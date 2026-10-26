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
| 1 — Restauración | T3–T9 | Chatbot, privacidad, tests, CI y E2E funcionando |
| 2 — Depuración | T10–T14 | Código y docs limpios según `depuracion.md` |
| 3 — Mejora | T15–T19 | Latencia medida, offline real, cobertura y `main` al día |

Orden crítico: **T0 → T1 → T2 → T3 → T4 → T5**. Desde T6 se puede ajustar el orden respetando las dependencias.

---

## Fase 0 — Preparación

### T0 — Consolidar Prueba3 en develop
- **Estado:** HECHA (2026-10-25). PR #131, merge `df0c9c8`. Además incluyó `9617c04` (ruff en CI) y `b4bfc4d` (`requests` + tests), que dejaron el CI en verde.
- **Qué:** PR `Prueba3 → develop` en GitHub. Es fast-forward y no cambia código.
- **Depende de:** —
- **Hecho cuando:** `git rev-list --count origin/develop..origin/Prueba3` = 0.
- **Excepción a RG-06:** al abrir el PR la base tenía 10 tests rojos; se arreglaron en el mismo PR (`b4bfc4d`).
- **Rama:** — (PR directo).

### T1 — Rescatar el WIP local
- **Estado (2026-10-26):** casi vacía.
  - El WIP está respaldado en `/home/mery/projects/EVA-respaldo-2026-10-25/` y el repo local se limpió.
  - `requests` y `test_security.py` entraron en `b4bfc4d`.
  - `rate_limiter.py` ya estaba en `develop`.
  - `auth/db.py` y `conftest.py` quedaron obsoletos.
  - `useAuth.ts` y `VerifyEmailPage.tsx` (no llamar a `setState` dentro de `useEffect`) pasan a T13.
  - Queda **solo** recrear el venv con Python 3.11, que no está instalado en el sistema.
- **Qué:** pasar los 7 archivos sin commit de `feature/auth_gateway` a una rama nueva desde `develop`, y recrear el venv con Python 3.11.
- **Cierra:** DP-03, DP-17.
- **Pasos:**
  1. `git stash push -m "wip-auth-tests"` (sin `-u`: los 7 archivos ya están versionados, y así `Docs/s10/`, que no está versionado, se queda en el árbol para T2).
  2. `git switch -c fix/meriyei/s10-rescate-wip-auth origin/develop`.
  3. `git stash apply` (no `pop`, para no perder el stash).
  4. Resolver el conflicto esperado en `backend/app/auth/db.py`: develop ya cambió el engine.
  5. Recrear el venv: `python3.11 -m venv venv && pip install -r requirements.txt`.
  6. Solo cuando el commit está hecho: `git stash drop`.
- **Hecho cuando:** `git diff origin/develop --stat` muestra solo esos archivos; `requests` está en `requirements.txt`; `python --version` = 3.11.x; pytest corre (puede seguir con fallos de DP-10).
- **Commit:** `[S10] fix(auth): rescatar ajustes de tests y rate limiter sobre develop`.

### T2 — Publicar las reglas de S10
- **Qué:** commitear `Docs/s10/` (los 7 documentos) y marcar `Docs/contextoopencode.md` y `eva_contexto` como HISTÓRICO (RG-15).
- **Depende de:** T0.
- **Hecho cuando:** `Docs/s10/` está en `develop` y las cabeceras HISTÓRICO están puestas.
- **Rama:** `docs/meriyei/s10-reglas-y-plan`.
- **Commit:** `[S10] docs: reglas, restricciones y plan de restructuración S10`.

---

## Fase 1 — Restauración

### T3 — Chatbot 100 % cloud (Groq + respaldo)
- **Qué:** `restructuracion.md` §3.1.
- **Cierra:** DP-01, DP-02, DP-05.
- **Depende de:** T1.
- **Archivos:**
  - `core/config.py`: agregar `GROQ_MODEL` y `LLM_TIMEOUT_SECONDS`; quitar `OLLAMA_BASE_URL`.
  - `services/llm_service.py`: solo Groq + `SYSTEM_PROMPT` de `60da7fe`.
  - Nuevo `services/insight_service.py`: contexto, sanitización, respaldo y guardado.
  - `routers/insights.py`: llama solo al servicio.
  - `tests/test_llm_service.py` y nuevo `tests/test_insight_service.py`.
  - `.env.example` y `Docs/GUIA_ENV.md`.
  - `frontend/src/hooks/useInsights.ts` y el componente del chat (etiqueta "Respuesta automática").
- **Tests mínimos (con mocks, RX-10):**
  - Groq OK → `source=groq/<modelo>`.
  - Groq 400 `model_decommissioned` → respaldo.
  - Sin `GROQ_API_KEY` → respaldo.
  - Timeout → respaldo.
  - 429 → respaldo.
  - El prompt enviado no contiene email, UUID ni teléfono.
  - El router no devuelve 503.
