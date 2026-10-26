# EVA — Restricciones (S10)

> **Qué es este documento:** los límites duros del proyecto. Definen lo que **no se puede hacer** o las condiciones fijas del entorno. No describen cómo trabajar (eso está en [`reglas.md`](reglas.md)).
>
> **Precedencia:** `restricciones.md` > `reglas.md` > `design.md` / `e2e.md` > resto de `Docs/`. Si una regla, guía o doc histórico contradice este archivo, gana este archivo.
>
> **Cambios:** solo Mery puede modificar este documento. Una restricción no se "excepciona" en una tarea: se cambia aquí primero, con fecha y motivo.
>
> Última revisión: 2026-10-26.
> - Deploy 100 % en Vercel (sale Render).
> - Chatbot con dos proveedores con failover.
> - Jobs programados solo en GitHub Actions.
> - Backups cifrados.
> - Marco legal colombiano.

---

## RX-01 — Costo cero

- Todo el stack corre en planes gratuitos.
- Cualquier proveedor, plan o feature de pago se rechaza y se documenta en `Docs/CRITERIOS_ISSUES.md` como **limitación aceptada**.
- Ejemplos ya rechazados:
  - Los *persistent disks* de Render (`backend/render.yaml:29-32`).
  - Los *cron jobs* de Render, que cobran un mínimo de $1/mes por servicio (`render.yaml:9-14`).
  - Ambos desaparecen con la migración a Vercel (T25).

## RX-02 — Stack fijo

| Capa | Tecnología permitida |
|---|---|
| Frontend | React 18 + TypeScript strict + Vite + Tailwind + Zustand |
| PWA / offline | vite-plugin-pwa + Workbox + IndexedDB (Dexie) |
| Backend | FastAPI + Python 3.12 + SQLAlchemy Core + Pydantic |
| **Deploy (frontend y backend)** | **Vercel** (plan Hobby). El backend corre como función Python serverless |
| Base de datos | PostgreSQL en Neon |
| Auth | Módulo propio con JWT (fastapi-users) |
| Predicción | Heurística propia. Prophet u otro modelo solo si la evaluación de T24 demuestra que mejora (ver `restructuracion.md` §3.8) |
| LLM | **Groq** (principal) + **Cloudflare Workers AI** (secundario), ambos en plan gratuito |
| Email | Brevo API |
| Errores | Sentry (solo captura de errores) |
| Jobs programados | **GitHub Actions** (`schedule`) |
| Backups | `pg_dump` cifrado con `age` → Google Drive de Mery |
| Testing | pytest, Vitest, Playwright |

Agregar o reemplazar una tecnología exige actualizar esta tabla antes de escribir código.

## RX-03 — Tecnologías prohibidas

| Prohibido | Motivo |
|---|---|
| Supabase (DB, Auth, SDK, Storage, variables, secretos, URLs) | Eliminado del stack: el auth es propio y la BD está en Neon. **No puede quedar ninguna referencia activa** en código, config, CI, env ni Service Worker (tarea T20) |
| Render (web services, cron jobs, disks) | Reemplazado por Vercel; sus extras son de pago |
| Ollama y cualquier LLM local o self-hosted | El chatbot debe funcionar en producción sin infraestructura de la usuaria |
| Gemini en free tier | Sus términos gratuitos permiten usar los datos para mejorar el producto (RX-04) |
| Cualquier otro proveedor de LLM no listado en RX-02 | Cada proveedor nuevo exige revisar sus términos de datos antes de agregarlo aquí |
| Analytics de terceros (Google Analytics, PostHog, Mixpanel, Hotjar…) | Privacy-first |
| Sentry Session Replay | Graba la pantalla, que muestra datos de salud |
| Migrar el backend a otro lenguaje (p. ej. Go) | Hipótesis sin evidencia; solo se reabre con mediciones |

Las migraciones de alembic históricas (`004`, `007`) pueden *mencionar* Supabase en comentarios: son el registro de cómo se salió de ahí, y borrarlas rompe la cadena de migraciones.

Playwright **no** está prohibido: se restaura en S10 (ver `e2e.md`).

## RX-04 — Definición de datos protegidos

