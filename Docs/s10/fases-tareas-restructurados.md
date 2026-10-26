# EVA — Fases y tareas restructuradas (S10)

> **Qué es este documento:** el orden de ejecución de S10, con una tarea a la vez (RG-02). Cada tarea dice qué ítems de [`depuracion.md`](depuracion.md) cierra, en qué rama va, cuándo está hecha y el commit sugerido (RG-04).
>
> **Contexto y decisiones:** [`restructuracion.md`](restructuracion.md). **Límites:** [`restricciones.md`](restricciones.md). **Proceso:** [`reglas.md`](reglas.md).
>
> **Responsable de todas las tareas:** Mery (RG-01).
> **"Hecho"** = criterio de la tarea **+** todos los comandos de RG-06 en verde (salvo que la tarea diga lo contrario).
>
> Última revisión: 2026-10-25.

---

## Resumen

| Fase | Tareas | Objetivo |
|---|---|---|
| 0 — Preparación | T0–T2 | Base única, sin perder trabajo, con las reglas en el repo |
| 1 — Restauración | T3, T20, T4, T22, T23, T5, T6, T8, T9 | Chatbot, cero Supabase, privacidad, marco legal, backups, tests y E2E |
| 2 — Depuración | T10–T12, T21, T13, T14 | Código y docs limpios según `depuracion.md`, con prototipos antes de tocar la UI |
| 3 — Mejora | T24, T25, T15–T19 | Predicción evaluada, deploy 100 % Vercel, latencia medida, offline real, `main` al día |

**Orden de ejecución (2026-10-26):**

T0 ✔ → T2 ✔ → T1 ✔ → T3 ✔ → T20 ✔ → T4 → T22 → T23 → T5 → T6 → T8 → T9 → T10 → T11 → T12 → T21 → T13 → T14 → T24 → T25 → T15 → T16 → T17 → T18 → T19

- T1 ahora es solo el entorno local con Python 3.12; se puede hacer en cualquier momento antes de T3.
- T7 se fusionó en T20 (CI sin Supabase) y T25 (fuera Render).

---

## Fase 0 — Preparación

### T0 — Consolidar Prueba3 en develop
- **Estado:** HECHA (2026-10-25). PR #131, merge `df0c9c8`. Además incluyó `9617c04` (ruff en CI) y `b4bfc4d` (`requests` + tests), que dejaron el CI en verde.
- **Qué:** PR `Prueba3 → develop` en GitHub. Es fast-forward y no cambia código.
- **Depende de:** —
- **Hecho cuando:** `git rev-list --count origin/develop..origin/Prueba3` = 0.
- **Excepción a RG-06:** al abrir el PR la base tenía 10 tests rojos; se arreglaron en el mismo PR (`b4bfc4d`).
- **Rama:** — (PR directo).

### T1 — Entorno local con Python 3.12
- **Historia:** antes era "Rescatar el WIP local". Al 2026-10-26 ese trabajo ya está resuelto:
  - El WIP está respaldado en `/home/mery/projects/EVA-respaldo-2026-10-25/` y el repo local se limpió.
  - `requests` y `test_security.py` entraron en `b4bfc4d`; `rate_limiter.py` ya estaba en `develop`.
  - `auth/db.py` y `conftest.py` quedaron obsoletos.
  - `useAuth.ts` y `VerifyEmailPage.tsx` pasan a T13.
- **Qué:** instalar Python **3.12**, la versión de Vercel y del CI (RX-12; Vercel no soporta 3.11), y recrear el venv del backend.
- **Cierra:** DP-03 (hecho en `b4bfc4d`), DP-17.
- **Depende de:** —
- **Pasos (Mery):**
  1. Instalar `uv` (con el gestor de paquetes del sistema o con el instalador oficial de astral.sh).
  2. `cd backend && uv python install 3.12`.
  3. `mv venv venv-314-viejo && uv venv -p 3.12 venv`.
  4. `uv pip install -p venv -r requirements.txt -r requirements-dev.txt`.
  5. Agregar `backend/.python-version` con `3.12`, que Vercel también lee.
  6. Verificar y luego borrar `venv-314-viejo`.
