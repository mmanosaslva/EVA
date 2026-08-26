# Organización de Tareas por Developer — Fase 2

> **Fecha:** 26 de Agosto, 2026
> **Equipo:** Meriyei, Daniel, Madeleine (3 desarrolladoras)
> **Referencia:** Ver `PLAN_ARQUITECTURA_FASE2.md` para contexto completo

---

## Tabla de Contenidos

1. [Resumen de Asignación](#1-resumen-de-asignación)
2. [Tareas por Frente](#2-tareas-por-frente)
3. [Distribución por Developer](#3-distribución-por-developer)
4. [Diagrama de Dependencias](#4-diagrama-de-dependencias)
5. [Cronograma de Ejecución](#5-cronograma-de-ejecución)
6. [Detalles de Tareas](#6-detalles-de-tareas)

---

## 1. Resumen de Asignación

| Developer | Frente Principal | Tiempo Estimado | Skills Clave |
|---|---|---|---|
| **Meriyei** | Backend (optimización + chatbot + ML) | ~49h (6 días) | Python, FastAPI, SQLAlchemy, Neon |
| **Daniel** | Frontend (chat UI + documentación + backups) | ~31h (4 días) | React, TypeScript, Vite, PWA |
| **Madeleine** | DevOps + ML (AWS + benchmark + Prophet) | ~77h (10 días) | AWS, ML, Prophet, Python, testing |

---

## 2. Tareas por Frente

### FREnte 1 — Backend Performance

| # | Tarea | Responsable | Dependencias | Estimación | Estado |
|---|---|---|---|---|---|
| T1.1 | Configurar connection pooling en `db.py` | Meriyei | Ninguna | 2h | ⬜ Pendiente |
| T1.2 | Configurar `pool_recycle`, `pool_timeout`, `pool_size` para Neon | Meriyei | T1.1 | 2h | ⬜ Pendiente |
| T1.3 | Migrar hosting backend a AWS São Paulo (Lambda o EC2) | Madeleine | T1.1, T1.2 | 1-2 días | ⬜ Pendiente |
| T1.4 | Implementar retry con exponential backoff para cold starts | Meriyei | T1.1 | 3h | ⬜ Pendiente |
| T1.5 | Optimizar query `get_cycle_by_id` (JOIN en vez de 2 queries) | Meriyei | Ninguna | 2h | ⬜ Pendiente |
| T1.6 | Benchmark: medir latencia antes/después de optimizaciones | Madeleine | T1.1-T1.5 | 4h | ⬜ Pendiente |

### FREnte 2 — Chatbot

| # | Tarea | Responsable | Dependencias | Estimación | Estado |
|---|---|---|---|---|---|
| T2.1 | Investigar y validar free tier de Groq (límites reales) | Madeleine | Ninguna | 4h | ⬜ Pendiente |
| T2.2 | Investigar y validar free tier de Google Gemini API | Daniel | Ninguna | 4h | ⬜ Pendiente |
| T2.3 | Investigar Cloudflare Workers AI como alternativa | Madeleine | Ninguna | 3h | ⬜ Pendiente |
| T2.4 | Crear tabla comparativa final con datos verificados | Madeleine | T2.1-T2.3 | 2h | ⬜ Pendiente |
| T2.5 | Implementar `llm_service.py` con Groq primario + Gemini fallback | Meriyei | T2.4 | 1 día | ⬜ Pendiente |
| T2.6 | Implementar sanitización de PII (solo estadísticas agregadas) | Meriyei | T2.5 | 4h | ⬜ Pendiente |
| T2.7 | Crear endpoint `/insights` para chatbot | Meriyei | T2.5, T2.6 | 1 día | ⬜ Pendiente |
| T2.8 | Crear componente chat en frontend | Daniel | T2.7 | 2 días | ⬜ Pendiente |
| T2.9 | Implementar plan de degradación (mensaje al agotar cuota) | Meriyei | T2.5 | 4h | ⬜ Pendiente |

### FREnte 3 — E2E

| # | Tarea | Responsable | Dependencias | Estimación | Estado |
|---|---|---|---|---|---|
| T3.1 | Actualizar `Docs/PROJECT.md` — eliminar referencias Playwright | Daniel | Ninguna | 1h | ⬜ Pendiente |
| T3.2 | Actualizar `Docs/ISSUES.md` — cerrar issues #27, #38, #52, #55 | Daniel | Ninguna | 1h | ⬜ Pendiente |
| T3.3 | Actualizar `Docs/CRITERIOS_ISSUES.md` — marcar criterios E2E | Daniel | Ninguna | 1h | ⬜ Pendiente |
| T3.4 | Verificar `Docs/ML_STRATEGY.md` — actualizar referencias | Daniel | Ninguna | 1h | ⬜ Pendiente |

### ML Layer

| # | Tarea | Responsable | Dependencias | Estimación | Estado |
|---|---|---|---|---|---|
| T4.1 | Crear `ml_service.py` (Prophet, modelo por usuaria) | Madeleine | F1 completado | 3 días | ⬜ Pendiente |
| T4.2 | Implementar pipeline de features | Madeleine | T4.1 | 2 días | ⬜ Pendiente |
| T4.3 | Configurar cron job de reentrenamiento nocturno | Madeleine | T4.1, T4.2 | 1 día | ⬜ Pendiente |
| T4.4 | Crear `prediction_service.py` (orquestador ML) | Meriyei | T4.1 | 1 día | ⬜ Pendiente |

### Backups

| # | Tarea | Responsable | Dependencias | Estimación | Estado |
|---|---|---|---|---|---|
| T5.1 | Investigar estrategia de backups (Google/WhatsApp como guía) | Daniel | Ninguna | 4h | ⬜ Pendiente |
| T5.2 | Diseñar alcance, frecuencia y retención de backups | Daniel | T5.1 | 3h | ⬜ Pendiente |
| T5.3 | Implementar backup cifrado por email | Meriyei | T5.2 | 1 día | ⬜ Pendiente |

---

## 3. Distribución por Developer

### 3.1 Meriyei — Backend Principal

| # | Tarea | Frente | Tiempo | Dependencias |
|---|---|---|---|---|
| T1.1 | Configurar connection pooling | F1 | 2h | — |
| T1.2 | Configurar parámetros Neon | F1 | 2h | T1.1 |
| T1.4 | Retry exponential backoff | F1 | 3h | T1.1 |
| T1.5 | Optimizar queries | F1 | 2h | — |
| T2.5 | `llm_service.py` (Groq + Gemini) | F2 | 8h | T2.4 |
| T2.6 | Sanitización PII | F2 | 4h | T2.5 |
| T2.7 | Endpoint `/insights` | F2 | 8h | T2.5, T2.6 |
| T2.9 | Degradación cuota | F2 | 4h | T2.5 |
| T4.4 | `prediction_service.py` | ML | 8h | T4.1 |
| T5.3 | Backup cifrado | Backups | 8h | T5.2 |

| **Total Meriyei** | **~49h (6 días)** |
|---|---|

**Secuencia recomendada para Meriyei:**

```
Semana 1: T1.1 → T1.2 → T1.4 → T1.5 (backend optimization)
Semana 2: T2.5 → T2.6 → T2.9 → T2.7 (chatbot implementation)
Semana 3: T4.4 (ML predictor) + T5.3 (backups)
```

### 3.2 Daniel — Frontend Principal

| # | Tarea | Frente | Tiempo | Dependencias |
|---|---|---|---|---|
| T2.2 | Investigar Gemini API | F2 | 4h | — |
| T2.8 | Componente chat frontend | F2 | 16h | T2.7 |
| T3.1 | Actualizar `PROJECT.md` | F3 | 1h | — |
| T3.2 | Actualizar `ISSUES.md` | F3 | 1h | — |
| T3.3 | Actualizar `CRITERIOS_ISSUES.md` | F3 | 1h | — |
| T3.4 | Verificar `ML_STRATEGY.md` | F3 | 1h | — |
| T5.1 | Investigar backups | Backups | 4h | — |
| T5.2 | Diseñar estrategia backups | Backups | 3h | T5.1 |

| **Total Daniel** | **~31h (4 días)** |
|---|---|

**Secuencia recomendada para Daniel:**

```
Semana 1: T3.1 → T3.2 → T3.3 → T3.4 (documentación E2E, paralelo)
Semana 1: T2.2 (investigar Gemini, paralelo)
Semana 2: T5.1 → T5.2 (investigar backups)
Semana 3: T2.8 (componente chat frontend, espera T2.7)
```

### 3.3 Madeleine — ML/AI/DevOps Principal

| # | Tarea | Frente | Tiempo | Dependencias |
|---|---|---|---|---|
| T1.3 | Migrar a AWS São Paulo | F1 | 16h | T1.1, T1.2 |
| T1.6 | Benchmark latencia | F1 | 4h | T1.1-T1.5 |
| T2.1 | Investigar Groq | F2 | 4h | — |
| T2.3 | Investigar Cloudflare | F2 | 3h | — |
| T2.4 | Tabla comparativa | F2 | 2h | T2.1-T2.3 |
| T4.1 | `ml_service.py` (Prophet) | ML | 24h | F1 completado |
| T4.2 | Pipeline features | ML | 16h | T4.1 |
| T4.3 | Cron job reentrenamiento | ML | 8h | T4.1, T4.2 |

| **Total Madeleine** | **~77h (10 días)** |
|---|---|

**Secuencia recomendada para Madeleine:**

```
Semana 1: T2.1 → T2.3 → T2.4 (investigar proveedores chatbot)
Semana 1-2: T1.3 (migrar a AWS São Paulo)
Semana 2: T1.6 (benchmark)
Semana 3-5: T4.1 → T4.2 → T4.3 (ML pipeline completo)
```

---

## 4. Diagrama de Dependencias

```
FRENTE 1 (Backend Optimization)
═══════════════════════════════════════════════════════════════════

T1.1 (Meriyei) ──→ T1.2 (Meriyei) ──→ T1.3 (Madeleine)
    │                                      │
    └──→ T1.4 (Meriyei)                    └──→ T1.6 (Madeleine)
    │                                      ↑
    └──→ T1.5 (Meriyei) ──────────────────┘


FRENTE 2 (Chatbot)
═══════════════════════════════════════════════════════════════════

T2.1 (Madeleine) ─┐
T2.2 (Daniel)    ─┼─→ T2.4 (Madeleine) ──→ T2.5 (Meriyei) ──→ T2.7 (Meriyei) ──→ T2.8 (Daniel)
T2.3 (Madeleine) ─┘                          │
                                              └──→ T2.6 (Meriyei)
                                              └──→ T2.9 (Meriyei)


FRENTE 3 (E2E Elimination)
═══════════════════════════════════════════════════════════════════

T3.1-T3.4 (Daniel) → Sin dependencias (paralelo, ejecutar primero)


ML LAYER
═══════════════════════════════════════════════════════════════════

F1 completado → T4.1 (Madeleine) → T4.2 (Madeleine) → T4.3 (Madeleine)
                                  └──→ T4.4 (Meriyei)


BACKUPS
═══════════════════════════════════════════════════════════════════

T5.1 (Daniel) → T5.2 (Daniel) → T5.3 (Meriyei)
```

### Flujo Crítico (Camino Más Largo)

```
T1.1 → T1.2 → T1.3 → T4.1 → T4.2 → T4.3
  │      │      │      │       │       │
  2h     2h    16h    24h     16h      8h
                              = 68h (~9 días laborales)
```

**El camino crítico depende de Madeleine.** Meriyei y Daniel tienen tareas paralelas que no bloquean el flujo principal.

---

## 5. Cronograma de Ejecución

### Semana 1 (Días 1-5)

| Developer | Lunes | Martes | Miércoles | Jueves | Viernes |
|---|---|---|---|---|---|
| **Meriyei** | T1.1 (2h) | T1.2 (2h) | T1.4 (3h) | T1.5 (2h) | — |
| **Daniel** | T3.1 (1h) | T3.2 (1h) | T3.3 (1h) | T3.4 (1h) | T2.2 (4h) |
| **Madeleine** | T2.1 (4h) | T2.3 (3h) | T2.4 (2h) | T1.3 (8h) | T1.3 (8h) |

**Entregables semana 1:**
- ✅ Backend con connection pooling optimizado
- ✅ Documentación E2E actualizada
- ✅ Tabla comparativa de proveedores chatbot
- ✅ Hosting migrado a AWS São Paulo (inicio)

### Semana 2 (Días 6-10)

| Developer | Lunes | Martes | Miércoles | Jueves | Viernes |
|---|---|---|---|---|---|
| **Meriyei** | T2.5 (8h) | T2.5 (continúa) | T2.6 (4h) | T2.9 (4h) | T2.7 (8h) |
| **Daniel** | T5.1 (4h) | T5.2 (3h) | — | — | — |
| **Madeleine** | T1.3 (continúa) | T1.6 (4h) | T4.1 (8h) | T4.1 (8h) | T4.1 (8h) |

**Entregables semana 2:**
- ✅ `llm_service.py` con Groq + Gemini
- ✅ Endpoint `/insights` funcional
- ✅ Benchmark de latencia completado
- ✅ Estrategia de backups diseñada

### Semana 3 (Días 11-15)

| Developer | Lunes | Martes | Miércoles | Jueves | Viernes |
|---|---|---|---|---|---|
| **Meriyei** | T4.4 (8h) | T5.3 (8h) | — | — | — |
| **Daniel** | T2.8 (8h) | T2.8 (8h) | — | — | — |
| **Madeleine** | T4.2 (8h) | T4.2 (8h) | T4.2 (continúa) | T4.3 (8h) | — |

**Entregables semana 3:**
- ✅ `prediction_service.py` funcional
- ✅ Componente chat en frontend
- ✅ Pipeline de features completado
- ✅ Cron job de reentrenamiento configurado

### Semana 4 (Días 16-20) — Buffer

| Developer | Actividad |
|---|---|
| **Meriyei** | Testing integration, fixes, documentación |
| **Daniel** | Testing UI, fixes, pulido |
| **Madeleine** | Testing ML, benchmark final, documentación |

---

## 6. Detalles de Tareas

### T1.1: Configurar Connection Pooling (Meriyei)

**Objetivo:** Configurar el pool de conexiones de SQLAlchemy para Neon.

**Archivo a modificar:** `backend/app/core/db.py`

**Cambios:**
```python
# ANTES
engine = create_async_engine(DATABASE_URL, pool_pre_ping=True)

# DESPUÉS
engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_timeout=30,
    echo=False,
)
```

**Criterio de aceptación:**
- [ ] Pool configurado con valores apropiados
- [ ] `pool_pre_ping=True` habilitado
- [ ] `pool_recycle=1800` configurado
- [ ] Tests existentes pasan sin cambios

**Dependencias:** Ninguna
**Estimación:** 2 horas

---

### T1.2: Configurar Parámetros Neon (Meriyei)

**Objetivo:** Ajustar configuración específica para el comportamiento de Neon.

**Consideraciones Neon:**
- Usar endpoint `-pooler` (PgBouncer transaction mode)
- `sslnegotiation=direct` si PostgreSQL 17+
- Connection string con `sslmode=require`

**Criterio de aceptación:**
- [ ] Connection string actualizado con `-pooler`
- [ ] SSL configurado correctamente
- [ ] Verificar conexión desde AWS São Paulo

**Dependencias:** T1.1
**Estimación:** 2 horas

---

### T1.3: Migrar a AWS São Paulo (Madeleine)

**Objetivo:** Mover el hosting del backend a `sa-east-1` (São Paulo).

**Opción recomendada:** AWS Lambda (free tier)

**Pasos:**
1. Crear cuenta AWS (si no existe)
2. Configurar Lambda con Python 3.11
3. Configurar API Gateway
4. Deploy del backend
5. Configurar variables de entorno
6. Verificar conectividad con Neon Brasil

**Criterio de aceptación:**
- [ ] Backend corriendo en `sa-east-1`
- [ ] Endpoints responden correctamente
- [ ] Latencia medida < 50ms (sin cold start)
- [ ] Cold start < 500ms

**Dependencias:** T1.1, T1.2
**Estimación:** 1-2 días

---

### T2.5: Implementar llm_service.py (Meriyei)

**Objetivo:** Crear el servicio de LLM con Groq primario y Gemini como respaldo.

**Nuevo archivo:** `backend/app/services/llm_service.py`

**Estructura:**
```python
# backend/app/services/llm_service.py

from app.core.config import settings
import httpx

class LLMService:
    def __init__(self):
        self.groq_client = httpx.AsyncClient(
            base_url="https://api.groq.com/openai/v1",
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"}
        )
        self.gemini_client = httpx.AsyncClient(
            base_url="https://generativelanguage.googleapis.com/v1beta",
        )
    
    async def get_insight(self, cycle_stats: dict) -> str:
        """Obtiene insight del LLM basado en estadísticas del ciclo."""
        try:
            return await self._groq_insight(cycle_stats)
        except Exception:
            return await self._gemini_insight(cycle_stats)
    
    async def _groq_insight(self, stats: dict) -> str:
        # Implementación Groq
        pass
    
    async def _gemini_insight(self, stats: dict) -> str:
        # Implementación Gemini fallback
        pass
```

**Criterio de aceptación:**
- [ ] Servicio con Groq primario
- [ ] Fallback automático a Gemini
- [ ] Manejo de errores con degradación
- [ ] Solo recibe estadísticas agregadas (sin PII)

**Dependencias:** T2.4
**Estimación:** 1 día

---

### T4.1: Crear ml_service.py (Madeleine)

**Objetivo:** Implementar el servicio de ML con Prophet para predicción de ciclos.

**Nuevo archivo:** `backend/app/services/ml_service.py`

**Estructura:**
```python
# backend/app/services/ml_service.py

from prophet import Prophet
import pandas as pd
import joblib
from pathlib import Path

class MLService:
    def __init__(self, models_dir: Path = Path("ml_models")):
        self.models_dir = models_dir
        self.models_dir.mkdir(exist_ok=True)
    
    def train(self, user_id: str, cycles_data: pd.DataFrame) -> dict:
        """Entrena modelo Prophet para una usuaria."""
        model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=False,
            daily_seasonality=False,
        )
        model.fit(cycles_data)
        
        model_path = self.models_dir / f"{user_id}.pkl"
        joblib.dump(model, model_path)
        
        return {"model_path": str(model_path), "status": "trained"}
    
    def predict(self, user_id: str, periods: int = 1) -> dict:
        """Predice próximos ciclos."""
        model_path = self.models_dir / f"{user_id}.pkl"
        if not model_path.exists():
            return {"error": "no_model"}
        
        model = joblib.load(model_path)
        future = model.make_future_dataframe(periods=periods * 28)
        forecast = model.predict(future)
        
        return {
            "next_period": forecast.iloc[-1]["yhat"],
            "lower_bound": forecast.iloc[-1]["yhat_lower"],
            "upper_bound": forecast.iloc[-1]["yhat_upper"],
        }
```

**REGLAS (no negociables):**
- ❌ Nunca hace queries a BD
- ❌ Nunca contiene lógica de negocio
- ✅ Solo entrena y predice
- ✅ Recibe features pre-procesadas

**Criterio de aceptación:**
- [ ] Modelo por usuaria (no global)
- [ ] Entrenamiento con 3+ ciclos
- [ ] Predicción con intervalos de confianza
- [ ] Guardado de modelo en `.pkl`
- [ ] Tests unitarios con datos sintéticos

**Dependencias:** F1 completado
**Estimación:** 3 días

---

### T2.8: Componente Chat Frontend (Daniel)

**Objetivo:** Crear la interfaz de chat para el asistente EVA.

**Nuevos archivos:**
- `frontend/src/components/chat/ChatWindow.tsx`
- `frontend/src/components/chat/ChatMessage.tsx`
- `frontend/src/components/chat/ChatInput.tsx`
- `frontend/src/components/chat/useChat.ts`

**Características:**
- Mensajes del usuario y del asistente
- Indicador de "escribiendo..."
- Manejo de errores (degradación)
- Diseño responsive
- Accesibilidad

**Criterio de aceptación:**
- [ ] Componente ChatWindow funcional
- [ ] Integración con endpoint `/insights`
- [ ] Manejo de loading states
- [ ] Manejo de errores con mensaje de degradación
- [ ] Diseño consistente con el resto de la app
- [ ] Tests unitarios

**Dependencias:** T2.7
**Estimación:** 2 días

---

## Anexo: Cómo Usar Este Documento

### Para el Equipo

1. **Revisar** el `PLAN_ARQUITECTURA_FASE2.md` para entender el contexto completo
2. **Asignar** cada tarea al developer correspondiente
3. **Seguir** la secuencia de dependencias
4. **Actualizar** el estado de las tareas conforme se completan
5. **Comunicar** bloqueos inmediatamente

### Para Seguimiento

Actualizar la columna "Estado" de la tabla de tareas:

| Estado | Significado |
|---|---|
| ⬜ Pendiente | No iniciada |
| 🔄 En Progreso | En ejecución |
| ✅ Completada | Finalizada y verificada |
| 🚫 Bloqueada | Esperando dependencia o aprobación |
| ❌ Cancelada | Ya no aplica |

### Definición de "Completada"

Una tarea está completa SOLO cuando:
1. El código está escrito y funciona
2. Los tests pasan
3. El linter no reporta errores
4. La dependencia está satisfecha para tareas siguientes
5. Se ha documentado si aplica
