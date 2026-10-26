# EVA — Depuración del código (S10)

> **Qué es este documento:** el inventario de lo que se limpia o corrige en el código. Cada ítem tiene evidencia (RG-16), una acción, una forma de verificarlo y la tarea de [`fases-tareas-restructurados.md`](fases-tareas-restructurados.md) que lo cierra.
>
> **Base del diagnóstico:** `origin/Prueba3` @ `c76b2cb` (2026-08-26). Los números de línea se refieren a ese commit.
>
> **Severidad:** crítica (rompe una restricción o pierde datos) · alta (función rota o riesgo de seguridad) · media (deuda que frena) · baja (higiene).

---

## Avance (2026-10-26)

| Hecho | Evidencia |
|---|---|
| T0: `Prueba3` mergeada en `develop` | PR #131, merge `df0c9c8` |
| Ruff fijado a la versión de `requirements-dev.txt` y reglas explícitas en `backend/ruff.toml` | `9617c04` |
| Secretos de BD real quitados del paso de tests de `backend.yml` (DP-08, en parte) | `9617c04` |
| DP-03 resuelto: `requests` declarado | `b4bfc4d` |
| DP-10 resuelto: tests de auth y export actualizados | `b4bfc4d` |
| DP-11 reclasificado y resuelto: era un error del test, no del repositorio | `b4bfc4d` |
| CI de backend en verde: lint OK, pytest 203 pasan, 0 fallan | Run `40216359589` |

## Estado base medido (2026-10-25)

| Comando | Resultado |
|---|---|
| `pytest -q` | **10 fallos**, 196 pasan (resuelto: ver Avance) |
| `ruff check .` | **11 errores** (ninguno en `app/`) |
| `npx vitest run` | 8/8 (un solo archivo: `Button.test.tsx`) |
| `npx eslint .` | 0 |
| `npx tsc --noEmit` | 0 |
| `npm run build` | OK (JS 367 KB) |
| `npx playwright test` | NO VERIFICADO en local: falta `libnspr4.so` en WSL. Además, la suite está desactivada en CI |
| `import app.main` | OK, 40 rutas (con una URL Postgres ficticia) |

---

## Backend

