# EVA — Restricciones (S10)

> **Qué es este documento:** los límites duros del proyecto. Definen lo que **no se puede hacer** o las condiciones fijas del entorno. No describen cómo trabajar (eso está en [`reglas.md`](reglas.md)).
>
> **Precedencia:** `restricciones.md` > `reglas.md` > `design.md` / `e2e.md` > resto de `Docs/`. Si una regla, guía o doc histórico contradice este archivo, gana este archivo.
>
> **Cambios:** solo Mery puede modificar este documento. Una restricción no se "excepciona" en una tarea: se cambia aquí primero, con fecha y motivo.
>
> Última revisión: 2026-10-25.

---

## RX-01 — Costo cero

- Todo el stack corre en planes gratuitos.
- Cualquier proveedor, plan o feature de pago se rechaza y se documenta en `Docs/CRITERIOS_ISSUES.md` como **limitación aceptada**.
- Ejemplo vigente: los *persistent disks* de Render son de pago, por lo que no se usan (hoy `backend/render.yaml:29-32` declara uno; ver `depuracion.md` DP-07).

## RX-02 — Stack fijo

| Capa | Tecnología permitida |
|---|---|
| Frontend | React 18 + TypeScript strict + Vite + Tailwind + Zustand |
| PWA / offline | vite-plugin-pwa + Workbox + IndexedDB (Dexie) |
| Deploy frontend | Vercel |
| Backend | FastAPI + Python 3.11 + SQLAlchemy Core + Pydantic |
| Deploy backend | Render (plan free) |
| Base de datos | PostgreSQL en Neon |
| Auth | Módulo propio con JWT (fastapi-users) |
| ML | Prophet + joblib |
| LLM | Groq API (cloud, free tier) |
| Email | Brevo API |
| Errores | Sentry (solo captura de errores) |
| Testing | pytest, Vitest, Playwright |

Agregar o reemplazar una tecnología exige actualizar esta tabla antes de escribir código.

## RX-03 — Tecnologías prohibidas

| Prohibido | Motivo |
|---|---|
| Supabase (DB, Auth, SDK, Storage) | Eliminado del stack |
| Ollama y cualquier LLM local o self-hosted | El chatbot debe funcionar en producción sin infraestructura del usuario |
| Gemini en free tier | Sus términos gratuitos permiten usar los datos para mejorar el producto; incompatible con RX-04 |
| Analytics de terceros (Google Analytics, PostHog, Mixpanel, Hotjar…) | Privacy-first |
| Sentry Session Replay | Graba la pantalla, que muestra datos de salud |
| Migrar el backend a otro lenguaje (p. ej. Go) | Hipótesis sin evidencia; solo se reabre con mediciones (ver `restructuracion.md`) |

Playwright **no** está prohibido: se restaura en S10 (ver `e2e.md`).

## RX-04 — Definición de datos protegidos

- **Datos de salud:** ciclos, fechas de inicio/fin, nivel de flujo, síntomas, intensidades, temperatura, notas, preguntas al chatbot, respuestas del chatbot, predicciones, métricas de modelos por usuaria (p. ej. MAE).
- **PII:** email, nombre, `user_id`, IP, tokens.

Toda restricción que diga "datos protegidos" se refiere a la unión de ambas listas.

## RX-05 — Logs y observabilidad

- Ningún log, traza, evento de Sentry o mensaje de error expuesto contiene datos protegidos (RX-04).
- Permitido: ruta como plantilla (`/daily-logs/{id}`), método, status HTTP, duración, número de queries, clase de error.
- Sentry se inicializa con `send_default_pii=False` y con un `before_send` que limpie el evento (backend y frontend).

## RX-06 — LLM

- Las llamadas al LLM salen **solo del backend**, nunca del navegador.
- El LLM recibe únicamente estadísticas agregadas del ciclo (fase, día de ciclo, duración promedio, síntomas frecuentes, intensidad promedio, días hasta el próximo periodo) y la pregunta de la usuaria **saneada** (sin emails, teléfonos ni UUID).
- Nunca recibe: email, nombre, `user_id`, fechas exactas, notas libres, historial crudo.
- El modelo se configura por variable de entorno (`GROQ_MODEL`), nunca hardcodeado.
- Si el proveedor falla, la usuaria recibe una respuesta de respaldo sin LLM, nunca un 503.

## RX-07 — Recursos de terceros en el navegador

- En runtime, el navegador solo habla con la API propia de EVA y con Sentry (errores).
- Fuentes e íconos se sirven desde el propio dominio (self-hosted). Hoy se cargan desde Google Fonts (`frontend/index.html:14-17`): es deuda registrada en `depuracion.md` DP-21.

## RX-08 — Derechos de la usuaria

- **Exportación:** CSV y PDF con todos sus datos de salud.
- **Borrado total:** eliminar la cuenta borra de forma irreversible todos sus datos en todas las tablas, los artefactos derivados (modelos `.pkl`) y los datos locales del dispositivo (IndexedDB). Ningún dato puede quedar huérfano ni volver a asociarse a otra cuenta (p. ej. por coincidencia de email).
- **Sin cuenta, sin datos:** no se guardan datos de salud de personas no registradas.

## RX-09 — Base de datos

- Conexión siempre por el endpoint **pooler** de Neon, nunca por conexión directa.
- Los cambios de esquema **nunca** se aplican automáticamente (ni en deploy, ni en startup, ni por un agente IA).
- Todo cambio de esquema se entrega como SQL comentado en el PR y **Mery lo ejecuta manualmente**.

## RX-10 — Entornos de prueba

- Ningún test automatizado (pytest, Vitest, Playwright, CI) se conecta a Neon ni a servicios reales (Groq, Brevo, Sentry).
- pytest usa SQLite in-memory o mocks; Vitest usa mocks; Playwright mockea el 100 % de la red hacia la API.
- La verificación contra Groq real la hace Mery a mano, en local, con su propia key; no es parte de ninguna suite.

## RX-11 — Secretos

- Nunca se commitean, imprimen, loguean ni se pegan en prompts o docs (`.env`, API keys, `SECRET_KEY`, `DATABASE_URL`).
- `.env.example` solo lleva nombres y valores de ejemplo.
- El backend no arranca si falta `SECRET_KEY` o es débil (hoy el default es `""`, `backend/app/core/config.py:5`; ver DP-04).

## RX-12 — Runtime

- Python **3.11** en Render y en el venv local (hoy el venv local es 3.14.6; ver DP-17).
- Node 22 LTS para el frontend.
