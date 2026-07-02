# Deploy Checklist — EVA

> Checklist para asegurar que el deploy a producción no tenga errores.

## 1. Variables de Entorno

### Render (Backend)
| Variable | Dónde obtenerla |
|----------|----------------|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (pooler) |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |
| `SUPABASE_JWT_SECRET` | Supabase → Project Settings → API → JWT Secret |
| `SENTRY_DSN` | Sentry → Projects → FastAPI → DSN |
| `GROQ_API_KEY` | https://console.groq.com (opcional, para fallback de LLM) |
| `ENVIRONMENT` | `production` |
| `OLLAMA_BASE_URL` | No se usa en producción (Render no tiene Ollama) |

> ⚠️ `OLLAMA_BASE_URL` quedará sin efecto en producción. El LLM usará Groq como fallback si `GROQ_API_KEY` está configurada. Si no, el chat de insights devolverá 503.

### Vercel (Frontend)
| Variable | Dónde obtenerla |
|----------|----------------|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon public |
| `VITE_API_URL` | URL del backend en Render (ej: `https://eva-api.onrender.com`) |
| `VITE_SENTRY_DSN` | Sentry → Projects → React → DSN |
| `VITE_ENVIRONMENT` | `production` |

## 2. CORS

En `backend/app/main.py`, las origins permitidas son:
```
"http://localhost:5173"
"http://localhost:3000"
```

**Antes del deploy**, Meriyei debe agregar el dominio de Vercel:
```
"https://eva-xi-nine.vercel.app"
```

## 3. Sentry — Data Scrubbing

Ya está configurado el scrubbing automático:
- Backend: filtra `authorization`, `cookie`, `email`, `user_id`, `password`, `birth_date` antes de enviar a Sentry
- Frontend: filtra `authorization` y `token`

No es necesario hacer nada extra, pero **verificar** yendo a Sentry dashboard → Issues y confirmar que no aparecen datos personales.

## 4. Dependencias faltantes

En el entorno local, instalar:
```bash
pip install fpdf2 sentry-sdk
```

Están en `requirements.txt` pero hay que correr `pip install -r requirements.txt` después de hacer pull.

## 5. Cron Job de ML (Render)

Joshua configuró `render.yaml` con el cron de reentrenamiento nocturno.
- Asegurarse de que Render tenga un **Persistent Disk** montado en `/ml_models/`
- Si no, los modelos `.pkl` se borran en cada deploy

## 6. Base de datos

Antes del deploy:
1. Ejecutar el schema completo de `DATABASE_SCHEMA.md` en Supabase SQL Editor
2. Verificar que `symptoms_catalog` tenga los 30 síntomas seed
3. Verificar RLS (Row Level Security) activo en todas las tablas

## 7. Build y tests

Siempre verificar antes de mergear a main:
```bash
# Backend
cd backend
pip install -r requirements.txt
python -m pytest -q

# Frontend
cd frontend
npm ci
npm run build
npm run test:run
npx playwright test           # E2E (opcional, requiere servidor corriendo)
```

## 8. Documentación

- `README.md` — Daniel actualiza con instrucciones de setup
- `ENDPOINTS.md` — Meriyei actualiza con endpoints finales
- `ML_STRATEGY.md` — Madeleine actualiza con MAE reales
