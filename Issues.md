# EVA
PWA de salud menstrual privacy-first · React + FastAPI + ML

## Issues para GitHub Projects
## 60 Issues · 9 Sprints · 3 Developers

**Equipo:**
- 🟣 **Daniel** → Frontend (principal) + participa en Backend y AI/ML
- 🟡 **Meriyei** → Backend (principal) + participa en AI/ML y Testing
- 🔵 **Madeleine** → AI/ML + Testing + DevOps (principal) + participa en Frontend y Backend

**Labels a crear en GitHub:**
`frontend` `backend` `database` `ml` `ai` `pwa` `testing` `devops` `analytics` `auth` `setup` `docs` `security` `performance` `monitoring`

---

## 🏁 Sprint 1 — Fundación (Semana 1)
*Milestone: "Sprint 1 — Fundación"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 1 | Inicializar proyecto Vite + React + TypeScript | Daniel | `frontend` `setup` |
| 2 | Configurar Tailwind CSS + sistema de diseño base | Daniel | `frontend` `setup` |
| 3 | Configurar vite-plugin-pwa + manifest.json | Daniel | `frontend` `pwa` |
| 4 | Inicializar FastAPI + estructura de carpetas SRP | Meriyei | `backend` `setup` |
| 5 | Configurar proyecto Supabase (BD + Auth) | Meriyei | `backend` `database` `auth` |
| 6 | Endpoint GET /health + CORS configurado | Meriyei | `backend` `setup` |
| 7 | Configurar CI/CD con GitHub Actions | Madeleine | `devops` `setup` |
| 8 | Configurar Vitest para testing unitario frontend *(Daniel apoya)* | Madeleine | `testing` `setup` `frontend` |

---

## 📅 Sprint 2 — Rastreo de ciclos (Semana 2)
*Milestone: "Sprint 2 — Rastreo de ciclos"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 9 | Modelo de datos: tablas cycles + daily_logs (3NF) | Meriyei | `backend` `database` |
| 10 | Repositorio cycle_repo.py + queries SQLAlchemy Core | Meriyei | `backend` `database` |
| 11 | Endpoints CRUD /cycles (POST, GET, PUT, DELETE) *(Daniel prueba)* | Meriyei | `backend` |
| 12 | Componente calendario mensual | Daniel | `frontend` |
| 13 | Formulario crear/editar ciclo | Daniel | `frontend` |
| 14 | Integración Supabase Auth en frontend *(Meriyei valida JWT)* | Daniel | `frontend` `auth` |
| 15 | Tests unitarios: cycle_service.py *(Meriyei revisa edge cases)* | Madeleine | `testing` `backend` |

---

## 🩺 Sprint 3 — Síntomas (Semana 3)
*Milestone: "Sprint 3 — Síntomas"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 16 | Tablas symptoms_catalog + daily_symptoms (3NF) | Meriyei | `backend` `database` |
| 17 | Endpoints CRUD /symptoms y /daily-logs | Meriyei | `backend` |
| 18 | Formulario de registro diario de síntomas | Daniel | `frontend` |
| 19 | Vista historial de síntomas por ciclo | Daniel | `frontend` |
| 20 | Configurar pytest + fixtures de BD para testing *(Meriyei define fixtures)* | Madeleine | `testing` `backend` |
| 21 | IndexedDB: modelo de datos local para offline *(Daniel integra con React)* | Madeleine | `frontend` `pwa` |

---

## 📊 Sprint 4 — Dashboard (Semana 4)
*Milestone: "Sprint 4 — Dashboard"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 22 | Endpoints /analytics/summary y /analytics/symptoms | Meriyei | `backend` `analytics` |
| 23 | Optimización de queries analytics con índices | Meriyei | `backend` `database` `performance` |
| 24 | Dashboard principal — métricas del ciclo | Daniel | `frontend` |
| 25 | Gráfico de duración de ciclos (línea histórica) *(Madeleine define datos)* | Daniel | `frontend` `analytics` |
| 26 | Gráfico de síntomas más frecuentes | Daniel | `frontend` `analytics` |
| 27 | Tests E2E: flujo de registro de síntomas *(Daniel apoya con selectores)* | Madeleine | `testing` |

---

## 🔮 Sprint 5 — Predicción básica (Semana 5)
*Milestone: "Sprint 5 — Predicción básica"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 28 | Servicio prediction_service.py — heurística promedio *(Madeleine valida)* | Meriyei | `backend` `ml` |
| 29 | Endpoint GET /predictions/next | Meriyei | `backend` `ml` |
| 30 | Widget 'Próximo período' en el dashboard | Daniel | `frontend` |
| 31 | Educación contextual por fase del ciclo *(Madeleine define contenido médico)* | Daniel | `frontend` |
| 32 | **Integrar Ollama (LLM local gratuito) para insights** *(Meriyei define contexto)* | Madeleine | `ml` `ai` `backend` |
| 33 | Tests unitarios: prediction_service.py | Madeleine | `testing` `ml` |