- **Hecho cuando:** `venv/bin/python --version` = 3.12.x; `pytest -q` = 203 pasan sin `.env` cargado (RX-10); `ruff check backend/app/` OK.
- **Rama:** `chore/meriyei/s10-python-312` (solo para `.python-version`).
- **Commit:** `[S10] chore: fijar Python 3.12 para backend local, CI y Vercel`.

### T2 — Publicar las reglas de S10
- **Estado:** HECHA (2026-10-26). Docs en #132 y #133; cabeceras HISTÓRICO en `contextoopencode.md` y `eva_contexto`.
- **Qué:** commitear `Docs/s10/` (los 7 documentos) y marcar `Docs/contextoopencode.md` y `eva_contexto` como HISTÓRICO (RG-15).
- **Depende de:** T0.
- **Hecho cuando:** `Docs/s10/` está en `develop` y las cabeceras HISTÓRICO están puestas.
- **Rama:** `docs/meriyei/s10-reglas-y-plan`.
- **Commit:** `[S10] docs: reglas, restricciones y plan de restructuración S10`.

---

## Fase 1 — Restauración

### T3 — Chatbot 100 % cloud (Groq + Cloudflare Workers AI + respaldo)
- **Qué:** `restructuracion.md` §3.1 y RX-06. Dos proveedores con failover automático y transparente, y la respuesta por reglas como último recurso.
- **Cierra:** DP-01, DP-02, DP-05.
- **Depende de:** T1.
- **Archivos:**
  - `core/config.py`:
    - agregar `LLM_PROVIDERS` (default `groq,cloudflare`), `GROQ_MODEL`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_AI_MODEL`, `LLM_TIMEOUT_SECONDS` y `LLM_PROVIDER_COOLDOWN_SECONDS`;
    - quitar `OLLAMA_BASE_URL`.
  - `services/llm_service.py`:
    - `SYSTEM_PROMPT` de `60da7fe`;
    - un adaptador por proveedor: Groq (API compatible con OpenAI) y Cloudflare (`POST /accounts/{account_id}/ai/run/{model}`);
    - `generate(prompt) -> LlmResult | None`, que recorre los proveedores en orden y salta los que están en enfriamiento.
    - Modelos: `GROQ_MODEL=openai/gpt-oss-20b` y `CLOUDFLARE_AI_MODEL=@cf/openai/gpt-oss-20b` (el mismo en los dos; alternativa `@cf/zai-org/glm-4.7-flash`). No usar `@cf/meta/llama-3.1-8b-instruct`, que ya no está en el catálogo (`verificaciones.md` §3).
    - El enfriamiento tras un 429 de Groq usa el header `retry-after`.
  - Nuevo `services/insight_service.py`: contexto, sanitización, llamada a `generate`, respaldo por reglas y guardado. El proveedor usado se guarda en `llm_insights` y no se devuelve al frontend.
  - `routers/insights.py`: llama solo al servicio. La respuesta no lleva campo de proveedor ni de modelo; lleva `is_automatic: bool` (true solo en el respaldo por reglas).
  - `tests/test_llm_service.py` y nuevo `tests/test_insight_service.py`.
  - `.env.example` y `Docs/GUIA_ENV.md`.
  - `frontend/src/hooks/useInsights.ts` y el componente del chat: la etiqueta "Respuesta automática" se muestra solo si `is_automatic`.
- **Tests mínimos (con mocks, RX-10):**
  - Groq OK → responde Groq; no se llama a Cloudflare.
  - Groq 429 / 5xx / timeout / `model_decommissioned` / respuesta vacía → responde Cloudflare.
  - Groq en enfriamiento → se va directo a Cloudflare, sin intentar Groq.
  - Sin `GROQ_API_KEY` → Cloudflare. Sin las credenciales de Cloudflare → solo Groq.
  - Ambos fallan → respuesta por reglas con `is_automatic=true`.
  - **Mismo formato de respuesta** responda Groq o Cloudflare (mismo esquema, sin proveedor ni modelo).
  - Los dos proveedores reciben el mismo prompt, sin email, UUID ni teléfono.
  - El router nunca devuelve 503.
- **Hecho cuando:**
  - Los tests de arriba pasan.
  - `grep -rni ollama backend/app` = 0.
  - `grep -rn "repositories" app/routers/insights.py app/services/llm_service.py` = 0.
  - Prueba manual en local con las keys de Mery: con las dos keys responde Groq; con una key de Groq inválida responde Cloudflare, y el frontend se ve igual en los dos casos.
- **Manual (Mery):**
  - Crear la cuenta gratuita de Cloudflare y un API token con permiso solo de Workers AI. No activar AI Gateway con logging.
  - En Groq: activar **Zero Data Retention** (Settings → Data Controls) y revisar los límites reales en `settings/limits`.
  - Configurar las variables en el hosting actual. Al migrar (T25), pasan a Vercel.
- **Rama:** `fix/meriyei/s10-llm-cloud`.
- **Commit:** `[S10] fix(llm): chatbot con Groq y Cloudflare Workers AI con failover y respaldo por reglas`.

### T4 — Borrado total de cuenta
- **Qué:** `restructuracion.md` §3.2.
- **Cierra:** DP-13, DP-14, DP-16 (documentación).
- **Depende de:** T1.
- **Archivos:**
  - Nuevo `services/account_service.py`.
  - `routers/auth.py`: solo HTTP.
  - `services/ml_service.py`: función para borrar el `.pkl`.
  - Frontend: vaciar Dexie al borrar la cuenta y al cerrar sesión.
  - `Docs/DATABASE_SCHEMA.md`.
  - SQL comentado en el PR (RX-09):
    1. Consulta de huérfanos en `users`.
    2. FK `users.id → "user".id ON DELETE CASCADE`.
    3. `create_user_profile()` sin `IF FOUND`.
- **Tests (SQLite):** después del delete, 0 filas del usuario en `users`, `cycles`, `daily_logs`, `daily_symptoms`, `ml_models`, `llm_insights` y `sync_operations`; el `.pkl` no existe; un re-registro con el mismo email ve 0 ciclos.
- **Hecho cuando:** los tests pasan, el SQL está en el PR y **Mery lo ejecutó en Neon** (anotar la fecha en el PR).
- **Rama:** `fix/meriyei/s10-borrado-total`.
- **Commit:** `[S10] fix(privacy): borrado total de cuenta sin datos huérfanos ni reasignación`.

### T5 — Tests y lint en verde
- **Estado (2026-10-26):** DP-10 y DP-11 hechos en `b4bfc4d`. Queda DP-12 (11 errores de ruff fuera de `app/`).
- **Cierra:** DP-10, DP-11, DP-12.
- **Depende de:** T1.
- **Hecho cuando:** `pytest -q` = 0 fallos y `ruff check .` = 0.
- **Rama:** `test/meriyei/s10-tests-verdes`.
- **Commit:** `[S10] test: actualizar tests obsoletos y corregir UUID en batch de síntomas`.

### T6 — `SECRET_KEY` obligatoria
- **Cierra:** DP-04.
- **Depende de:** T5.
- **Hecho cuando:** un test confirma que el arranque falla sin `SECRET_KEY` o con menos de 32 caracteres, y `GUIA_ENV.md` está actualizado.
- **Rama:** `fix/meriyei/s10-secret-failfast`.
- **Commit:** `[S10] fix(security): exigir SECRET_KEY robusta al arrancar`.

### T7 — (fusionada)
- Se fusionó el 2026-10-26: los secretos de Supabase del CI pasan a **T20** y la limpieza de Render pasa a **T25** (Render sale del stack).

### T8 — E2E: infraestructura + auth
- **Qué:** `e2e.md` §3, §6, §7 y la fila `auth` de §4.
- **Cierra:** DP-08 (E2E en CI), DP-28 (en parte), DP-34.
- **Depende de:** T20.
- **Archivos:**
  - `frontend/.env.e2e`.
  - `playwright.config.ts`.
  - `e2e/fixtures/{test,data,api}.ts`, con `api.ts` basado en `8954784:frontend/e2e/helpers/apiMocks.ts`.
  - `e2e/auth.spec.ts`.
  - (Los specs viejos basados en Supabase ya los borró T20; los selectores se rescatan del tag `archive/e2e_fail`.)
  - Job de E2E en `frontend.yml`.
  - Reabrir #27/#38/#52/#55 en `ISSUES.md` y actualizar `RESUMEN_DECISIONES_FASE2.md` §6.
- **Hecho cuando:** `npx playwright test e2e/auth.spec.ts` está en verde en local y en CI; existe un test que demuestra que la guardia de red falla ante una petición sin mock.
- **Manual (Mery):** `sudo npx playwright install-deps chromium` en WSL.
- **Rama:** `test/meriyei/s10-e2e-base`.
- **Commit:** `[S10] test(e2e): restaurar Playwright con red mockeada y flujo de auth`.

### T9 — E2E: flujos de la app
- **Qué:** las filas `cycles`, `symptoms`, `insights`, `export` y `account` de `e2e.md` §4; `offline.spec.ts` reescrito con `test.fixme`; borrar `regression.spec.ts`; mover los tests de filtros del export a pytest.
- **Cierra:** DP-28.
- **Depende de:** T8, T3 (etiqueta de respaldo), T4 (borrado).
- **Hecho cuando:** la suite completa está en verde en CI; `--grep @smoke` corre también en el proyecto `mobile`.
- **Rama:** `test/meriyei/s10-e2e-flujos`.
- **Commit:** `[S10] test(e2e): flujos de ciclo, síntomas, chatbot, export y borrado de cuenta`.

---

## Fase 2 — Depuración

### T10 — Logs sin datos protegidos
- **Cierra:** DP-06.
- **Depende de:** T5.
- **Hecho cuando:** `grep -rnE "logger\.(info|warning|error|debug)" backend/app` revisado línea por línea, sin email, `user_id` ni métricas de salud (RX-05).
- **Rama:** `fix/meriyei/s10-logs-privacidad`.
- **Commit:** `[S10] fix(privacy): eliminar PII y métricas de salud de los logs`.

### T11 — Un solo engine de BD
- **Cierra:** DP-09.
- **Depende de:** T1, T5.
- **Hecho cuando:** el engine de `core/db.py` usa `pool_pre_ping=True`, la rama no Postgres no pasa argumentos de pool, y la conexión sigue yendo por el pooler (RX-09). (`auth/db.py` ya reutiliza este engine.)
- **Rama:** `refactor/meriyei/s10-pool-unico`.
- **Commit:** `[S10] refactor(db): unificar engine y pool de conexiones`.

### T12 — Restos y docs históricos
- **Cierra:** DP-27, DP-31, DP-33, DP-35.
- **Depende de:** T20.
- **Hecho cuando:** los docs con Supabase u Ollama llevan cabecera HISTÓRICO o están corregidos; `bun.lock` eliminado; `eva_contexto` movido a `Docs/historico/`.
- **Rama:** `chore/meriyei/s10-limpieza-restos`.
- **Commit:** `[S10] chore: archivar docs históricos y eliminar restos de Ollama`.

### T13 — UI alineada a `design.md`
- **Cierra:** DP-21, DP-22, DP-23, DP-24, DP-25, DP-26, DP-30, DP-36, DP-37, DP-39.
- **Depende de:** T9 (los E2E protegen contra regresiones) y T21 (prototipos aprobados).
- **Hecho cuando:**
  - El checklist de `design.md` §15 se cumple en todas las páginas.
  - DevTools → Network no muestra dominios de terceros.
  - grep de hex, clases legacy, voseo y `replay` = 0.
  - Toda sección se puede navegar a 768 px.
  - E2E en verde.
- **Nota:** es una tarea grande; si conviene, partirla en T13a (terceros: fuentes y Sentry Replay), T13b (tokens) y T13c (copy y navegación), cada una con su PR.
- **Rama:** `refactor/meriyei/s10-ui-design-system`.
- **Commit:** `[S10] refactor(ui): aplicar guía de diseño, self-host de fuentes y quitar Sentry Replay`.

### T14 — `ENDPOINTS.md` fiel al código
- **Cierra:** DP-32.
- **Depende de:** T3, T4.
- **Hecho cuando:** cada ruta de `/openapi.json` aparece en `ENDPOINTS.md` y viceversa.
- **Rama:** `docs/meriyei/s10-endpoints`.
- **Commit:** `[S10] docs: regenerar ENDPOINTS.md desde OpenAPI`.

---

## Fase 3 — Mejora

### T15 — Instrumentación temporal y medición
- **Qué:** `restructuracion.md` §3.5. Va detrás de `EVA_PERF_INSTRUMENTATION=1` y se marca `# TEMP-INSTRUMENTATION` (RG-14).
- **Depende de:** T11, T25 (se mide sobre Vercel, que es donde quedará el backend).
- **Hecho cuando:** existe `Docs/s10/mediciones.md` con: latencia de `SELECT 1` (función en `gru1` → Neon), cold start de la función, y los 5 endpoints principales (p50 y p95 en ms, y número de queries), con fecha y método.
- **Rama:** `perf/meriyei/s10-instrumentacion`.
- **Commit:** `[S10] perf: instrumentación temporal de queries y tiempos por request`.

