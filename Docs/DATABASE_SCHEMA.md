# EVA — Database Schema

> Motor: PostgreSQL 15 (Supabase)
> Normalización: Tercera Forma Normal (3NF)
> ORM / Query builder: SQLAlchemy Core (sin ORM)
> Migraciones: Alembic

---

## Tabla de contenidos

- [EVA — Database Schema](#eva--database-schema)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [1. Principios de diseño](#1-principios-de-diseño)
    - [¿Por qué 3NF en datos médicos?](#por-qué-3nf-en-datos-médicos)
    - [SQLAlchemy Core vs ORM](#sqlalchemy-core-vs-orm)
  - [2. Diagrama de relaciones](#2-diagrama-de-relaciones)
  - [3. Tablas](#3-tablas)
    - [3.1 users](#31-users)
    - [3.2 cycles](#32-cycles)
    - [3.3 daily\_logs](#33-daily_logs)
    - [3.4 symptoms\_catalog](#34-symptoms_catalog)
    - [3.5 daily\_symptoms](#35-daily_symptoms)
    - [3.6 ml\_models](#36-ml_models)
    - [3.7 llm\_insights](#37-llm_insights)
    - [3.8 sync\_operations](#38-sync_operations)
  - [4. Índices](#4-índices)
  - [5. Script SQL completo](#5-script-sql-completo)
  - [6. Seed de síntomas](#6-seed-de-síntomas)
  - [7. Migraciones con Alembic](#7-migraciones-con-alembic)
    - [Setup inicial](#setup-inicial)
    - [Primera migración (Sprint 1)](#primera-migración-sprint-1)
    - [Estructura de migraciones por sprint](#estructura-de-migraciones-por-sprint)
    - [Ejemplo de migración manual](#ejemplo-de-migración-manual)
  - [8. Configuración en Supabase](#8-configuración-en-supabase)
    - [Paso 1 — Ejecutar el schema](#paso-1--ejecutar-el-schema)
    - [Paso 2 — Ejecutar el seed](#paso-2--ejecutar-el-seed)
    - [Paso 3 — Obtener credenciales](#paso-3--obtener-credenciales)
    - [Paso 4 — Activar Row Level Security](#paso-4--activar-row-level-security)
  - [9. Queries frecuentes](#9-queries-frecuentes)
    - [Listar ciclos de un usuario (cycle\_repo.py)](#listar-ciclos-de-un-usuario-cycle_repopy)
    - [Calcular duración promedio de ciclos (analytics\_service.py)](#calcular-duración-promedio-de-ciclos-analytics_servicepy)
    - [Top síntomas de una usuaria (analytics\_service.py)](#top-síntomas-de-una-usuaria-analytics_servicepy)
    - [Datos para entrenar Prophet (ml\_service.py)](#datos-para-entrenar-prophet-ml_servicepy)
  - [10. Políticas de Row Level Security (RLS)](#10-políticas-de-row-level-security-rls)
    - [Activar RLS en todas las tablas](#activar-rls-en-todas-las-tablas)
    - [Políticas por tabla](#políticas-por-tabla)

---

## 1. Principios de diseño

### ¿Por qué 3NF en datos médicos?

La Tercera Forma Normal garantiza integridad referencial y evita anomalías de actualización — crítico cuando los datos son de salud.

**1NF — Atomicidad:** cada celda contiene exactamente un valor.

```
❌ Mal diseño (viola 1NF):
daily_logs: { sintomas: "dolor,fatiga,nauseas", intensidades: "4,2,3" }

✅ Diseño EVA (cumple 1NF):
daily_symptoms: una fila por síntoma, con su propia intensidad
```

**2NF — Sin dependencias parciales:** todos los atributos dependen de la clave primaria completa.

```
daily_symptoms (log_id, symptom_id) → intensity
✅ intensity depende de AMBAS columnas de la clave compuesta
```

**3NF — Sin dependencias transitivas:** los atributos no clave no dependen entre sí.

```
❌ Viola 3NF: daily_symptoms con columna symptom_name
   (symptom_name depende de symptom_id, no de la PK completa)

✅ EVA: symptom_name vive en symptoms_catalog
   daily_symptoms solo guarda symptom_id + intensity
```

### SQLAlchemy Core vs ORM

EVA usa **SQLAlchemy Core** (query builder) en lugar del ORM por las siguientes razones:

| Criterio | SQLAlchemy ORM | SQLAlchemy Core |
|---|---|---|
| Control del SQL | Limitado (magia oculta) | Total |
| Performance | N+1 queries frecuentes | Queries optimizadas explícitas |
| Debuggability | Difícil inspeccionar SQL generado | El SQL es lo que escribiste |
| Ideal para | CRUD simple | Queries complejas de analytics |
| Curva de aprendizaje | Menor | Mayor, pero más transferible |

---

## 2. Diagrama de relaciones

```
┌─────────────┐
│    users    │
│─────────────│
│ id (PK)     │◄──────────────────────────────┐
│ email       │                               │
│ birth_date  │                               │
│ created_at  │                               │
└──────┬──────┘                               │
       │ 1                                    │
       │                                      │
       │ N                                    │
┌──────▼──────┐     ┌─────────────────┐       │
│   cycles    │     │   ml_models     │       │
│─────────────│     │─────────────────│       │
│ id (PK)     │     │ id (PK)         │       │
│ user_id (FK)│     │ user_id (FK)────┼───────┘
│ start_date  │     │ model_path      │
│ end_date    │     │ mae             │
│ created_at  │     │ trained_at      │
└──────┬──────┘     │ cycles_used     │
       │ 1          └─────────────────┘
       │
       │ N
┌──────▼──────┐     ┌──────────────────┐
│ daily_logs  │     │  llm_insights    │
│─────────────│     │──────────────────│
│ id (PK)     │     │ id (PK)          │
│ cycle_id(FK)│     │ user_id (FK)─────┼──► users
│ date        │     │ question         │
│ flow_level  │     │ insight          │
│ temperature │     │ phase            │
│ notes       │     │ source           │
└──────┬──────┘     │ created_at       │
       │ 1          └──────────────────┘
       │
       │ N
┌──────▼──────────┐     ┌─────────────────────┐
│ daily_symptoms  │     │  symptoms_catalog   │
│─────────────────│     │─────────────────────│
│ log_id (FK, PK) │────►│ id (PK)             │
│ symptom_id(FK,PK│     │ name                │
│ intensity       │     │ category            │
└─────────────────┘     └─────────────────────┘

┌─────────────────────┐
│  sync_operations    │
│─────────────────────│
│ id (PK)             │
│ user_id (FK)────────┼──► users
│ client_id (UNIQUE)  │
│ type                │
│ payload (JSONB)     │
│ status              │
│ applied_at          │
└─────────────────────┘
```

---

## 3. Tablas

### 3.1 users

Almacena el perfil básico del usuario. El email y la autenticación los maneja Supabase Auth — esta tabla extiende el perfil con datos médicos relevantes.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() | Mismo UUID que Supabase Auth |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Email del usuario |
| `birth_date` | DATE | NULL | Para calcular edad en features ML |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Fecha de registro |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Última actualización |

**Nota:** El `id` de esta tabla debe coincidir con el `auth.users.id` de Supabase para que RLS funcione correctamente.

---

### 3.2 cycles

Un ciclo representa un período menstrual completo, desde el inicio del sangrado hasta el inicio del siguiente.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() | Identificador único |
| `user_id` | UUID | FK → users(id) ON DELETE CASCADE | Propietaria del ciclo |
| `start_date` | DATE | NOT NULL | Primer día de sangrado (día 1) |
| `end_date` | DATE | NULL | Último día del ciclo (día antes del siguiente inicio) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Cuándo se registró |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Última edición |

**Constraints:**
- `end_date >= start_date` cuando `end_date` no es NULL
- Un usuario no puede tener dos ciclos con el mismo `start_date`

**Duración del ciclo** se calcula en el servicio:
```python
# cycle_service.py
duration = (next_cycle.start_date - current_cycle.start_date).days
```

---

### 3.3 daily_logs

Registro diario de síntomas, flujo y temperatura. Un registro por día por ciclo.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() | Identificador único |
| `cycle_id` | UUID | FK → cycles(id) ON DELETE CASCADE | Ciclo al que pertenece |
| `date` | DATE | NOT NULL | Día del registro |
| `flow_level` | VARCHAR(10) | CHECK IN ('none','light','medium','heavy') | Nivel de sangrado |
| `temperature` | DECIMAL(4,2) | NULL | Temperatura basal en °C (ej: 36.75) |
| `notes` | TEXT | NULL | Notas libres de la usuaria |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Cuándo se creó |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Última edición |

**Constraints:**
- `UNIQUE(cycle_id, date)` — un solo log por día por ciclo
- `temperature` entre 35.0 y 42.0 si se provee

---

### 3.4 symptoms_catalog

Catálogo maestro de síntomas. No lo editan las usuarias — es una tabla de referencia seeded.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | SERIAL | PK | Identificador incremental |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE | Nombre del síntoma en español |
| `category` | VARCHAR(20) | CHECK IN ('fisica','emocional','digestiva','otra') | Categoría |
| `common_phase` | VARCHAR(20) | NULL | Fase donde más ocurre (referencia educativa) |

**Nota de 3NF:** el nombre del síntoma vive aquí, no se repite en `daily_symptoms`. Esto garantiza que si un síntoma se renombra, se actualiza en un solo lugar.

---

### 3.5 daily_symptoms

Tabla puente entre `daily_logs` y `symptoms_catalog`. Implementa la relación muchos-a-muchos con intensidad.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `log_id` | UUID | FK → daily_logs(id) ON DELETE CASCADE, parte de PK | Log del día |
| `symptom_id` | INTEGER | FK → symptoms_catalog(id), parte de PK | Síntoma del catálogo |
| `intensity` | SMALLINT | CHECK BETWEEN 1 AND 5, NOT NULL | Intensidad subjetiva |

**Clave primaria compuesta:** `(log_id, symptom_id)` — garantiza que un síntoma no se registre dos veces en el mismo día.

**Escala de intensidad:**
- 1 = Muy leve (apenas perceptible)
- 2 = Leve
- 3 = Moderado
- 4 = Intenso
- 5 = Muy intenso (incapacitante)

---

### 3.6 ml_models

Registra el estado y métricas del modelo Prophet entrenado por usuaria.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() | Identificador único |
| `user_id` | UUID | FK → users(id) ON DELETE CASCADE, UNIQUE | Una entrada por usuaria |
| `model_path` | TEXT | NOT NULL | Ruta al archivo .pkl en el sistema |
| `mae` | DECIMAL(5,3) | NULL | Error medio absoluto en días |
| `cycles_used` | INTEGER | NULL | Número de ciclos usados para entrenar |
| `trained_at` | TIMESTAMPTZ | DEFAULT NOW() | Última vez que se entrenó |
| `is_active` | BOOLEAN | DEFAULT TRUE | Si el modelo está disponible para predicción |

**Nota:** el archivo `.pkl` real se guarda en `backend/ml_models/user_{user_id}.pkl`.

---

### 3.7 llm_insights

Historial de conversaciones con el asistente EVA.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() | Identificador único |
| `user_id` | UUID | FK → users(id) ON DELETE CASCADE | Propietaria |
| `question` | TEXT | NOT NULL | Pregunta de la usuaria |
| `insight` | TEXT | NOT NULL | Respuesta del LLM |
| `phase` | VARCHAR(20) | NULL | Fase del ciclo en el momento de la pregunta |
| `source` | VARCHAR(50) | NOT NULL | Modelo usado ('ollama/mistral', 'groq/llama3') |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Cuándo se generó |

**Privacidad:** esta tabla no almacena el contexto enviado al LLM (solo la pregunta y respuesta), y nunca contiene PII.

---

### 3.8 sync_operations

Registro de operaciones offline procesadas. Permite idempotencia en el endpoint `/sync`.

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | UUID | PK, default gen_random_uuid() | Identificador del servidor |
| `user_id` | UUID | FK → users(id) ON DELETE CASCADE | Propietaria |
| `client_id` | VARCHAR(100) | UNIQUE, NOT NULL | ID generado por el cliente offline |
| `type` | VARCHAR(30) | NOT NULL | Tipo de operación (CREATE_CYCLE, etc.) |
| `payload` | JSONB | NOT NULL | Datos de la operación |
| `status` | VARCHAR(20) | DEFAULT 'applied' | Estado: applied / skipped / failed |
| `applied_at` | TIMESTAMPTZ | DEFAULT NOW() | Cuándo se procesó |

---

## 4. Índices

Los índices están diseñados para optimizar las queries más frecuentes de EVA.

```sql
-- cycles: query más frecuente — listar ciclos de un usuario ordenados por fecha
CREATE INDEX idx_cycles_user_date ON cycles(user_id, start_date DESC);

-- daily_logs: buscar logs de un ciclo específico
CREATE INDEX idx_daily_logs_cycle ON daily_logs(cycle_id, date);

-- daily_symptoms: buscar síntomas de un log
CREATE INDEX idx_daily_symptoms_log ON daily_symptoms(log_id);

-- daily_symptoms: buscar todos los logs que tienen un síntoma específico (para analytics)
CREATE INDEX idx_daily_symptoms_symptom ON daily_symptoms(symptom_id);

-- ml_models: buscar el modelo de un usuario rápidamente
CREATE INDEX idx_ml_models_user ON ml_models(user_id);

-- llm_insights: historial de un usuario
CREATE INDEX idx_llm_insights_user_date ON llm_insights(user_id, created_at DESC);

-- sync_operations: verificar idempotencia por client_id
-- (ya cubierto por UNIQUE constraint, que crea índice automáticamente)
```

---

## 5. Script SQL completo

Ejecutar en Supabase → SQL Editor en este orden:

```sql
-- ============================================================
-- EVA — Schema completo
-- Ejecutar una sola vez al inicializar el proyecto
-- ============================================================

-- Extensión para UUIDs (ya viene en Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- TABLA: users
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) UNIQUE NOT NULL,
    birth_date  DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- TABLA: cycles
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cycles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date  DATE NOT NULL,
    end_date    DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_cycle_dates CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT uq_cycle_user_start UNIQUE (user_id, start_date)
);

CREATE INDEX idx_cycles_user_date ON cycles(user_id, start_date DESC);

-- ────────────────────────────────────────────────────────────
-- TABLA: daily_logs
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id     UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
    date         DATE NOT NULL,
    flow_level   VARCHAR(10) CHECK (flow_level IN ('none', 'light', 'medium', 'heavy')),
    temperature  DECIMAL(4,2) CHECK (temperature IS NULL OR temperature BETWEEN 35.0 AND 42.0),
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_log_cycle_date UNIQUE (cycle_id, date)
);

CREATE INDEX idx_daily_logs_cycle ON daily_logs(cycle_id, date);

-- ────────────────────────────────────────────────────────────
-- TABLA: symptoms_catalog
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS symptoms_catalog (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL UNIQUE,
    category      VARCHAR(20) NOT NULL CHECK (category IN ('fisica', 'emocional', 'digestiva', 'otra')),
    common_phase  VARCHAR(20) CHECK (common_phase IN ('menstruacion', 'folicular', 'ovulacion', 'lutea', 'todas'))
);

-- ────────────────────────────────────────────────────────────
-- TABLA: daily_symptoms (tabla puente — 1NF)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_symptoms (
    log_id      UUID NOT NULL REFERENCES daily_logs(id) ON DELETE CASCADE,
    symptom_id  INTEGER NOT NULL REFERENCES symptoms_catalog(id),
    intensity   SMALLINT NOT NULL CHECK (intensity BETWEEN 1 AND 5),

    PRIMARY KEY (log_id, symptom_id)
);

CREATE INDEX idx_daily_symptoms_log     ON daily_symptoms(log_id);
CREATE INDEX idx_daily_symptoms_symptom ON daily_symptoms(symptom_id);

-- ────────────────────────────────────────────────────────────
-- TABLA: ml_models
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ml_models (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    model_path   TEXT NOT NULL,
    mae          DECIMAL(5,3),
    cycles_used  INTEGER,
    trained_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active    BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_ml_models_user ON ml_models(user_id);

-- ────────────────────────────────────────────────────────────
-- TABLA: llm_insights
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS llm_insights (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question    TEXT NOT NULL,
    insight     TEXT NOT NULL,
    phase       VARCHAR(20) CHECK (phase IN ('menstruacion', 'folicular', 'ovulacion', 'lutea')),
    source      VARCHAR(50) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_llm_insights_user_date ON llm_insights(user_id, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- TABLA: sync_operations
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sync_operations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    client_id   VARCHAR(100) NOT NULL UNIQUE,
    type        VARCHAR(30) NOT NULL CHECK (type IN (
                    'CREATE_CYCLE', 'UPDATE_CYCLE', 'DELETE_CYCLE',
                    'CREATE_DAILY_LOG', 'UPDATE_DAILY_LOG', 'DELETE_DAILY_LOG'
                )),
    payload     JSONB NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'skipped', 'failed')),
    applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- TRIGGER: updated_at automático
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cycles_updated_at
    BEFORE UPDATE ON cycles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_daily_logs_updated_at
    BEFORE UPDATE ON daily_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 6. Seed de síntomas

Ejecutar después del schema para poblar el catálogo:

```sql
-- ============================================================
-- EVA — Seed de síntomas (30 síntomas base)
-- ============================================================
INSERT INTO symptoms_catalog (name, category, common_phase) VALUES
-- Físicos — menstruación y lútea
('Dolor abdominal (cólicos)',    'fisica',    'menstruacion'),
('Dolor lumbar',                 'fisica',    'menstruacion'),
('Dolor de cabeza / migraña',    'fisica',    'lutea'),
('Fatiga',                       'fisica',    'lutea'),
('Sensibilidad mamaria',         'fisica',    'lutea'),
('Hinchazón corporal',           'digestiva', 'lutea'),
('Calambres en piernas',         'fisica',    'menstruacion'),
('Acné / brotes en piel',        'fisica',    'lutea'),
('Temperatura basal elevada',    'fisica',    'lutea'),
('Insomnio / sueño alterado',    'fisica',    'lutea'),
('Energía alta',                 'fisica',    'folicular'),
('Piel radiante',                'fisica',    'folicular'),
('Dolor ovulatorio (Mittelschmerz)', 'fisica', 'ovulacion'),
('Flujo abundante',              'fisica',    'ovulacion'),
('Sofocos',                      'fisica',    'todas'),

-- Digestivos
('Náuseas',                      'digestiva', 'menstruacion'),
('Antojos de comida',            'digestiva', 'lutea'),
('Estreñimiento',                'digestiva', 'lutea'),
('Diarrea',                      'digestiva', 'menstruacion'),
('Gases / distensión',           'digestiva', 'lutea'),

-- Emocionales
('Irritabilidad',                'emocional', 'lutea'),
('Ansiedad',                     'emocional', 'lutea'),
('Tristeza / llanto fácil',      'emocional', 'lutea'),
('Cambios de humor bruscos',     'emocional', 'lutea'),
('Dificultad de concentración',  'emocional', 'lutea'),
('Baja libido',                  'emocional', 'lutea'),
('Libido alta',                  'emocional', 'ovulacion'),
('Motivación / claridad mental', 'emocional', 'folicular'),
('Sensación de bienestar',       'emocional', 'folicular'),
('Aislamiento social',           'emocional', 'lutea');
```

---

## 7. Migraciones con Alembic

### Setup inicial

```bash
cd backend
pip install alembic
alembic init migrations
```

**`migrations/env.py`** — configurar la URL de la BD:
```python
from app.core.config import settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
```

### Primera migración (Sprint 1)

```bash
# Generar migración automática desde los modelos SQLAlchemy
alembic revision --autogenerate -m "initial_schema"

# Aplicar migración
alembic upgrade head

# Ver estado
alembic current
```

### Estructura de migraciones por sprint

```
migrations/versions/
├── 001_initial_schema.py          # Sprint 1: todas las tablas base
├── 002_add_symptoms_seed.py       # Sprint 3: seed del catálogo
├── 003_add_ml_models.py           # Sprint 7: tabla ml_models
└── 004_add_llm_insights.py        # Sprint 7: tabla llm_insights
```

### Ejemplo de migración manual

```python
# migrations/versions/001_initial_schema.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('birth_date', sa.Date(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('NOW()')),
    )

def downgrade():
    op.drop_table('users')
```

---

## 8. Configuración en Supabase

### Paso 1 — Ejecutar el schema

1. Ir a Supabase → **SQL Editor**
2. Pegar el script de la sección 5
3. Ejecutar
4. Verificar que aparecen las 8 tablas en **Table Editor**

### Paso 2 — Ejecutar el seed

1. En SQL Editor, pegar el script de la sección 6
2. Ejecutar
3. Verificar: `SELECT count(*) FROM symptoms_catalog;` → debe retornar 30

### Paso 3 — Obtener credenciales

En Supabase → **Project Settings → API:**

```
SUPABASE_URL = https://xxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET = your-jwt-secret   ← para validar tokens en FastAPI
DATABASE_URL = postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres
```

### Paso 4 — Activar Row Level Security

Ver sección 10 para las políticas RLS.

---

## 9. Queries frecuentes

Estas son las queries más usadas en los repositorios. Documentadas para referencia.

### Listar ciclos de un usuario (cycle_repo.py)

```python
from sqlalchemy import select, desc
from app.core.db import engine
from app.models.db_tables import cycles_table

async def get_cycles_by_user(user_id: str, limit: int = 20, offset: int = 0):
    query = (
        select(cycles_table)
        .where(cycles_table.c.user_id == user_id)
        .order_by(desc(cycles_table.c.start_date))
        .limit(limit)
        .offset(offset)
    )
    async with engine.connect() as conn:
        result = await conn.execute(query)
        return result.fetchall()
```

### Calcular duración promedio de ciclos (analytics_service.py)

```sql
-- SQL equivalente
SELECT
    AVG(
        EXTRACT(DAY FROM (
            LEAD(start_date) OVER (PARTITION BY user_id ORDER BY start_date)
            - start_date
        ))
    ) AS avg_duration,
    STDDEV(
        EXTRACT(DAY FROM (
            LEAD(start_date) OVER (PARTITION BY user_id ORDER BY start_date)
            - start_date
        ))
    ) AS variability
FROM cycles
WHERE user_id = $1
  AND start_date >= NOW() - INTERVAL '12 months';
```

### Top síntomas de una usuaria (analytics_service.py)

```sql
SELECT
    sc.id,
    sc.name,
    sc.category,
    COUNT(ds.log_id)::FLOAT / total_logs.total AS frequency,
    ROUND(AVG(ds.intensity)::NUMERIC, 2) AS avg_intensity
FROM daily_symptoms ds
JOIN symptoms_catalog sc ON sc.id = ds.symptom_id
JOIN daily_logs dl ON dl.id = ds.log_id
JOIN cycles c ON c.id = dl.cycle_id
CROSS JOIN (
    SELECT COUNT(DISTINCT id) AS total
    FROM daily_logs dl2
    JOIN cycles c2 ON c2.id = dl2.cycle_id
    WHERE c2.user_id = $1
) total_logs
WHERE c.user_id = $1
GROUP BY sc.id, sc.name, sc.category, total_logs.total
ORDER BY frequency DESC
LIMIT 10;
```

### Datos para entrenar Prophet (ml_service.py)

```sql
-- Obtener series de tiempo de ciclos para Prophet
-- Prophet necesita columnas 'ds' (fecha) e 'y' (valor a predecir)
SELECT
    start_date AS ds,
    COALESCE(
        EXTRACT(DAY FROM (
            LEAD(start_date) OVER (ORDER BY start_date) - start_date
        )),
        28  -- valor por defecto para el último ciclo
    ) AS y
FROM cycles
WHERE user_id = $1
ORDER BY start_date;
```

---

## 10. Políticas de Row Level Security (RLS)

RLS garantiza que una usuaria **nunca pueda ver datos de otra**, incluso si el JWT es válido.

### Activar RLS en todas las tablas

```sql
ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cycles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_models      ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_insights   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_operations ENABLE ROW LEVEL SECURITY;
```

### Políticas por tabla

```sql
-- users: solo puede ver y editar su propio perfil
CREATE POLICY "users_own_data" ON users
    FOR ALL USING (auth.uid() = id);

-- cycles: solo los ciclos propios
CREATE POLICY "cycles_own_data" ON cycles
    FOR ALL USING (auth.uid() = user_id);

-- daily_logs: solo los logs de sus propios ciclos
CREATE POLICY "daily_logs_own_data" ON daily_logs
    FOR ALL USING (
        cycle_id IN (
            SELECT id FROM cycles WHERE user_id = auth.uid()
        )
    );

-- daily_symptoms: solo los síntomas de sus propios logs
CREATE POLICY "daily_symptoms_own_data" ON daily_symptoms
    FOR ALL USING (
        log_id IN (
            SELECT dl.id FROM daily_logs dl
            JOIN cycles c ON c.id = dl.cycle_id
            WHERE c.user_id = auth.uid()
        )
    );

-- symptoms_catalog: lectura pública, sin escritura para usuarios
CREATE POLICY "symptoms_catalog_read" ON symptoms_catalog
    FOR SELECT USING (true);

-- ml_models: solo los modelos propios
CREATE POLICY "ml_models_own_data" ON ml_models
    FOR ALL USING (auth.uid() = user_id);

-- llm_insights: solo los propios
CREATE POLICY "llm_insights_own_data" ON llm_insights
    FOR ALL USING (auth.uid() = user_id);

-- sync_operations: solo las propias
CREATE POLICY "sync_operations_own_data" ON sync_operations
    FOR ALL USING (auth.uid() = user_id);
```

**Nota importante:** cuando FastAPI hace queries con SQLAlchemy usando el `DATABASE_URL` de Supabase (que usa el rol `postgres`), RLS no se aplica automáticamente. Para respetar RLS desde el backend:

```python
# core/db.py — establecer el user_id en cada sesión
async def get_db_for_user(user_id: str):
    async with engine.connect() as conn:
        await conn.execute(
            text("SET LOCAL app.current_user_id = :uid"),
            {"uid": user_id}
        )
        yield conn
```

O alternativamente, **validar el `user_id` en cada query** del repositorio (lo que hace EVA por defecto con el parámetro `user_id` en todas las queries).

---

*Última actualización: Sprint 1 — Schema inicial*
*Responsable: Meriyei (BD) · Revisión: Madeleine (índices y queries ML)*