---

## 📶 Sprint 6 — PWA Offline (Semana 6)
*Milestone: "Sprint 6 — PWA Offline"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 34 | CRUD completo en IndexedDB (offline-first) | Daniel | `frontend` `pwa` |
| 35 | Banner de instalación PWA + prompt nativo | Daniel | `frontend` `pwa` |
| 36 | Service Worker con Workbox — estrategia de cache *(Daniel integra con router)* | Madeleine | `pwa` `frontend` |
| 37 | Sincronización offline → online (Background Sync) | Madeleine | `pwa` `frontend` |
| 38 | Tests de integración: flujos offline completos *(Daniel configura entorno)* | Madeleine | `testing` `pwa` |
| 39 | Endpoint de sincronización POST /sync | Meriyei | `backend` |

---

## 🤖 Sprint 7 — ML Real (Semana 7)
*Milestone: "Sprint 7 — ML Real"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 40 | ml_service.py — Prophet para predicción de series de tiempo *(Meriyei define features)* | Madeleine | `ml` `backend` |
| 41 | Pipeline de features para el modelo ML | Madeleine | `ml` |
| 42 | Cron job de reentrenamiento nocturno (Render) *(Meriyei hace queries)* | Madeleine | `ml` `devops` |
| 43 | **Integrar LLM con datos reales del ciclo** *(Meriyei valida privacidad)* | Madeleine | `ml` `ai` `backend` |
| 44 | Métricas de precisión: MAE del modelo ML | Madeleine | `testing` `ml` |
| 45 | Tests: ml_service.py con datos sintéticos | Madeleine | `testing` `ml` |
| 46 | UI: chat de insights con el asistente EVA *(Madeleine define prompts)* | Daniel | `frontend` `ai` |

---

## 📤 Sprint 8 — ML + Exportación (Semana 8–9)
*Milestone: "Sprint 8 — ML + Exportación"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 47 | Endpoint GET /predictions/next — integración con Prophet *(Madeleine valida)* | Meriyei | `backend` `ml` |
| 48 | Endpoint GET /export/csv | Meriyei | `backend` |
| 49 | Endpoint GET /export/pdf — informe médico *(Daniel diseña layout)* | Meriyei | `backend` |
| 50 | UI de exportación de datos | Daniel | `frontend` |
| 51 | Actualizar UI de predicción: mostrar precisión del modelo *(Madeleine define confianza)* | Daniel | `frontend` `ml` |
| 52 | Tests E2E: flujo de exportación PDF y CSV | Madeleine | `testing` |
| 53 | Configurar Sentry para monitoreo de errores *(Daniel integra en frontend)* | Madeleine | `devops` `monitoring` |

---

## 🚀 Sprint 9 — Pulido y lanzamiento (Semana 9–10)
*Milestone: "Sprint 9 — Pulido y lanzamiento"*

| # | Título | Asignado | Labels |
|---|--------|----------|--------|
| 54 | Auditoría Lighthouse: PWA score > 90 *(Daniel corrige frontend)* | Madeleine | `testing` `pwa` |
| 55 | Tests E2E: regresión completa de la app *(Daniel y Meriyei revisan)* | Madeleine | `testing` |
| 56 | Revisión de privacidad y seguridad *(Madeleine revisa capa ML)* | Meriyei | `backend` `security` |
| 57 | Deploy producción: Vercel (frontend) | Daniel | `devops` |
| 58 | Deploy producción: Render (backend) *(Madeleine valida cron job)* | Meriyei | `devops` `backend` |
| 59 | Documentación final: README + guías técnicas *(Meriyei y Madeleine documentan sus secciones)* | Daniel | `docs` |
| 60 | Presentación demo y video walkthrough | Daniel + Meriyei + Madeleine | `docs` |

---

## 📋 Resumen de distribución

| Developer | Issues principales | Issues como participante | Total involucrado |
|-----------|-------------------|--------------------------|-------------------|
| Daniel | 22 | 10 | 32 |
| Meriyei | 19 | 11 | 30 |
| Madeleine | 19 | 12 | 31 |

### Sectores con participación cruzada:
- **Daniel** toca: Frontend (22) + Backend/auth (2) + AI/frontend (1)
- **Meriyei** toca: Backend (19) + AI/predicción (3) + Testing review (3)
- **Madeleine** toca: ML/Testing/DevOps (19) + Frontend/PWA (3) + Backend hooks (2)

