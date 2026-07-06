# EVA — Reemplazar Supabase Auth con fastapi-users

> Fecha: 2026-07-05
> Autor: brainstorming → design → writing-plans

## Objetivo

Reemplazar Supabase Auth (autenticación vía `supabase.auth.*` + validación JWT remota) por
**fastapi-users** (v15.x) con JWT local, eliminando la dependencia de Supabase para
autenticación. La BD (PostgreSQL) puede seguir en Supabase o migrarse después — este spec
solo cubre el reemplazo de auth.

## Stack objetivo

| Capa | Tecnología |
|---|---|
| Librería auth | fastapi-users[sqlalchemy] v15.x |
| DB adapter | SQLAlchemy ORM 2.0 async (solo tabla `user`) |
| Resto del proyecto | SQLAlchemy Core (sin cambios) |
| JWT | HS256 con secret propio |
| Frontend token mgmt | AuthClient wrapper (~60 líneas, fetch + localStorage) |

## Arquitectura

```
Backend actual                    Backend nuevo
─────────────────                 ─────────────────

main.py                           main.py
  ├── security.py (Supabase)        ├── security.py (ELIMINAR)
  ├── core/                         ├── core/ (sin cambios)
  │   ├── config.py                 │   ├── config.py (+ SECRET_KEY)
  │   └── db.py (asyncpg)           │   └── db.py
  ├── routers/*.py                  ├── routers/*.py
  ├── services/*.py                 ├── services/*.py
  ├── repositories/*.py             ├── repositories/*.py
  └── ...                           │
                                    ├── auth/              ← NUEVO módulo
                                    │   ├── __init__.py
                                    │   ├── db.py          (Modelo ORM User)
                                    │   ├── schemas.py     (UserRead/Create/Update)
                                    │   ├── manager.py     (UserManager)
                                    │   └── setup.py       (backend + routers + deps)
                                    │
                                    └── main.py
                                          └── include_router(auth_router)
                                          └── lifespan: create_db_and_tables()
```

### Árbol de archivos nuevo

```
backend/
├── app/
│   ├── auth/                          ← NUEVO
│   │   ├── __init__.py
│   │   ├── db.py
│   │   ├── schemas.py
│   │   ├── manager.py
│   │   └── setup.py
│   ├── core/
│   │   └── config.py                  ← MODIFICAR (+ SECRET_KEY, - SUPABASE_*)
│   ├── main.py                        ← MODIFICAR (lifespan, routers, eliminar security)
│   └── ...
├── .env                               ← MODIFICAR
└── requirements.txt                   ← MODIFICAR (+ fastapi-users[sqlalchemy])

frontend/
├── src/
│   ├── services/
│   │   ├── authClient.ts              ← NUEVO (reemplaza supabase.auth)
│   │   ├── apiClient.ts               ← MODIFICAR (usa authClient)
│   │   ├── syncManager.ts             ← MODIFICAR (usa authClient)
│   │   └── exportService.ts           ← MODIFICAR (usa authClient)
│   ├── hooks/
│   │   └── useAuth.ts                 ← REESCRIBIR (usa authClient)
│   ├── lib/
│   │   ├── supabaseClient.ts          ← ELIMINAR
│   │   └── supabase.ts                ← ELIMINAR (si no se usa para otra cosa)
│   ├── pages/
│   │   ├── LoginPage.tsx              ← SIN CAMBIOS (consume useAuth)
│   │   └── RegisterPage.tsx           ← SIN CAMBIOS (consume useAuth)
│   └── components/auth/
│       └── PrivateRoute.tsx            ← SIN CAMBIOS (consume useAuth)
├── .env                                ← MODIFICAR (- VITE_SUPABASE_*)
├── package.json                        ← MODIFICAR (- @supabase/supabase-js)
```

## Diseño detallado

### 1. Base de datos — Tabla `user`

fastapi-users crea su propia tabla `user` (singular) vía SQLAlchemy ORM. No toca la tabla
existente `users` (plural, perfil). Coexisten sin conflicto.

```sql
-- Creada automáticamente por SQLAlchemy (Base.metadata.create_all)
CREATE TABLE "user" (
    id              UUID PRIMARY KEY,
    email           VARCHAR(320) NOT NULL UNIQUE,
    hashed_password VARCHAR(1024) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_superuser    BOOLEAN NOT NULL DEFAULT FALSE,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE
);
```

**Trigger post-registro** (SQL manual vía migración Alembic):

Al crearse un usuario en `user`, se inserta automáticamente una fila en `users` (perfil)
con el mismo `id` y `email`, preservando la FK de todas las tablas existentes (cycles,
daily_logs, etc.):

```sql
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_user_profile
    AFTER INSERT ON "user"
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();
```

### 2. Backend — Módulo `auth/`

#### `auth/db.py` — Modelo ORM y engine

