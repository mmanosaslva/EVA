# EVA
PWA de salud menstrual privacy-first · React + FastAPI + ML

## Issues para GitHub Projects
## 60 Issues · 9 Sprints · 3 Developers

**Equipo:**
- 🟣 **Daniel** → Frontend (principal) + participa en Backend y AI/ML
- 🟡 **Meriyei** → Backend (principal) + participa en AI/ML y Testing
- 🔵 **Madeleine** → AI/ML + Testing + DevOps (principal) + participa en Frontend y Backend
- 🟠 **Joshua** → ML/Data Science (principal) + participa en Testing y DevOps ML

**Labels a crear en GitHub:**
`frontend` `backend` `database` `ml` `ai` `pwa` `testing` `devops` `analytics` `auth` `setup` `docs` `security` `performance` `monitoring`

---

## 🏁 Sprint 1 — Fundación (Semana 1)
*Milestone: "Sprint 1 — Fundación"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 1 | Inicializar proyecto Vite + React + TypeScript | Daniel | `frontend` `setup` |
| 2 | Configurar Tailwind CSS + sistema de diseño base | Daniel | `frontend` `setup` |
| 3 | Configurar vite-plugin-pwa + manifest.json | Daniel | `frontend` `pwa` |
| 4 | Inicializar FastAPI + estructura de carpetas SRP | Meriyei | `backend` `setup` |
| 5 | Configurar proyecto Supabase (BD + Auth) | Meriyei | `backend` `database` `auth` |
| 6 | Endpoint GET /health + CORS configurado | Meriyei | `backend` `setup` |
| 7 | Configurar CI/CD con GitHub Actions | Madeleine | `devops` `setup` |
| 8 | Configurar Vitest para testing unitario frontend *(Daniel apoya)* | Madeleine | `testing` `setup` `frontend` |
| 61 | Setup entorno ML local (Prophet + Ollama + Mistral) | Joshua | `ml` `setup` |

---

## 📅 Sprint 2 — Rastreo de ciclos (Semana 2)
*Milestone: "Sprint 2 — Rastreo de ciclos"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 9 | Modelo de datos: tablas cycles + daily_logs (3NF) | Meriyei | `backend` `database` |
| 10 | Repositorio cycle_repo.py + queries SQLAlchemy Core | Meriyei | `backend` `database` |
| 11 | Endpoints CRUD /cycles (POST, GET, PUT, DELETE) *(Daniel prueba)* | Meriyei | `backend` |
| 12 | Componente calendario mensual | Daniel | `frontend` |
| 13 | Formulario crear/editar ciclo | Daniel | `frontend` |
| 14 | Integración Supabase Auth en frontend *(Meriyei valida JWT)* | Daniel | `frontend` `auth` |
| 15 | Tests unitarios: cycle_service.py *(Meriyei revisa edge cases)* | Madeleine | `testing` `backend` |

---

## 🩺 Sprint 3 — Síntomas (Semana 3)
*Milestone: "Sprint 3 — Síntomas"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 16 | Tablas symptoms_catalog + daily_symptoms (3NF) | Meriyei | `backend` `database` |
| 17 | Endpoints CRUD /symptoms y /daily-logs | Meriyei | `backend` |
| 18 | Formulario de registro diario de síntomas | Daniel | `frontend` |
| 19 | Vista historial de síntomas por ciclo | Daniel | `frontend` |
| 20 | Configurar pytest + fixtures de BD para testing *(Meriyei define fixtures)* | Madeleine | `testing` `backend` |
| 21 | IndexedDB: modelo de datos local para offline *(Daniel integra con React)* | Madeleine | `frontend` `pwa` |

---

