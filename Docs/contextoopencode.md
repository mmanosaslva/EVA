# EVA — Contexto OpenCode

> Documento generado para que OpenCode entienda el estado actual del proyecto, los cambios implementados, la atribución de responsabilidades y la deuda técnica pendiente.

---

## Equipo

| Nombre | Rol principal | Archivos que mantiene |
|--------|--------------|----------------------|
| **Daniel** | Frontend | `frontend/src/**` |
| **Meriyei** | Backend + BD | `backend/app/**` |
| **Madeleine** | DevOps / Testing / AI | CI/CD, Sentry, middleware, LLM |
| **Joshua** | ML / Data Science | Prophet, Ollama, scripts ML |

---

## 1. Rediseño Responsive — Serene Health (Daniel)

### 1.1 — Design System

**Archivo:** `frontend/src/index.css`

Se reemplazó la paleta de colores original (`eva-*`, `lavender-*`, `green-*`) por los tokens del design system **Serene Health** definidos en `Docs/eva_responsive_redesign/serene_health/DESIGN.md`.

| Cambio | Antes | Ahora |
|--------|-------|-------|
| Colores | `eva-500: #ec4899`, `lavender-500: #8b5cf6` | `primary: #af1665`, `secondary: #6b38d4`, 47 tokens Material Design |
| Fondo | `surface: #ffffff` | `surface: #fff8f8` |
| Fases | `red-50`, `amber-50` | `menstrual-pink`, `follicular-green`, `ovulation-purple`, `luteal-yellow` |
| Fuente | Inter | Plus Jakarta Sans (headlines/body) + Inter (labels) |
| Íconos | Emojis | Material Symbols Outlined |
| Espaciado | — | `container-max`, `gutter`, `margin-mobile`, `margin-desktop`, `stack-*` |

**Aliases backward compat:** Los tokens legacy (`eva-*`, `lavender-*`, `green-*`) se mantienen como aliases para no romper código existente. Ya fueron migrados todos (0 tokens legacy restantes).

### 1.2 — Fuentes e íconos

**Archivo:** `frontend/index.html`

- Importadas: Plus Jakarta Sans (400,500,600,700), Inter (400,500,600), Material Symbols Outlined
- CSS para `.material-symbols-outlined` con font-variation-settings
- `theme-color` actualizado a `#af1665`

### 1.3 — Componentes UI base

**Archivos:** `frontend/src/components/ui/{Button,Badge,Card,Input}.tsx`

| Componente | Cambios |
|-----------|---------|
| Button | `rounded-xl`, `text-label-md`, `active:scale-95`, colores Serene |
| Badge | Variantes por fase: `bg-menstrual-pink`, `bg-follicular-green`, etc. |
| Card | `rounded-3xl`, `border-border-subtle`, sombra sutil |
| Input | `rounded-xl`, focus ring `primary-fixed-dim/30`, error con `error-container` |

### 1.4 — Shell de navegación

**Archivos nuevos:** `frontend/src/components/layout/{ShellLayout,Sidebar,TopAppBar,BottomNavBar}.tsx`

| Componente | Descripción |
|-----------|-------------|
| `ShellLayout` | Contenedor: OfflineIndicator + PwaInstallBanner + Sidebar + TopAppBar + `<Outlet />` + spacer mobile + BottomNavBar |
| `Sidebar` | Desktop (`lg:flex`, `w-64` fixed). Logo "EVA Health", 5 nav links con Material Symbols, perfil de usuaria + logout |
| `TopAppBar` | Desktop: título + tabs (Dashboard, Calendar, Insights) + notificaciones/config. Mobile: logo "EVA" + notificaciones |
| `BottomNavBar` | Mobile (`md:hidden`, fixed bottom). 4 tabs: Hoy, Ciclo, Tendencias, Perfil |

**Archivo modificado:** `frontend/src/App.tsx`