```python
from fastapi_users.db import SQLAlchemyBaseUserTableUUID
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

class Base(DeclarativeBase):
    pass

class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "user"

engine = create_async_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"statement_cache_size": 0})
async_session_maker = async_sessionmaker(engine, expire_on_commit=False)

async def create_db_and_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

async def get_user_db(session: AsyncSession = Depends(get_async_session)):
    yield SQLAlchemyUserDatabase(session, User)
```

**Nota**: Usa engine separado del Core (`core/db.py`). Ambos apuntan a la misma BD pero
cada uno con su pool de conexiones. Es intencional: ORM y Core tienen configuraciones
distintas de pool y sesión.

#### `auth/schemas.py` — Schemas Pydantic

```python
import uuid
from fastapi_users import schemas

class UserRead(schemas.BaseUser[uuid.UUID]):
    pass

class UserCreate(schemas.BaseUserCreate):
    pass

class UserUpdate(schemas.BaseUserUpdate):
    pass
```

#### `auth/manager.py` — UserManager

```python
import uuid
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, UUIDIDMixin
from fastapi_users.db import SQLAlchemyUserDatabase

from app.core.config import settings
from app.auth.db import User, get_user_db

SECRET = settings.SECRET_KEY

class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    async def on_after_register(self, user: User, request: Request | None = None):
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(
        self, user: User, token: str, request: Request | None = None
    ):
        print(f"User {user.id} forgot password. Token: {token}")

    async def on_after_request_verify(
        self, user: User, token: str, request: Request | None = None
    ):
        print(f"User {user.id} verification requested. Token: {token}")

async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)
```

#### `auth/setup.py` — Factory de auth

```python
import uuid
from fastapi_users import FastAPIUsers, models
from fastapi_users.authentication import (
    AuthenticationBackend, BearerTransport, JWTStrategy,
)

from app.auth.manager import get_user_manager
from app.auth.db import User
from app.core.config import settings

bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

def get_jwt_strategy() -> JWTStrategy[models.UP, models.ID]:
    return JWTStrategy(
        secret=settings.SECRET_KEY,
        lifetime_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [auth_backend])

current_active_user = fastapi_users.current_user(active=True)
```

#### Routers expuestos

| Router | Prefix | Endpoints |
|---|---|---|
| Auth | `/auth/jwt` | `POST /login`, `POST /logout` |
| Register | `/auth` | `POST /register` |
| Reset password | `/auth` | `POST /forgot-password`, `POST /reset-password` |
| Verify | `/auth` | `POST /request-verify-token`, `POST /verify` |
| Users | `/users` | `GET /me`, `PATCH /me`, `DELETE /me`, `GET /{id}`, `PATCH /{id}` |

### 3. Frontend — AuthClient

#### `services/authClient.ts`

Clase que envuelve fetch para login/register/logout con refresh automático:

```typescript
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface AuthUser {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
}

interface LoginResponse {
  access_token: string;
  token_type: "bearer";
}

export class AuthClient {
  async login(email: string, password: string): Promise<AuthUser> {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const res = await fetch(`${API_BASE}/auth/jwt/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData,
    });
    if (!res.ok) throw new Error(await this._errorMessage(res));

    const { access_token } = (await res.json()) as LoginResponse;
    this._saveToken(access_token);
    return this.me();
  }

  async register(email: string, password: string): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(await this._errorMessage(res));
    // auto-login after register
    return this.login(email, password);
  }

  async logout(): Promise<void> {
    // JWT es stateless: el logout solo elimina el token del cliente.
    // El endpoint /auth/jwt/logout existe pero no invalida el token (ver docs de fastapi-users).
    this._clearToken();
  }

  async me(): Promise<AuthUser> {
    const token = this._getToken();
    const res = await fetch(`${API_BASE}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Sesión expirada");
    return res.json();
  }

  async getToken(): Promise<string | null> {
    return this._getToken();
  }

  // fetch con auth + refresh automático en 401
  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this._getToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });

    // 401 → logout (JWT no se puede refrescar desde browser sin refresh token)
    if (res.status === 401) {
      this._clearToken();
      window.location.href = "/login";
      throw new Error("Sesión expirada");
    }

    return res;
  }

  // -- privados --
  private _saveToken(token: string) {
    localStorage.setItem("eva_access_token", token);
  }

  private _getToken(): string | null {
    return localStorage.getItem("eva_access_token");
  }

  private _clearToken() {
    localStorage.removeItem("eva_access_token");
  }

  private async _errorMessage(res: Response): Promise<string> {
    try {
      const body = await res.json();
      return body.detail || `Error ${res.status}`;
    } catch {
      return `Error del servidor (${res.status})`;
    }
  }
}

export const authClient = new AuthClient();
```

#### `hooks/useAuth.ts` — Reescribir

Reemplazar toda referencia a `supabase.auth` por `authClient`:

```typescript
import { useState, useEffect, useCallback } from "react";
import { authClient } from "../services/authClient";
import type { AuthUser } from "../services/authClient";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check existing session on mount
    authClient.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const u = await authClient.login(email, password);
      setUser(u);
    } catch (e: any) {
      setAuthError(e.message);
      throw e;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const u = await authClient.register(email, password);
      setUser(u);
    } catch (e: any) {
      setAuthError(e.message);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await authClient.logout();
    setUser(null);
  }, []);

  const clearError = useCallback(() => setAuthError(null), []);

  const getToken = useCallback(async () => authClient.getToken(), []);

  return { user, isLoading, authError, login, register, logout, clearError, getToken };
}
```

#### `services/apiClient.ts` — Modificar

```typescript
import { authClient } from "./authClient";

export async function apiClient<T = unknown>(...): Promise<T> {
  const response = await authClient.fetchWithAuth(`${API_BASE}${path}`, config);
  // ... resto igual
}
```

### 4. Configuración (`core/config.py`)

```python
class Settings(BaseSettings):
    DATABASE_URL: str = ""
    TEST_DATABASE_URL: str = ""
    # ELIMINAR: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET
    SECRET_KEY: str = ""                # NUEVO
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30  # NUEVO
    # ... resto igual (OLLAMA, GROQ, SENTRY, CORS, etc.)
```

### 5. main.py — Cambios

```python
from contextlib import asynccontextmanager
from app.auth.db import create_db_and_tables  # NUEVO
from app.auth.setup import fastapi_users, auth_backend  # NUEVO
from app.auth.schemas import UserRead, UserCreate, UserUpdate  # NUEVO

@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_db_and_tables()       # Crea tabla "user" si no existe
    yield

# Incluir routers de auth
app.include_router(
    fastapi_users.get_auth_router(auth_backend), prefix="/auth/jwt", tags=["auth"]
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth", tags=["auth"],
)
app.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth", tags=["auth"],
)
app.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/auth", tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users", tags=["users"],
)
```

Los routers existentes (cycles, symptoms, predictions, etc.) **no cambian**. Su seguridad
se modifica en el siguiente paso.

### 6. Seguridad — Reemplazar `core/security.py`

Los routers existentes esperan `current_user: dict` con clave `user_id`.
fastapi-users devuelve un objeto `User` ORM. Para **no tocar los 10+ routers**,
el wrapper mantiene el mismo contrato:

```python
# core/security.py — NUEVO (reemplaza el anterior)
from fastapi import Depends
from app.auth.setup import current_active_user
from app.auth.db import User

async def get_current_user(current_user: User = Depends(current_active_user)) -> dict:
    return {"user_id": str(current_user.id), "email": current_user.email}
```

**Cero cambios** en routers existentes — siguen llamando `current_user["user_id"]`.

### 7. Limpieza post-migración (fase separada)

Después de probar que todo funciona:

1. **BD**: Eliminar triggers de Supabase (`handle_new_user`, `handle_user_delete`)
2. **BD**: Eliminar RLS policies
3. **Env**: Eliminar `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` del backend
4. **Frontend**: Eliminar `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` del `.env`
5. **Frontend**: Eliminar `lib/supabaseClient.ts`, `lib/supabase.ts`
6. **Deps**: `npm uninstall @supabase/supabase-js`
7. **Tests**: Actualizar mocks de auth

## Secuencia de implementación

1. Agregar dependencias (`fastapi-users[sqlalchemy]`, `asyncpg`)
2. Crear `auth/db.py` (modelo ORM + engine + session)
3. Crear `auth/schemas.py`
4. Crear `auth/manager.py`
5. Crear `auth/setup.py` (backend + FastAPIUsers + current_user)
6. Modificar `core/config.py` (+ SECRET_KEY, - SUPABASE_*)
7. Modificar `main.py` (lifespan + routers auth)
8. Crear trigger SQL `create_user_profile` (migración Alembic)
9. Reemplazar `core/security.py` por wrapper
10. Crear `authClient.ts` en frontend
11. Reescribir `hooks/useAuth.ts`
12. Modificar `apiClient.ts`, `syncManager.ts`, `exportService.ts`
13. Actualizar `.env` (backend + frontend)
14. Probar flujo completo: register → login → CRUD cycles → logout
15. Limpieza post-migración

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| JWT no se puede invalidar server-side | Usar `lifetime_seconds` bajo (30 min). El logout solo borra el token del lado cliente |
| Engine separado ORM + Core = 2 pools a la misma BD | Configurar pool pequeño en el engine ORM (pool_size=2). Ambos apuntan al mismo host |
| fastapi-users en maintenance mode | v15 es estable y madura. Si emerge un bug crítico, la alternativa es hacer auth custom |

---

*Fin del design doc — siguiente paso: writing-plans para plan de implementación.*