### T16 — Bajar la latencia según lo medido
- **Qué:** `gather` en `export_pdf`, menos round-trips en `list_logs_by_cycle`, y ajustar la región de las funciones de Vercel si la medición lo indica (T25 ya las pone junto a Neon).
- **Depende de:** T15.
- **Hecho cuando:** `mediciones.md` muestra antes y después con el mismo método, y las decisiones están anotadas en `restructuracion.md` §5.
- **Rama:** `perf/meriyei/s10-latencia`.
- **Commit:** `[S10] perf: paralelizar queries de export y reducir round-trips`.

### T17 — Offline real con Dexie
- **Qué:** `restructuracion.md` §3.3.
- **Cierra:** DP-18, DP-20.
- **Depende de:** T9.
- **Hecho cuando:** `offline.spec.ts` sin `fixme` y en verde (registrar sin red y sincronizar al reconectar); IndexedDB se vacía al cerrar sesión.
- **Rama:** `feat/meriyei/s10-offline-dexie`.
- **Commit:** `[S10] feat(offline): servicios con Dexie como fuente de verdad y cola de sincronización`.

### T18 — Cobertura de Vitest
- **Cierra:** DP-29.
- **Depende de:** T17.
- **Hecho cuando:** hay al menos un archivo de test por cada servicio de `src/services/` y por cada hook de `src/hooks/` con lógica.
- **Rama:** `test/meriyei/s10-vitest-servicios`.
- **Commit:** `[S10] test(frontend): tests unitarios de servicios y hooks`.

