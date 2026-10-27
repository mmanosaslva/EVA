# EVA — Guía de variables de entorno

Referencia de todas las variables del proyecto. **Ningún valor real se sube al repo** (RX-11): en local van en `backend/.env` y `frontend/.env`, y en producción en Vercel (*Settings → Environment Variables*; ver [`DEPLOY.md`](DEPLOY.md) §5 para qué va en *Production* y qué en *Preview*).

Plantillas: `backend/.env.example` y `frontend/.env.example`.

---

## Backend

Las lee `backend/app/core/config.py`.

| Variable | Obligatoria | Descripción | Ejemplo / valor por defecto |
|---|---|---|---|
| `DATABASE_URL` | Sí | Connection string **pooled** de Neon (host con `-pooler`) | `postgresql://…@ep-…-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require` |
| `SECRET_KEY` | Sí | Firma de los JWT. Mínimo 32 caracteres; distinta en producción y en previews | `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | Duración de la sesión | `30` |
| `GROQ_API_KEY` | Sí* | Proveedor principal del chatbot | `gsk_…` |
| `CLOUDFLARE_ACCOUNT_ID` | Sí* | Proveedor de respaldo del chatbot (Workers AI) | `0123abcd…` |
| `CLOUDFLARE_API_TOKEN` | Sí* | Token con permiso solo de Workers AI | `…` |
| `LLM_PROVIDERS` | No | Orden de failover | `groq,cloudflare` |
| `GROQ_MODEL` / `CLOUDFLARE_AI_MODEL` | No | Modelos del chatbot | `openai/gpt-oss-20b` / `@cf/openai/gpt-oss-20b` |
| `LLM_TIMEOUT_SECONDS`, `LLM_PROVIDER_COOLDOWN_SECONDS`, `LLM_MAX_TOKENS` | No | Ajustes del failover | `20`, `300`, `1024` |
| `BREVO_API_KEY` | Sí | API key `eva` de Brevo (emails de verificación y recuperación) | `xkeysib-…` |
| `SMTP_FROM` | Sí | Email del remitente `EVA` confirmado en Brevo | `eva@…` |
| `FRONTEND_URL` | No | Base de los links de los emails. Si falta, usa la URL del deploy de Vercel (`VERCEL_URL`) o, en local, `http://localhost:5173`. **No definirla en previews** | `https://<proyecto>.vercel.app` |
| `CORS_ORIGINS` | No | Orígenes permitidos, separados por coma. En Vercel el frontend usa el mismo dominio | `http://localhost:5173` |
| `ENVIRONMENT` | No | Entorno; Sentry lo usa como etiqueta | `development` / `preview` / `production` |
| `SENTRY_DSN` | No | Monitoreo de errores. Sin él la app funciona igual | `https://…ingest.sentry.io/…` |
| `TEST_DATABASE_URL` | No | **Dejarla vacía.** Los tests usan SQLite (RX-10) | — |
| `VERCEL`, `VERCEL_URL` | — | Las define Vercel en cada deploy; no se cargan a mano | — |

\* Sin ninguna clave de LLM, el chatbot responde con el respaldo por reglas (T3).

---

## Frontend

Las variables `VITE_*` se incrustan en el build: si cambian en Vercel, hay que redeployar.

| Variable | Descripción | Local | Vercel |
|---|---|---|---|
| `VITE_API_URL` | Base de la API | `http://localhost:8000` | `/api` |
| `VITE_SENTRY_DSN` | Sentry del frontend (opcional) | — | Opcional |
| `VITE_ENVIRONMENT` | Etiqueta de Sentry | `development` | `production` |

---

## Sentry

- Opcional. Se configura después de T25.
- `send_default_pii=False`. El hook `before_send` de `app/main.py` borra `authorization`, `cookie` y el cuerpo de las peticiones a `/daily-logs`, `/cycles` y `/insights`.

## CORS

En Vercel frontend y backend comparten dominio, así que el navegador no hace peticiones entre orígenes. `CORS_ORIGINS` solo importa en local (`http://localhost:5173`). Nunca usar `*`.