## 📊 Sprint 4 — Dashboard (Semana 4)
*Milestone: "Sprint 4 — Dashboard"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 22 | Endpoints /analytics/summary y /analytics/symptoms | Meriyei | `backend` `analytics` |
| 23 | Optimización de queries analytics con índices | Meriyei | `backend` `database` `performance` |
| 24 | Dashboard principal — métricas del ciclo | Daniel | `frontend` |
| 25 | Gráfico de duración de ciclos (línea histórica) *(Madeleine define datos)* | Daniel | `frontend` `analytics` |
| 26 | Gráfico de síntomas más frecuentes | Daniel | `frontend` `analytics` |
| 27 | Tests E2E: flujo de registro de síntomas *(Daniel apoya con selectores)* | Madeleine | `testing` |

---

## 🔮 Sprint 5 — Predicción básica (Semana 5)
*Milestone: "Sprint 5 — Predicción básica"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 28 | Servicio prediction_service.py — heurística promedio *(Madeleine valida)* | Meriyei | `backend` `ml` |
| 29 | Endpoint GET /predictions/next | Meriyei | `backend` `ml` |
| 30 | Widget 'Próximo período' en el dashboard | Daniel | `frontend` |
| 31 | Educación contextual por fase del ciclo *(Madeleine define contenido médico)* | Daniel | `frontend` |
| 32 | **Integrar Ollama (LLM local gratuito) para insights** *(Meriyei define contexto)* | Madeleine | `ml` `ai` `backend` |
| 33 | Tests unitarios: prediction_service.py | Joshua | `testing` `ml` |

---

## 📶 Sprint 6 — PWA Offline (Semana 6)
*Milestone: "Sprint 6 — PWA Offline"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 34 | CRUD completo en IndexedDB (offline-first) | Daniel | `frontend` `pwa` |
| 35 | Banner de instalación PWA + prompt nativo | Daniel | `frontend` `pwa` |
| 36 | Service Worker con Workbox — estrategia de cache *(Daniel integra con router)* | Madeleine | `pwa` `frontend` |
| 37 | Sincronización offline → online (Background Sync) | Madeleine | `pwa` `frontend` |
| 38 | Tests de integración: flujos offline completos *(Daniel configura entorno)* | Madeleine | `testing` `pwa` |
| 39 | Endpoint de sincronización POST /sync | Meriyei | `backend` |

---

## 🤖 Sprint 7 — ML Real (Semana 7)
*Milestone: "Sprint 7 — ML Real"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 40 | ml_service.py — Prophet para predicción de series de tiempo *(Meriyei define features)* | Joshua | `ml` `backend` |
| 41 | Pipeline de features para el modelo ML | Joshua | `ml` |
| 42 | Cron job de reentrenamiento nocturno (AWS Lambda) *(Meriyei hace queries)* | Joshua *(Madeleine valida deploy)* | `ml` `devops` |
| 43 | **Integrar LLM con datos reales del ciclo** *(Meriyei valida privacidad)* | Madeleine | `ml` `ai` `backend` |
| 44 | Métricas de precisión: MAE del modelo ML | Joshua | `testing` `ml` |
| 45 | Tests: ml_service.py con datos sintéticos | Joshua | `testing` `ml` |
| 46 | UI: chat de insights con el asistente EVA *(Madeleine define prompts)* | Daniel | `frontend` `ai` |

---

## 📤 Sprint 8 — ML + Exportación (Semana 8–9)
*Milestone: "Sprint 8 — ML + Exportación"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 47 | Endpoint GET /predictions/next — integración con Prophet *(Joshua valida)* | Meriyei | `backend` `ml` |
| 48 | Endpoint GET /export/csv | Meriyei | `backend` |
| 49 | Endpoint GET /export/pdf — informe médico *(Daniel diseña layout)* | Meriyei | `backend` |
| 50 | UI de exportación de datos | Daniel | `frontend` |
| 51 | Actualizar UI de predicción: mostrar precisión del modelo *(Madeleine define confianza)* | Daniel | `frontend` `ml` |
| 52 | Tests E2E: flujo de exportación PDF y CSV | Madeleine | `testing` |
| 53 | Configurar Sentry para monitoreo de errores *(Daniel integra en frontend)* | Madeleine | `devops` `monitoring` |
| 62 | Script evaluate_models.py + integración CI/CD | Joshua | `ml` `testing` `devops` |

---