| ID | Sev. | Hallazgo | Evidencia | Acción | Verificación | Tarea |
|---|---|---|---|---|---|---|
| DP-01 | alta | Código de Ollama (prohibido, RX-03) | `services/llm_service.py:10-11,44-59,157-163`; `core/config.py:9`; `.env.example:12`; `tests/test_llm_service.py`; `scripts/verify_ml_env.py` | Eliminar | `grep -rni ollama backend/` = 0 | T3 |
| DP-02 | alta | Modelo Groq retirado y hardcodeado: `llama3-8b-8192` (apagado 2025-08-30) | `services/llm_service.py:14` | Usar `GROQ_MODEL` por env, default `openai/gpt-oss-20b` | Test de config + prueba manual local | T3 |
| DP-03 | alta | **[RESUELTO `b4bfc4d`]** `requests` se importa pero no está en `requirements.txt` | `auth/email.py:3` | Declararlo (ya está en el WIP local) | `pip install -r requirements.txt` en un venv limpio + `import app.main` | T1 |
| DP-04 | alta | `SECRET_KEY` vale `""` por defecto, así que el JWT se firmaría con clave vacía | `core/config.py:5`, `auth/setup.py:19` | Validar al arrancar: obligatoria y ≥ 32 caracteres | Test: el arranque falla sin la variable | T6 |
| DP-05 | media | Violaciones de SRP | `routers/insights.py:11` importa `insight_repo`; `services/llm_service.py:7` importa 4 repos | Crear `services/insight_service.py` | `grep -rn "repositories" app/routers app/services/llm_service.py` = 0 | T3 |
| DP-06 | media | Logs con datos protegidos (RX-05) | `auth/email.py:26` (email); `services/ml_service.py:86` (user_id + MAE) | Loguear solo el evento y el status | grep manual + revisión del PR | T10 |
| DP-07 | alta | Dos `render.yaml` distintos; el de backend lleva vars Supabase/Ollama y un disco de pago (RX-01) | `backend/render.yaml:10-16,29-32,42-46`; `render.yaml` (raíz) | Borrar los dos: Render sale del stack (RX-03) | No existe ningún `render.yaml` | T25 |
| DP-08 | alta | **[Secretos RESUELTOS en T20; E2E pendiente en T8]** CI con secretos Supabase y E2E comentado | `frontend.yml:53-54,58-78`; `lighthouse.yml:32-33` (los de `backend.yml` ya salieron en `9617c04`) | Quitar los secretos y reactivar E2E | `grep -ri supabase .github` = 0 | T20, T8 |
| DP-09 | media | El engine de `core/db.py` no tiene `pool_pre_ping` y su rama para URLs no Postgres pasa `pool_size` a SQLite (`TypeError` al importar). *Corrección 2026-10-26: el diagnóstico decía "dos engines", pero eso venía del WIP local; en `develop`, `auth/db.py` ya reutiliza el engine de core (`auth/db.py:5`)* | `core/db.py:28,30` | Agregar `pool_pre_ping=True` y que la rama no Postgres no pase argumentos de pool | `grep -rn create_async_engine app/` = 2 líneas en `core/db.py`, ambas válidas | T11 |
| DP-10 | alta | **[RESUELTO `b4bfc4d`]** Tests obsoletos | `tests/test_security.py::TestJWTJWKSErrorHandling` (5, parchean `_get_jwks_client`, que ya no existe); `tests/test_export_service.py` (4, parchean `get_logs_by_cycle`) | Reescribirlos contra fastapi-users y la API batch | `pytest -q` sin fallos | T5 |
| DP-11 | media | **[RESUELTO `b4bfc4d`]** `test_valid_uuid_returns_logs` fallaba con `'str' object has no attribute 'hex'`. *Corrección 2026-10-26: no era un bug del repositorio; el test parcheaba `get_symptoms_by_log` en lugar de `get_symptoms_by_log_ids`, así que la consulta real corría sin mock* | `tests/test_symptom_service.py` | Parchear la función batch | Pasa el test | T5 |
| DP-12 | baja | 11 errores de ruff | `migrations/versions/006,007,008` (F401); `scripts/audit_pkl_privacy.py:15`; `scripts/verify_ml_env.py:39,41,92`; `tests/test_config.py:4`; `tests/test_llm_service.py:1`; `tests/test_metadata.py:22`; `tests/test_sync_service.py:1` | `ruff check --fix` + arreglos manuales | `ruff check .` = 0 | T5 |
| DP-13 | **crítica** | El borrado de cuenta elimina solo `"user"`; los datos (FK a `users`) quedan. La lógica y el SQL viven en el router | `routers/auth.py:14-23`; `migrations/versions/008_fix_profile_trigger.py:22-34`; `models/db_tables.py:22` | Borrado total en un servicio + FK en cascada (SQL manual, RX-09) + borrar el `.pkl` | Test SQLite: 0 filas en todas las tablas del usuario | T4 |
| DP-14 | **crítica** | El trigger reasigna `users` por email, así que un re-registro hereda datos ajenos | `008_fix_profile_trigger.py:44-48` + `onupdate="CASCADE"` (`:33`) | Quitar la rama `IF FOUND` | Test: un re-registro con el mismo email ve 0 ciclos | T4 |
| DP-15 | media | Modelos ML en disco local (`ml_models/`), que en Render free es efímero | `services/ml_service.py:8-9,15,84` | Primero evaluar si Prophet aporta. Si se queda: persistir el modelo en `ml_models` (no en disco) y reentrenar sin cron | `Docs/s10/evaluacion-prediccion.md` con la decisión | T24 |
| DP-16 | media | Duplicación de identidad: `"user"` (auth) y `users` (perfil) con el email repetido (3NF, RG-08) | `auth/db.py` (`__tablename__="user"`); `models/db_tables.py` | Documentar la justificación o unificar (ver `restructuracion.md`) | Entrada en `DATABASE_SCHEMA.md` | T4 |
| DP-17 | baja | Python local 3.14.6 vs. 3.12 (RX-12; el CI ya usa 3.12) | `backend/venv/bin/python --version` | Instalar 3.12 (`uv` o `pyenv`) y recrear el venv | `python --version` = 3.12.x | T1 |

## Frontend