Rutas reestructuradas:
```
/login, /register  → sin shell (layout propio centrado)
/dashboard/*        ┐
/calendar/*         │
/symptoms/*         ├── PrivateRoute → ShellLayout
/insights/*         │
/export/*           ┘
*                   → redirect /dashboard
```

### 1.5 — Dashboard (Bento Grid)

**Archivo modificado:** `frontend/src/pages/Dashboard.tsx`

Layout reemplazado: de `max-w-lg` centrado a **bento grid 12 columnas** (`grid-cols-12 gap-gutter`).

**Componentes nuevos:**

| Componente | Grid | Descripción |
|-----------|------|-------------|
| `PhaseCard` | `lg:col-span-8` | Fondo de color por fase, "Día X" display-stat, descripción, siguiente periodo, CTA |
| `CycleProgressCard` | `lg:col-span-4` | SVG circular progress con anillo secondary, % completado |
| `TrendChartCard` | `lg:col-span-7` | Barras de duración de ciclo (6 meses), tooltips hover |
| `RecommendationsCard` | `lg:col-span-5` | Nutrición, ejercicio y artículos por fase |

**Eliminado:** Dependencia `recharts` (bundle bajó de 1289 KB a 914 KB).

### 1.6 — Calendario Desktop

**Archivo modificado:** `frontend/src/pages/CalendarPage.tsx`

Layout desktop: `grid-cols-12` con calendario (8 cols) + paneles laterales (4 cols).

**Componentes modificados/creados:**

| Archivo | Cambios |
|---------|---------|
| `CalendarCell.tsx` | Celdas con color de fase Serene, hoy con ring-2, ovulación con estrella, predicción con borde punteado |
| `Calendar.tsx` | Header con chevrones, predicción automática de ovulación y próximo periodo |
| `CyclePhasePanel.tsx` | Panel lateral: fase, barra progreso coloreada, descripción contextual |
| `UpcomingEventsPanel.tsx` | Próximo periodo con % probabilidad, ventana fértil |
| `PhaseLegend.tsx` | Leyenda 5 colores (menstrual, folicular, ovulación, lútea, predicción) |

### 1.7 — Calendario Móvil

**Archivo modificado:** `frontend/src/components/calendar/CalendarCell.tsx`

Celdas responsive: `aspect-square` en mobile (círculo de color), `h-16` en desktop (fondo completo). Day names abreviados (LU/MA/...) en mobile.

**Componente nuevo:** `DayDetailsCard.tsx`

Sección `lg:hidden` debajo del calendario: card de fase actual + grid 2-col (Flujo/Ánimo) + botón registrar.

**FAB:** `md:hidden fixed right-6 bottom-24` en `CalendarPage.tsx`.

### 1.8 — Páginas restantes pulidas

| Archivo | Cambios |
|---------|---------|
| `InsightsPage.tsx` | Colores Serene, Material Symbols, tipografía |
| `SymptomsPage.tsx` | Tabs con `border-primary text-primary`, SVG → Material Symbols, empty states |
| `ExportPage.tsx` | Cards `rounded-3xl`, Material Symbols, danger zone con `error-container` |
| `LoginPage.tsx` | `bg-surface`, `text-primary`, link registro |
| `RegisterPage.tsx` | Igual que LoginPage |
| `ChatBubble.tsx` | `bg-primary text-on-primary`, `bg-surface-container-low` |
| `ChatInput.tsx` | `focus:ring-primary-fixed-dim/30` |
| `DeleteAccountModal.tsx` | `rounded-3xl`, `bg-surface`, Material Symbols, `bg-error` |
| `PwaInstallBanner.tsx` | Tokens legacy → Serene Health |
| `OfflineIndicator.tsx` | `bg-warning-orange` |
| `Toast.tsx` | `error-container` + `text-error` |

---

## 2. Conexión Frontend → Backend (Daniel)

### 2.1 — Servicios CRUD migrados a API real