## 🚀 Sprint 9 — Pulido y lanzamiento (Semana 9–10)
*Milestone: "Sprint 9 — Pulido y lanzamiento"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 54 | Auditoría Lighthouse: PWA score > 90 *(Daniel corrige frontend)* | Madeleine | `testing` `pwa` |
| 55 | Tests E2E: regresión completa de la app *(Daniel y Meriyei revisan)* | Madeleine | `testing` |
| 56 | Revisión de privacidad y seguridad *(Madeleine revisa capa ML)* | Meriyei | `backend` `security` |
| 57 | Deploy producción: Vercel (frontend) | Daniel | `devops` |
| 58 | Deploy producción: AWS São Paulo (backend) *(Madeleine valida cron job)* | Meriyei | `devops` `backend` |
| 59 | Documentación final: README + guías técnicas *(Meriyei y Madeleine documentan sus secciones)* | Daniel | `docs` |
| 60 | Presentación demo y video walkthrough | Daniel + Meriyei + Madeleine | `docs` |

---

## 🛠️ Sprint 10 — Bugfix & Estabilización (Post-Lanzamiento)
*Milestone: "Sprint 10 — Bugfix & Estabilización"*

### Crítico — Bloquea funcionalidad

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 63 | `useDailyLogs` llama API con `cycleId` vacío → 500 en backend | Daniel | `frontend` `bug` |
| 64 | Backend: validar `cycle_id` UUID antes de query (evitar DataError) | Meriyei | `backend` `bug` |
| 65 | CORS no devuelve headers en respuestas de error 500 | Madeleine | `backend` `bug` `devops` |

### Alto — Afecta experiencia de usuario

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 66 | Vite WebSocket HMR falla desde dispositivos en red local | Daniel | `frontend` `bug` `pwa` |
| 67 | `POST /insights` → 503 cuando Ollama no está corriendo (mejorar mensaje) | Madeleine | `backend` `ai` `bug` |
| 68 | `apiClient.ts` muestra "Failed to fetch" genérico en vez de mensaje descriptivo | Daniel | `frontend` `bug` |
| 69 | Latencia alta (~1.5s) en queries a BD (sin cache de catálogo de síntomas) | Meriyei | `backend` `performance` |
| 70 | `GET /cycles` → 401 por JWT ES256 no soportado (solo validaba HS256) | Meriyei | `backend` `auth` `security` `bug` |
| 71 | PgBouncer + asyncpg: `DuplicatePreparedStatementError` (statement_cache_size=0 requerido) | Meriyei | `backend` `database` `bug` |
| 72 | Cache frontend de ciclos y daily-logs para evitar peticiones duplicadas | Daniel | `frontend` `performance` |

### Ollama / LLM — Setup y validación

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 76 | Documentar instalación y setup de Ollama + modelo `mistral` | Joshua | `ai` `docs` `setup` |
| 77 | Probar integración `_call_ollama()` end-to-end con Ollama corriendo | Joshua | `ai` `testing` |
| 78 | Evaluar y ajustar calidad de respuestas del LLM (SYSTEM_PROMPT) | Joshua | `ai` `ml` |
| 79 | Validar fallback automático a Groq cuando Ollama no está disponible | Joshua | `ai` `testing` |
| 80 | Agregar health check de Ollama en startup de la app | Joshua | `ai` `devops` |

### Medio — Deuda técnica

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 73 | Dependencias faltantes en `requirements.txt`: `greenlet`, `jinja2`, `cryptography` | Madeleine | `backend` `setup` |
| 74 | TypeScript: tipos `DailyLog.flow_level` y `Cycle` inconsistentes con backend | Daniel | `frontend` `bug` |
| 75 | Service Worker pattern solo matchea `localhost` — no funciona con IPs de red | Daniel | `frontend` `pwa` |

---

## 📋 Detalle técnico por issue

### #63 — `useDailyLogs` llama API con `cycleId` vacío