| ID | Sev. | Hallazgo | Evidencia | Acción | Verificación | Tarea |
|---|---|---|---|---|---|---|
| DP-18 | **crítica** | La capa Dexie existe pero nadie la usa: el offline no funciona (RG-09) | `src/db/{database,cycleStore,syncQueue}.ts` sin imports fuera de `src/db/` | Conectar los servicios a Dexie (no borrar la capa) | `offline.spec.ts` en verde | T17 |
| DP-19 | baja | **[RESUELTO en T20]** Caché del Service Worker para `*.supabase.co`, duplicada en la config de Vitest | `vite.config.ts:63-66`; `vitest.config.ts:57` | Eliminar | `grep -rni supabase frontend/*.ts` = 0 | T20 |
| DP-20 | media | El runtime cache `eva-api` solo cubre `localhost`/`192.168.*`, es decir, solo sirve en dev | `vite.config.ts` (bloque `runtimeCaching`) | Redefinirlo junto con el offline (los datos salen de Dexie, no del cache del SW) | Revisión en T17 | T17 |
| DP-21 | media | Fuentes e íconos desde Google Fonts (tercero, RX-07) | `index.html:14-17` | Self-host con `@fontsource/plus-jakarta-sans`, `@fontsource/inter` y `material-symbols` | DevTools → Network sin dominios de Google | T13 |
| DP-22 | alta | Sentry Session Replay activo (RX-03) | `src/main.tsx:12-14` (`replayIntegration`, `replays*SampleRate`) | Quitar la integración y sus rates | grep `replay` = 0 | T13 |
| DP-23 | baja | Tokens legacy (`eva-*`, `lavender-*`, `green-*`) todavía en uso; la doc dice "0 restantes" | 13 clases en `src/**/*.tsx`; aliases en `src/index.css` (bloques "Legacy") | Migrar a tokens semánticos y borrar los aliases | grep de clases legacy = 0 | T13 |
| DP-24 | baja | 18 colores hex hardcodeados en componentes (RG-12) | `grep -rnE "#[0-9a-fA-F]{6}" src --include=*.tsx` | Reemplazarlos por tokens | grep = 0 (salvo SVG justificados) | T13 |
| DP-25 | baja | Rutas dudosas: `/config` duplica `ExportPage` y `/demo` vive dentro del shell privado | `src/App.tsx:34-35` | Eliminarlas o justificarlas | Rutas revisadas en el PR | T13 |
| DP-26 | baja | Copy mezcla voseo y tú (`Elegí`, `Intentá` ×2, `Verificá`, `Registrate`) | grep en `src/` | Pasar todo a tú (`design.md` §Voz) | grep de voseo = 0 | T13 |
| DP-27 | baja | Dos lockfiles (`bun.lock` + `package-lock.json`); el CI usa npm | `frontend/bun.lock` | Borrar `bun.lock` | Queda un solo lockfile | T12 |
| DP-28 | alta | La suite E2E simula una sesión Supabase, incompatible con el auth propio | `e2e/helpers/auth.ts:3,33` vs. `src/services/authClient.ts:138` | Reescribirla según `e2e.md` | `playwright test` en verde | T8, T9 |
| DP-29 | media | Cobertura de Vitest mínima (solo `Button`) | `find src -name "*.test.*"` = 1 | Agregar tests de servicios y hooks | ≥ 1 test por servicio | T18 |
| DP-36 | media | En tablet (768–1023 px), Síntomas y Exportar no se pueden navegar: `BottomNavBar` y `Sidebar` están ocultas y `TopAppBar` muestra solo 3 tabs | `components/layout/BottomNavBar.tsx:12` (`md:hidden`), `Sidebar.tsx:17` (`hidden lg:flex`), `TopAppBar.tsx:23` | Hacer que toda sección principal sea navegable en cada breakpoint (`design.md` §7) | Probar a 768 px | T13 |
| DP-37 | baja | 6 radios y 5 sombras distintos; `transition-all` usado 21 veces | grep `rounded-*`, `shadow*`, `transition-all` en `src/` | Reducir a la escala de `design.md` §5 y §10 | grep | T13 |
| DP-30 | baja | Contraste insuficiente: `warning-orange` (2.15:1) y `success-green` (2.54:1) sobre blanco; los fondos de fase son indistinguibles de `surface` (≈1.0:1) | Cálculo WCAG sobre `src/index.css` | Aplicar las reglas de uso de `design.md` | Revisión visual + Lighthouse a11y | T13 |

## Agregados el 2026-10-26

