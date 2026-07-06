# Reemplazar Supabase Auth con fastapi-users — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar Supabase Auth por fastapi-users con JWT local, eliminando latencia y dependencia externa de auth.

**Architecture:** Nuevo módulo `app/auth/` autocontenido con SQLAlchemy ORM async (fastapi-users nativo). Tabla `user` separada de `users` (perfil). Wrapper en `core/security.py` mantiene contrato dict `{user_id, email}` para cero cambios en routers existentes. Frontend: AuthClient wrapper reemplaza `supabase.auth.*`.

**Tech Stack:** fastapi-users[sqlalchemy] v15+, SQLAlchemy ORM 2.0 async, JWT HS256, localStorage (frontend)

## Global Constraints

- Python 3.11+, fastapi 0.136.1, SQLAlchemy 2.0.38 (ya instalados)
- asyncpg 0.31.0 ya instalado
- PyJWT 2.10.1 ya instalado
- No tocar routers existentes de cycles, symptoms, predictions, etc.
- Mantener contrato `current_user: dict` con clave `"user_id"` en todos los routers
- Alembic para migraciones (ya configurado)

## File Structure

```
backend/app/auth/                    ← CREAR (nuevo módulo)
├── __init__.py
├── db.py                            ← Modelo ORM + engine + deps
├── schemas.py                       ← UserRead, UserCreate, UserUpdate
├── manager.py                       ← UserManager + hooks
└── setup.py                         ← auth_backend + FastAPIUsers + current_active_user

backend/app/core/
├── config.py                        ← MODIFICAR (+ SECRET_KEY, + ACCESS_TOKEN_EXPIRE_MINUTES)
└── security.py                      ← REEMPLAZAR (wrapper que devuelve dict)

backend/app/main.py                  ← MODIFICAR (+ lifespan, + auth routers)

backend/migrations/versions/
└── 006_user_profile_trigger.py      ← CREAR

frontend/src/services/
├── authClient.ts                    ← CREAR
├── apiClient.ts                     ← MODIFICAR (usa authClient en vez de supabase)
├── syncManager.ts                   ← MODIFICAR (usa authClient en vez de supabase)
└── exportService.ts                 ← MODIFICAR (usa authClient en vez de supabase)

frontend/src/hooks/
└── useAuth.ts                       ← REESCRIBIR

frontend/src/lib/
├── supabaseClient.ts                ← ELIMINAR
└── supabase.ts                      ← ELIMINAR

frontend/
├── package.json                     ← MODIFICAR (- @supabase/supabase-js)
└── .env                             ← MODIFICAR (- VITE_SUPABASE_*)

backend/
├── requirements.txt                 ← MODIFICAR (+ fastapi-users[sqlalchemy])
└── .env                             ← MODIFICAR (+ SECRET_KEY, + ACCESS_TOKEN_EXPIRE_MINUTES)
```

---

### Task 1: Instalar fastapi-users y actualizar dependencias

**Files:**
- Modify: `backend/requirements.txt`

**Interfaces:**
- Produces: fastapi-users[sqlalchemy] disponible en venv

- [ ] **Step 1: Agregar fastapi-users[sqlalchemy] a requirements.txt**

```txt
# Agregar al final del archivo -- NO duplicar líneas existentes:
# ── Auth ─────────────────────────────────────────────────────
fastapi-users[sqlalchemy]==15.0.5
```

- [ ] **Step 2: Instalar**

```bash
cd backend && pip install "fastapi-users[sqlalchemy]==15.0.5"
```

- [ ] **Step 3: Commit**

```bash
git add backend/requirements.txt && git commit -m "deps: add fastapi-users[sqlalchemy] v15.0.5"
```

---

### Task 2: Crear módulo auth/db.py — modelo ORM y sesiones

**Files:**
- Create: `backend/app/auth/__init__.py`
- Create: `backend/app/auth/db.py`

**Interfaces:**
- Produces: `User` (SQLAlchemy model), `create_db_and_tables()`, `get_async_session()`, `get_user_db()`