**Problema original:** Todos los servicios (`cycleService`, `symptomService`, `exportService`, `insightService`) operaban sobre arrays en memoria (`MOCK_CYCLES`, `MOCK_LOGS`, `MOCK_SYMPTOMS`). Al recargar la página, todo se perdía. No había aislamiento por usuario. El backend (FastAPI con JWT) estaba 100% funcional pero nunca se llamaba.

| Archivo | Antes | Ahora |
|---------|-------|-------|
| `cycleService.ts` | `MOCK_CYCLES` hardcodeados (4 ciclos de ejemplo) | `apiClient` → `GET/POST/PUT /cycles` |
| `symptomService.ts` | `MOCK_LOGS` (objeto vacío) + `MOCK_SYMPTOMS` (30 hardcodeados) | `apiClient` → `GET /symptoms`, `GET/POST/PUT /daily-logs` |
| `exportService.ts` | CSV hardcodeado + PDF falso (`%PDF-1.4 fake...`) | `fetch` blob autenticado → `GET /export/csv`, `GET /export/pdf` |
| `insightService.ts` | Keyword matching mock (`if q.includes("dolor")`) | `apiClient` → `POST /insights`, `GET /insights/history` |
| `syncManager.ts` | `http://localhost:8000` hardcodeado | `VITE_API_URL` env var |

**Resultado:** Datos persisten en PostgreSQL (Supabase), sobreviven recargas, y cada usuaria ve solo sus datos (aislamiento por `user_id` vía JWT).

### 2.2 — apiClient mejorado

**Archivo:** `frontend/src/services/apiClient.ts`

| Situación | Mensaje de error |
|-----------|-----------------|
| Fetch falla (conexión perdida) | `No se pudo conectar con el servidor (${API_BASE}). Verificá que el backend esté corriendo.` |
| Respuesta no es JSON | `Respuesta inesperada del servidor (${status}). Intentá de nuevo.` |
| 401/404/409 | Mensaje descriptivo del backend o `Error del servidor (XXX)` |

### 2.3 — Tipos actualizados

**Archivo:** `frontend/src/lib/types.ts`

- `Cycle`: agregado `updated_at: string`
- `DailyLog.flow_level`: cambiado de `"none" | "light" | "medium" | "heavy"` a `string | null` (compatible con respuesta del backend)

---

## 3. Bugfixes Backend

### 3.1 — PgBouncer + asyncpg prepared statements (Meriyei + Daniel)

**Problema:** `DuplicatePreparedStatementError` en cada query a BD vía Supabase pooler (puerto 6543).

**Archivo:** `backend/app/core/db.py`

```python
engine = create_async_engine(DATABASE_URL, pool_pre_ping=True,
    connect_args={"statement_cache_size": 0})  # ← agregado
```

### 3.2 — JWT ES256 vía JWKS (Meriyei + Daniel)

**Problema:** `GET /cycles` → 401 incluso con token válido. Supabase emite tokens `ES256` (asimétrico) pero `security.py` solo validaba `HS256` (simétrico).

**Archivo:** `backend/app/core/security.py`

Ahora intenta HS256 primero (con `SUPABASE_JWT_SECRET`), y si falla, descarga la clave pública del JWKS de Supabase y valida con `ES256`/`RS256` vía `PyJWKClient`.

### 3.3 — Catálogo de síntomas cacheado (Meriyei + Daniel)

**Problema:** `GET /symptoms` demoraba ~1.3s por latencia geográfica a Supabase (AWS us-west-2).

**Archivo:** `backend/app/services/symptom_service.py`

Cache en memoria del catálogo (30 síntomas estáticos). Resultado: **1.3s → 8ms** (162x más rápido).

### 3.4 — Dependencias faltantes (Madeleine)

**Archivo:** `backend/requirements.txt`