**Síntoma:** `GET /daily-logs?cycle_id=` → 500 Internal Server Error  
**Origen:** `SymptomsPage.tsx` pasa `cycleId` vacío cuando no encuentra ciclo para la fecha. `useDailyLogs` ejecuta el `useEffect` sin validar.  
**Fix:** Agregar `if (!cycleId) return` en `useDailyLogs.ts` antes de `load()`.  
**Archivos:** `hooks/useDailyLogs.ts:45`, `pages/SymptomsPage.tsx:43`

### #64 — Validar `cycle_id` UUID en backend

**Síntoma:** PostgreSQL lanza `DataError: invalid UUID ''` cuando recibe string vacío.  
**Origen:** `symptom_service.py:71` → `cycle_repo.get_cycle_by_id(cycle_id="", user_id)` sin validar.  
**Fix:** Agregar validación en `list_logs_by_cycle()` — si `cycle_id` es vacío o < 32 chars, retornar 400.  
**Archivos:** `services/symptom_service.py:71`, `routers/symptoms.py:46`

### #65 — CORS no responde en errores 500

**Síntoma:** El navegador bloquea respuestas de error porque no tienen header `Access-Control-Allow-Origin`.  
**Origen:** `CORSMiddleware` está después de `SecurityHeadersMiddleware` en `main.py`. En errores no manejados, la excepción sale antes de que CORS procese la respuesta.  
**Fix:** Mover `CORSMiddleware` al primer lugar en `main.py:55-63`.  
**Archivos:** `main.py:55-63`

### #66 — Vite HMR WebSocket falla en red

**Síntoma:** `WebSocket connection to 'ws://localhost:5173/' failed` desde dispositivos remotos.  
**Origen:** El script HMR de Vite intenta conectar a `localhost`, que en el dispositivo remoto es ese mismo dispositivo, no el servidor.  
**Fix:** Agregar `hmr: { clientPort: 5173 }` en `vite.config.ts` dentro de `server`.  
**Archivos:** `vite.config.ts`

### #67 — `POST /insights` → 503 sin Ollama

**Síntoma:** El endpoint devuelve 503 sin un mensaje claro al usuario.  
**Origen:** `llm_service.py` intenta Ollama → falla, intenta Groq → también falla, lanza `RuntimeError`.  
**Fix:** Mejorar mensaje de error indicando que Ollama debe estar corriendo localmente. Documentar setup en README.  
**Archivos:** `services/llm_service.py`

### #68 — `apiClient.ts` muestra "Failed to fetch" genérico

**Síntoma:** Errores de red muestran mensaje críptico del navegador en vez de algo descriptivo.  
**Origen:** `apiClient.ts` no captura `TypeError` de `fetch()` nativo.  
**Fix:** Agregar try/catch alrededor de `fetch()` con mensaje descriptivo en español. YA IMPLEMENTADO.  
**Archivos:** `services/apiClient.ts`

### #69 — Latencia alta en queries a BD

**Síntoma:** `GET /symptoms` demora ~1.3s, `GET /cycles` ~1.3s por latencia geográfica a Supabase (us-west-2).  
**Origen:** Cada request hace round-trip a PostgreSQL en AWS.  
**Fix:** Cache en memoria del catálogo de síntomas (static data). YA IMPLEMENTADO: bajó de 1.3s a 8ms.  
**Archivos:** `services/symptom_service.py:24`

### #70 — JWT ES256 no soportado

**Síntoma:** `GET /cycles` → 401 incluso con token válido de Supabase.  
**Origen:** `security.py` solo validaba `HS256`. Supabase emite tokens `ES256` (algoritmo asimétrico).  
**Fix:** Agregar fallback a validación ES256/RS256 vía JWKS (`PyJWKClient`). YA IMPLEMENTADO.  
**Archivos:** `core/security.py`

### #71 — PgBouncer + asyncpg prepared statement conflict

**Síntoma:** `DuplicatePreparedStatementError` en queries a BD vía Supabase pooler (puerto 6543).  
**Origen:** asyncpg usa prepared statements por defecto. PgBouncer en modo transaction no los soporta.  
**Fix:** `connect_args={"statement_cache_size": 0}` en `create_async_engine()`. YA IMPLEMENTADO.  
**Archivos:** `core/db.py:10`