- [ ] **Step 1: Crear __init__.py**

```bash
touch backend/app/auth/__init__.py
```

- [ ] **Step 2: Escribir db.py**

```python
from collections.abc import AsyncGenerator

from fastapi import Depends
from fastapi_users.db import SQLAlchemyBaseUserTableUUID, SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)


class Base(DeclarativeBase):
    pass


class User(SQLAlchemyBaseUserTableUUID, Base):
    __tablename__ = "user"


engine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=2,
    max_overflow=5,
    connect_args={"statement_cache_size": 0},
)
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

- [ ] **Step 3: Verificar que carga sin errores**

```bash
cd backend && python -c "from app.auth.db import User, create_db_and_tables; print('OK')"
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/auth/ && git commit -m "feat(auth): add ORM User model and session deps"
```

---

### Task 3: Crear módulo auth/schemas.py y auth/manager.py

**Files:**
- Create: `backend/app/auth/schemas.py`
- Create: `backend/app/auth/manager.py`

**Interfaces:**
- Consumes: `settings.SECRET_KEY` (definido en Task 6), `User`, `get_user_db` de `auth/db.py`
- Produces: `UserRead`, `UserCreate`, `UserUpdate`, `get_user_manager()`

- [ ] **Step 1: Escribir schemas.py**

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

- [ ] **Step 2: Escribir manager.py**

```python
import uuid

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, UUIDIDMixin
from fastapi_users.db import SQLAlchemyUserDatabase

from app.core.config import settings
from app.auth.db import User, get_user_db


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = settings.SECRET_KEY
    verification_token_secret = settings.SECRET_KEY

    async def on_after_register(self, user: User, request: Request | None = None):
        print(f"User {user.id} has registered.")

    async def on_after_forgot_password(
        self, user: User, token: str, request: Request | None = None
    ):
        print(f"User {user.id} has forgot their password. Reset token: {token}")

    async def on_after_request_verify(
        self, user: User, token: str, request: Request | None = None
    ):
        print(f"Verification requested for user {user.id}. Verification token: {token}")


async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)
```

- [ ] **Step 3: Verificar que cargan sin errores**

```bash
cd backend && python -c "from app.auth.schemas import UserRead, UserCreate; print('OK')" && python -c "from app.auth.manager import get_user_manager; print('OK')"
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/auth/schemas.py backend/app/auth/manager.py && git commit -m "feat(auth): add schemas and UserManager"
```

---

### Task 4: Crear módulo auth/setup.py — factory de auth

**Files:**
- Create: `backend/app/auth/setup.py`

**Interfaces:**
- Consumes: `settings.SECRET_KEY`, `settings.ACCESS_TOKEN_EXPIRE_MINUTES` (definido en Task 6), `get_user_manager` de `auth/manager.py`, `User` de `auth/db.py`
- Produces: `auth_backend`, `fastapi_users`, `current_active_user`

- [ ] **Step 1: Escribir setup.py**

```python
import uuid

from fastapi_users import FastAPIUsers, models
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
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

- [ ] **Step 2: Verificar que carga sin errores**

```bash
cd backend && python -c "from app.auth.setup import fastapi_users, current_active_user; print('OK')"
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/auth/setup.py && git commit -m "feat(auth): add auth backend setup with JWT strategy"
```

---

### Task 5: Actualizar core/config.py — agregar SECRET_KEY

**Files:**
- Modify: `backend/app/core/config.py`

**Interfaces:**
- Consumes: .env (nuevas variables)
- Produces: `settings.SECRET_KEY`, `settings.ACCESS_TOKEN_EXPIRE_MINUTES`

- [ ] **Step 1: Agregar nuevas variables a la clase Settings**

```python
# Agregar DESPUÉS de DATABASE_URL y ANTES de OLLAMA_BASE_URL:
    SECRET_KEY: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
```

Posición exacta en el archivo: después de la línea `TEST_DATABASE_URL: str = ""` (~línea 7) y antes de la línea `OLLAMA_BASE_URL: str = "http://localhost:11434"`.