### T19 — Cierre de S10
- **Qué:**
  1. Quitar la instrumentación temporal (`grep -rn "TEMP-INSTRUMENTATION"` = 0).
  2. PR `develop → main` (requiere permiso explícito de Mery).
  3. Archivar las ramas viejas (`restructuracion.md` §3.6).
- **Depende de:** todas las anteriores (T0–T18 y T20–T25).
- **Hecho cuando:** `git rev-list --count origin/main..origin/develop` = 0; RG-06 en verde sobre `main`; los objetivos O1–O7 de `restructuracion.md` §2 marcados con su evidencia.
- **Rama:** `chore/meriyei/s10-cierre`.
- **Commit:** `[S10] chore: retirar instrumentación temporal y cerrar S10`.

## Tareas agregadas el 2026-10-26

### T20 — Supabase cero
- **Estado:** código HECHO (2026-10-26). `backend/app/.env` borrado el mismo día. Falta la parte manual de Mery: secrets `SUPABASE_*` en GitHub y variables en el hosting.
- **Qué:** que **nada** apunte a Supabase (RX-03). Lo que se elimina:
  - Secretos `SUPABASE_*` / `VITE_SUPABASE_*` de `frontend.yml:53-54,68-69` y `lighthouse.yml:32-33`.
  - Variables `SUPABASE_*` de `backend/render.yaml` (el archivo entero sale en T25).
  - Caché `*.supabase.co` de `vite.config.ts:63-66` y `vitest.config.ts:57`.
  - La suite E2E vieja (`frontend/e2e/helpers/auth.ts` y los specs que usan `mockSupabaseAuth`); queda guardada en el tag `archive/e2e_fail`.
  - Los scripts de la migración ya hecha: `backend/scripts/clean_dump.py` y `migrate_to_neon.sh`. Si se quieren conservar, se mueven a `Docs/historico/`.
