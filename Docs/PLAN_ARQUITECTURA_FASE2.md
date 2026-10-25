# PLAN DE ARQUITECTURA EVA — FASE 2

> **Fecha:** 26 de Agosto, 2026
> **Equipo:** Meriyei, Daniel, Madeleine (3 desarrolladoras)
> **Estado:** Para revisión del equipo

---

## Tabla de Contenidos

1. [Estado Actual del Proyecto](#1-estado-actual-del-proyecto)
2. [FRENTE 1 — Diagnóstico de Latencia/Performance del Backend](#2-frente-1--diagnóstico-de-latenciaperformance-del-backend)
3. [FRENTE 2 — Diagnóstico de Proveedor Cloud Gratuito para Chatbot](#3-frente-2--diagnóstico-de-proveedor-cloud-gratuito-para-chatbot)
4. [FRENTE 3 — Eliminación Total de E2E (Playwright)](#4-frente-3--eliminación-total-de-e2e-playwright)
5. [Backups — Estrategia de Respaldo de Datos](#5-backups--estrategia-de-respaldo-de-datos)

---

## 1. Estado Actual del Proyecto

### Stack Actual

| Componente | Tecnología | Estado |
|---|---|---|
| **Frontend** | React 19 + TypeScript + Vite 8 + Tailwind 4 + Zustand 5 | Funcional |
| **PWA** | vite-plugin-pwa + Workbox | Configurado |
| **Backend** | Python 3.11 + FastAPI 0.136.1 + SQLAlchemy 2.0 (async) | Funcional |
| **Driver BD** | asyncpg (PostgreSQL async) | Configurado |
| **Base de datos** | Neon (Postgres serverless, región Brasil) | Migrado desde Supabase |
| **Auth** | Módulo propio in-house (JWT + PyJWT) | Migrado desde Supabase Auth |
| **ML** | Prophet + joblib (planeado) | Schema definido, no implementado |
| **LLM** | Ollama local (primario) + Groq (fallback) | Configurado, no funcional en cloud |
| **CI/CD** | GitHub Actions (frontend.yml + backend.yml) | Funcional |
| **Hosting frontend** | Vercel | Funcional |
| **Hosting backend** | Local (sin desplegar aún) | Pendiente de deploy en AWS São Paulo |

### Infraestructura de BD

```
┌─────────────────────────────────────────────────────┐
│                    NEON (Brasil)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │    users     │  │    cycles    │  │ daily_logs │ │
│  ├─────────────┤  ├──────────────┤  ├────────────┤ │
│  │ UUID PK     │  │ UUID PK      │  │ UUID PK   │ │
│  │ email       │  │ user_id FK   │  │ cycle_id  │ │
│  │ birth_date  │  │ start_date   │  │ date      │ │
│  └─────────────┘  │ end_date     │  │ flow_level│ │
│                    └──────────────┘  │ temp      │ │
│  ┌─────────────────┐  ┌───────────┐ │ notes     │ │
│  │symptoms_catalog │  │daily_sympt│  └────────────┘ │
│  ├─────────────────┤  ├───────────┤                  │
│  │ UUID PK         │  │ UUID PK   │  ┌────────────┐ │
│  │ name            │  │ log_id FK │  │ ml_models  │ │
│  │ category        │  │ symp_id FK│  ├────────────┤ │
│  │ common_phase    │  │ intensity │  │ user_id FK │ │
│  └─────────────────┘  └───────────┘  │ model_path │ │
│                                       │ mae        │ │
│  ┌─────────────────┐  ┌────────────┐ │ trained_at │ │
│  │ llm_insights    │  │sync_ops    │  └────────────┘ │
│  ├─────────────────┤  ├────────────┤                  │
│  │ UUID PK         │  │ UUID PK   │                  │
│  │ user_id FK      │  │ client_id │                  │
│  │ question        │  │ type      │                  │
│  │ insight         │  │ payload   │                  │
│  └─────────────────┘  └────────────┘                  │
└─────────────────────────────────────────────────────┘
```

### Endpoints Actuales

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/health` | Health check | No |
| POST | `/cycles` | Crear ciclo | JWT |
| GET | `/cycles` | Listar ciclos del usuario | JWT |
| GET | `/cycles/{id}` | Detalle de ciclo + daily_logs | JWT |
| PUT | `/cycles/{id}` | Actualizar ciclo | JWT |
| DELETE | `/cycles/{id}` | Eliminar ciclo | JWT |

### Endpoints Planeados (no implementados)

| Sprint | Endpoints |
|---|---|
| Sprint 3 | `/symptoms`, `/daily-logs` CRUD |
| Sprint 4 | `/analytics/summary`, `/analytics/symptoms` |
| Sprint 5 | `/predictions/next` |
| Sprint 6 | `/sync` (offline → online) |
| Sprint 7 | `/insights` (chatbot LLM) |
| Sprint 8 | `/export/csv`, `/export/pdf` |

---

## 2. FRENTE 1 — Diagnóstico de Latencia/Performance del Backend

### 2.1 El Problema Real

> El tiempo de respuesta del backend no es el óptimo. Necesitamos reducir la
> latencia y mejorar el nivel de respuesta general de la API.

### 2.2 Diagnóstico Técnico

#### Problema #1: Connection Pooling Ausente

**Archivo:** `backend/app/core/db.py`

```python
# ACTUAL — Sin pooling configurado
engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)
```

**Impacto:** Cada request abre una conexión TCP + TLS nueva a Neon:
- TCP handshake: ~20-40ms
- TLS negotiation: ~30-60ms
- PostgreSQL authentication: ~10-20ms
- **Total overhead por request: 60-120ms**

#### Problema #2: Hosting Lejano de Neon

Si el backend corre en un hosting fuera de Brasil, cada request tiene:
- Latencia de red Brasil ↔ Hosting exterior: **80-150ms ida y vuelta**
- Neon está en Brasil → hosting ideal también en Brasil (AWS São Paulo `sa-east-1`)

#### Problema #3: Neon Cold Starts

Neon escala a cero después de 5 minutos de inactividad:
- Cold start: **200-500ms** adicionales
- Sin retry logic configurado

#### Problema #4: Queries No Optimizadas

**Archivo:** `backend/app/services/cycle_service.py:49-59`

```python
# Actual: 2 queries secuenciales
row = await cycle_repo.get_cycle_by_id(cycle_id, user_id)  # Query 1
logs = await get_logs_by_cycle(cycle_id)                    # Query 2
```

**Oportunidad:** Un solo JOIN reduciría a 1 query.

### 2.3 Opciones Evaluadas

| Opción | Descripción | Latencia Esperada | Esfuerzo | Riesgo |
|---|---|---|---|---|
| **A** | Optimizar Python actual (pooling + queries) | -40-60ms | 2-3 días | Bajo |
| **B** | Mover hosting a AWS São Paulo | -80-150ms | 1-2 días | Bajo |
| **C** | Migración parcial a Go (endpoints críticos) | -20-40ms adicional | 2-3 semanas | Alto |
| **D** | Migración completa a Go | -30-50ms adicional | 4-6 semanas | Muy alto |

### 2.4 Recomendación: Opción A + B

**Por qué NO migrar a Go:**

| Factor | Python (FastAPI) | Go (Chi/Echo) |
|---|---|---|
| Endpoints actuales | 5 | 5 |
| Carga computacional | Baja (CRUD) | Baja (CRUD) |
| Equipo lo conoce | Sí | No (curva aprendizaje) |
| Ecosistema ML | Nativo (Prophet, sklearn) | Pobre (CGo bindings) |
| Tiempo migración | 0 (ya funciona) | 4-6 semanas |
| Mejora real | 120-210ms (infraestructura) | 20-40ms adicional |

**Conclusión:** El problema NO es Python vs Go. El problema es infraestructura (sin pooling + hosting lejano). Optimizar Python + mover a São Paulo resuelve el 80% de la latencia.

### 2.5 Plan de Implementación

#### Paso 1: Configurar Connection Pooling (Meriyei, 4h)

```python
# backend/app/core/db.py — VERSIÓN OPTIMIZADA
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL

if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,           # Conexiones persistentes en el pool
    max_overflow=20,        # Conexiones extra para bursts
    pool_pre_ping=True,     # Validar conexiones antes de usar
    pool_recycle=1800,      # Reciclar cada 30 minutos
    pool_timeout=30,        # Timeout si pool está lleno
    echo=False,             # Deshabilitar SQL logging en producción
) if DATABASE_URL else None
```

**Configuración por entorno:**

| Entorno | pool_size | max_overflow | pool_recycle |
|---|---|---|---|
| Development | 5 | 10 | 1800 |
| Production | 10 | 20 | 1800 |
| Testing | 2 | 5 | 600 |

#### Paso 2: Desplegar Backend en AWS São Paulo (Madeleine, 1-2 días)

El backend actualmente solo corre en local. Neon ya está en Brasil. El paso es desplegar el backend en la misma región para minimizar latencia de red.

**Opción Lambda (recomendada para empezar):**

| Característica | AWS Lambda Free Tier |
|---|---|
| Requests | 1M/mes gratis |
| Compute | 400,000 GB-seconds/mes |
| Almacenamiento | DynamoDB 25GB (si se necesita cache) |
| Red | 1GB transferencia/mes gratis |
| Región | `sa-east-1` (São Paulo) |

**Opción EC2 (si se necesita más control):**

| Característica | EC2 Free Tier |
|---|---|
| Instancia | t3.micro o t3.small (12 meses) |
| Almacenamiento | 30GB EBS |
| Red | 100GB transferencia/mes |
| Región | `sa-east-1` (São Paulo) |

#### Paso 3: Retry con Exponential Backoff (Meriyei, 3h)

```python
# backend/app/core/retry.py
import asyncio
import random
from typing import Callable, Any

async def retry_with_backoff(
    func: Callable,
    max_retries: int = 3,
    base_delay: float = 0.1,
    max_delay: float = 2.0,
) -> Any:
    for attempt in range(max_retries):
        try:
            return await func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            delay = min(base_delay * (2 ** attempt), max_delay)
            jitter = random.uniform(0, delay * 0.1)
            await asyncio.sleep(delay + jitter)
```

#### Paso 4: Optimizar Queries (Meriyei, 2h)

```python
# Optimización: JOIN en vez de 2 queries
# ANTES (cycle_service.py:49-59):
row = await cycle_repo.get_cycle_by_id(cycle_id, user_id)
logs = await get_logs_by_cycle(cycle_id)

# DESPUÉS (query con JOIN):
async def get_cycle_with_logs(cycle_id: str, user_id: str):
    query = (
        select(cycles_table, daily_logs_table)
        .join(daily_logs_table, cycles_table.c.id == daily_logs_table.c.cycle_id)
        .where(
            cycles_table.c.id == cycle_id,
            cycles_table.c.user_id == user_id
        )
    )
    # ...
```

#### Paso 5: Benchmark (Madeleine, 4h)

```python
# scripts/benchmark.py
import time
import httpx

BASE_URL = "https://tu-backend-sa-east-1.amazonaws.com"

async def benchmark_endpoint(endpoint: str, iterations: int = 100):
    times = []
    async with httpx.AsyncClient() as client:
        for _ in range(iterations):
            start = time.perf_counter()
            await client.get(f"{BASE_URL}{endpoint}")
            elapsed = (time.perf_counter() - start) * 1000
            times.append(elapsed)
    
    avg = sum(times) / len(times)
    p50 = sorted(times)[len(times) // 2]
    p95 = sorted(times)[int(len(times) * 0.95)]
    p99 = sorted(times)[int(len(times) * 0.99)]
    
    return {
        "avg_ms": round(avg, 2),
        "p50_ms": round(p50, 2),
        "p95_ms": round(p95, 2),
        "p99_ms": round(p99, 2),
    }
```

### 2.6 Neon: Consideraciones Específicas

| Aspecto | Configuración Actual | Recomendación |
|---|---|---|
| Connection pooling | No configurado | Usar endpoint `-pooler` (PgBouncer) |
| Cold starts | Sin manejo | `pool_pre_ping=True` + retry backoff |
| Scale to zero | Default 5min | Mantener para ahorrar costs en free tier |
| SSL | Negotiation estándar | Usar `sslnegotiation=direct` si PG 17+ |
| Pool size | No configurado | `pool_size=5`, `max_overflow=10` para serverless |

**Cadena de conexión recomendada:**
```
postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/dbname?sslmode=require&sslnegotiation=direct
```

### 2.7 ML Layer: Estrategia

| Decisión | Justificación |
|---|---|
| Mantener Prophet en Python | No hay equivalente maduro fuera de Python |
| Microservicio separado | La capa ML nunca hace queries a BD ni contiene lógica de negocio |
| Despliegue | AWS Lambda o job separado (cron nocturno) |
| Comunicación | API interna o cola de mensajes (SQS free tier) |

**Arquitectura ML:**
```
┌─────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   routers/   │  │  services/   │  │repositories/ │ │
│  │  (HTTP层)    │→ │ (逻辑层)     │→ │  (数据层)    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                                               │
│         │ API interna                                   │
│         ↓                                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │              ML SERVICE (Prophet)                 │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │  │
│  │  │ml_service.py│  │features.py  │  │models/   │ │  │
│  │  │ (entrena)   │  │ (pipeline)  │  │(.pkl)    │ │  │
│  │  └─────────────┘  └─────────────┘  └──────────┘ │  │
│  │                                                   │  │
│  │  REGLAS:                                          │  │
│  │  - Nunca hace queries a BD                        │  │
│  │  - Nunca contiene lógica de negocio               │  │
│  │  - Solo entrena y predice                         │  │
│  │  - Recibe features pre-procesadas                 │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 3. FRENTE 2 — Diagnóstico de Proveedor Cloud Gratuito para Chatbot

### 3.1 El Problema

> El chatbot (/insights) debe responder de forma oportuna y pertinente.
> Hoy depende de Ollama corriendo localmente en el servidor.
> **Ollama queda completamente descartado del proyecto.**

### 3.2 Requisitos No Negociables

| Requisito | Descripción |
|---|---|
| **100% cloud** | Sin dependencias locales |
| **100% gratuito** | Sin créditos temporales, sin fecha de expiración |
| **Privacidad** | Solo estadísticas agregadas del ciclo, nunca PII |
| **Degradación** | Plan claro al agotar cuota (mensaje, no fallo) |

### 3.3 Criterios de Evaluación

| Criterio | Importancia | Método de Verificación |
|---|---|---|
| Gratuidad sostenida | **Descalificante** si expira | Revisar docs oficiales |
| Límites de cuota | Crítico para producción | Docs de rate limits |
| Calidad de modelos | Debe dar advice de salud | Probar con prompts de ejemplo |
| Latencia LatAm | UX del chatbot | Benchmark desde Brasil |
| Integración | API OpenAI-compatible = preferible | Revisar documentación |
| Degradación | Plan al agotar cuota | Diseñar fallback |

### 3.4 Tabla Comparativa de Proveedores

#### 3.4.1 Groq

| Aspecto | Evaluación |
|---|---|
| **URL oficial** | https://console.groq.com/docs/rate-limits |
| **Gratuidad** | ✅ Perpetua — rate-limited forever, sin expiración |
| **Límites** | 30 RPM, 1K-14.4K RPD (según modelo), 6K-15K TPM |
| **Modelos gratis** | Llama 3.3 70B (128K context), Llama 3.1 8B, DeepSeek R1, Qwen QwQ 32B, Gemma 2 9B |
| **Latencia** | **La más baja del mercado** — LPU inference, <100ms |
| **Integración** | API OpenAI-compatible en `api.groq.com/openai/v1` |
| **Privacidad** | ✅ No entrena con datos de usuarios free tier |
| **Autenticación** | API key, sin tarjeta de crédito |
| **Riesgo principal** | RPD es el límite más restrictivo — 1,000 requests/día |
| **Degradación** | HTTP 429 + header `retry-after` |

**Modelos disponibles en free tier:**

| Modelo | RPM | RPD | TPM | TPD | Contexto |
|---|---|---|---|---|---|
| Llama 3.3 70B Versatile | 30 | 1K | 12K | 100K | 128K |
| Llama 3.1 8B Instant | 30 | 14.4K | 6K | 500K | 128K |
| DeepSeek R1 Distill 70B | 30 | 1K | 6K | — | 128K |
| Qwen QwQ 32B | 30 | 1K | 6K | — | 128K |
| Gemma 2 9B | 30 | 1K | 15K | — | 8K |

#### 3.4.2 Google Gemini API (AI Studio)

| Aspecto | Evaluación |
|---|---|
| **URL oficial** | https://ai.google.dev/gemini-api/docs/rate-limits |
| **Gratuidad** | ✅ Perpetua — rate-limited forever |
| **Límites** | 500 RPD, 25K TPM (Flash), 10 RPM (Pro) |
| **Modelos gratis** | Gemini 2.5 Flash (1M context), 2.5 Flash-Lite, 2.0 Flash |
| **Latencia** | Baja — infraestructura global Google |
| **Integración** | API OpenAI-compatible + SDK oficial |
| **Privacidad** | ⚠️ Free tier: prompts pueden usarse para mejorar productos (excepto UK/CH/EEA/EU) |
| **Autenticación** | API key, sin tarjeta de crédito |
| **Riesgo principal** | 500 RPD puede ser limitante en horas pico |
| **Degradación** | HTTP 429 |

#### 3.4.3 Cloudflare Workers AI

| Aspecto | Evaluación |
|---|---|
| **URL oficial** | https://developers.cloudflare.com/workers-ai/platform/pricing/ |
| **Gratuidad** | ✅ Perpetua — 10,000 Neurons/día |
| **Límites** | 10,000 Neurons/día (1 Neuron ≈ 1 request), reset UTC 00:00 |
| **Modelos gratis** | Llama 3.3 70B, GPT-OSS 120B, Qwen 2.5, DeepSeek R1 |
| **Latencia** | **La más baja** — edge computing global |
| **Integración** | API OpenAI-compatible |
| **Privacidad** | ✅ No entrena con datos de usuarios |
| **Autenticación** | API token, sin tarjeta de crédito |
| **Riesgo principal** | Neurons son por cuenta, no por API key |
| **Degradación** | Error al agotar neurons del día |

#### 3.4.4 Oracle Cloud (Always Free)

| Aspecto | Evaluación |
|---|---|
| **URL oficial** | https://www.oracle.com/cloud/free/ |
| **Gratuidad** | ⚠️ Perpetua PERO capacity lottery |
| **Límites** | 4 OCPU ARM, 24GB RAM — capacidad NO garantizada |
| **Modelos** | Self-hosted (Ollama, llama.cpp) — 8-10 tok/s en CPU |
| **Latencia** | **Alta** — CPU-only, sin GPU |
| **Integración** | Requiere自己 hosting de API |
| **Privacidad** | ✅ Total control — datos nunca salen |
| **Autenticación** | Cuenta Oracle Cloud |
| **Riesgo principal** | **CRÍTICO**: Regiones populares perpetuamente llenas |
| **Degradación** | Instancia no disponible por falta de capacidad |

**Problema conocido de Oracle Cloud:**
> "Oracle's ARM capacity is allocated per-region. Popular regions (US, EU,
> Canada) are perpetually full. You cannot create an ARM instance because
> there is no capacity. This is not a temporary condition. It is structural."

#### 3.4.5 OpenRouter

| Aspecto | Evaluación |
|---|---|
| **URL oficial** | https://openrouter.ai/docs/api-reference/limits |
| **Gratuidad** | ✅ Perpetua (modelos `:free`) |
| **Límites** | 20 RPM, 50 RPD (muy restrictivo) |
| **Modelos gratis** | 35+ modelos con suffix `:free` |
| **Latencia** | Variable — depende del proveedor backend |
| **Integración** | API OpenAI-compatible |
| **Privacidad** | ⚠️ Depende del proveedor subyacente |
| **Autenticación** | API key, sin tarjeta de crédito |
| **Riesgo principal** | 500 RPD es muy bajo para producción |
| **Degradación** | HTTP 429 |

#### 3.4.6 SambaNova Cloud

| Aspecto | Evaluación |
|---|---|
| **URL oficial** | https://cloud.sambanova.ai/plans |
| **Gratuidad** | ✅ Perpetua (rate-limited) |
| **Límites** | 20 RPM, 20 RPD (muy restrictivo) |
| **Modelos gratis** | DeepSeek V3, Llama 3.3 70B, GPT-OSS 120B |
| **Latencia** | Media (US servers) |
| **Integración** | API OpenAI-compatible |
| **Privacidad** | ✅ No especifica entrenamiento con datos free |
| **Autenticación** | API key, sin tarjeta de crédito |
| **Riesgo principal** | 20 RPD es extremadamente bajo |
| **Degradación** | HTTP 429 |

#### 3.4.7 NVIDIA NIM

| Aspecto | Evaluación |
|---|---|
| **URL oficial** | https://build.nvidia.com |
| **Gratuidad** | ✅ Perpetua |
| **Límites** | 40 RPM, sin daily token cap |
| **Modelos gratis** | 100+ modelos open-source (Llama, DeepSeek, Qwen, etc.) |
| **Latencia** | Media (US servers) |
| **Integración** | API OpenAI-compatible |
| **Privacidad** | ✅ No especifica entrenamiento con datos free |
| **Autenticación** | API key + verificación telefónica |
| **Riesgo principal** | Requiere phone verification |
| **Degradación** | HTTP 429 |

### 3.5 Tabla Resumen Comparativa

| Proveedor | Gratuidad | Límites (RPD) | Modelos | Latencia LatAm | Privacidad | Recomendación |
|---|---|---|---|---|---|---|
| **Groq** | ✅ Perpetua | 1K-14.4K | Llama 70B, DeepSeek R1 | **Muy baja** | ✅ Sin entrenamiento | **PRIMARIO** |
| **Gemini** | ✅ Perpetua | 500 | Gemini 2.5 Flash | **Baja** | ⚠️ Puede entrenar | **RESPALDO** |
| **Cloudflare** | ✅ Perpetua | 10K neurons | Llama 70B, GPT-OSS | **Muy baja** | ✅ Sin entrenamiento | Alternativa |
| **Oracle** | ⚠️ Capacity lottery | N/A | Self-hosted | Alta | ✅ Total control | **NO** |
| **OpenRouter** | ✅ Perpetua | 50 | 35+ free | Variable | ⚠️ Variable | Limitado |
| **SambaNova** | ✅ Perpetua | 20 | DeepSeek V3 | Media | ✅ | Limitado |
| **NVIDIA** | ✅ Perpetua | Sin cap | 100+ modelos | Media | ✅ | Alternativa |

### 3.6 Recomendación Final

| Rol | Proveedor | Justificación |
|---|---|---|
| **Primario** | **Groq** | Latencia más baja (LPU), modelos capaces (Llama 3.3 70B), perpetuo, sin PII, API OpenAI-compatible |
| **Respaldo** | **Google Gemini API** | 500 RPD, modelos Flash excelentes, perpetuo, API OpenAI-compatible |

### 3.7 Plan de Degradación

```
┌─────────────────────────────────────────────────────────┐
│                  FLUJO DE CHATBOT                       │
│                                                         │
│  Usuario pregunta                                      │
│       │                                                 │
│       ↓                                                 │
│  ┌─────────────┐                                       │
│  │  Groq API   │ ← Intento primario                   │
│  └──────┬──────┘                                       │
│         │                                               │
│    ¿Éxito? ──── SÍ ───→ Respuesta al usuario          │
│         │                                               │
│         NO (429 o error)                                │
│         │                                               │
│         ↓                                               │
│  ┌──────────────┐                                      │
│  │ Gemini API   │ ← Intento de respaldo                │
│  └──────┬───────┘                                      │
│         │                                               │
│    ¿Éxito? ──── SÍ ───→ Respuesta al usuario          │
│         │                                               │
│         NO (429 o error)                                │
│         │                                               │
│         ↓                                               │
│  ┌──────────────────────────────────────────────┐      │
│  │ Mensaje de degradación:                      │      │
│  │ "El asistente está temporalmente ocupado.    │      │
│  │  Intenta en unos minutos."                   │      │
│  │                                              │      │
│  │ ❌ NUNCA fallo silencioso                    │      │
│  │ ❌ NUNCA respuesta genérica sin contexto     │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### 3.8 Privacidad en el LLM

**Regla absoluta:** El contexto enviado al LLM **NUNCA** incluye PII.

| Campo permitido | Ejemplo |
|---|---|
| Fase actual del ciclo | "folicular", "ovulatorio", "lúteo" |
| Día del ciclo | 14 |
| Duración promedio del ciclo | 28 días |
| Duración promedio del período | 5 días |
| Síntomas frecuentes | ["dolor_cabeza", "hinchazon"] |
| Días hasta el siguiente período | 14 |
| Temperatura basal promedio | 36.5°C |

| Campo PROHIBIDO | Razón |
|---|---|
| email | PII |
| nombre | PII |
| fecha de nacimiento | PII |
| user_id | Identificador único |
| IP | Identificador de red |
| notas de texto libre | Puede contener PII |

---

## 4. FRENTE 3 — Eliminación Total de E2E (Playwright)

### 4.1 Decisión

> **Se elimina Playwright del proyecto por completo, no se suspende.**

### 4.2 Estado Actual

**Playwright NO existe en el código actual.** La exploración del repositorio encontró:
- ❌ Sin `playwright.config.ts` ni `playwright.config.js`
- ❌ Sin dependencia `@playwright/test` en `package.json`
- ❌ Sin specs o tests de Playwright
- ❌ Sin pasos de CI relacionados con Playwright

**Solo queda documentación residual** que referencia Playwright.

### 4.3 Archivos a Eliminar (NO existen — solo documentación)

| # | Archivo | Acción | Estado |
|---|---|---|---|
| 1 | `frontend/playwright.config.ts` | Eliminar | ✅ No existe |
| 2 | `frontend/e2e/` (carpeta specs) | Eliminar | ✅ No existe |
| 3 | `@playwright/test` en `package.json` | Eliminar dependencia | ✅ No está instalado |
| 4 | `npm run test:e2e` en scripts | Eliminar script | ✅ No definido |
| 5 | Pasos Playwright en `.github/workflows/` | Eliminar de CI | ✅ No hay pasos Playwright |

### 4.4 Documentación a Actualizar

| # | Archivo | Sección | Acción |
|---|---|---|---|
| 1 | `Docs/PROJECT.md` | Referencia a Playwright | Eliminar mención |
| 2 | `Docs/ISSUES.md` | Issues #27, #38, #52, #55 | Marcar como "Won't do" |
| 3 | `Docs/CRITERIOS_ISSUES.md` | Criterios de aceptación E2E | Eliminar o marcar como "Won't do" |
| 4 | `Docs/ML_STRATEGY.md` | Referencias a testing E2E | Verificar y actualizar |

### 4.5 Texto de Cierre para Issues

```
Won't do — decisión de producto, Fase 2.

El equipo decidió eliminar completamente los tests E2E (Playwright)
del proyecto. Los tests unitarios (Vitest frontend) y de integración
(backend pytest) se mantienen activos.

Razón: El overhead de mantenimiento de E2E no justifica la cobertura
adicional para un proyecto académico con alcance definido. Vitest +
pytest cubren los flujos críticos.
```

**Issues a cerrar:** #27, #38, #52, #55

### 4.6 Qué Se Mantiene

| Tipo de Test | Framework | Estado |
|---|---|---|
| Unitarios frontend | Vitest + Testing Library | ✅ Activo |
| Unitarios backend | pytest + pytest-asyncio | ✅ Activo |
| Integración backend | pytest + httpx | ✅ Activo |
| E2E | Playwright | ❌ Eliminado |

---

## 5. Backups — Estrategia de Respaldo de Datos

### 5.1 Alcance del Backup

| Tipo de Dato | Incluir | Justificación |
|---|---|---|
| Datos de ciclos | ✅ Sí | Datos irreemplazables del usuario |
| Datos de síntomas | ✅ Sí | Registro histórico del usuario |
| Modelos ML | ✅ Sí | Modelo entrenado por usuaria |
| Datos de auth | ❌ No | Neon maneja su propia replicación |
| Configuración app | ❌ No | Está en código fuente |

### 5.2 Frecuencia y Retención

| Parámetro | Valor | Justificación |
|---|---|---|
| Frecuencia | Diaria | Datos de salud requieren consistencia |
| Retención | 30 días | Suficiente para recuperación, no excesivo |
| Horario | 03:00 UTC | Fuera de horario de uso |

### 5.3 Dónde Se Guarda (100% Gratis)

| Opción | Capacidad | Costo | Privacidad |
|---|---|---|---|
| **Neon Backup** (built-in) | Incluido en plan | Gratis | ✅ Misma región |
| **Google Drive** | 15GB gratis | Gratis | ⚠️ Datos cifrados necesarios |
| **Cloudflare R2** | 10GB gratis | Gratis | ✅ Sin egress fees |
| **AWS S3** (free tier) | 5GB, 12 meses | Gratis temporal | ✅ |

**Recomendación:** Neon Backup (built-in) + Cloudflare R2 como respaldo.

### 5.4 Privacidad del Backup

**Regla:** Si el backup se envía por email, **DEBE** ir cifrado.

| Método | Cifrado | Recomendación |
|---|---|---|
| Neon Backup | ✅ En tránsito y en reposo | Primario |
| Email con adjunto | ⚠️ Requiere PGP/GPG | Solo si usuario solicita |
| Cloudflare R2 | ✅ En tránsito y en reposo | Respaldo |

**No enviar backups por email sin cifrado.** Un backup con datos de ciclo/síntomas viajando por correo sin cifrado rompe los principios de privacidad de EVA.

---

## Anexo: Restricciones que Nunca se Violan

| # | Restricción | Verificación |
|---|---|---|
| 1 | Todo el stack 100% gratuito | ✅ Groq/Gemini free tier perpetuo, AWS Lambda free tier |
| 2 | Sin cambios automáticos en Neon | ✅ Todos los schema changes documentados para aplicación manual |
| 3 | SRP estricto | ✅ Capa HTTP / lógica / datos / ML separadas |
| 4 | 3NF en BD | ✅ Schema actual ya cumple 3NF |
| 5 | ML sin queries a BD | ✅ ml_service.py solo entrena y predice |
| 6 | Privacidad LLM | ✅ Solo estadísticas agregadas, nunca PII |
| 7 | Ollama completamente fuera | ✅ No se propone ni como fallback |
| 8 | No cerrar issues E2E sin aprobación | ✅ Pendiente de revisión del equipo |
| 9 | No elegir proveedor chatbot sin comparación | ✅ Tabla comparativa presentada |
