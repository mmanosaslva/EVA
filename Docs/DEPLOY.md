# EVA — Despliegue en Vercel

Guía para desplegar EVA **desde cero**: con este documento se debe poder repetir el deploy sin otra ayuda. Todo vive en cuentas de Mery: GitHub (`mmanosaslva/EVA`), Vercel, Neon, Brevo, Groq y Cloudflare.

Para la verificación posterior al deploy, ver [`DEPLOY_CHECKLIST.md`](DEPLOY_CHECKLIST.md). Para las variables de entorno, ver [`GUIA_ENV.md`](GUIA_ENV.md).

---

## 1. Arquitectura

Frontend y backend van en **un solo proyecto de Vercel**:

```
https://<proyecto>.vercel.app
├── /            → frontend (Vite, archivos estáticos de frontend/dist)
└── /api/*       → backend (FastAPI como función Python, api/index.py)
                      └── Neon (pooler, región sa-east-1)
```

| Archivo | Qué hace |
|---|---|
| `vercel.json` | Build del frontend, región `gru1`, archivos excluidos de la función, rewrites y headers |
| `api/index.py` | Monta la API de `backend/app/main.py` bajo `/api` |
| `requirements.txt` | Apunta a `backend/requirements.txt` (dependencias de la función) |
| `.python-version` | Python 3.12 para la función |

**Por qué un solo proyecto:**
- El frontend llama a `/api/...` en su mismo dominio, sin CORS entre dominios.
- **Cada preview trae su propio backend.** El preview de un PR usa las variables de entorno *Preview*, que apuntan a un branch de Neon distinto del de producción. Con dos proyectos, el frontend de un preview llamaría al backend de producción.
- Los links de los emails de un preview apuntan al mismo preview (`VERCEL_URL`).

**Qué cambió en el backend para funcionar sin servidor (DP-43):**
- No hay tareas de arranque: se quitaron el keepalive y el `create_all`. El esquema se aplica siempre a mano con SQL (RX-09).
- Rate limit en Neon (tabla `rate_limits`) en vez de en memoria.
- `NullPool` en Vercel: cada request abre su conexión contra el pooler de Neon.

En local nada cambia: el backend corre en `http://localhost:8000` sin el prefijo `/api` (ver `README.md`).

---

## 2. Antes de empezar (una sola vez)

| Servicio | Qué hacer |
|---|---|
| **Groq** | Rotar la API key si alguna vez se expuso. La nueva va solo en Vercel y en `backend/.env` |
| **Brevo** | *Senders, Domains & Dedicated IPs → Senders → Add a sender*: nombre `EVA` y un email que puedas confirmar. Después, *SMTP & API → API Keys → Generate* con el nombre `eva` |
| **Cloudflare** | Account ID y token con permiso solo de Workers AI (T3) |
| **Secretos** | Generar dos `SECRET_KEY`, una para producción y otra para previews: `python -c "import secrets; print(secrets.token_urlsafe(48))"` |

Sin dominio propio, los correos de Brevo pueden caer en spam. Es una limitación aceptada (`CRITERIOS_ISSUES.md`, L-01).

---

## 3. Neon: base de producción y base de previews

### 3.1 Producción

Es el branch default del proyecto de Neon: endpoint `ep-bold-bread-acya5dpp`, base `neondb`.

1. Haz un **snapshot**.
2. Ejecuta [`Docs/s10/sql/T25-rate-limits.sql`](s10/sql/T25-rate-limits.sql) en la consola SQL. Crea la tabla `rate_limits` y deja alembic en `010`.
3. En **Connect**, copia el connection string **pooled** (el host tiene `-pooler`). Es el `DATABASE_URL` de producción.

### 3.2 Previews (nunca la de producción)

Las previews **no deben tener datos reales de salud**:

1. *Branches → New branch* con el nombre `preview`, desde el branch de producción.
   - Si Neon ofrece crearlo **solo con el esquema** (*schema only*), elige esa opción.
   - Si no, créalo normal y vacíalo antes de usarlo; ver el SQL de abajo.
2. Ejecuta `T25-rate-limits.sql` también en ese branch, si no se copió el esquema con la tabla.
3. Copia su connection string **pooled**. Es el `DATABASE_URL` de *Preview*.