- **Cierra:** DP-08 (secretos), DP-19, DP-41, DP-45.
- **Depende de:** T3.
- **Manual (Mery):**
  - Borrar las 2 variables `SUPABASE_*` de `backend/app/.env` y eliminar ese archivo (el válido es `backend/.env`).
  - Borrar los secrets `SUPABASE_*` en GitHub → Settings → Secrets.
  - Revisar en el hosting que no quede ninguna variable `SUPABASE_*`.
  - Si el proyecto de Supabase sigue existiendo, exportarlo por si acaso y eliminarlo.
- **Hecho cuando:** `git grep -nIi supabase -- . ':!Docs' ':!docs' ':!backend/migrations/versions'` = 0; el CI está en verde.
- **Rama:** `chore/meriyei/s10-supabase-cero`.
- **Commit:** `[S10] chore: eliminar toda referencia activa a Supabase`.

### T21 — Prototipar pantallas
- **Qué:** prototipos navegables de las pantallas clave, basados en `design.md`, **antes** de tocar la UI en T13:
  1. Dashboard.
  2. Registro diario de síntomas.
  3. Calendario (móvil y desktop).
  4. Chat, incluida la variante "Respuesta automática".
  5. Privacidad y exportación, con la zona de borrado.
  6. Registro con consentimiento legal (T22).
  7. Estado offline.
