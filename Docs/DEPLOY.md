# EVA — Guía de Despliegue

## Frontend: Vercel

### 1. Conectar repositorio

1. Ir a [vercel.com](https://vercel.com) e iniciar sesión con GitHub
2. Clic en **Add New → Project**
3. Seleccionar el repositorio `mmanosaslva/EVA`
4. Configurar:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 2. Variables de entorno en Vercel

Ir a **Settings → Environment Variables** en el dashboard y agregar:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://nrvkuofqbzvrciyvhgbs.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (anon key pública de Supabase) |
| `VITE_API_URL` | `https://eva-api.onrender.com` (cuando Render esté listo, sino `http://localhost:8000` para dev) |
| `VITE_SENTRY_DSN` | (opcional, para monitoreo de errores) |
| `VITE_ENVIRONMENT` | `production` |

### 3. Deploy

- Primer deploy: `npx vercel --prod` desde la raíz del proyecto
- Después: automático en cada push a `main`
- Preview: automático en cada PR (URL única por PR)

### 4. Verificar

- URL de producción: `https://eva-frontend.vercel.app`
- Lighthouse PWA score esperado: > 90
- `npm run build` debe pasar sin errores antes del deploy

---

## Backend: Render

Ver `render.yaml` en la raíz del proyecto.

### Configuración manual en Render

1. Crear **Web Service** en [render.com](https://render.com)
2. Conectar repositorio de GitHub
3. Configurar:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/health`

### Variables de entorno en Render

Ver `backend/.env.example` para la lista completa. Las claves son:
- `DATABASE_URL` — conexión PostgreSQL (Supabase pooler)
- `SUPABASE_URL`, `SUPABASE_JWT_SECRET` — autenticación
- `OLLAMA_BASE_URL`, `GROQ_API_KEY` — LLM
- `ENVIRONMENT=production`

### Cron job de reentrenamiento ML

`render.yaml` ya incluye el cron job `eva-ml-retrain` que se ejecuta diario a las 03:00 UTC.

---

## Verificación post-deploy

1. **Frontend** — Navegar a `https://eva-frontend.vercel.app`, verificar login y dashboard
2. **Backend** — `GET https://eva-api.onrender.com/health` debe retornar `{"status": "ok"}`
3. **CORS** — El frontend debe poder hacer fetch a la API del backend sin errores
4. **PWA** — Instalar la app desde Chrome en Android y verificar modo offline
5. **Lighthouse** — Ejecutar auditoría en la URL de Vercel, verificar PWA score > 90