- [ ] **Step 2: Verificar que los settings cargan**

```bash
cd backend && python -c "from app.core.config import settings; print(f'SECRET_KEY={settings.SECRET_KEY[:4]}...'); print(f'EXPIRE={settings.ACCESS_TOKEN_EXPIRE_MINUTES}')"
```

- [ ] **Step 3: Agregar al .env (BACKEND)**

```
SECRET_KEY=your-secret-key-change-in-production-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/core/config.py && git commit -m "feat(config): add SECRET_KEY and ACCESS_TOKEN_EXPIRE_MINUTES"
```

---

### Task 6: Reemplazar core/security.py por wrapper

**Files:**
- Modify: `backend/app/core/security.py`

**Interfaces:**
- Consumes: `current_active_user` de `auth/setup.py`, `User` de `auth/db.py`
- Produces: `get_current_user()` → `dict` con `{"user_id": str, "email": str}`

- [ ] **Step 1: Sobrescribir security.py**

```python
from fastapi import Depends

from app.auth.setup import current_active_user
from app.auth.db import User


async def get_current_user(current_user: User = Depends(current_active_user)) -> dict:
    return {"user_id": str(current_user.id), "email": current_user.email}
```

**NOTA: Borrar todo el contenido anterior del archivo.**

- [ ] **Step 2: Verificar que el import sigue funcionando en routers existentes**

```bash
cd backend && python -c "from app.core.security import get_current_user; print('OK')"
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/core/security.py && git commit -m "feat(security): replace Supabase JWT validation with fastapi-users wrapper"
```

---

### Task 7: Modificar main.py — agregar lifespan y routers de auth

**Files:**
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: `fastapi_users`, `auth_backend` de `auth/setup.py`, `UserRead`, `UserCreate`, `UserUpdate` de `auth/schemas.py`, `create_db_and_tables` de `auth/db.py`

- [ ] **Step 1: Agregar imports en la parte superior del archivo**

Abrir `backend/app/main.py`. Agregar estas líneas DESPUÉS del bloque `from app.routers import ...` (aproximadamente línea 10):

```python
from app.auth.db import create_db_and_tables
from app.auth.setup import fastapi_users, auth_backend
from app.auth.schemas import UserRead, UserCreate, UserUpdate
```

- [ ] **Step 2: Agregar startup event DESPUÉS de `app = FastAPI(...)`**

Localizar la línea `app = FastAPI(...)` (~línea 44). Agregar inmediatamente DESPUÉS:

```python
@app.on_event("startup")
async def startup():
    await create_db_and_tables()
```

- [ ] **Step 3: Agregar routers de auth DESPUÉS de los routers existentes (antes del final del archivo)**

```python
app.include_router(
    fastapi_users.get_auth_router(auth_backend), prefix="/auth/jwt", tags=["auth"]
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_reset_password_router(),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_verify_router(UserRead),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)
```

- [ ] **Step 4: Verificar que la app carga sin errores de importación**

```bash
cd backend && python -c "from app.main import app; print(f'Routes: {len(app.routes)}')"
```

Expected: número de rutas mayor que antes (debe incluir las nuevas de auth)

- [ ] **Step 5: Commit**

```bash
git add backend/app/main.py && git commit -m "feat(main): add lifespan and auth routers from fastapi-users"
```

---

### Task 8: Crear migración Alembic — trigger create_user_profile

**Files:**
- Create: `backend/migrations/versions/006_user_profile_trigger.py`

**Interfaces:**
- Consumes: BD PostgreSQL con tabla `user` (creada por fastapi-users) y tabla `users` (existente)

- [ ] **Step 1: Escribir migración**