- **Depende de:** T2 (`design.md` en el repo), T22 (textos legales).
- **Hecho cuando:** Mery aprueba cada pantalla, el enlace a los prototipos queda en `design.md` §14, y los ajustes que salgan se reflejan en `design.md`.
- **Rama:** `docs/meriyei/s10-prototipos` (solo si se agregan capturas o el enlace al repo).
- **Commit:** `[S10] docs(design): enlazar prototipos aprobados`.

### T22 — Módulo legal (Colombia)
- **Qué:** RX-14.
  - Páginas `/legal/privacidad` (política de tratamiento) y `/legal/terminos`, con versión y fecha, enlazadas desde el registro, el login y el perfil.
  - Registro con dos checkboxes sin marcar: términos, y autorización expresa de datos sensibles y transferencia internacional. Más la declaración de mayoría de edad.
  - Tabla `consents` (`user_id`, `document`, `version`, `accepted_at`), con SQL comentado en el PR (RX-09).
  - El backend rechaza datos de salud si no hay consentimiento vigente.
  - Usuarias que ya existen: en el próximo login se les pide la autorización antes de mostrar o aceptar datos de salud.
  - Exigir el email verificado para iniciar sesión (`requires_verification=True`, DP-38).
  - Tests de backend de registro, verificación y recuperación de contraseña (DP-44).
  - Copy según `design.md` §2.
