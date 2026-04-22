# EVA — Plataforma de Salud Menstrual

> *En honor a la primera mujer. Privacidad radical, inteligencia real.*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-offline--first-purple)](docs/pwa.md)
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20FastAPI%20%2B%20PostgreSQL-blue)](docs/stack.md)

---

## Tabla de contenidos

1. [¿Qué es EVA?](#1-qué-es-eva)
2. [Problema que resuelve](#2-problema-que-resuelve)
3. [Propuesta de valor única](#3-propuesta-de-valor-única)
4. [Público objetivo](#4-público-objetivo)
5. [¿Qué rastreamos?](#5-qué-rastreamos)
6. [Arquitectura técnica](#6-arquitectura-técnica)
7. [Modelo de datos (3NF)](#7-modelo-de-datos-3nf)
8. [Stack tecnológico](#8-stack-tecnológico)
9. [Estrategia de ML e IA](#9-estrategia-de-ml-e-ia)
10. [Estrategia de autenticación](#10-estrategia-de-autenticación)
11. [PWA vs App nativa](#11-pwa-vs-app-nativa)
12. [Estructura de carpetas (SRP)](#12-estructura-de-carpetas-srp)
13. [Equipo y distribución](#13-equipo-y-distribución)
14. [Roadmap — 9 sprints](#14-roadmap--9-sprints)
15. [Métricas de éxito](#15-métricas-de-éxito)
16. [Principios de privacidad](#16-principios-de-privacidad)
17. [Setup local](#17-setup-local)
18. [Decisiones técnicas clave](#18-decisiones-técnicas-clave)

---

## 1. ¿Qué es EVA?

EVA es una plataforma digital que ayuda a las mujeres a rastrear, predecir y comprender su ciclo menstrual mediante tecnología moderna, análisis de datos e inteligencia artificial, con un enfoque radical en la privacidad y la experiencia de usuario.

**Nombre:** EVA nace en honor a la primera mujer — un símbolo de origen, autonomía y conocimiento propio.

**Tipo de app:** Progressive Web App (PWA) — instalable, offline-first, sin tienda de apps.

---

## 2. Problema que resuelve

| Problema actual | Solución EVA |
|---|---|
| Las apps actuales venden datos sensibles de salud femenina | Datos locales primero, sin venta a terceros |
| Falta de precisión en ciclos irregulares | ML por usuaria con Prophet, no modelo genérico |
| Escasa personalización real | Modelo entrenado con los datos propios de cada mujer |
| Dependencia total de internet | PWA offline-first con IndexedDB |
| Interfaz que no educa sobre el ciclo | Educación contextual por fase del ciclo |
| Datos atrapados en la app | Exportación PDF/CSV para ginecólogos |

---

## 3. Propuesta de valor única

| Característica | Descripción |
|---|---|
| **Privacidad hardcore** | Datos locales primero, sincronización opcional, sin venta de datos |
| **PWA Offline** | Funciona sin internet, se instala como app nativa |
| **ML por usuaria** | Modelo de IA entrenado con tus datos, no genérico |
| **Educación contextual** | Artículos que cambian según tu fase del ciclo |
| **Exportación médica** | Informe PDF/CSV para compartir con ginecóloga |
| **Código abierto** | Transparencia total en el manejo de datos |
| **LLM local** | Asistente conversacional que corre en el servidor, sin enviar datos a terceros |

---

## 4. Público objetivo

| Segmento | Necesidad específica |
|---|---|
| Adolescentes (15–19) | Entender su ciclo, normalizar la menstruación, detectar irregularidades tempranas |
| Mujeres jóvenes (20–35) | Planificación familiar, seguimiento de fertilidad, control de síntomas |
| Mujeres adultas (36–50) | Seguimiento de perimenopausia, detección de patrones anormales |
| Profesionales de salud | Datos confiables para diagnóstico (exportación opcional) |

---

## 5. ¿Qué rastreamos?

```
Ciclo menstrual — 4 fases

Fase 1: Menstruación (días 1–5)
├── Nivel de sangrado (nulo / leve / medio / alto)
├── Síntomas: dolor, fatiga, cólicos
└── Temperatura basal (opcional)

Fase 2: Folicular (días 6–14)
├── Energía progresiva
└── Síntomas: piel radiante, claridad mental

Fase 3: Ovulación (día 14 ± 2)
├── Ventana fértil
├── Flujo elástico (moco cervical)
└── Posible dolor ovulatorio (Mittelschmerz)

Fase 4: Lútea (días 15–28)
├── Síntomas premenstruales (SPM)
├── Hinchazón, irritabilidad, antojos
└── Cambios de humor
```

---

## 6. Arquitectura técnica

Modelo de 3 capas con Principio de Responsabilidad Única (SRP):

```
┌─────────────────────────────────────────────────────┐
│                 CAPA DE PRESENTACIÓN                │
│   React + TypeScript + Tailwind + PWA               │
│   - Componentes UI (Vite + vite-plugin-pwa)         │
│   - Estado global (Zustand)                         │
│   - Persistencia offline (IndexedDB / Dexie.js)     │
└─────────────────────────────────────────────────────┘
                          │
                          ▼ HTTP / REST
┌─────────────────────────────────────────────────────┐
│                  CAPA DE NEGOCIO                    │
│   FastAPI + Python 3.11                             │
│   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐  │
│   │Auth Service │ │Cycle Service│ │ ML Service  │  │
│   │(Supabase JWT│ │(CRUD ciclos)│ │(Prophet+LLM)│  │
│   └─────────────┘ └─────────────┘ └─────────────┘  │
└─────────────────────────────────────────────────────┘
                          │
                          ▼ SQLAlchemy Core
┌─────────────────────────────────────────────────────┐
│                   CAPA DE DATOS                     │
│   PostgreSQL (Supabase) — Normalización 3NF         │
│   ┌───────┐ ┌────────┐ ┌──────────┐ ┌───────────┐  │
│   │ users │ │ cycles │ │daily_logs│ │daily_symp.│  │
│   └───────┘ └────────┘ └──────────┘ └───────────┘  │
│   ┌──────────────────┐                              │
│   │ symptoms_catalog │                              │
│   └──────────────────┘                              │
└─────────────────────────────────────────────────────┘
```

### Regla de oro de SRP

> Si modificas `ml_service.py` por un cambio de algoritmo, **no debes tocar** `cycle_service.py`.

| Capa | Responsabilidad única |
|---|---|
| `routers/` | Solo reciben HTTP y llaman a servicios |
| `services/` | Contienen la lógica de negocio |
| `repositories/` | Solo hablan con la base de datos |
| `core/` | Configuración transversal (DB, seguridad) |

---

## 7. Modelo de datos (3NF)

### Por qué 3NF en datos médicos

1. **1NF (Atomicidad):** cada celda contiene un solo valor
   - ❌ Antes: `sintomas = "dolor,hinchazon,fatiga"`
   - ✅ Ahora: tabla `daily_symptoms` con una fila por síntoma

2. **2NF (Sin dependencias parciales):** todos los atributos dependen de la clave completa

3. **3NF (Sin dependencias transitivas):** el nombre del síntoma está en `symptoms_catalog`, no repetido en cada registro

### Diagrama de relaciones

```
users (id, email, birth_date, created_at)
    │
    └── cycles (id, user_id, start_date, end_date, created_at)
            │
            ├── daily_logs (id, cycle_id, date, flow_level, temperature, notes)
            │       │
            │       └── daily_symptoms (log_id, symptom_id, intensity 1–5)
            │                   │
            │                   └── symptoms_catalog (id, name, category)
            │
            └── ml_models (id, user_id, model_path, mae, trained_at, cycles_used)
```

### SQL del esquema

```sql
-- Usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    birth_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ciclos menstruales
CREATE TABLE cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);
CREATE INDEX idx_cycles_user ON cycles(user_id);

-- Registros diarios
CREATE TABLE daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES cycles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    flow_level VARCHAR(10) CHECK (flow_level IN ('none','light','medium','heavy')),
    temperature DECIMAL(4,2),
    notes TEXT,
    UNIQUE(cycle_id, date)
);

-- Catálogo de síntomas (semilla con ~30 síntomas)
CREATE TABLE symptoms_catalog (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('fisica','emocional','digestiva','otra'))
);

-- Síntomas diarios (tabla puente — 1NF)
CREATE TABLE daily_symptoms (
    log_id UUID REFERENCES daily_logs(id) ON DELETE CASCADE,
    symptom_id INTEGER REFERENCES symptoms_catalog(id),
    intensity SMALLINT CHECK (intensity BETWEEN 1 AND 5),
    PRIMARY KEY (log_id, symptom_id)
);

-- Modelos ML por usuaria
CREATE TABLE ml_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_path TEXT NOT NULL,
    mae DECIMAL(5,3),
    trained_at TIMESTAMPTZ DEFAULT NOW(),
    cycles_used INTEGER
);
```

---

## 8. Stack tecnológico

> Criterio de selección: **100% gratuito**, moderno, y compatible con Windows/Linux.

| Capa | Tecnología | Justificación |
|---|---|---|
| Frontend | React 18 + TypeScript (strict) + Vite | Tipado fuerte, builds rápidos |
| Estilos | Tailwind CSS | Utilidades, diseño consistente |
| Estado global | Zustand | Liviano, sin boilerplate |
| PWA | vite-plugin-pwa + Workbox | Offline-first, Service Workers |
| Persistencia local | IndexedDB (Dexie.js) | Datos offline sin internet |
| Backend | Python 3.11 + FastAPI | Rendimiento, tipado, ideal para ML |
| ORM / Query builder | SQLAlchemy Core | Control total, sin magia de ORM |
| Base de datos | PostgreSQL via Supabase | 500MB gratis, relacional 3NF |
| Autenticación | Supabase Auth + JWT | Zero código, social login incluido |
| ML predicción | Prophet (Meta) + scikit-learn | Series de tiempo cíclicas, ideal para ciclos |
| Serialización ML | joblib | Modelos `.pkl` por usuaria |
| LLM local | Ollama (Mistral 7B / Llama 3) | 100% gratuito, datos no salen del servidor |
| LLM fallback | Groq API (tier gratuito) | Rápido, sin costo para proyectos académicos |
| Testing frontend | Vitest + Testing Library | Integrado con Vite |
| Testing backend | pytest + fixtures | Estándar en Python |
| Testing E2E | Playwright | Automatización de flujos completos |
| Hosting frontend | Vercel | Deploy automático desde GitHub |
| Hosting backend | Render | Plan gratuito + cron jobs |
| CI/CD | GitHub Actions | Integrado, gratuito para repos públicos |
| Monitoreo | Sentry (tier gratuito) | Errores en producción |
| Gestión | GitHub Projects | Kanban + Milestones + 60 issues |

---

## 9. Estrategia de ML e IA

### Fase 1 — Heurística (Sprint 5)

```python
# Regla simple: promedio de duraciones anteriores
def predict_next_cycle(cycles: list[Cycle]) -> date:
    if len(cycles) < 1:
        return None
    if len(cycles) == 1:
        return cycles[0].start_date + timedelta(days=28)  # default
    durations = [
        (cycles[i].start_date - cycles[i-1].start_date).days
        for i in range(1, len(cycles))
    ]
    avg_duration = sum(durations) / len(durations)
    return cycles[-1].start_date + timedelta(days=round(avg_duration))
```

Precisión esperada: 70–80%. No es ML real — es una regla de negocio.

### Fase 2 — ML Real con Prophet (Sprint 7–8)

**¿Por qué Prophet y no redes neuronales?**

| Criterio | Red neuronal | Prophet |
|---|---|---|
| Datos necesarios | Miles de ejemplos | 10–20 ciclos |
| Interpretabilidad | Baja | Alta |
| Costo computacional | Alto | Bajo |
| Series estacionales | Requiere configuración | Nativo |

```python
# Features para el modelo Prophet
features = {
    "ds": fecha_inicio_ciclo,        # variable temporal requerida por Prophet
    "y": duracion_ciclo_dias,         # lo que predecimos
    # Regresores adicionales
    "variabilidad_3_ciclos": ...,
    "promedio_flujo": ...,
    "sintomas_fase_lutea_count": ...,
    "edad_usuario": ...,
}
```

**Modelo por usuaria:**
- Cada mujer tiene su propio archivo: `models/user_{id}.pkl`
- Mínimo 3 ciclos para entrenar
- Reentrenamiento automático cada noche (cron job en Render)
- MAE objetivo: menos de 1.5 días de error

### Fase 3 — LLM conversacional (Sprint 5+)

**Stack LLM:**
- Primario: **Ollama** con Mistral 7B o Llama 3 (corre en el servidor de Render o localmente)
- Fallback: **Groq API** (tier gratuito, ~14,400 tokens/día)

**Privacidad del LLM:**

```python
# Lo que SÍ se envía al LLM
context = {
    "fase_actual": "lútea",
    "duracion_promedio_ciclo": 27,
    "sintomas_frecuentes": ["fatiga", "irritabilidad"],
    "dias_hasta_siguiente": 5,
}

# Lo que NUNCA se envía al LLM
forbidden = ["email", "nombre", "fecha_nacimiento", "ip"]
```

---

## 10. Estrategia de autenticación

**¿Por qué Supabase Auth y no JWT custom?**

| Aspecto | JWT Custom | Supabase Auth |
|---|---|---|
| Implementación | 200+ líneas | ~10 líneas |
| Recuperación de contraseña | Implementar desde cero | Incluida |
| Login social (Google) | Integración compleja | Un clic |
| Seguridad | Depende del código | Auditada |
| Mantenimiento | Responsabilidad del equipo | Zero |

**Flujo de autenticación:**

```
Usuario → Supabase Auth → JWT token
                              │
                              ▼
                     FastAPI (valida JWT con
                     SUPABASE_JWT_SECRET)
                              │
                              ▼
                     Request autenticada
```

---

## 11. PWA vs App nativa

| Requisito | App Nativa | PWA | ¿Por qué PWA gana? |
|---|---|---|---|
| Instalable | ✅ | ✅ | Mismo resultado |
| Offline | ✅ | ✅ | IndexedDB + Service Workers |
| Distribución | App Store (burocracia) | Link directo | Sin esperar aprobaciones |
| Actualizaciones | Días de review | Instantáneas | Bugs corregibles al momento |
| Costo | $99/año (Apple) | $0 | Apps de salud tienen cuotas altas |
| Código | iOS + Android separados | Un solo código | **Clave siendo un equipo de 3** |

> **Conclusión:** PWA = 90% de los beneficios con 10% del esfuerzo.

---

## 12. Estructura de carpetas (SRP)

### Backend

```
backend/
├── app/
│   ├── main.py                    # Entry point FastAPI
│   ├── routers/                   # Solo reciben HTTP
│   │   ├── cycles.py
│   │   ├── symptoms.py
│   │   ├── predictions.py
│   │   ├── analytics.py
│   │   ├── insights.py            # LLM endpoint
│   │   └── export.py
│   ├── services/                  # Lógica de negocio (SRP)
│   │   ├── cycle_service.py       # CRUD de ciclos
│   │   ├── symptom_service.py     # CRUD de síntomas
│   │   ├── prediction_service.py  # Orquesta heurística/ML
│   │   ├── ml_service.py          # SOLO entrena y predice (Prophet)
│   │   ├── llm_service.py         # SOLO interactúa con Ollama/Groq
│   │   ├── analytics_service.py   # Cálculos estadísticos
│   │   └── export_service.py      # Genera PDF y CSV
│   ├── repositories/              # SOLO hablan con BD
│   │   ├── cycle_repo.py
│   │   ├── symptom_repo.py
│   │   └── user_repo.py
│   ├── models/                    # Pydantic schemas
│   │   ├── cycle.py
│   │   ├── symptom.py
│   │   └── prediction.py
│   ├── core/                      # Configuración transversal
│   │   ├── db.py                  # Conexión PostgreSQL
│   │   ├── security.py            # Validación JWT Supabase
│   │   └── config.py              # Variables de entorno
│   └── ml_models/                 # Archivos .pkl por usuaria
│       └── user_{uuid}.pkl
├── tests/
│   ├── test_cycle_service.py
│   ├── test_prediction_service.py
│   └── test_ml_service.py
├── requirements.txt
└── .env.example
```

### Frontend

```
frontend/
├── src/
│   ├── components/                # UI reutilizable
│   │   ├── ui/                    # Button, Input, Card, Badge
│   │   ├── calendar/              # Componente calendario
│   │   ├── charts/                # Gráficos de ciclos
│   │   └── chat/                  # Chat con asistente EVA
│   ├── pages/                     # Páginas de la app
│   │   ├── Dashboard.tsx
│   │   ├── Calendar.tsx
│   │   ├── Symptoms.tsx
│   │   ├── Insights.tsx           # Chat LLM
│   │   ├── Export.tsx
│   │   └── Auth.tsx
│   ├── hooks/                     # Custom hooks
│   │   ├── useCycles.ts
│   │   ├── useSync.ts             # Sincronización offline
│   │   └── usePrediction.ts
│   ├── services/                  # Llamadas a la API
│   │   ├── cycleService.ts
│   │   ├── authService.ts
│   │   └── syncService.ts
│   ├── store/                     # Zustand stores
│   │   ├── cycleStore.ts
│   │   └── authStore.ts
│   ├── db/                        # IndexedDB con Dexie.js
│   │   └── localDB.ts
│   └── lib/                       # Utilidades
│       └── utils.ts
├── public/
│   ├── manifest.json
│   └── icons/
├── index.html
├── vite.config.ts
└── tailwind.config.ts
```

---

## 13. Equipo y distribución

| Developer | Sector principal | Participa en |
|---|---|---|
| **Daniel** | Frontend (React, UI, PWA, IndexedDB) | Backend (auth), AI/ML (chat UI) |
| **Meriyei** | Backend + BD (FastAPI, PostgreSQL, SQLAlchemy) | AI/ML (features, contexto LLM), Testing (revisión) |
| **Madeleine** | AI/ML + Testing + DevOps (Prophet, Ollama, Playwright, CI/CD) | Frontend (PWA offline), Backend (queries) |

**Distribución de issues por developer:**

| Developer | Issues principales | Como participante | Total |
|---|---|---|---|
| Daniel | 22 | 10 | 32 |
| Meriyei | 19 | 11 | 30 |
| Madeleine | 19 | 12 | 31 |

**Metodología de trabajo:**
- Daily de 10 minutos al inicio de cada jornada
- Pull Requests con revisión cruzada (mínimo 1 aprobación)
- Issues en GitHub Projects con estados: Backlog → To Do → In Progress → Review → Done
- Commit convention: `[S1] feat: descripción` (prefijo de sprint)

---

## 14. Roadmap — 9 sprints

| Sprint | Épica | Objetivo | Dev principal | Entregable |
|---|---|---|---|---|
| 1 | Fundación | Setup completo del proyecto | Todos | Auth funcionando + `/health` |
| 2 | Rastreo | CRUD de ciclos | Meriyei + Daniel | Crear/editar ciclos en UI |
| 3 | Síntomas | Registro diario | Meriyei + Daniel | Formulario síntomas completo |
| 4 | Dashboard | Gráficos y estadísticas | Daniel + Meriyei | Dashboard con 3 gráficos |
| 5 | Predicción básica | Heurística + LLM local | Meriyei + Madeleine | Widget "próximo período" + Ollama |
| 6 | PWA Offline | Modo sin internet | Madeleine + Daniel | App 100% funcional offline |
| 7 | ML real | Prophet por usuaria | Madeleine + Meriyei | Modelos entrenados + chat EVA |
| 8 | Exportación | PDF/CSV + predicción mejorada | Meriyei + Daniel | Informes descargables |
| 9 | Lanzamiento | Testing + Deploy producción | Todos | App en Vercel + Render |

**Estimación total: 220 horas · 9–10 semanas**

---

## 15. Métricas de éxito

| KPI | Meta | Cómo se mide |
|---|---|---|
| Tiempo de predicción | < 200ms | Logs en FastAPI |
| Precisión ML (MAE) | < 1.5 días | Script de evaluación con datos holdout |
| Offline funcional | 100% de acciones | Tests Playwright sin red |
| Tasa de adopción | 70% registran > 3 ciclos | Analytics anonimizados |
| Lighthouse PWA | Score > 90 | Auditoría automática en CI/CD |
| Tiempo de carga inicial | < 3 segundos | Lighthouse Performance |

---

## 16. Principios de privacidad

Estos principios son **no negociables** en toda decisión de diseño e implementación:

1. **Datos locales primero** — IndexedDB es la fuente de verdad. La nube es secundaria y opcional.
2. **Sin venta de datos** — Ningún dato de salud se comparte con terceros, nunca.
3. **Sin analytics invasivos** — No se usan Google Analytics ni herramientas similares que recopilen datos de salud.
4. **LLM privacy** — El asistente EVA recibe solo datos del ciclo (fase, duración, síntomas). Nunca PII (email, nombre, IP).
5. **Sin logs de síntomas** — Los logs del servidor no contienen datos sensibles de salud.
6. **Derecho al olvido** — La usuaria puede eliminar su cuenta y todos sus datos con un clic.
7. **Exportación libre** — Los datos son de la usuaria. Puede exportarlos en CSV o PDF cuando quiera.
8. **Código abierto** — Cualquiera puede auditar cómo se manejan los datos.

---

## 17. Setup local

### Requisitos previos

- Node.js 18+
- Python 3.11+
- Git
- Cuenta en Supabase (gratuita)
- Ollama instalado localmente (opcional para desarrollo)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Editar .env.local con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
# App en http://localhost:5173
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Editar .env con DATABASE_URL, SUPABASE_JWT_SECRET, etc.
uvicorn app.main:app --reload --port 8000
# API en http://localhost:8000
# Docs en http://localhost:8000/docs
```

### Variables de entorno necesarias

**Backend `.env`:**
```env
DATABASE_URL=postgresql://...@db.supabase.co:5432/postgres
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
OLLAMA_BASE_URL=http://localhost:11434
GROQ_API_KEY=gsk_...  # fallback gratuito
ENVIRONMENT=development
```

**Frontend `.env.local`:**
```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:8000
```

### Tests

```bash
# Backend
cd backend && pytest -v

# Frontend
cd frontend && npm run test

# E2E
cd frontend && npx playwright test
```

---

## 18. Decisiones técnicas clave

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| PWA en lugar de app nativa | React Native | 1 código vs 2, siendo equipo de 3 |
| Supabase Auth en lugar de JWT custom | FastAPI + JWT | 10 líneas vs 200+, incluye recuperación |
| SQLAlchemy Core en lugar de ORM | SQLAlchemy ORM | Más control, menos magia oculta |
| Prophet en lugar de Random Forest | Random Forest | Diseñado para series de tiempo cíclicas |
| Heurística antes que ML | ML desde el Sprint 1 | Necesitas datos para entrenar (huevo/gallina) |
| Ollama (LLM local) en lugar de OpenAI | API de OpenAI | 100% gratuito, datos no salen del servidor |
| Groq API como fallback LLM | Ollama únicamente | Gratuito y rápido si Ollama no está disponible |
| Modelo por usuaria en ML | Modelo global único | Los ciclos varían enormemente entre personas |
| IndexedDB (Dexie.js) para offline | localStorage | Capacidad, indexación, y transacciones |
| Vitest desde Sprint 1 | Añadir testing al final | Evita deuda técnica desde el inicio |

---

## Documentación relacionada

- [`ENDPOINTS.md`](docs/ENDPOINTS.md) — Todos los endpoints con ejemplos de request/response
- [`DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) — SQL completo del esquema
- [`ML_STRATEGY.md`](docs/ML_STRATEGY.md) — Features, modelo Prophet, métricas
- [`PRIVACY.md`](docs/PRIVACY.md) — Política de privacidad técnica detallada
- [`eva_github_issues.md`](docs/eva_github_issues.md) — Las 60 issues del proyecto

---

*Última actualización: Sprint 1 — Inicio del proyecto*

*EVA es un proyecto académico final. Stack 100% gratuito. Código abierto bajo licencia MIT.*