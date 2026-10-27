# EVA — Verificaciones (S10)

> **Qué es este documento:** las respuestas a los puntos que los otros docs marcaban como **NO VERIFICADO**, con su fuente oficial (RG-16). Si una fuente cambia, se actualiza aquí y en el doc que la usa.
>
> Fecha de la verificación: 2026-10-26.

---

## 1. Vercel

| Pregunta | Respuesta | Fuente |
|---|---|---|
| ¿Qué versiones de Python acepta? | **3.12 (por defecto), 3.13 y 3.14.** La versión se fija con `.python-version` en la raíz del backend (o con `pyproject.toml` / `Pipfile.lock`). **3.11 no está soportada**, por eso RX-12 pasó a 3.12 | [Python Runtime](https://vercel.com/docs/functions/runtimes/python) |
| ¿Límite de tamaño de una función Python? | **500 MB sin comprimir**. Hay una beta de hasta 5 GB con Fluid compute, por defecto en proyectos nuevos elegibles. Vercel no hace *tree-shaking* en Python: empaqueta todo lo que encuentra | [Python Runtime](https://vercel.com/docs/functions/runtimes/python), [Limits](https://vercel.com/docs/functions/limitations) |
| ¿Cabe el backend actual? | **Ahora sí (T24).** Con Prophet, un entorno limpio medía 611 MB, por encima del límite; sin él mide 296 MB (`evaluacion-prediccion.md`). Medición original: **muy justo.** Medido en el venv local: prophet 38 MB, numpy 43 MB (+27 MB de libs), pandas 74 MB, scipy 109 MB (+30 MB), scikit-learn 49 MB, matplotlib 38 MB. Solo el stack de ML suma ~410 MB. Sin Prophet ni sus dependencias, el backend queda muy por debajo del límite. Se confirma T24 → T25 | `du -sh` sobre `backend/venv` (Python 3.14, 2026-10-26) |
| ¿Tiempo máximo por request en Hobby? | **300 s** (por defecto y máximo), con 2 GB de memoria y 1 vCPU. La cifra de "10 s" que circula en blogs es de las funciones legacy | [Limits](https://vercel.com/docs/functions/limitations), [Hobby](https://vercel.com/docs/plans/hobby) |
| ¿Se puede elegir región en Hobby? | **Sí, una sola región** por proyecto (Pro: 5). Se configura en Settings o con `regions` en `vercel.json`. La región por defecto es `iad1` (Washington) | [Configuring regions](https://vercel.com/docs/functions/configuring-functions/region) |
| ¿Existe São Paulo? | **Sí: `gru1` (sa-east-1)** es una de las 19 regiones con cómputo. La doc no dice expresamente que Hobby pueda elegir cualquiera; **se confirma en el dashboard al crear el proyecto (T25)** | [Regions](https://vercel.com/docs/regions) |
| ¿Uso comercial en Hobby? | **No:** "restricts users to non-commercial, personal use only". Un proyecto académico es compatible. Si EVA se vuelve un producto comercial, hay que cambiar de plan (RX-01) | [Hobby](https://vercel.com/docs/plans/hobby) |

## 2. Groq

| Pregunta | Respuesta | Fuente |
|---|---|---|
| ¿Entrena con los datos de la API? | **No.** Services Agreement §4.2: *"Groq is not permitted to use Inputs or Outputs for training or fine-tuning any AI Model Services or other models, unless explicitly granted permission or instructed by Customer."* Aplica también al uso gratuito. La excepción son los servicios Beta, donde no rige el DPA: no usar modelos marcados como Beta | [Services Agreement](https://console.groq.com/docs/legal/services-agreement) |
| ¿Retiene los datos? | **No, por defecto.** Puede registrar inputs y outputs hasta 30 días solo para diagnosticar fallas o investigar abusos. Existe **Zero Data Retention** (Data Controls): Mery debe activarlo (T3). Los datos se alojan en EE. UU. (GCP) | [Your data](https://console.groq.com/docs/your-data) |
| Límites de `openai/gpt-oss-20b` | **30 peticiones/min, 1.000/día, 8.000 tokens/min, 200.000 tokens/día.** La página dice "base limits"; los límites reales de la cuenta se ven en `console.groq.com/settings/limits` | [Rate limits](https://console.groq.com/docs/rate-limits) |
| ¿Qué pasa al excederlos? | HTTP **429** con el header `retry-after` (en segundos). El enfriamiento del failover usa ese valor (T3) | [Rate limits](https://console.groq.com/docs/rate-limits) |
| ¿Sigue activo `llama3-8b-8192`? | **No**: se apagó el 2025-08-30. `llama-3.1-8b-instant` también se retiró (2026-08-16); el reemplazo recomendado es `openai/gpt-oss-20b` | [Deprecations](https://console.groq.com/docs/deprecations) |

## 3. Cloudflare Workers AI

| Pregunta | Respuesta | Fuente |
|---|---|---|
| ¿Entrena con los datos? | **No.** *"Cloudflare does not use Customer Content processed by Workers AI to train AI models."* Además, **zero data retention**. **No** usar AI Gateway con logging o caché, R2, KV ni funciones batch/async, porque en esos casos sí se guarda contenido | [Data usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/) |
| Asignación gratuita | **10.000 neurons por día**, que se reinician a las 00:00 UTC. Al agotarse, las peticiones fallan con error; la doc no da un código, así que el failover trata cualquier error como "proveedor caído" | [Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) |
| ¿Cuánto rinde? | `@cf/openai/gpt-oss-20b` cuesta ~18.182 neurons por millón de tokens de entrada y ~27.273 por millón de salida. Una respuesta típica de EVA (~500 tokens de entrada y ~300 de salida) usa ~17 neurons, lo que da **~580 respuestas al día** gratis como respaldo. Es una estimación, no una medición | [Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) |
| Límite de velocidad | **300 peticiones por minuto** en generación de texto (los modelos que exigen plan pago tienen menos) | [Limits](https://developers.cloudflare.com/workers-ai/platform/limits/) |
| ¿Qué modelo usar? | **`@cf/openai/gpt-oss-20b`**: es el mismo modelo que en Groq, así que el estilo de las respuestas no cambia al hacer failover (RX-06), y no exige plan pago. Alternativa multilingüe: `@cf/zai-org/glm-4.7-flash` ("100+ languages"). **Ojo:** `@cf/meta/llama-3.1-8b-instruct` sigue en la página de precios pero ya no aparece en el catálogo; no usarlo | [Models](https://developers.cloudflare.com/workers-ai/models/), [Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/) |
| ¿Funciona el endpoint compatible con OpenAI con `gpt-oss-20b`? | **Sí.** Prueba manual (2026-10-26) con las keys de Mery: `POST /accounts/{id}/ai/v1/chat/completions` respondió en español; el failover Groq (key inválida, 401) → Cloudflare funcionó, y con la key válida volvió a responder Groq | `llm_service.generate`, prueba manual de T3 |

## 4. Otros (verificados antes)

| Pregunta | Respuesta | Fuente |
|---|---|---|
| Historial de Neon free | **6 horas** (tope de 1 GB) + **1 snapshot manual** | [History window](https://neon.com/docs/introduction/history-window) |
| Cron jobs de Render | Mínimo de **$1/mes** por servicio, es decir, no son gratis (RX-01) | [Render — costos](https://render-www.onrender.com/articles/how-much-does-cloud-application-hosting-cost-for-small-businesses) |
| ¿El repo es público? | **Sí**, así que los minutos de GitHub Actions son gratis y los artifacts los puede descargar cualquiera (RX-13) | `gh repo view --json visibility` |

| Región de Neon | **`sa-east-1` (São Paulo).** El host del pooler en el `backend/.env.example` original era `…-pooler.sa-east-1.aws.neon.tech`, y la base es de Mery | `backend/.env.example` antes de T20 |

## 5. Sigue sin verificar

| Punto | Por qué | Cuándo se resuelve |
|---|---|---|
| Que Hobby permita elegir `gru1` | La doc dice "una región", pero no cuáles | T25, en el dashboard de Vercel |
| Cold start de las funciones de Vercel | Hay que medirlo | T15 |
| Huérfanos en `users` por el bug de borrado | Requiere consultar Neon | T4 (consulta previa al SQL) |
| E2E en local | Falta `libnspr4.so` en WSL | T8 (`sudo npx playwright install-deps chromium`) |
| Tamaño del bundle en Python 3.12 | Medí en 3.14; los wheels pueden variar un poco | T25 (el build de Vercel muestra el tamaño) |