| Dependencia | Requerida por |
|------------|---------------|
| `greenlet>=3.0` | SQLAlchemy async |
| `jinja2>=3.1` | Sentry SDK → Starlette templating |
| `cryptography>=41.0` | PyJWKClient (validación JWT ES256) |

---

## 4. Caché Frontend (Daniel)

### 4.1 — Caché de ciclos

**Archivo:** `frontend/src/services/cycleService.ts`

```typescript
let cyclesCache: CyclesResponse | null = null;
// Cache se invalida en createCycle() y updateCycle()
// Exportado: invalidateCycleCache()
```

### 4.2 — Caché de daily logs por cycleId

**Archivo:** `frontend/src/services/symptomService.ts`

```typescript
const logsCache = new Map<string, DailyLog[]>();
let catalogCache: SymptomCatalog[] | null = null;
// Cache se invalida en createDailyLog() (cycleId específico)
// y updateDailyLog() (limpieza total)
```

---

## 5. Configuración de red (Daniel)

### 5.1 — Vite server

**Archivo:** `frontend/vite.config.ts`

```typescript
server: { host: true },  // Bind a 0.0.0.0 (accesible desde red)
```

### 5.2 — Service Worker caching

**Archivo:** `frontend/vite.config.ts`

El patrón de runtime caching del Service Worker se extendió para incluir IPs de red local:
```
/^http:\/\/(localhost|192\.168\.\d+\.\d+):\d+\/.*/i
```

### 5.3 — Firewall

Puertos 5173/tcp y 8000/tcp abiertos vía `ufw` para acceso desde red local.

---

## 6. Deuda técnica — Sprint 10 (ISSUES.md)

### 6.1 — Pendiente Daniel

| # | Título | Archivos |
|---|--------|----------|
| 63 | `useDailyLogs` llama API con `cycleId` vacío → 500 en backend | `hooks/useDailyLogs.ts`, `pages/SymptomsPage.tsx` |
| 66 | Vite WebSocket HMR falla desde dispositivos en red local | `vite.config.ts` |
| 74 | TypeScript: verificar tipos `DailyLog.flow_level` y `Cycle` | `lib/types.ts` |

### 6.2 — Pendiente Meriyei

| # | Título | Archivos |
|---|--------|----------|
| — | (ninguno pendiente) | #64 implementado |

### 6.3 — Pendiente Madeleine

| # | Título | Archivos |
|---|--------|----------|
| 65 | Mover `CORSMiddleware` al primer lugar en `main.py` | `main.py:55-63` |
| 67 | Mejorar mensaje de error en `POST /insights` cuando LLM no disponible | `services/llm_service.py` |
| 73 | Verificar `requirements.txt` completo (greenlet, jinja2, cryptography) | `requirements.txt` |

### 6.4 — Pendiente Joshua (Ollama)

| # | Título | Archivos |
|---|--------|----------|
| 76 | Documentar instalación y setup de Ollama + modelo `mistral` | `Docs/SETUP_OLLAMA.md` |
| 77 | Probar integración `_call_ollama()` end-to-end | `services/llm_service.py` |
| 78 | Evaluar y ajustar calidad de respuestas (SYSTEM_PROMPT) | `services/llm_service.py` |
| 79 | Validar fallback automático Ollama → Groq | `services/llm_service.py` |
| 80 | Health check de Ollama en startup | `services/llm_service.py`, `main.py`, `scripts/verify_ml_env.py` |

---

## 7. Archivos clave por persona

### Daniel (Frontend)

