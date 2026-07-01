# EVA — Plataforma de Salud Menstrual

> *En honor a la primera mujer. Privacidad radical, inteligencia real.*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-offline--first-purple)](Docs/PROJECT.md)
[![Stack](https://img.shields.io/badge/stack-React%20%2B%20FastAPI%20%2B%20PostgreSQL-blue)](#stack-tecnológico)

---

## ¿Qué es EVA?

EVA es una Progressive Web App (PWA) diseñada para ayudar a las mujeres a rastrear, predecir y comprender su ciclo menstrual. Utiliza tecnología moderna, análisis de datos e inteligencia artificial, con un enfoque radical en la privacidad y la experiencia de usuario.

El problema que resuelve EVA es crítico: las aplicaciones actuales venden datos sensibles de salud femenina, carecen de precisión en ciclos irregulares, ofrecen escasa personalización real y dependen totalmente de internet. Además, sus interfaces no educan sobre el ciclo y atrapan los datos en la app, impidiendo que las usuarias compartan información con profesionales de salud.

EVA soluciona estos problemas con datos locales primero (sin venta a terceros), predicciones personalizadas mediante machine learning por usuaria, funcionamiento offline como PWA, educación contextual por fase del ciclo y exportación libre de datos en PDF/CSV. El proyecto es un desarrollo académico final que demuestra que es posible construir una app de salud seria con privacidad real, ML por usuaria y cero costo de infraestructura.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript (strict) + Vite |
| Estilos | Tailwind CSS |
| Estado global | Zustand |
| PWA | vite-plugin-pwa + Workbox |
| Persistencia local | IndexedDB (Dexie.js) |
| Backend | Python 3.11 + FastAPI |
| ORM / Query builder | SQLAlchemy Core |
| Base de datos | PostgreSQL via Supabase |
| Autenticación | Supabase Auth + JWT |
| ML predicción | Prophet (Meta) + scikit-learn |
| Serialización ML | joblib |
| LLM local | Ollama (Mistral 7B / Llama 3) |
| LLM fallback | Groq API (tier gratuito) |
| Testing frontend | Vitest + Testing Library |
| Testing backend | pytest + fixtures |
| Testing E2E | Playwright |
| Hosting frontend | Vercel |
| Hosting backend | Render |
| CI/CD | GitHub Actions |
| Monitoreo | Sentry (tier gratuito) |
| Gestión | GitHub Projects |

---

## Instalación y Uso

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

## Estructura de carpetas

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

## Equipo

| Developer | Sector principal | Participa en |
|---|---|---|
| **Daniel** | Frontend (React, UI, PWA, IndexedDB) | Backend (auth), AI/ML (chat UI) |
| **Meriyei** | Backend + BD (FastAPI, PostgreSQL, SQLAlchemy) | AI/ML (features, contexto LLM), Testing (revisión) |
| **Madeleine** | AI/ML + Testing + DevOps (Prophet, Ollama, Playwright, CI/CD) | Frontend (PWA offline), Backend (queries) |
| **Joshua** | ML/Data Science (Prophet, features, modelos) | Testing ML, DevOps ML |

---

## Documentación

- [PROJECT.md](Docs/PROJECT.md) — Contexto completo, decisiones de diseño y principios de privacidad
- [ENDPOINTS.md](Docs/ENDPOINTS.md) — Todos los endpoints con ejemplos de request/response
- [DATABASE_SCHEMA.md](Docs/DATABASE_SCHEMA.md) — SQL completo del esquema 3NF
- [ML_STRATEGY.md](Docs/ML_STRATEGY.md) — Features, modelo Prophet, métricas y estrategia de IA
- [CRITERIOS_ISSUES.md](Docs/CRITERIOS_ISSUES.md) — Criterios de aceptación por issue

---

## Licencia

MIT License — ver [LICENSE](LICENSE).

*EVA es un proyecto académico final. Stack 100% gratuito. Código abierto.*