- **Cierra:** DP-38, DP-44.
- **Depende de:** T4 (el borrado total es el derecho de supresión).
- **Hecho cuando:**
  - No se puede crear una cuenta sin las dos autorizaciones.
  - `consents` registra la versión.
  - Login con email sin verificar → 400 `LOGIN_USER_NOT_VERIFIED`.
  - Los tests de los tres flujos pasan.
  - El docente o asesor revisó los textos (anotar la fecha en el PR).
- **Manual (Mery):** ejecutar el SQL de `consents` con un snapshot previo.
- **Rama:** `feat/meriyei/s10-modulo-legal`.
- **Commit:** `[S10] feat(legal): política de tratamiento, consentimiento expreso y verificación obligatoria`.

### T23 — Backups diarios cifrados
- **Qué:** RX-13.
  - Workflow `.github/workflows/backup.yml` con `schedule` diario y `workflow_dispatch`.
  - Pasos: `pg_dump` con un rol de solo lectura → `age -r <clave pública>` → `rclone` a Google Drive.
  - Rotación: 7 diarios + 4 semanales.
  - Sin artifacts, y sin `set -x` ni echo de variables.
- **Depende de:** T4 (que el esquema de borrado ya esté corregido).
- **Manual (Mery):**
  1. Generar las claves `age` y guardar la privada fuera de la nube.
  2. Crear el rol de solo lectura en Neon (SQL manual).
  3. Configurar `rclone` con Google Drive.
  4. Cargar los secrets en GitHub: `BACKUP_DATABASE_URL`, `AGE_PUBLIC_KEY`, `RCLONE_CONFIG`.
- **Hecho cuando:**
  - El workflow corre en verde dos días seguidos.
  - En Drive solo hay archivos `.age`.
  - Una restauración de prueba en un branch descartable de Neon funciona, y queda anotada en `Docs/s10/backups.md` con fecha y pasos.
- **Rama:** `chore/meriyei/s10-backups`.
- **Commit:** `[S10] chore(ops): backup diario de Neon cifrado con age a Google Drive`.

### T24 — Evaluar el modelo de predicción
- **Qué:** decidir con datos si Prophet aporta, o si conviene una alternativa más liviana (`restructuracion.md` §3.8).
  - Comparar con **datos sintéticos** (RX-10, `scripts/seed_test_data.py`), con validación *walk-forward* (predecir cada ciclo usando solo los anteriores).
  - **Métricas:** MAE en días, % de predicciones dentro de ±2 días, tiempo de cálculo y memoria.
  - **Candidatos:**
    1. Heurística actual (promedio).
    2. Mediana.
    3. Promedio móvil ponderado (más peso a los ciclos recientes).
    4. Suavizado exponencial simple.
    5. Prophet.
  - **Escenarios:** usuaria regular, irregular, con pocos ciclos (1–3) y con un ciclo atípico.
- **Regla de decisión:**
  - Si Prophet no supera al mejor método simple por **al menos 0,5 días de MAE** en el escenario irregular, se elimina, junto con `prophet`, `cmdstanpy`, `matplotlib`, `scipy`, `scikit-learn` y el cron, si nada más los usa. Hoy el stack de ML mide ~410 MB de los 500 MB que admite una función de Vercel (`verificaciones.md` §1): sin él, el backend cabe con holgura.
  - Si lo supera, se define cómo persistir el modelo sin disco (columna en `ml_models`, SQL manual), cómo reentrenar sin cron (al registrar un ciclo nuevo), y se poda todo lo que Prophet no necesite para quedar por debajo de 500 MB, verificándolo en el build de Vercel.
