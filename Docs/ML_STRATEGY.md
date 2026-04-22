# EVA — Estrategia de Machine Learning e IA

> Responsable: Madeleine (ML/AI) · Revisión: Meriyei (features y datos)
> Stack: Prophet (Meta) · scikit-learn · joblib · Ollama · Groq API

---

## Tabla de contenidos

- [EVA — Estrategia de Machine Learning e IA](#eva--estrategia-de-machine-learning-e-ia)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [1. Principios de diseño ML en EVA](#1-principios-de-diseño-ml-en-eva)
    - [Modelo por usuaria, no modelo global](#modelo-por-usuaria-no-modelo-global)
    - [Privacidad como restricción de diseño](#privacidad-como-restricción-de-diseño)
    - [Graceful degradation](#graceful-degradation)
  - [2. Por qué no redes neuronales](#2-por-qué-no-redes-neuronales)
  - [3. Fase 1 — Predicción heurística (Sprint 5)](#3-fase-1--predicción-heurística-sprint-5)
    - [Algoritmo](#algoritmo)
    - [Precisión esperada](#precisión-esperada)
  - [4. Fase 2 — ML real con Prophet (Sprints 7–8)](#4-fase-2--ml-real-con-prophet-sprints-78)
    - [¿Qué es Prophet?](#qué-es-prophet)
    - [Instalación](#instalación)
    - [Implementación completa](#implementación-completa)
  - [5. Arquitectura del modelo por usuaria](#5-arquitectura-del-modelo-por-usuaria)
    - [Ciclo de vida del modelo](#ciclo-de-vida-del-modelo)
  - [6. Pipeline de features](#6-pipeline-de-features)
    - [Features actuales (v1 — Sprint 7)](#features-actuales-v1--sprint-7)
    - [Extracción de features (repositories/cycle\_repo.py)](#extracción-de-features-repositoriescycle_repopy)
    - [Features futuras (v2 — post-lanzamiento)](#features-futuras-v2--post-lanzamiento)
  - [7. Entrenamiento y reentrenamiento](#7-entrenamiento-y-reentrenamiento)
    - [Entrenamiento inicial](#entrenamiento-inicial)
    - [Reentrenamiento nocturno (cron job en Render)](#reentrenamiento-nocturno-cron-job-en-render)
  - [8. Métricas de evaluación](#8-métricas-de-evaluación)
    - [MAE — Error Medio Absoluto](#mae--error-medio-absoluto)
    - [Script de evaluación](#script-de-evaluación)
  - [9. Integración con el backend (SRP)](#9-integración-con-el-backend-srp)
    - [prediction\_service.py (orquestador)](#prediction_servicepy-orquestador)
  - [10. LLM conversacional — Ollama + Groq](#10-llm-conversacional--ollama--groq)
    - [Arquitectura del LLM](#arquitectura-del-llm)
    - [llm\_service.py](#llm_servicepy)
    - [Instalar Ollama (guía para el equipo)](#instalar-ollama-guía-para-el-equipo)
  - [11. Privacidad en el pipeline ML](#11-privacidad-en-el-pipeline-ml)
    - [Qué datos usa el ML](#qué-datos-usa-el-ml)
    - [Qué contiene el archivo .pkl](#qué-contiene-el-archivo-pkl)
    - [Eliminación de cuenta](#eliminación-de-cuenta)
  - [12. Testing del módulo ML](#12-testing-del-módulo-ml)
    - [Tests unitarios — ml\_service.py](#tests-unitarios--ml_servicepy)
    - [Tests del LLM](#tests-del-llm)
  - [13. Roadmap ML por sprint](#13-roadmap-ml-por-sprint)

---

## 1. Principios de diseño ML en EVA

### Modelo por usuaria, no modelo global

El ciclo menstrual es profundamente individual. Un modelo global entrenado con datos de muchas mujeres puede tener mayor precisión estadística agregada, pero falla en los casos extremos — que son precisamente las usuarias que más necesitan EVA (ciclos irregulares, SOP, perimenopausia).

```
❌ Modelo global:    un modelo aprende de miles de ciclos de miles de mujeres
                    → predicción: "el ciclo promedio es de 28 días"
                    → error para una mujer con ciclos de 22–35 días: alto

✅ Modelo por usuaria: un modelo por persona, entrenado con sus propios ciclos
                    → predicción: "tu ciclo varía entre 22 y 35 días,
                       basándome en tus últimos 8 ciclos"
                    → error: significativamente menor
```

### Privacidad como restricción de diseño

Los datos nunca salen del sistema de EVA para entrenar modelos:
- Sin APIs externas de ML (Google AutoML, Azure ML, etc.)
- Sin envío de datos a OpenAI, Anthropic u otros LLMs en la nube para el análisis del ciclo
- El LLM recibe solo estadísticas agregadas del ciclo, nunca datos crudos o PII

### Graceful degradation

El sistema funciona aunque no haya modelo ML:

```
Ciclos disponibles → Estrategia de predicción
─────────────────────────────────────────────
0 ciclos           → Sin predicción (mensaje informativo)
1 ciclo            → Heurística: asumir 28 días
2 ciclos           → Heurística: promedio de los 2
3+ ciclos          → Heurística (hasta que se entrene Prophet)
3+ ciclos + modelo → Prophet (más preciso)
```

---

## 2. Por qué no redes neuronales

| Criterio | Red neuronal (LSTM) | Prophet (EVA) |
|---|---|---|
| Datos mínimos para ser útil | 500–1000+ ejemplos | 3–6 ciclos |
| Datos de una usuaria típica | 10–20 ciclos/año | 10–20 ciclos/año |
| Interpretabilidad | Caja negra | Alta (tendencia, estacionalidad visibles) |
| Costo computacional | Alto (GPU recomendada) | Bajo (CPU suficiente) |
| Overfitting con pocos datos | Muy probable | Manejado por regularización interna |
| Manejo de estacionalidad cíclica | Requiere configuración | Nativo |
| Deploy en Render (plan gratuito) | Difícil (memoria) | Viable |
| Reentrenamiento nocturno | Lento | Rápido (segundos por usuaria) |

**Conclusión:** Prophet es la elección correcta para el dominio específico de EVA — series de tiempo cíclicas con pocos datos por usuaria.

---

## 3. Fase 1 — Predicción heurística (Sprint 5)

La heurística no es ML. Es una regla de negocio simple que da resultados aceptables mientras se acumulan datos para entrenar Prophet.

### Algoritmo

```python
# services/prediction_service.py
from datetime import date, timedelta
from typing import Optional
from app.repositories.cycle_repo import get_cycles_by_user

async def predict_next_cycle_heuristic(user_id: str) -> dict:
    cycles = await get_cycles_by_user(user_id, limit=12)

    if not cycles:
        return {
            "prediction_source": "none",
            "message": "Registra al menos un ciclo para obtener predicciones."
        }

    if len(cycles) == 1:
        predicted = cycles[0].start_date + timedelta(days=28)
        return {
            "predicted_start_date": predicted,
            "confidence_range": {
                "early": predicted - timedelta(days=3),
                "late":  predicted + timedelta(days=3),
            },
            "prediction_source": "heuristic",
            "note": "Basado en el ciclo promedio de 28 días (solo tienes 1 ciclo registrado)"
        }

    # Calcular duración entre inicios de ciclos consecutivos
    durations = [
        (cycles[i - 1].start_date - cycles[i].start_date).days
        # cycles está ordenado DESC, por eso el orden es invertido
        for i in range(1, len(cycles))
    ]

    avg_duration    = sum(durations) / len(durations)
    std_duration    = (sum((d - avg_duration) ** 2 for d in durations) / len(durations)) ** 0.5
    predicted_date  = cycles[0].start_date + timedelta(days=round(avg_duration))

    return {
        "predicted_start_date": predicted_date,
        "confidence_range": {
            "early": predicted_date - timedelta(days=round(std_duration)),
            "late":  predicted_date + timedelta(days=round(std_duration)),
        },
        "avg_cycle_length": round(avg_duration, 1),
        "cycle_variability": round(std_duration, 1),
        "cycles_analyzed": len(durations),
        "prediction_source": "heuristic",
    }
```

### Precisión esperada

- Ciclos regulares (variabilidad < 3 días): 80–90% dentro de ±2 días
- Ciclos irregulares (variabilidad > 5 días): 60–70% dentro de ±4 días
- Casos de SOP o perimenopausia: 50–60% (aquí Prophet marca la diferencia)

---

## 4. Fase 2 — ML real con Prophet (Sprints 7–8)

### ¿Qué es Prophet?

Prophet es una librería de Meta Research diseñada para series de tiempo con:
- Patrones de estacionalidad (semanal, mensual, anual)
- Tendencias no lineales
- Manejo de valores atípicos (outliers)
- Intervalos de incertidumbre automáticos

El ciclo menstrual es una serie de tiempo con estacionalidad natural — exactamente el caso de uso para el que Prophet fue diseñado.

### Instalación

```bash
pip install prophet
# Prophet requiere pystan como dependencia — puede tardar en instalar
# Si hay problemas en Windows: pip install prophet --no-build-isolation
```

### Implementación completa

```python
# services/ml_service.py
# SRP: este servicio SOLO entrena y predice. No hace CRUD de ciclos.

import joblib
import pandas as pd
from prophet import Prophet
from pathlib import Path
from datetime import date
from typing import Optional
import logging

logger = logging.getLogger(__name__)

MODELS_DIR = Path("ml_models")
MODELS_DIR.mkdir(exist_ok=True)

MIN_CYCLES_TO_TRAIN = 3


def get_model_path(user_id: str) -> Path:
    return MODELS_DIR / f"user_{user_id}.pkl"


def train_model(user_id: str, cycles_data: list[dict]) -> dict:
    """
    Entrena un modelo Prophet para la usuaria.

    Args:
        user_id: UUID de la usuaria
        cycles_data: lista de dicts con 'start_date' y features adicionales

    Returns:
        dict con mae, cycles_used y model_path
    """
    if len(cycles_data) < MIN_CYCLES_TO_TRAIN:
        raise ValueError(
            f"Se necesitan al menos {MIN_CYCLES_TO_TRAIN} ciclos para entrenar. "
            f"La usuaria tiene {len(cycles_data)}."
        )

    # Preparar dataframe para Prophet
    # Prophet requiere columnas 'ds' (fecha) e 'y' (valor a predecir)
    df = pd.DataFrame(cycles_data)
    df["ds"] = pd.to_datetime(df["start_date"])

    # y = duración hasta el siguiente ciclo (lo que predecimos)
    df = df.sort_values("ds")
    df["y"] = df["ds"].diff().dt.days.shift(-1)
    df = df.dropna(subset=["y"])  # última fila no tiene ciclo siguiente

    if len(df) < 2:
        raise ValueError("Datos insuficientes después de calcular duraciones.")

    # Configurar Prophet
    model = Prophet(
        yearly_seasonality=False,    # ciclos menstruales no tienen estacionalidad anual
        weekly_seasonality=False,    # ni semanal
        daily_seasonality=False,
        seasonality_mode="additive",
        interval_width=0.80,         # intervalo de confianza del 80%
        changepoint_prior_scale=0.05 # regularización conservadora (pocos datos)
    )

    # Agregar regresores si están disponibles
    if "avg_symptoms_lutea" in df.columns:
        model.add_regressor("avg_symptoms_lutea")
    if "avg_flow_level" in df.columns:
        model.add_regressor("avg_flow_level")

    model.fit(df)

    # Evaluar con leave-one-out cross validation
    mae = _evaluate_model(model, df)

    # Serializar y guardar
    model_path = get_model_path(user_id)
    joblib.dump(model, model_path)

    logger.info(f"Modelo entrenado para usuario {user_id[:8]}... | MAE: {mae:.2f} días | Ciclos: {len(df)}")

    return {
        "model_path": str(model_path),
        "mae": round(mae, 3),
        "cycles_used": len(df),
    }


def predict_next_cycle(user_id: str, last_cycle_start: date) -> Optional[dict]:
    """
    Predice el próximo ciclo usando el modelo entrenado.
    Retorna None si no existe modelo para la usuaria.
    """
    model_path = get_model_path(user_id)

    if not model_path.exists():
        return None  # Fallback a heurística en prediction_service.py

    model: Prophet = joblib.load(model_path)

    # Crear dataframe futuro (predecir 1 período adelante)
    future = model.make_future_dataframe(periods=1, freq="28D")
    forecast = model.predict(future)

    # Tomar la última predicción (próximo ciclo)
    last_forecast = forecast.iloc[-1]

    predicted_start = pd.Timestamp(last_cycle_start) + pd.Timedelta(days=int(last_forecast["yhat"]))

    return {
        "predicted_start_date": predicted_start.date(),
        "confidence_range": {
            "early": (pd.Timestamp(last_cycle_start) + pd.Timedelta(days=int(last_forecast["yhat_lower"]))).date(),
            "late":  (pd.Timestamp(last_cycle_start) + pd.Timedelta(days=int(last_forecast["yhat_upper"]))).date(),
        },
        "predicted_duration_days": round(last_forecast["yhat"], 1),
        "prediction_source": "prophet",
    }


def _evaluate_model(model: Prophet, df: pd.DataFrame) -> float:
    """
    Evaluación simple de leave-one-out para calcular MAE.
    Solo se usa en training, nunca en predicción.
    """
    if len(df) < 4:
        return 99.0  # No hay suficientes datos para evaluar correctamente

    errors = []
    for i in range(2, len(df)):  # entrenar con los primeros i ciclos, predecir el i+1
        train_df = df.iloc[:i].copy()
        actual = df.iloc[i]["y"]

        eval_model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=False,
            daily_seasonality=False,
            interval_width=0.80,
            changepoint_prior_scale=0.05
        )
        eval_model.fit(train_df)
        future = eval_model.make_future_dataframe(periods=1, freq="28D")
        forecast = eval_model.predict(future)
        predicted = forecast.iloc[-1]["yhat"]
        errors.append(abs(actual - predicted))

    return sum(errors) / len(errors)
```

---

## 5. Arquitectura del modelo por usuaria

```
backend/
└── ml_models/
    ├── user_550e8400-e29b-41d4-a716-446655440000.pkl   ← modelo serializado
    ├── user_123e4567-e89b-12d3-a456-426614174000.pkl
    └── ...

Tamaño aproximado por archivo: 50–200 KB
Con 1000 usuarias activas: ~100 MB total (manejable en Render)
```

### Ciclo de vida del modelo

```
Usuario registra ciclo N
        │
        ▼
¿Tiene >= 3 ciclos totales?
        │
   No ──┤── Heurística (prediction_service.py)
        │
   Sí ──▼
¿Existe user_{id}.pkl?
        │
   No ──┤── Encolar reentrenamiento (cron job nocturno)
        │   Mientras tanto: heurística
        │
   Sí ──▼
Predecir con Prophet (ml_service.predict_next_cycle)
        │
        ▼
Resultado enviado por prediction_service.py
(este servicio orquesta, ml_service solo predice)
```

---

## 6. Pipeline de features

### Features actuales (v1 — Sprint 7)

| Feature | Cálculo | Relevancia |
|---|---|---|
| `ds` | Fecha de inicio del ciclo | Requerida por Prophet |
| `y` | Días hasta el siguiente inicio | Variable objetivo |
| `avg_flow_level` | Promedio de flujo (none=0, light=1, medium=2, heavy=3) | Correlaciona con duración de sangrado |
| `avg_symptoms_lutea` | Promedio de síntomas en fase lútea | Indicador de SPM / variabilidad |

### Extracción de features (repositories/cycle_repo.py)

```python
async def get_cycles_with_features(user_id: str) -> list[dict]:
    """
    Retorna ciclos con features calculadas para entrenamiento ML.
    """
    query = """
    SELECT
        c.start_date,
        c.end_date,
        -- Feature: nivel de flujo promedio del ciclo
        COALESCE(
            AVG(CASE dl.flow_level
                WHEN 'heavy'  THEN 3
                WHEN 'medium' THEN 2
                WHEN 'light'  THEN 1
                ELSE 0
            END), 1.5
        ) AS avg_flow_level,
        -- Feature: síntomas en fase lútea (días 15-28)
        COALESCE(
            AVG(CASE
                WHEN dl.date - c.start_date >= 14
                THEN ds_count.symptom_count
                ELSE NULL
            END), 0
        ) AS avg_symptoms_lutea
    FROM cycles c
    LEFT JOIN daily_logs dl ON dl.cycle_id = c.id
    LEFT JOIN (
        SELECT log_id, COUNT(*) AS symptom_count
        FROM daily_symptoms
        GROUP BY log_id
    ) ds_count ON ds_count.log_id = dl.id
    WHERE c.user_id = :user_id
    GROUP BY c.id, c.start_date, c.end_date
    ORDER BY c.start_date ASC
    """
    async with engine.connect() as conn:
        result = await conn.execute(text(query), {"user_id": user_id})
        return [dict(row) for row in result.fetchall()]
```

### Features futuras (v2 — post-lanzamiento)

| Feature | Disponible cuando | Impacto esperado |
|---|---|---|
| `variability_3_cycles` | 4+ ciclos | Identifica ciclos irregulares |
| `temp_pattern_lutea` | Temperatura basal registrada | Confirmación de ovulación |
| `age_group` | Perfil de usuaria | Diferencia adolescentes / adultas / perimenopausia |
| `symptom_pattern_pms` | 3+ ciclos con síntomas | Detecta SPM severo |

---

## 7. Entrenamiento y reentrenamiento

### Entrenamiento inicial

Se dispara automáticamente cuando una usuaria alcanza 3 ciclos:

```python
# services/cycle_service.py
# Después de crear un ciclo exitosamente:

async def create_cycle(user_id: str, data: CycleCreate) -> Cycle:
    cycle = await cycle_repo.create_cycle(user_id, data)

    # Verificar si hay suficientes ciclos para entrenar
    total_cycles = await cycle_repo.count_cycles(user_id)
    if total_cycles >= MIN_CYCLES_TO_TRAIN:
        # Encolar en background task (no bloquear el response)
        background_tasks.add_task(trigger_ml_training, user_id)

    return cycle
```

### Reentrenamiento nocturno (cron job en Render)

```python
# scripts/retrain_models.py
# Ejecutado por Render como cron job a las 03:00 UTC

import asyncio
from app.repositories.user_repo import get_users_with_new_cycles
from app.services.ml_service import train_model
from app.repositories.cycle_repo import get_cycles_with_features
from app.repositories.ml_repo import upsert_ml_model

async def retrain_all():
    """Reentrena solo las usuarias que tienen ciclos nuevos desde el último entrenamiento."""

    users_to_retrain = await get_users_with_new_cycles()
    results = {"trained": 0, "skipped": 0, "failed": 0}

    for user in users_to_retrain:
        try:
            cycles_data = await get_cycles_with_features(user.id)
            if len(cycles_data) < 3:
                results["skipped"] += 1
                continue

            model_info = train_model(user.id, cycles_data)
            await upsert_ml_model(user.id, model_info)
            results["trained"] += 1

        except Exception as e:
            logger.error(f"Error reentrenando usuario {user.id[:8]}: {e}")
            results["failed"] += 1

    logger.info(f"Reentrenamiento completado: {results}")

if __name__ == "__main__":
    asyncio.run(retrain_all())
```

**Configuración en Render (render.yaml):**
```yaml
services:
  - type: web
    name: eva-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT

  - type: cron
    name: eva-ml-retrain
    env: python
    schedule: "0 3 * * *"   # 03:00 UTC todos los días
    buildCommand: pip install -r requirements.txt
    startCommand: python scripts/retrain_models.py
```

---

## 8. Métricas de evaluación

### MAE — Error Medio Absoluto

**Es la métrica principal de EVA.** Mide en promedio cuántos días se equivoca la predicción.

```
MAE = (1/n) × Σ |predicción_i - real_i|

Meta EVA: MAE < 1.5 días
```

**Interpretación:**
- MAE < 1.0 días → excelente (ciclos muy regulares)
- MAE 1.0–1.5 días → bueno (meta de EVA)
- MAE 1.5–2.5 días → aceptable (ciclos moderadamente irregulares)
- MAE > 2.5 días → insuficiente (ciclos muy irregulares, necesita más datos)

### Script de evaluación

```python
# scripts/evaluate_models.py

import asyncio
import pandas as pd
from pathlib import Path
from app.repositories.user_repo import get_all_active_users
from app.repositories.cycle_repo import get_cycles_with_features
from app.services.ml_service import get_model_path, predict_next_cycle
import joblib

async def evaluate_all_models():
    users = await get_all_active_users()
    maes = []

    for user in users:
        model_path = get_model_path(user.id)
        if not model_path.exists():
            continue

        cycles = await get_cycles_with_features(user.id)
        if len(cycles) < 4:
            continue

        # Holdout: usar el último ciclo como test
        train_cycles = cycles[:-1]
        actual_duration = (
            pd.Timestamp(cycles[-1]["start_date"])
            - pd.Timestamp(cycles[-2]["start_date"])
        ).days

        model = joblib.load(model_path)
        future = model.make_future_dataframe(periods=1, freq="28D")
        forecast = model.predict(future)
        predicted_duration = forecast.iloc[-1]["yhat"]

        mae = abs(actual_duration - predicted_duration)
        maes.append(mae)

    global_mae = sum(maes) / len(maes) if maes else 0
    print(f"MAE global: {global_mae:.2f} días | Modelos evaluados: {len(maes)}")
    return global_mae

if __name__ == "__main__":
    asyncio.run(evaluate_all_models())
```

---

## 9. Integración con el backend (SRP)

La separación de responsabilidades es crítica en el módulo ML:

```
routers/predictions.py
    │ Solo recibe HTTP, llama a prediction_service
    ▼
services/prediction_service.py
    │ Orquesta: ¿uso Prophet o heurística?
    │ Calcula la fase actual del ciclo
    │ Llama a ml_service o a la heurística
    ▼
services/ml_service.py
    │ SOLO entrena y predice con Prophet
    │ No hace queries a la BD
    │ No conoce la lógica de negocio
    ▼
repositories/cycle_repo.py
    SOLO habla con la BD
    Retorna datos crudos
```

### prediction_service.py (orquestador)

```python
# services/prediction_service.py

from app.services import ml_service
from app.repositories import cycle_repo, ml_model_repo
from app.utils.cycle_utils import calculate_current_phase

async def get_next_prediction(user_id: str) -> dict:
    """
    Punto de entrada único para predicciones.
    Decide automáticamente entre Prophet y heurística.
    """
    cycles = await cycle_repo.get_cycles_by_user(user_id, limit=20)

    if not cycles:
        return {"prediction_source": "none", "message": "Sin ciclos registrados."}

    # Calcular fase actual
    current_phase_info = calculate_current_phase(cycles[0])

    # Intentar usar Prophet
    ml_prediction = ml_service.predict_next_cycle(user_id, cycles[0].start_date)

    if ml_prediction:
        model_record = await ml_model_repo.get_by_user(user_id)
        return {
            **ml_prediction,
            **current_phase_info,
            "model_mae_days": model_record.mae if model_record else None,
            "cycles_used_for_training": model_record.cycles_used if model_record else None,
        }

    # Fallback a heurística
    heuristic = await predict_next_cycle_heuristic(user_id)
    return {**heuristic, **current_phase_info}
```

---

## 10. LLM conversacional — Ollama + Groq

### Arquitectura del LLM

```
POST /insights (question: str)
        │
        ▼
llm_service.py
        │
        ├── Construir contexto desde BD (NUNCA PII)
        │     { fase_actual, duracion_promedio, sintomas_frecuentes, ... }
        │
        ├── Intentar Ollama (local)
        │     ✓ Disponible → respuesta local, datos no salen del servidor
        │     ✗ Error → fallback a Groq
        │
        └── Groq API (fallback)
              ✓ Disponible → respuesta externa (estadísticas agregadas)
              ✗ Error → 503 Service Unavailable
```

### llm_service.py

```python
# services/llm_service.py
# SRP: este servicio SOLO interactúa con el LLM. No hace predicciones ni CRUD.

import httpx
from typing import Optional

OLLAMA_BASE_URL = "http://localhost:11434"
OLLAMA_MODEL    = "mistral"   # o "llama3" según lo disponible

GROQ_API_URL    = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL      = "llama3-8b-8192"  # modelo gratuito de Groq

SYSTEM_PROMPT = """
Eres EVA, una asistente de salud menstrual. Respondes en español, con tono cálido,
empático y basado en evidencia científica. Tus respuestas son concisas (máximo 4 oraciones)
y siempre incluyen el disclaimer de que no reemplazas al médico.

Principios:
- Solo hablas de salud menstrual y temas relacionados
- Nunca haces diagnósticos médicos
- Si la usuaria menciona síntomas graves, la remites a su ginecóloga
- Usas los datos del ciclo proporcionados para personalizar la respuesta
"""

def build_context_prompt(cycle_context: dict, question: str) -> str:
    """Construye el prompt con contexto del ciclo. Nunca incluye PII."""
    return f"""
Contexto del ciclo actual:
- Fase: {cycle_context.get('fase_actual', 'desconocida')}
- Día del ciclo: {cycle_context.get('dia_del_ciclo', '?')}
- Duración promedio de sus ciclos: {cycle_context.get('duracion_promedio', 28)} días
- Síntomas más frecuentes: {', '.join(cycle_context.get('sintomas_frecuentes', []))}
- Intensidad de síntomas actual: {cycle_context.get('intensidad_actual', 'moderada')}
- Días hasta el próximo período: {cycle_context.get('dias_hasta_siguiente', '?')}

Pregunta: {question}
"""

async def get_insight(question: str, cycle_context: dict) -> dict:
    """Obtiene un insight del LLM. Intenta Ollama primero, luego Groq."""

    prompt = build_context_prompt(cycle_context, question)

    # Intento 1: Ollama (local)
    ollama_response = await _call_ollama(prompt)
    if ollama_response:
        return {
            "insight": ollama_response,
            "source": f"ollama/{OLLAMA_MODEL}",
            "disclaimer": "EVA no reemplaza el consejo médico profesional."
        }

    # Intento 2: Groq API (fallback gratuito)
    groq_response = await _call_groq(prompt)
    if groq_response:
        return {
            "insight": groq_response,
            "source": f"groq/{GROQ_MODEL}",
            "disclaimer": "EVA no reemplaza el consejo médico profesional."
        }

    raise RuntimeError("LLM service unavailable")


async def _call_ollama(prompt: str) -> Optional[str]:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": f"{SYSTEM_PROMPT}\n\n{prompt}",
                    "stream": False,
                    "options": {"temperature": 0.7, "num_predict": 300}
                }
            )
            response.raise_for_status()
            return response.json()["response"].strip()
    except Exception:
        return None


async def _call_groq(prompt: str) -> Optional[str]:
    from app.core.config import settings
    if not settings.GROQ_API_KEY:
        return None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                json={
                    "model": GROQ_MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user",   "content": prompt}
                    ],
                    "max_tokens": 300,
                    "temperature": 0.7,
                }
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return None
```

### Instalar Ollama (guía para el equipo)

```bash
# Linux / Ubuntu (servidor Render o local)
curl -fsSL https://ollama.ai/install.sh | sh

# Descargar modelo (hacer una vez)
ollama pull mistral       # 4.1 GB — recomendado
# o
ollama pull llama3        # 4.7 GB — alternativa

# Verificar que funciona
ollama run mistral "¿Qué es la fase lútea?"

# Iniciar servidor Ollama en background
ollama serve &
```

---

## 11. Privacidad en el pipeline ML

### Qué datos usa el ML

| Dato | ¿Entra al modelo Prophet? | ¿Entra al LLM? | Almacenado en .pkl |
|---|---|---|---|
| Fecha de inicio de ciclo | ✅ Sí (ds) | No | No |
| Duración del ciclo | ✅ Sí (y) | Solo como estadística | No |
| Nivel de flujo | ✅ Sí (feature) | Solo promedio | No |
| Síntomas + intensidades | ✅ Sí (conteo agregado) | Solo lista de nombres | No |
| Temperatura basal | ✅ Sí (feature futura) | No | No |
| Email | ❌ Nunca | ❌ Nunca | ❌ Nunca |
| Nombre | ❌ Nunca | ❌ Nunca | ❌ Nunca |
| Fecha de nacimiento | Solo edad calculada | No | No |
| IP / dispositivo | ❌ Nunca | ❌ Nunca | ❌ Nunca |

### Qué contiene el archivo .pkl

El archivo serializado de Prophet contiene:
- Los parámetros del modelo ajustados a los datos de la usuaria
- Las fechas de entrenamiento (solo timestamps, sin contenido)
- Las features numéricas (sin identificadores personales)

El `.pkl` **no** contiene: email, nombre, síntomas como texto, notas, ni ninguna PII.

### Eliminación de cuenta

Cuando una usuaria elimina su cuenta:

```python
# services/user_service.py
async def delete_user(user_id: str):
    # 1. Eliminar datos de BD (CASCADE automático por FK)
    await user_repo.delete_user(user_id)

    # 2. Eliminar modelo ML local
    model_path = get_model_path(user_id)
    if model_path.exists():
        model_path.unlink()  # borrar el archivo .pkl

    # 3. Eliminar de Supabase Auth
    await supabase.auth.admin.delete_user(user_id)
```

---

## 12. Testing del módulo ML

### Tests unitarios — ml_service.py

```python
# tests/test_ml_service.py

import pytest
from datetime import date, timedelta
from app.services.ml_service import train_model, predict_next_cycle, get_model_path

def make_cycles(n: int, base_duration: int = 28, noise: int = 0):
    """Genera N ciclos sintéticos con duración base +/- noise días."""
    import random
    cycles = []
    current = date(2024, 1, 1)
    for i in range(n):
        duration = base_duration + random.randint(-noise, noise)
        cycles.append({"start_date": current, "avg_flow_level": 1.5, "avg_symptoms_lutea": 2.0})
        current += timedelta(days=duration)
    return cycles

def test_train_requires_minimum_cycles():
    """No debe entrenar con menos de 3 ciclos."""
    with pytest.raises(ValueError, match="al menos"):
        train_model("test-user-001", make_cycles(2))

def test_train_regular_cycles(tmp_path, monkeypatch):
    """Entrenar con ciclos regulares debe producir MAE < 2 días."""
    monkeypatch.setattr("app.services.ml_service.MODELS_DIR", tmp_path)
    result = train_model("test-user-002", make_cycles(6, base_duration=28, noise=0))
    assert result["mae"] < 2.0
    assert result["cycles_used"] == 5  # 6 ciclos → 5 duraciones

def test_train_irregular_cycles(tmp_path, monkeypatch):
    """Ciclos irregulares deben entrenar sin errores (MAE puede ser mayor)."""
    monkeypatch.setattr("app.services.ml_service.MODELS_DIR", tmp_path)
    result = train_model("test-user-003", make_cycles(8, base_duration=26, noise=6))
    assert "mae" in result
    assert result["cycles_used"] >= 4

def test_predict_returns_none_without_model(tmp_path, monkeypatch):
    """Sin modelo guardado debe retornar None (fallback a heurística)."""
    monkeypatch.setattr("app.services.ml_service.MODELS_DIR", tmp_path)
    result = predict_next_cycle("nonexistent-user", date.today())
    assert result is None

def test_predict_after_training(tmp_path, monkeypatch):
    """Después de entrenar, predict debe retornar una fecha futura."""
    monkeypatch.setattr("app.services.ml_service.MODELS_DIR", tmp_path)
    cycles = make_cycles(6)
    train_model("test-user-004", cycles)
    result = predict_next_cycle("test-user-004", cycles[-1]["start_date"])
    assert result is not None
    assert result["predicted_start_date"] > cycles[-1]["start_date"]
    assert result["prediction_source"] == "prophet"
```

### Tests del LLM

```python
# tests/test_llm_service.py

import pytest
from unittest.mock import patch, AsyncMock
from app.services.llm_service import get_insight

MOCK_CONTEXT = {
    "fase_actual": "lutea",
    "dia_del_ciclo": 20,
    "duracion_promedio": 28,
    "sintomas_frecuentes": ["Fatiga", "Irritabilidad"],
    "intensidad_actual": "moderada",
    "dias_hasta_siguiente": 8,
}

@pytest.mark.asyncio
async def test_insight_uses_ollama_first():
    """El servicio debe intentar Ollama antes que Groq."""
    with patch("app.services.llm_service._call_ollama", new_callable=AsyncMock) as mock_ollama:
        mock_ollama.return_value = "Respuesta de prueba de Ollama."
        result = await get_insight("¿Por qué estoy cansada?", MOCK_CONTEXT)
        assert result["source"].startswith("ollama")
        assert "ollama" in result["source"]

@pytest.mark.asyncio
async def test_insight_falls_back_to_groq():
    """Si Ollama falla, debe usar Groq."""
    with patch("app.services.llm_service._call_ollama", new_callable=AsyncMock) as mock_ollama, \
         patch("app.services.llm_service._call_groq", new_callable=AsyncMock) as mock_groq:
        mock_ollama.return_value = None
        mock_groq.return_value = "Respuesta de prueba de Groq."
        result = await get_insight("¿Por qué estoy cansada?", MOCK_CONTEXT)
        assert result["source"].startswith("groq")

@pytest.mark.asyncio
async def test_insight_raises_when_both_fail():
    """Si ambos LLMs fallan, debe lanzar RuntimeError."""
    with patch("app.services.llm_service._call_ollama", new_callable=AsyncMock) as mock_ollama, \
         patch("app.services.llm_service._call_groq", new_callable=AsyncMock) as mock_groq:
        mock_ollama.return_value = None
        mock_groq.return_value = None
        with pytest.raises(RuntimeError):
            await get_insight("¿Por qué estoy cansada?", MOCK_CONTEXT)
```

---

## 13. Roadmap ML por sprint

| Sprint | Tarea ML | Asignado | Entregable |
|---|---|---|---|
| S5 | Implementar `prediction_service.py` con heurística | Meriyei | Endpoint `/predictions/next` funcional |
| S5 | Integrar Ollama básico | Madeleine | Endpoint `/insights` con respuestas locales |
| S5 | Tests unitarios heurística | Madeleine | pytest con MAE calculado en datos sintéticos |
| S7 | Implementar `ml_service.py` con Prophet | Madeleine | Modelos `.pkl` generados por usuaria |
| S7 | Pipeline de features (cycle_repo) | Meriyei | Query SQL con features calculadas |
| S7 | Script de reentrenamiento nocturno | Madeleine | Cron job en Render |
| S7 | Tests Prophet con datos sintéticos | Madeleine | 4 tests cubriendo casos edge |
| S7 | LLM con contexto real del ciclo | Madeleine | `/insights` usa datos reales de BD |
| S8 | Integrar Prophet en `/predictions/next` | Meriyei | Predicción ML en producción |
| S8 | Script de evaluación de MAE global | Madeleine | MAE < 1.5 días verificado |
| S9 | Auditoria de privacidad ML | Meriyei + Madeleine | Confirmar que ningún .pkl tiene PII |

---

*Última actualización: Sprint 1 — Documento inicial*
*Responsable: Madeleine (ML/AI) · Revisión técnica: Meriyei (features y datos)*