| ID | Sev. | Hallazgo | Evidencia | Acción | Verificación | Tarea |
|---|---|---|---|---|---|---|
| DP-38 | alta | No se exige el email verificado para iniciar sesión, así que el mensaje "Debes verificar tu correo" del frontend nunca aparece | `backend/app/main.py:109` (`get_auth_router` sin `requires_verification=True`); `frontend/src/services/authClient.ts` (manejo de `LOGIN_USER_NOT_VERIFIED`) | Agregar `requires_verification=True` | Test: login sin verificar → 400 `LOGIN_USER_NOT_VERIFIED` | T22 |
| DP-39 | baja | Manifest de la PWA duplicado y con un color viejo | `frontend/public/manifest.webmanifest` (`#af1665`) + el que genera `vite-plugin-pwa` (`vite.config.ts:22`, `#ec4899`) | Dejar solo el del plugin, con `#af1665` y un ícono `maskable` | `dist/` contiene un solo manifest; Lighthouse PWA sin avisos | T13 |
| DP-40 | alta | El cron de reentrenamiento de Render es de pago (RX-01) y corre en otra máquina sin el disco de la API, así que la API nunca ve los modelos que entrena | `render.yaml:9-14` | Eliminarlo; si T24 necesita un job, va en GitHub Actions (RX-13) | No existe el cron en Render | T24, T25 |
| DP-41 | media | **[RESUELTO en T20]** `.env` local con variables de Supabase y en una ubicación duplicada | `backend/app/.env` (2 claves `SUPABASE_*`; solo se contaron los nombres, el contenido no se leyó) | Mery borra las claves y el archivo; el válido es `backend/.env` | `backend/app/.env` no existe | T20 (manual) |
| DP-42 | **crítica** | No hay backups. Neon free solo guarda 6 h de historial y 1 snapshot | No existe ningún workflow de backup en `.github/workflows/` | Backup diario cifrado (RX-13) | Workflow en verde + restauración de prueba documentada | T23 |
| DP-43 | alta | Estado en memoria incompatible con serverless (RX-12) | Keepalive con `asyncio.create_task` en startup (`main.py:63-80`); rate limit en memoria (`core/rate_limiter.py:25`); modelos en disco (`ml_service.py:8-9`) | Quitar el keepalive, mover el rate limit a Neon, y los modelos según T24 | Revisión en el PR de T25 | T25 |
| DP-44 | alta | Sin tests de registro, verificación ni recuperación de contraseña | `ls backend/tests/` (no hay `test_auth*`) | Tests de los tres flujos con mocks de Brevo | Los tests pasan en el CI | T22 |
| DP-45 | baja | **[RESUELTO en T20]** Scripts de la migración Supabase → Neon, ya hecha, siguen en el código | `backend/scripts/clean_dump.py`, `backend/scripts/migrate_to_neon.sh` | Borrarlos o moverlos a `Docs/historico/` | `git grep -i supabase backend/scripts` = 0 | T20 |

## Documentación

| ID | Sev. | Hallazgo | Evidencia | Acción | Tarea |
|---|---|---|---|---|---|
| DP-31 | media | Docs con Supabase/Ollama/Joshua desactualizados | 18 archivos (`grep -rliE "supabase\|ollama" Docs docs README.md`); `Docs/contextoopencode.md` (2026-07-03) | Marcarlos HISTÓRICO (RG-15) o corregirlos | T12 |
| DP-32 | media | `ENDPOINTS.md` no coincide con el código | `ENDPOINTS.md:337` dice `/symptoms/catalog`, el real es `GET /symptoms` (`routers/symptoms.py:19`); `:285` dice `/daily-logs/{cycle_id}`, el real es `GET /daily-logs` (`symptoms.py:41`); `:83` menciona JWKS | Regenerarlo desde `/openapi.json` | T14 |
| DP-33 | baja | Se referencia un `DESIGN.md` que no existe | `contextoopencode.md` §1.1 → `Docs/eva_responsive_redesign/...` | Lo reemplaza `Docs/s10/design.md` | T12 |
| DP-34 | media | E2E marcado "Won't do", lo que contradice la restauración | `ISSUES.md:74,131,143`; `RESUMEN_DECISIONES_FASE2.md` §6 | Reabrir #27/#38/#52/#55 y actualizar la decisión | T8 |
| DP-35 | baja | Archivo suelto en la raíz | `eva_contexto` (178 líneas) | Moverlo a `Docs/historico/` | T12 |