```
frontend/src/
├── index.css                    ← 50+ tokens Serene Health
├── App.tsx                      ← Rutas con ShellLayout
├── lib/types.ts                 ← Tipos compatibles con backend
├── services/
│   ├── apiClient.ts             ← Fetch con JWT + mensajes descriptivos
│   ├── cycleService.ts          ← CRUD ciclos + caché
│   ├── symptomService.ts        ← CRUD síntomas + caché
│   ├── exportService.ts         ← Descarga blob autenticado
│   ├── insightService.ts        ← POST/GET insights real
│   └── syncManager.ts           ← VITE_API_URL env var
├── components/
│   ├── layout/                  ← ShellLayout, Sidebar, TopAppBar, BottomNavBar
│   ├── ui/                      ← Button, Badge, Card, Input (Serene)
│   ├── dashboard/               ← PhaseCard, CycleProgressCard, TrendChartCard, RecommendationsCard
│   ├── calendar/                ← CalendarCell, CyclePhasePanel, UpcomingEventsPanel, PhaseLegend, DayDetailsCard
│   ├── chat/                    ← ChatBubble, ChatInput (Serene)
│   └── auth/PrivateRoute.tsx    ← Spinner con tokens Serene
├── pages/
│   ├── Dashboard.tsx            ← Bento grid 12 cols
│   ├── CalendarPage.tsx         ← Desktop 8+4, mobile con FAB + DayDetails
│   ├── SymptomsPage.tsx         ← Tabs Serene, Material Symbols
│   ├── InsightsPage.tsx         ← Chat con diseño Serene
│   ├── ExportPage.tsx           ← Configuración Serene
│   ├── LoginPage.tsx            ← Auth Serene
│   └── RegisterPage.tsx         ← Auth Serene
└── hooks/
    ├── useDailyLogs.ts          ← Validación cycleId pendiente (#63)
    └── useDailyLogForm.ts       ← FlowLevel cast fix
```

### Meriyei (Backend + BD)

```
backend/app/
├── core/
│   ├── db.py                    ← statement_cache_size=0 (PgBouncer fix)
│   ├── security.py              ← JWT ES256 + HS256 vía JWKS
│   └── config.py               ← Settings desde .env
├── services/
│   ├── symptom_service.py       ← Cache catálogo en memoria + validación cycle_id pendiente (#64)
│   ├── cycle_service.py         ← CRUD ciclos con user_id isolation
│   └── llm_service.py           ← Ollama + Groq con cascading fallback
├── routers/
│   ├── cycles.py                ← Endpoints /cycles (JWT required)
│   ├── symptoms.py              ← /symptoms (public) + /daily-logs (JWT)
│   ├── export.py                ← /export/csv + /export/pdf (JWT)
│   ├── insights.py              ← /insights (JWT + rate limit)
│   ├── sync.py                  ← /sync (JWT)
│   ├── analytics.py             ← /analytics/* (JWT)
│   └── predictions.py           ← /predictions/* (JWT)
└── requirements.txt             ← greenlet, jinja2, cryptography agregados
```

### Madeleine (DevOps / Testing)

```
backend/app/
├── main.py                      ← CORS middleware order pendiente (#65)
├── core/
│   ├── security_middleware.py   ← Security headers
│   └── rate_limiter.py          ← slowapi rate limiter
├── .github/workflows/           ← CI/CD pipelines
└── tests/                       ← pytest suite
```

### Joshua (ML / Data Science)

```
backend/
├── app/services/
│   ├── llm_service.py           ← Ollama + Groq (implementado, falta validar #77-#80)
│   └── ml_service.py            ← Prophet para predicciones
├── scripts/
│   ├── verify_ml_env.py         ← Verificación de entorno ML
│   ├── retrain_models.py        ← Reentrenamiento de Prophet
│   └── evaluate_models.py       ← Evaluación de métricas
└── Docs/                        ← SETUP_OLLAMA.md pendiente (#76)
```

---

## 8. Quickstart para desarrollo

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Linux/Mac bash
source venv/bin/activate.fish # Linux fish
pip install -r requirements.txt
cp .env.example .env          # Configurar credenciales
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env          # VITE_API_URL=http://localhost:8000
npm run dev                   # Vite escucha en 0.0.0.0:5173 (server.host: true)
```

---

*Última actualización: 2026-07-03 · Generado por OpenCode*