Para vaciar el branch `preview`, ejecuta esto **solo en `preview`, nunca en producción**. Confirma arriba en la consola el nombre del branch antes de ejecutarlo:

```sql
TRUNCATE public."user" CASCADE;   -- cuentas → perfiles → ciclos, registros, insights, sync (FK en cascada)
TRUNCATE public.rate_limits;
```

---

## 4. Vercel: crear el proyecto

1. *Add New → Project* → importar `mmanosaslva/EVA`.
2. **Root Directory:** déjalo en la raíz del repo, no en `frontend/`.
3. **Framework, build y output:** no los cambies; los define `vercel.json` (Vite, `cd frontend && npm run build`, `frontend/dist`).
4. Carga las variables de entorno de la sección 5 **antes** del primer deploy.
5. *Deploy*.

**Región:** `vercel.json` fija `gru1` (São Paulo), junto a Neon. Comprueba en *Settings → Functions* que la región sea `gru1`. Si el plan Hobby no lo permite, anótalo en `Docs/s10/verificaciones.md` y deja la región que Vercel asigne; T15 mide la latencia.

**Deploys automáticos:** cada push a `main` despliega producción, y cada PR recibe su URL de preview.

---

## 5. Variables de entorno en Vercel

*Settings → Environment Variables*. Cada variable se marca para **Production**, **Preview** o ambas. **Nunca se suben al repo** (RX-11).

| Variable | Production | Preview |
|---|---|---|
| `DATABASE_URL` | Pooled del branch de producción | Pooled del branch `preview` |
| `SECRET_KEY` | Una de las dos generadas | La otra (distinta) |
| `GROQ_API_KEY` | ✔ | ✔ (la misma) |
| `CLOUDFLARE_ACCOUNT_ID` | ✔ | ✔ |
| `CLOUDFLARE_API_TOKEN` | ✔ | ✔ |
| `BREVO_API_KEY` | ✔ | ✔ |
| `SMTP_FROM` | Email del remitente `EVA` | El mismo |
| `FRONTEND_URL` | `https://<proyecto>.vercel.app` | **No definir:** usa la URL del preview |
| `CORS_ORIGINS` | `https://<proyecto>.vercel.app` | No hace falta (mismo dominio) |
| `ENVIRONMENT` | `production` | `preview` |
| `VITE_API_URL` | `/api` | `/api` |
| `SENTRY_DSN`, `VITE_SENTRY_DSN` | Opcional | Opcional |

`VERCEL` y `VERCEL_URL` las define Vercel solo; no se cargan a mano.

Si cambias una variable, haz *Redeploy*: las `VITE_*` se incrustan en el build del frontend.

---

## 6. Verificar el deploy

1. En el log del build, en la parte de la función `api/index.py`, revisa el **tamaño de la función**: debe estar por debajo de 500 MB. En un entorno limpio, las dependencias miden 296 MB (`Docs/s10/evaluacion-prediccion.md`).
2. Abre `https://<proyecto>.vercel.app/api/health`; debe responder `200`.
3. Sigue [`DEPLOY_CHECKLIST.md`](DEPLOY_CHECKLIST.md) y anota el resultado y la fecha en el PR.

---

## 7. Problemas conocidos

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El build falla instalando dependencias de Python | El instalador no siguió el `-r backend/requirements.txt` de la raíz | Copiar el contenido de `backend/requirements.txt` en `requirements.txt` de la raíz, y anotarlo aquí |
| `/api/...` devuelve el `index.html` | El rewrite del frontend se aplicó antes que el de la API | Revisar que en `vercel.json` el rewrite `/api/(.*)` esté primero |
| `500` en todo `/api` con error de conexión | `DATABASE_URL` vacío o sin `-pooler` | Revisar la variable del entorno correspondiente (Production o Preview) |
| `429 Demasiadas solicitudes` | Rate limit (login 10/15 min por IP; registro, recuperación y verificación 10/h por IP; chatbot 20/h; PDF 5/h; borrado de cuenta 2/día) | Esperar el tiempo de `Retry-After` |
| Emails de un preview con links a producción | `FRONTEND_URL` definido para *Preview* | Quitar la variable de ese entorno |
| Los correos llegan a spam | Sin dominio propio (L-01) | Limitación aceptada |
