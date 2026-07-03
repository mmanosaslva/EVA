# EVA — Guía de Variables de Entorno

Referencia central de todas las configuraciones externas del proyecto.

---

## Backend (`backend/.env`)

Ver `backend/.env.example` para la plantilla completa.

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL (Supabase Pooler) | `postgresql://...@aws-1-...pooler.supabase.com:6543/postgres` |
| `SUPABASE_URL` | URL del proyecto Supabase | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Clave pública de Supabase | `eyJ...` |
| `SUPABASE_JWT_SECRET` | Secreto para validar JWT (Auth → Settings → API) | `your-jwt-secret` |
| `CORS_ORIGINS` | Orígenes permitidos, separados por coma | `http://localhost:5173` |
| `OLLAMA_BASE_URL` | URL de Ollama local | `http://localhost:11434` |
| `GROQ_API_KEY` | API key de Groq (fallback LLM, tier gratuito) | `gsk_...` |
| `SENTRY_DSN` | DSN de Sentry para monitoreo de errores | `https://...@o....ingest.sentry.io/...` |
| `ENVIRONMENT` | Entorno de ejecución | `development` / `ci` / `production` |

---

## Frontend (`frontend/.env.local`)

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública de Supabase |
| `VITE_API_URL` | URL del backend FastAPI |
| `VITE_SENTRY_DSN` | DSN de Sentry para el frontend |

---

## SMTP — Confirmación de Email (Supabase Auth)

La confirmación de email **no se configura en el código ni en `.env`**. vive
en el Dashboard de Supabase y se aplica tanto en desarrollo local como en
producción (no hay que cambiar nada al hacer deploy).

### Dónde está la config

```
Supabase Dashboard → Authentication → Emails → SMTP Settings
```

### Configuración actual

- **Proveedor:** Gmail SMTP
- **Host:** `smtp.gmail.com`
- **Port:** `587` (STARTTLS)
- **Usuario:** cuenta de Google del proyecto
- **Contraseña:** Gmail App Password (no la contraseña regular de Gmail)

### Generar una Gmail App Password

1. Ir a https://myaccount.google.com/security
2. Activar la verificación en 2 pasos si no está activa
3. Buscar "App passwords" (o ir a https://myaccount.google.com/apppasswords)
4. Seleccionar "Mail" y "Otro (nombre personalizado)" → escribir "EVA"
5. Copiar la contraseña de 16 caracteres generada
6. Pegarla en Supabase Dashboard → SMTP Settings → Password

> La App Password reemplaza la contraseña real de Gmail. Si se revoca desde
> la cuenta de Google, hay que generar una nueva en Supabase Dashboard.

### Qué controla esta config

- Email de **confirmación** cuando una usuaria se registra
- Email de **restablecimiento de contraseña**
- Cualquier transacción de email que Supabase Auth envíe

### Nota sobre desarrollo local

No hay diferencia entre local y producción. Supabase Auth usa la misma config
SMTP siempre que el proyecto sea el mismo. Si estás en un proyecto de
Supabase diferente (ej. `eva-dev` vs `eva-prod`), configura SMTP en cada uno.

---

## Sentry

| Entorno | Dónde vive el DSN |
|---------|-------------------|
| Backend | `SENTRY_DSN` en `backend/.env` |
| Frontend | `VITE_SENTRY_DSN` en `frontend/.env.local` |

- Tier gratuito: 5,000 eventos/mes
- `send_default_pii=False` siempre — nunca envía email, nombre, ni datos del ciclo
- `before_send` hook en `app/main.py` redacta `Authorization`, `cookie`, y `request.data`
  en endpoints sensibles (`/daily-logs`, `/cycles`, `/insights`)

---

## CORS

`CORS_ORIGINS` en `backend/.env` acepta múltiples orígenes separados por coma:

```env
CORS_ORIGINS=http://localhost:5173
```

En producción se agregará el dominio de Vercel:

```env
CORS_ORIGINS=http://localhost:5173,https://eva-frontend.vercel.app
```

Nunca usar `allow_origins=["*"]` — viola la política privacy-first del proyecto.

---

## LLM (Ollama + Groq)

- **Ollama** corre localmente en `http://localhost:11434` con el modelo `mistral`
- **Groq** es el fallback gratuito cuando Ollama no está disponible
- Si ambos fallan, `get_insight()` lanza `RuntimeError` (nunca crashea silenciosamente)
- Ver `backend/app/services/llm_service.py` para la cadena de fallback