### #72 — Cache frontend de ciclos y daily-logs

**Síntoma:** Peticiones duplicadas en cada montaje de componente (Dashboard + Calendar cargan los mismos datos).  
**Origen:** `useCycles()` y `useDailyLogs()` se llaman en múltiples componentes sin compartir estado.  
**Fix:** Cache en memoria con invalidación al crear/editar. YA IMPLEMENTADO.  
**Archivos:** `services/cycleService.ts`, `services/symptomService.ts`

### #73 — Dependencias faltantes en requirements.txt

**Síntoma:** `pip install -r requirements.txt` no instala todas las dependencias necesarias.  
**Origen:** `greenlet` (requerido por SQLAlchemy async), `jinja2` (requerido por Sentry/Starlette), `cryptography` (requerido por PyJWKClient).  
**Fix:** Agregar las 3 dependencias a `requirements.txt`. YA IMPLEMENTADO parcialmente — verificar que estén todas.  
**Archivos:** `requirements.txt`

### #74 — TypeScript types inconsistentes con backend

**Síntoma:** `DailyLog.flow_level` era `"none" | "light" | "medium" | "heavy"` pero backend retorna `string | null`.  
**Origen:** Tipos del frontend más estrictos que la respuesta real del backend.  
**Fix:** Actualizar `DailyLog.flow_level` a `string | null` y `Cycle.updated_at` agregado. YA IMPLEMENTADO.  
**Archivos:** `lib/types.ts:104-109`, `lib/types.ts:130-136`

### #75 — Service Worker cache pattern solo matchea localhost

**Síntoma:** El runtime caching del Service Worker no aplica cuando la API se accede vía IP de red.  
**Origen:** `urlPattern: /^http:\/\/localhost:\d+\/.*/i` en `vite.config.ts:68`.  
**Fix:** Extender el patrón para incluir IPs de red local. YA IMPLEMENTADO.  
**Archivos:** `vite.config.ts:68`

### #76 — Documentar instalación y setup de Ollama + modelo `mistral`

**Síntoma:** No hay documentación clara de cómo instalar Ollama para desarrollo local.  
**Origen:** El `README.md` menciona Ollama pero no da pasos detallados. `verify_ml_env.py` verifica si Ollama está corriendo pero no ayuda a instalarlo.  
**Fix:** Crear `Docs/SETUP_OLLAMA.md` con:
1. Descargar e instalar Ollama desde https://ollama.ai
2. Iniciar servidor: `ollama serve`
3. Descargar modelo mistral: `ollama pull mistral` (~4.4 GB)
4. Verificar con: `ollama run mistral "Hola, ¿cómo estás?"`
5. Troubleshooting común (puerto 11434 en firewall, espacio en disco, etc.)
**Archivos:** `Docs/SETUP_OLLAMA.md`, `README.md` (link a la guía)

### #77 — Probar integración `_call_ollama()` end-to-end

**Síntoma:** `POST /insights` → 503 porque Ollama no está corriendo. Nadie ha verificado el flujo completo.  
**Origen:** El código de `_call_ollama()` existe y es correcto, pero no se ha probado con Ollama real.  
**Fix:**
1. Iniciar Ollama con `mistral` cargado
2. Enviar `POST /insights` con pregunta de prueba: `{"question": "¿Qué síntomas son normales en la fase lútea?"}`
3. Verificar respuesta 200 con `source: "ollama/mistral"`
4. Verificar que la respuesta se guarda en BD (`llm_insights` table)
5. Documentar latencia promedio y calidad de respuesta
**Archivos:** `services/llm_service.py:44-59`, `POST /insights`

### #78 — Evaluar y ajustar calidad de respuestas del LLM