- **Datos de salud:** ciclos, fechas de inicio/fin, nivel de flujo, síntomas, intensidades, temperatura, notas, preguntas al chatbot, respuestas del chatbot, predicciones, métricas de modelos por usuaria (p. ej. MAE).
- **PII:** email, nombre, `user_id`, IP, tokens.

Toda restricción que diga "datos protegidos" se refiere a la unión de ambas listas. En el marco legal colombiano, los datos de salud son **datos sensibles** (RX-14).

## RX-05 — Logs y observabilidad

- Ningún log, traza, evento de Sentry o mensaje de error expuesto contiene datos protegidos (RX-04).
- Permitido: ruta como plantilla (`/daily-logs/{id}`), método, status HTTP, duración, número de queries, clase de error, nombre del proveedor de LLM.
- Sentry se inicializa con `send_default_pii=False` y con un `before_send` que limpie el evento (backend y frontend).

## RX-06 — LLM

- Las llamadas al LLM salen **solo del backend**, nunca del navegador.
- **Contenido:**
  - El LLM recibe únicamente estadísticas agregadas del ciclo (fase, día de ciclo, duración promedio, síntomas frecuentes, intensidad promedio, días hasta el próximo periodo) y la pregunta de la usuaria **saneada** (sin emails, teléfonos ni UUID).
  - Nunca recibe email, nombre, `user_id`, fechas exactas, notas libres ni historial crudo.
  - Los dos proveedores reciben exactamente el mismo prompt.
- **Failover, transparente y solo en el backend:**
  1. Orden: Groq → Cloudflare Workers AI → respuesta por reglas, sin LLM.
  2. Se pasa al siguiente proveedor ante timeout, error 5xx, 429 (cuota agotada), modelo retirado o respuesta vacía.
  3. Un proveedor que devolvió 429 o 5xx se salta durante un enfriamiento configurable.
  4. El frontend **no se entera** del cambio: la respuesta tiene el mismo formato y **no incluye el nombre del proveedor ni del modelo**. El proveedor usado solo queda registrado en el backend (tabla `llm_insights`, logs según RX-05).
  5. La única diferencia visible es la respuesta por reglas, que se marca como "Respuesta automática" (`design.md` §2), porque no es una respuesta de IA y la usuaria tiene derecho a saberlo.