- **Hecho cuando:** los tests de arriba pasan; `grep -rni ollama backend/app` = 0; `grep -rn "repositories" app/routers/insights.py app/services/llm_service.py` = 0; prueba manual en local con la key de Mery devuelve `source=groq/openai/gpt-oss-20b`.
- **Manual (Mery):** configurar `GROQ_API_KEY` y `GROQ_MODEL` en el dashboard de Render.
- **Rama:** `fix/meriyei/s10-llm-cloud`.
- **Commit:** `[S10] fix(llm): migrar chatbot a Groq configurable con respaldo por reglas`.

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

### T7 — CI y Render limpios
- **Cierra:** DP-07, DP-08 (la parte de los secretos).
- **Depende de:** T3.
- **Qué:** un solo `render.yaml` en la raíz, sin disco, con `PYTHON_VERSION=3.11` y `GROQ_MODEL`; quitar los secretos Supabase de los 3 workflows.
- **Hecho cuando:** `grep -ri "supabase\|ollama" .github render.yaml` = 0; `backend/render.yaml` no existe; el CI corre en verde en el PR.
- **Manual (Mery):** revisar en el dashboard de Render que el servicio use el `render.yaml` de la raíz, y borrar los secretos Supabase de GitHub.
- **Rama:** `chore/meriyei/s10-ci-render-cleanup`.
- **Commit:** `[S10] chore(ci): eliminar secretos Supabase y unificar render.yaml`.

### T8 — E2E: infraestructura + auth
- **Qué:** `e2e.md` §3, §6, §7 y la fila `auth` de §4.
- **Cierra:** DP-08 (E2E en CI), DP-28 (en parte), DP-34.
- **Depende de:** T7.
- **Archivos:**
  - `frontend/.env.e2e`.
  - `playwright.config.ts`.
  - `e2e/fixtures/{test,data,api}.ts`, con `api.ts` basado en `8954784:frontend/e2e/helpers/apiMocks.ts`.
  - `e2e/auth.spec.ts`.
  - Borrar `e2e/helpers/auth.ts` y `e2e/login.spec.ts`.
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
- **Cierra:** DP-19, DP-27, DP-31, DP-33, DP-35.
- **Depende de:** T7.
- **Hecho cuando:** `grep -rniE "supabase|ollama" --exclude-dir=node_modules --exclude-dir=.git .` solo encuentra `backend/migrations/versions/` y docs con cabecera HISTÓRICO; `bun.lock` eliminado; `eva_contexto` movido a `Docs/historico/`.
- **Rama:** `chore/meriyei/s10-limpieza-restos`.
- **Commit:** `[S10] chore: eliminar restos de Supabase y Ollama y archivar docs históricos`.

### T13 — UI alineada a `design.md`
- **Cierra:** DP-21, DP-22, DP-23, DP-24, DP-25, DP-26, DP-30, DP-36, DP-37.
- **Depende de:** T9 (los E2E protegen contra regresiones).
- **Hecho cuando:**
  - El checklist de `design.md` §13 se cumple en todas las páginas.
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
- **Depende de:** T11.
- **Hecho cuando:** existe `Docs/s10/mediciones.md` con: latencia de `SELECT 1`, `/health` en frío y en caliente, y los 5 endpoints principales (p50 y p95 en ms, y número de queries), con fecha y método.
- **Rama:** `perf/meriyei/s10-instrumentacion`.
- **Commit:** `[S10] perf: instrumentación temporal de queries y tiempos por request`.

### T16 — Bajar la latencia según lo medido
- **Qué:** `gather` en `export_pdf`, menos round-trips en `list_logs_by_cycle`, decisión de región y decisión sobre los modelos ML.
- **Cierra:** DP-15.
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
- **Depende de:** T0–T18.
- **Hecho cuando:** `git rev-list --count origin/main..origin/develop` = 0; RG-06 en verde sobre `main`; los objetivos O1–O7 de `restructuracion.md` §2 marcados con su evidencia.
- **Rama:** `chore/meriyei/s10-cierre`.
- **Commit:** `[S10] chore: retirar instrumentación temporal y cerrar S10`.

---

## Trazabilidad DP → tarea

| Tarea | DP que cierra |
|---|---|
| T1 | 03, 17 |
| T3 | 01, 02, 05 |
| T4 | 13, 14, 16 |
| T5 | 10, 11, 12 |
| T6 | 04 |
| T7 | 07, 08 (secretos) |
| T8 | 08 (E2E), 28 (en parte), 34 |
| T9 | 28 |
| T10 | 06 |
| T11 | 09 |
| T12 | 19, 27, 31, 33, 35 |
| T13 | 21, 22, 23, 24, 25, 26, 30, 36, 37 |
| T14 | 32 |
| T16 | 15 |
| T17 | 18, 20 |
| T18 | 29 |