**Síntoma:** El SYSTEM_PROMPT actual puede producir respuestas genéricas o incorrectas sin ajuste fino.  
**Origen:** Prompt base no ha sido evaluado con casos reales de usuarias.  
**Fix:**
1. Preparar 10 preguntas de prueba representativas (dolor, fatiga, alimentación, ejercicio, fase, ansiedad, etc.)
2. Evaluar respuestas en: precisión médica, tono empático, longitud (máx 4 oraciones), español correcto
3. Ajustar parámetros en `llm_service.py`:
   - `temperature` (0.3-0.9) para balance creatividad/precisión
   - `num_predict` (200-500) para controlar longitud
   - `SYSTEM_PROMPT` para mejorar tono y restricciones
4. Documentar la configuración final recomendada
**Archivos:** `services/llm_service.py:16-26`, `services/llm_service.py:53`

### #79 — Validar fallback automático a Groq cuando Ollama no está

**Síntoma:** No se ha verificado que el fallback Ollama → Groq funciona correctamente.  
**Origen:** `get_insight()` intenta Ollama primero, luego Groq. Si ambos fallan, lanza RuntimeError.  
**Fix:**
1. Con Ollama corriendo: verificar que usa Ollama (source: `ollama/mistral`)
2. Detener Ollama: verificar que cae a Groq automáticamente (source: `groq/llama3-8b-8192`)
3. Sin Ollama y sin `GROQ_API_KEY`: verificar que lanza 503 con mensaje claro
4. Verificar que `_call_groq()` funciona con la API key actual (ya configurada en `.env`)
5. Documentar requisitos: tier gratuito de Groq permite ~30 req/min
**Archivos:** `services/llm_service.py:154-173`, `services/llm_service.py:62-84`

### #80 — Agregar health check de Ollama en startup

**Síntoma:** La app arranca sin verificar si Ollama está disponible. El usuario descubre el problema al preguntar en el chat.  
**Origen:** No hay verificación proactiva de conectividad con Ollama.  
**Fix:**
1. Agregar función `check_ollama_health()` en `llm_service.py` que haga un GET a `OLLAMA_BASE_URL/api/tags`
2. Llamarla en el evento `startup` de FastAPI (`main.py`)
3. Si Ollama no responde, loguear WARNING pero no bloquear el arranque
4. Actualizar `verify_ml_env.py` para que el check de Ollama sea más informativo
5. Agregar endpoint opcional `GET /health/llm` que reporte estado de Ollama y Groq
**Archivos:** `services/llm_service.py`, `main.py`, `scripts/verify_ml_env.py`

---

## 📋 Resumen Sprint 10

| Estado | Cantidad | Issues |
|--------|----------|--------|
| ✅ Implementado | 6 | #64, #68, #69, #70, #72, #75 |
| ⚠️ Pendiente validación staging | 1 | #71 (necesita prueba contra Pooler real puerto 6543) |
| 🔧 Pendiente Daniel | 2 | #63, #66 |
| 🔧 Pendiente Madeleine | 3 | #65, #67, #73 (verificar) |
| 🔧 Pendiente Joshua | 5 | #76, #77, #78, #79, #80 |

### Orden de ejecución

```
1. #63 + #64 (Daniel + Meriyei)  → Elimina el 500 que más aparece en logs
2. #65 (Madeleine)               → Permite ver errores reales sin bloqueo CORS
3. #66 (Daniel)                  → HMR funcional desde cualquier dispositivo
4. #76 (Joshua)                  → Documentar instalación de Ollama
5. #77 + #78 + #79 (Joshua)      → Validar integración LLM completa
6. #80 (Joshua)                  → Health check de Ollama en startup
7. #67 (Madeleine)               → UX de insights sin Ollama
8. #73 + #74 (Madeleine + Daniel) → Deuda técnica pendiente
```

---

## 📋 Resumen de distribución actualizado

| Developer | Issues Sprint 1-9 | Issues Sprint 10 | Total |
|-----------|:---:|:---:|:---:|
| Daniel    | 22 | 6 | 28 |
| Meriyei   | 19 | 4 | 23 |
| Madeleine | 13 | 3 | 16 |
| Joshua    | 8  | 5 | 13 |