```python
"""user_profile_trigger

Revision ID: 006
Revises: 005
Create Date: 2026-07-05

Agrega trigger AFTER INSERT en la tabla "user" que inserta automáticamente
una fila en public.users con el mismo id y email.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        CREATE OR REPLACE FUNCTION public.create_user_profile()
        RETURNS TRIGGER AS $$
        BEGIN
            INSERT INTO public.users (id, email, created_at, updated_at)
            VALUES (NEW.id, NEW.email, NOW(), NOW())
            ON CONFLICT (id) DO NOTHING;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    op.execute("""
        DROP TRIGGER IF EXISTS trg_create_user_profile ON "user";
        CREATE TRIGGER trg_create_user_profile
            AFTER INSERT ON "user"
            FOR EACH ROW
            EXECUTE FUNCTION public.create_user_profile();
    """)


def downgrade() -> None:
    op.execute('DROP TRIGGER IF EXISTS trg_create_user_profile ON "user"')
    op.execute("DROP FUNCTION IF EXISTS public.create_user_profile()")
```

- [ ] **Step 2: Ejecutar migración**

```bash
cd backend && alembic upgrade head
```

Expected: "Running upgrade 005 -> 006, user_profile_trigger"

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/versions/006_user_profile_trigger.py && git commit -m "migration: add trigger to sync user profile on registration"
```

---

### Task 9: Crear authClient.ts en frontend

**Files:**
- Create: `frontend/src/services/authClient.ts`

**Interfaces:**
- Consumes: `VITE_API_URL` del .env
- Produces: `authClient` singleton (class AuthClient)

- [ ] **Step 1: Escribir authClient.ts**

Leer el archivo actual: `frontend/src/services/apiClient.ts`

```typescript
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export interface AuthUser {
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

class AuthClient {
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
      body: JSON.stringify({ email, password, is_active: true, is_superuser: false, is_verified: false }),
    });
    if (!res.ok) throw new Error(await this._errorMessage(res));
    return this.login(email, password);
  }

  async logout(): Promise<void> {
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

  isAuthenticated(): boolean {
    return this._getToken() !== null;
  }

  async fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
    const token = this._getToken();
    const res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (res.status === 401) {
      this._clearToken();
      window.location.href = "/login";
      throw new Error("Sesión expirada");
    }

    return res;
  }

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

- [ ] **Step 2: Verificar que compila**

```bash
cd frontend && npx tsc --noEmit src/services/authClient.ts
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/services/authClient.ts && git commit -m "feat(frontend): add AuthClient for fastapi-users JWT"
```

---

### Task 10: Reescribir hooks/useAuth.ts

**Files:**
- Modify: `frontend/src/hooks/useAuth.ts`

- [ ] **Step 1: Sobrescribir useAuth.ts**

```typescript
import { useState, useEffect, useCallback } from "react";
import { authClient, type AuthUser } from "../services/authClient";

interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  getToken: () => Promise<string | null>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (authClient.isAuthenticated()) {
      authClient.me()
        .then(setUser)
        .catch(() => {
          setUser(null);
          authClient.logout();
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const u = await authClient.login(email, password);
      setUser(u);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al iniciar sesión";
      setAuthError(msg);
      throw e;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const u = await authClient.register(email, password);
      setUser(u);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al registrarse";
      setAuthError(msg);
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await authClient.logout();
    setUser(null);
  }, []);

  const clearError = useCallback(() => setAuthError(null), []);

  const getToken = useCallback(async () => authClient.getToken(), []);

  return {
    user,
    isLoading,
    authError,
    login,
    register,
    logout,
    clearError,
    getToken,
  };
}
```

- [ ] **Step 2: Verificar que el tipo UsetAuthReturn satisface a PrivateRoute**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useAuth.ts && git commit -m "refactor(frontend): rewrite useAuth to use AuthClient instead of supabase"
```

---

### Task 11: Modificar apiClient.ts, syncManager.ts y exportService.ts

**Files:**
- Modify: `frontend/src/services/apiClient.ts`
- Modify: `frontend/src/services/syncManager.ts`
- Modify: `frontend/src/services/exportService.ts`

- [ ] **Step 1: Modificar apiClient.ts**

Reemplazar TODO el contenido:

```typescript
import { authClient } from "./authClient";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface ApiClientOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
}