- **Cierra:** DP-15, DP-40 (la parte del cron).
- **Depende de:** T5.
- **Hecho cuando:** `Docs/s10/evaluacion-prediccion.md` tiene la tabla de resultados, la decisión y el código de evaluación reproducible en `backend/scripts/`; el método elegido queda implementado y con tests.
- **Rama:** `feat/meriyei/s10-evaluacion-prediccion`.
- **Commit:** `[S10] feat(ml): evaluar métodos de predicción y adoptar el de menor error`.

### T25 — Migrar el deploy a Vercel (fuera Render)
- **Qué:** el backend FastAPI pasa a una función Python de Vercel; Render se elimina (RX-02, RX-03).
  - **Estado entre requests (DP-43):**
    - Quitar el keepalive de startup (`main.py:63-80`): en serverless no hay tareas en segundo plano.
    - Reemplazar el rate limit en memoria de slowapi (`core/rate_limiter.py:25`) por un contador en Neon, como mínimo para `/insights` y `/auth/*`.
    - La caché del catálogo de síntomas (`symptom_service.py:27`) puede quedarse: solo dura lo que la instancia caliente.
  - **Conexiones:** pool mínimo o `NullPool` contra el pooler de Neon (RX-09).
  - **Región de las funciones:** `gru1` (São Paulo) con `regions` en `vercel.json`. Hobby permite una región; si el dashboard no deja elegir `gru1`, se documenta y se mide la alternativa.
  - **Python:** fijar 3.12 con `.python-version`.
  - **Tamaño del bundle:** el límite es de 500 MB sin comprimir y el stack de ML mide ~410 MB (`verificaciones.md` §1). Depende de T24.
  - **Cron de reentrenamiento:** sale; si T24 necesita un job, va en GitHub Actions (RX-13).
  - **Mismo origen:** el frontend reescribe `/api/*` hacia el backend, así se elimina el CORS entre dominios. Se decide al implementar: un proyecto o dos.
  - **Limpieza:** borrar `render.yaml` y `backend/render.yaml`; actualizar `DEPLOY.md`, `DEPLOY_CHECKLIST.md`, `GUIA_ENV.md`.
- **Cierra:** DP-07, DP-40, DP-43.
- **Depende de:** T24.
- **Manual (Mery):**
  - Crear o ajustar los proyectos en Vercel y cargar las variables de entorno.
  - Actualizar `FRONTEND_URL` y las URLs de los emails de Brevo.
  - Apagar y borrar los servicios de Render cuando Vercel esté verificado.
- **Hecho cuando:**
  - Login, registro, chatbot, export y borrado de cuenta funcionan en la URL de Vercel (prueba manual de Mery, anotada en el PR).
  - `git grep -nIi render -- . ':!Docs' ':!docs'` no encuentra configuración de Render.
  - Los servicios de Render están eliminados.
- **Rama:** `feat/meriyei/s10-deploy-vercel`.
- **Commit:** `[S10] feat(deploy): migrar backend a Vercel y retirar Render`.

---

## Trazabilidad DP → tarea

| Tarea | DP que cierra |
|---|---|
| T1 | 03 (hecho), 17 |
| T3 | 01, 02, 05 |
| T4 | 13, 14, 16 |
| T5 | 10 (hecho), 11 (hecho), 12 |
| T6 | 04 |
| T8 | 08 (E2E), 28 (en parte), 34 |
| T9 | 28 |
| T10 | 06 |
| T11 | 09 |
| T12 | 27, 31, 33, 35 |
| T13 | 21, 22, 23, 24, 25, 26, 30, 36, 37, 39 |
| T14 | 32 |
| T17 | 18, 20 |
| T18 | 29 |
| T20 | 08 (secretos), 19, 41, 45 |
| T22 | 38, 44 |
| T23 | 42 |
| T24 | 15, 40 (cron) |
| T25 | 07, 40, 43 |