- **Configuración por variables de entorno, sin hardcodear:**
  - Modelos: `GROQ_MODEL`, `CLOUDFLARE_AI_MODEL`.
  - Orden de proveedores: `LLM_PROVIDERS=groq,cloudflare`.
  - Credenciales: `GROQ_API_KEY`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`.
- La usuaria nunca recibe un 503 por falta de LLM.

## RX-07 — Recursos de terceros en el navegador

- En runtime, el navegador solo habla con la API propia de EVA y con Sentry (errores).
- Fuentes e íconos se sirven desde el propio dominio (self-hosted). Hoy se cargan desde Google Fonts (`frontend/index.html:14-17`): es deuda registrada en `depuracion.md` DP-21.

## RX-08 — Derechos de la usuaria

- **Exportación:** CSV y PDF con todos sus datos de salud.
- **Borrado total:** eliminar la cuenta borra de forma irreversible:
  - todos sus datos en todas las tablas;
  - los artefactos derivados (modelos);
  - los datos locales del dispositivo (IndexedDB).
- Ningún dato puede quedar huérfano ni volver a asociarse a otra cuenta (p. ej. por coincidencia de email).
- Los backups (RX-13) caducan por rotación: un dato borrado desaparece de todos los backups cuando vence la retención. Esto se informa en la política de privacidad.
- **Sin cuenta, sin datos:** no se guardan datos de salud de personas no registradas.

## RX-09 — Base de datos

- Conexión siempre por el endpoint **pooler** de Neon, nunca por conexión directa. Esto es obligatorio en serverless (Vercel).
- Los cambios de esquema **nunca** se aplican automáticamente (ni en deploy, ni en startup, ni por un agente IA).
- Todo cambio de esquema se entrega como SQL comentado en el PR. **Antes de ejecutarlo, Mery toma un snapshot manual en Neon**, y lo ejecuta a mano.

## RX-10 — Entornos de prueba

- Ningún test automatizado (pytest, Vitest, Playwright, CI) se conecta a Neon ni a servicios reales (Groq, Cloudflare, Brevo, Sentry, Google Drive).
- pytest usa SQLite in-memory o mocks; Vitest usa mocks; Playwright mockea el 100 % de la red hacia la API.
- La verificación contra Groq y Cloudflare reales la hace Mery a mano, en local, con sus propias keys; no es parte de ninguna suite.
- La evaluación de modelos de predicción (T24) usa datos sintéticos, nunca datos de usuarias reales.

## RX-11 — Secretos

- Nunca se commitean, imprimen, loguean ni se pegan en prompts o docs (`.env`, API keys, `SECRET_KEY`, `DATABASE_URL`, tokens de Cloudflare y de Google Drive, clave privada de `age`).
- `.env.example` solo lleva nombres y valores de ejemplo.
- El backend no arranca si falta `SECRET_KEY` o es débil (hoy el default es `""`, `backend/app/core/config.py:5`; ver DP-04).
- Los secretos de producción viven solo en Vercel (variables de entorno del proyecto) y en GitHub (secrets del repo, solo para backups).

## RX-12 — Runtime

- Python **3.12** en Vercel, en el CI (`backend.yml` ya usa 3.12) y en el venv local (hoy el venv local es 3.14.6; ver DP-17). NO VERIFICADO: la lista de versiones que acepta el runtime Python de Vercel; se confirma en T25.
- Node 22 LTS para el frontend.
- **Serverless:** el backend no guarda estado entre requests: nada de caché en memoria que deba persistir, tareas en segundo plano (`asyncio.create_task` en startup), archivos en disco ni rate limit en memoria (ver DP-43).

## RX-13 — Jobs programados y backups

- **Único scheduler permitido: GitHub Actions** (`on: schedule`). El repo es público, así que los minutos son gratis.
- Un job programado **nunca** deja datos protegidos en logs, en artifacts, en caché de Actions ni en el repo. En un repo público, cualquiera con cuenta de GitHub puede descargar los artifacts.
- **Backups:**
  - Frecuencia: diario, por workflow de GitHub Actions.
  - Contenido: `pg_dump` de Neon hecho con un **rol de solo lectura**.
  - El dump se **cifra con `age` dentro del runner**, antes de salir. Se usa la clave pública, guardada en un secret.
  - La clave privada la tiene **solo Mery**, fuera de GitHub y de la nube.
  - Destino: Google Drive de Mery, vía `rclone`.
  - Retención: 7 diarios + 4 semanales. Lo más viejo se borra automáticamente.
- Antes de cada SQL manual: snapshot manual en Neon (RX-09). El plan free de Neon incluye 1 snapshot y 6 horas de historial.
- Restauración de prueba: una vez al mes, en un branch de Neon descartable.

## RX-14 — Marco legal (Colombia)

> Esto no es asesoría legal. Antes de abrir EVA a usuarias reales, lo valida el docente o un asesor.

- **Normas aplicables:** Ley 1581 de 2012 (protección de datos personales) y su reglamentación (Decreto 1377 de 2013, compilado en el Decreto 1074 de 2015).
- **Datos sensibles:** los datos de salud (RX-04) solo se tratan con **autorización previa, expresa e informada**.
  - Se informa que entregarlos es facultativo y para qué se usan.
  - La autorización se pide en un checkbox **sin marcar por defecto**, separado de la aceptación de términos.
- **Prueba de la autorización:** se guarda la versión del documento aceptado y la fecha (tabla `consents`). Sin autorización registrada, no se aceptan datos de salud.
- **Política de tratamiento** publicada y accesible desde el registro y desde el perfil:
  - responsable;
  - finalidades;
  - derechos de la titular (conocer, actualizar, rectificar, suprimir, revocar la autorización);
  - canal de contacto y plazos de respuesta.
- **Transferencia internacional:** los datos se alojan fuera de Colombia (Neon y Vercel), y la autorización lo dice expresamente.
- **Edad mínima: 18 años**, verificada con una declaración en el registro. Un flujo para menores con autorización de su representante legal queda fuera de S10.
- **Revocación:** revocar la autorización equivale a pedir el borrado total (RX-08), con export previo opcional.