export async function apiClient<T = unknown>(
  path: string,
  options: ApiClientOptions = {},
): Promise<T> {
  const { method = "GET", body } = options;
  const config: RequestInit = { method, headers: { "Content-Type": "application/json" } };

  if (body) {
    config.body = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await authClient.fetchWithAuth(`${API_BASE}${path}`, config);
  } catch {
    throw new Error(
      `No se pudo conectar con el servidor (${API_BASE}). Verificá que el backend esté corriendo.`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  let data: Record<string, unknown>;

  try {
    data = await response.json();
  } catch {
    throw new Error(
      `Respuesta inesperada del servidor (${response.status}). Intentá de nuevo.`,
    );
  }

  if (!response.ok) {
    const message = data.detail || `Error del servidor (${response.status})`;
    throw new Error(typeof message === "string" ? message : `Error ${response.status}`);
  }

  return data as T;
}
```

- [ ] **Step 2: Modificar syncManager.ts**

Cambiar las líneas 1 y 97:

```typescript
// Línea 1: Reemplazar
// import { supabase } from "../lib/supabaseClient";
import { authClient } from "./authClient";

// Líneas 97-98: Reemplazar
// const { data: sessionData } = await supabase.auth.getSession();
// const token = sessionData.session?.access_token;
const token = await authClient.getToken();
```

El resto del archivo syncManager.ts **no cambia**.

- [ ] **Step 3: Modificar exportService.ts**

Cambiar las líneas 1 y 15-18:

```typescript
// Línea 1: Reemplazar
// import { supabase } from "../lib/supabaseClient";
import { authClient } from "./authClient";

// Líneas 15-19: Reemplazar toda la función authFetch:
async function authFetch(path: string): Promise<Response> {
  const token = await authClient.getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, { headers });

  if (!response.ok) {
    const detail = response.headers.get("content-type")?.includes("application/json")
      ? (await response.json()).detail
      : `Error ${response.status}`;
    throw new Error(detail || `Error ${response.status}`);
  }

  return response;
}
```

- [ ] **Step 4: Verificar que compila**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/services/apiClient.ts frontend/src/services/syncManager.ts frontend/src/services/exportService.ts && git commit -m "refactor(frontend): replace supabase auth with AuthClient in all services"
```

---

### Task 12: Eliminar Supabase del frontend

**Files:**
- Delete: `frontend/src/lib/supabaseClient.ts`
- Delete: `frontend/src/lib/supabase.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/.env`

- [ ] **Step 1: Eliminar archivos de Supabase**

```bash
rm frontend/src/lib/supabaseClient.ts frontend/src/lib/supabase.ts
```

- [ ] **Step 2: Desinstalar dependencia**

```bash
cd frontend && npm uninstall @supabase/supabase-js
```

- [ ] **Step 3: Eliminar variables de entorno de Supabase del .env del frontend**

Quitar estas líneas de `frontend/.env`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 4: Verificar que compila sin errores**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 5: Verificar que no queden referencias a supabase**

```bash
cd frontend && grep -r "supabase" src/ || echo "No references found — clean"
```

Expected: "No references found — clean"

- [ ] **Step 6: Commit**

```bash
git add -A frontend/ && git commit -m "chore(frontend): remove Supabase client library and env vars"
```

---

### Task 13: Limpiar variables Supabase del backend

**Files:**
- Modify: `backend/.env`
- Modify: `backend/app/core/config.py`

- [ ] **Step 1: Eliminar variables de entorno Supabase del .env del backend**

Quitar estas líneas de `backend/.env`:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_JWT_SECRET=
```

Si las variables están en `.env` con valores reales, eliminarlas.

- [ ] **Step 2: Eliminar las variables del config (opcional — pydantic_settings las ignora con extra="ignore")**

Las variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET` pueden quedarse en `config.py` o eliminarse. Con `extra="ignore"`, las variables no definidas en el .env simplemente se ignoran.

**Recomendación**: eliminarlas de `config.py` para mantener el código limpio:

Quitar estas líneas de `backend/app/core/config.py`:
```python
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
```

- [ ] **Step 3: Verificar que la app sigue funcionando sin esas variables**

```bash
cd backend && python -c "from app.main import app; print('OK')"
```

- [ ] **Step 4: Commit**

```bash
git add backend/.env backend/app/core/config.py && git commit -m "chore(backend): remove Supabase env vars from config"
```

---

### Task 14: Test funcional — flujo completo

**Files:**
- No se crean archivos, solo verificación manual

- [ ] **Step 1: Levantar backend**

```bash
cd backend && uvicorn app.main:app --reload --port 8000 &
sleep 3
```

- [ ] **Step 2: Test: Register**

```bash
curl -s -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@eva.app","password":"test1234","is_active":true,"is_superuser":false,"is_verified":false}' \
  | python -m json.tool
```

Expected: 201 con el usuario creado, incluyendo `id` y `email`.

- [ ] **Step 3: Test: Login**

```bash
curl -s -X POST http://localhost:8000/auth/jwt/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@eva.app&password=test1234" \
  | python -m json.tool
```

Expected: 200 con `access_token` y `token_type: "bearer"`.

- [ ] **Step 4: Test: Usar token en ruta protegida**

```bash
TOKEN="<copiar access_token del paso anterior>"
curl -s http://localhost:8000/cycles \
  -H "Authorization: Bearer $TOKEN" \
  | python -m json.tool
```

Expected: 200 con `[]` o lista de ciclos del usuario.

- [ ] **Step 5: Test: Verificar trigger (perfil creado en tabla users)**

Conectarse a la BD y verificar:

```bash
cd backend && python -c "
from app.core.db import engine
from sqlalchemy import text
import asyncio

async def check():
    async with engine.connect() as conn:
        result = await conn.execute(text(\"SELECT id, email FROM users WHERE email = 'test@eva.app'\"))
        row = result.fetchone()
        print(f'Profile row: id={row.id}, email={row.email}' if row else 'NO PROFILE ROW — trigger failed')

asyncio.run(check())
"
```

- [ ] **Step 6: Test: Me endpoint**

```bash
curl -s http://localhost:8000/users/me \
  -H "Authorization: Bearer $TOKEN" \
  | python -m json.tool
```

Expected: 200 con `id`, `email`, `is_active`.

- [ ] **Step 7: Limpiar datos de test**

```bash
cd backend && python -c "
from app.core.db import engine
from sqlalchemy import text
import asyncio

async def cleanup():
    async with engine.connect() as conn:
        await conn.execute(text(\"DELETE FROM public.users WHERE email = 'test@eva.app'\"))
        await conn.commit()
        print('Test user cleaned up')

asyncio.run(cleanup())
"
```

- [ ] **Step 8: Detener backend**

```bash
kill %1 2>/dev/null
```

---

### Task 15: Limpieza post-migración (BD Supabase)

**NOTA:** Este task es opcional y puede ejecutarse días después, cuando se haya confirmado que todo funciona en producción.

**Files:**
- Create: `backend/migrations/versions/007_cleanup_supabase_auth.py`

- [ ] **Step 1: Crear migración de limpieza**

```python
"""cleanup_supabase_auth

Revision ID: 007
Revises: 006
Create Date: 2026-07-05

Limpia triggers y estructuras heredadas de Supabase Auth que ya no se usan.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "007"
down_revision: Union[str, None] = "006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users")
    op.execute("DROP FUNCTION IF EXISTS app_hidden.handle_user_delete()")
    op.execute("DROP FUNCTION IF EXISTS app_hidden.handle_new_user()")


def downgrade() -> None:
    pass
```

- [ ] **Step 2: Ejecutar migración**

```bash
cd backend && alembic upgrade head
```

- [ ] **Step 3: Commit**

```bash
git add backend/migrations/versions/007_cleanup_supabase_auth.py && git commit -m "migration: cleanup legacy Supabase Auth triggers"
```
