# EVA — Criterios de Aceptación por Issue

> Este archivo complementa `eva_github_issues.md`.
> Copia el contenido de cada issue en el campo **Description** al crear la issue en GitHub.
> Los criterios marcados con `- [ ]` se convierten en checkboxes interactivos en GitHub.

---

## Sprint 1 — Fundación

---

### Issue #1 — [S1] Inicializar proyecto Vite + React + TypeScript
**Asignado:** Daniel | **Labels:** `frontend` `setup`

```
## Descripción
Crear el proyecto base con Vite, React 18 y TypeScript en modo strict.

## Criterios de aceptación
- [ ] `npm create vite@latest` ejecutado con template `react-ts`
- [ ] `tsconfig.json` con `"strict": true` activado
- [ ] ESLint instalado y configurado (sin errores en proyecto vacío)
- [ ] Prettier instalado con reglas base (.prettierrc)
- [ ] Estructura de carpetas creada: `components/` `pages/` `hooks/` `services/` `store/` `db/` `lib/`
- [ ] `npm run dev` levanta el proyecto sin errores en http://localhost:5173
- [ ] README.md con instrucciones de instalación local

## Notas técnicas
Usar Node.js 18+. No instalar librerías adicionales en esta issue — solo el setup base.
```

---

### Issue #2 — [S1] Configurar Tailwind CSS + sistema de diseño base
**Asignado:** Daniel | **Labels:** `frontend` `setup`

```
## Descripción
Instalar y configurar Tailwind con la paleta de colores y tipografías de EVA.

## Criterios de aceptación
- [ ] Tailwind CSS instalado y configurado correctamente con Vite
- [ ] Paleta de colores EVA definida en `tailwind.config.ts` (rosa, lavanda, verde salud)
- [ ] Componente `Button` creado con variantes: primary, secondary, ghost
- [ ] Componente `Input` creado con estado: default, focus, error
- [ ] Componente `Card` creado con sombra y borde redondeado
- [ ] Componente `Badge` creado para labels de fase del ciclo
- [ ] Dark mode configurado con `class` strategy
- [ ] Página de prueba mostrando todos los componentes base

## Notas técnicas
Los colores de la paleta EVA deben reflejar los valores del proyecto: cálido, femenino, médico.
```

---

### Issue #3 — [S1] Configurar vite-plugin-pwa + manifest.json
**Asignado:** Daniel | **Labels:** `frontend` `pwa`

```
## Descripción
Configurar la PWA para que EVA sea instalable en dispositivos móviles y desktop.

## Criterios de aceptación
- [ ] `vite-plugin-pwa` instalado y configurado en `vite.config.ts`
- [ ] `manifest.json` con: nombre "EVA", nombre corto "EVA", descripción, colores de tema
- [ ] Iconos de la app en tamaños: 192x192 y 512x512 (pueden ser placeholders por ahora)
- [ ] App instalable desde Chrome en Android (aparece el banner "Agregar a pantalla de inicio")
- [ ] `npm run build` genera el Service Worker sin errores
- [ ] Lighthouse PWA score básico > 80 en build de producción

## Notas técnicas
Workbox se configurará en detalle en el Sprint 6. Por ahora solo el setup mínimo funcional.
```

---

### Issue #4 — [S1] Inicializar FastAPI + estructura de carpetas SRP
**Asignado:** Meriyei | **Labels:** `backend` `setup`

```
## Descripción
Crear el backend con FastAPI siguiendo estrictamente el Principio de Responsabilidad Única.

## Criterios de aceptación
- [ ] FastAPI inicializado con Python 3.11+
- [ ] Estructura de carpetas creada:
  - `app/routers/` — solo reciben HTTP
  - `app/services/` — lógica de negocio
  - `app/repositories/` — solo hablan con BD
  - `app/models/` — schemas Pydantic
  - `app/core/` — configuración transversal (db.py, security.py, config.py)
- [ ] `python-dotenv` instalado, `.env.example` creado con todas las variables necesarias
- [ ] `.gitignore` configurado (incluye `.env`, `__pycache__`, `ml_models/*.pkl`)
- [ ] `requirements.txt` completo y funcional
- [ ] `uvicorn app.main:app --reload` levanta sin errores en puerto 8000

## Notas técnicas
NO instalar SQLAlchemy ni Prophet en esta issue. Solo el skeleton del proyecto.
```

---

### Issue #5 — [S1] Configurar proyecto Supabase (BD + Auth)
**Asignado:** Meriyei | **Labels:** `backend` `database` `auth`

```
## Descripción
Crear y configurar el proyecto en Supabase con la base de datos y autenticación.

## Criterios de aceptación
- [ ] Proyecto Supabase creado en https://supabase.com
- [ ] Variables de entorno obtenidas: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`, `DATABASE_URL`
- [ ] Variables agregadas al `.env` local y al `.env.example` (sin valores reales)
- [ ] Supabase Auth habilitado con proveedor Email/Password
- [ ] Script SQL de `DATABASE_SCHEMA.md` ejecutado en el SQL Editor de Supabase
- [ ] Seed de síntomas ejecutado: `SELECT count(*) FROM symptoms_catalog` → retorna 30
- [ ] Conexión PostgreSQL verificada desde FastAPI: `asyncpg` o `psycopg2` conecta sin error
- [ ] Row Level Security (RLS) activado en todas las tablas

## Notas técnicas
Las credenciales reales NUNCA van al repositorio. Usar GitHub Secrets para CI/CD.
```

---

### Issue #6 — [S1] Endpoint GET /health + CORS configurado
**Asignado:** Meriyei | **Labels:** `backend` `setup`

```
## Descripción
Primer endpoint funcional y configuración de CORS para que el frontend pueda consumir la API.

## Criterios de aceptación
- [ ] `GET /health` retorna `{"status": "ok", "version": "1.0.0", "environment": "development"}`
- [ ] CORS configurado para aceptar requests de `http://localhost:5173`
- [ ] Swagger UI accesible en `http://localhost:8000/docs`
- [ ] ReDoc accesible en `http://localhost:8000/redoc`
- [ ] Uvicorn corriendo en puerto 8000 con `--reload`
- [ ] El frontend puede hacer `fetch('http://localhost:8000/health')` sin errores de CORS

## Notas técnicas
Agregar el middleware de CORS con `CORSMiddleware` de FastAPI. En producción,
el origen permitido será el dominio de Vercel.
```

---

### Issue #7 — [S1] Configurar CI/CD con GitHub Actions
**Asignado:** Madeleine | **Labels:** `devops` `setup`

```
## Descripción
Automatizar la verificación de calidad del código en cada push al repositorio.

## Criterios de aceptación
- [ ] Workflow `.github/workflows/backend.yml`: ejecuta lint (flake8/ruff) + pytest en cada push a `main`
- [ ] Workflow `.github/workflows/frontend.yml`: ejecuta `npm run build` en cada PR
- [ ] Badges de estado de los workflows en el README.md
- [ ] Variables de entorno de prueba configuradas como GitHub Secrets
- [ ] Los workflows pasan en verde con el código actual (aunque no haya tests todavía)
- [ ] Fallan correctamente si se introduce un error de sintaxis

## Notas técnicas
Usar `ubuntu-latest` como runner. Los secretos necesarios: `SUPABASE_URL_TEST`,
`SUPABASE_JWT_SECRET_TEST` para el entorno de pruebas del CI.
```

---

### Issue #8 — [S1] Configurar Vitest para testing unitario frontend
**Asignado:** Madeleine | **Participa:** Daniel | **Labels:** `testing` `setup` `frontend`

```
## Descripción
Configurar el framework de testing desde el Sprint 1 para evitar deuda técnica acumulada.

## Criterios de aceptación
- [ ] Vitest instalado y configurado en `vite.config.ts`
- [ ] `@testing-library/react` y `@testing-library/user-event` instalados
- [ ] `jsdom` configurado como entorno de test
- [ ] Test de ejemplo funcionando: verifica que el componente `Button` renderiza su texto
- [ ] Script `npm run test` ejecuta los tests correctamente
- [ ] Script `npm run test:coverage` genera reporte de cobertura
- [ ] Configuración integrada con el workflow de GitHub Actions

## Notas técnicas
**Daniel apoya** en la configuración del entorno y en el test de ejemplo del componente Button.
```

---

## Sprint 2 — Rastreo de ciclos

---

### Issue #9 — [S2] Modelo de datos: tablas cycles + daily_logs (3NF)
**Asignado:** Meriyei | **Labels:** `backend` `database`

```
## Descripción
Implementar el esquema normalizado de ciclos y registros diarios en PostgreSQL.

## Criterios de aceptación
- [ ] Tabla `cycles` creada con todos los campos de `DATABASE_SCHEMA.md`
- [ ] Tabla `daily_logs` creada con todos sus campos
- [ ] Foreign keys y constraints de fechas implementados (`end_date >= start_date`)
- [ ] Constraint UNIQUE en `(user_id, start_date)` en cycles
- [ ] Constraint UNIQUE en `(cycle_id, date)` en daily_logs
- [ ] Índices creados: `idx_cycles_user_date`, `idx_daily_logs_cycle`
- [ ] Trigger `updated_at` funcionando en ambas tablas
- [ ] Migración Alembic generada: `001_initial_schema.py`
- [ ] `DATABASE_SCHEMA.md` actualizado si hay cambios respecto al documento original

## Notas técnicas
Usar SQLAlchemy Core para definir las tablas como objetos `Table`. No usar modelos ORM declarativos.
```

---

### Issue #10 — [S2] Repositorio cycle_repo.py + queries SQLAlchemy Core
**Asignado:** Meriyei | **Labels:** `backend` `database`

```
## Descripción
Capa de repositorio que abstrae todas las operaciones de base de datos para ciclos.

## Criterios de aceptación
- [ ] `get_cycles_by_user(user_id, limit, offset)` — lista ciclos con paginación
- [ ] `get_cycle_by_id(cycle_id, user_id)` — obtiene un ciclo verificando que pertenezca al usuario
- [ ] `create_cycle(user_id, data)` — inserta nuevo ciclo
- [ ] `update_cycle(cycle_id, user_id, data)` — actualiza ciclo verificando propiedad
- [ ] `delete_cycle(cycle_id, user_id)` — elimina ciclo (CASCADE automático)
- [ ] `count_cycles(user_id)` — cuenta total de ciclos (usado para trigger de ML)
- [ ] Todas las queries usan SQLAlchemy Core (no texto SQL crudo ni ORM)
- [ ] Ninguna query usa `SELECT *` — siempre columnas explícitas

## Notas técnicas
El `user_id` siempre se pasa como filtro en cada query. Esto garantiza que un usuario
no pueda acceder a datos de otro, incluso si el JWT es válido.
```

---

### Issue #11 — [S2] Endpoints CRUD /cycles
**Asignado:** Meriyei | **Participa:** Daniel | **Labels:** `backend`

```
## Descripción
Exponer los endpoints REST para gestión completa de ciclos.

## Criterios de aceptación
- [ ] `POST /cycles` — crea ciclo, retorna 201 con el objeto creado
- [ ] `GET /cycles` — lista ciclos del usuario con paginación (limit, offset, from_date)
- [ ] `GET /cycles/{cycle_id}` — obtiene ciclo con sus daily_logs incluidos
- [ ] `PUT /cycles/{cycle_id}` — actualiza ciclo, retorna 200
- [ ] `DELETE /cycles/{cycle_id}` — elimina ciclo, retorna 204
- [ ] Validación Pydantic en todos los inputs
- [ ] Retorna 404 si el ciclo no existe o no pertenece al usuario
- [ ] Retorna 409 si ya existe un ciclo con la misma `start_date`
- [ ] Retorna 401 si no hay JWT válido
- [ ] Todos los endpoints documentados en Swagger (`/docs`)
- [ ] `ENDPOINTS.md` actualizado si hay diferencias con el documento original

## Notas técnicas
**Daniel apoya** probando los endpoints desde el frontend (fetch manual o Postman)
y reportando cualquier problema de CORS o formato de respuesta.
```

---

### Issue #12 — [S2] Componente calendario mensual
**Asignado:** Daniel | **Labels:** `frontend`

```
## Descripción
Vista de calendario que muestra el ciclo actual y el historial de ciclos anteriores.

## Criterios de aceptación
- [ ] Calendario mensual navegable (botones anterior/siguiente mes)
- [ ] Días de menstruación marcados con color rojo/rosa
- [ ] Fases del ciclo con colores diferenciados (menstruación, folicular, ovulación, lútea)
- [ ] Día actual resaltado
- [ ] Al hacer clic en un día, muestra el resumen del registro de ese día (si existe)
- [ ] Diseño responsive: funciona en móvil (375px) y desktop
- [ ] Accesible: `aria-label` en cada celda del calendario
- [ ] Se conecta a `GET /cycles` para obtener los datos reales

## Notas técnicas
Implementar sin librerías de calendario externas para mantener control total del diseño.
Usar CSS Grid para la grilla del calendario.
```

---

### Issue #13 — [S2] Formulario crear/editar ciclo
**Asignado:** Daniel | **Labels:** `frontend`

```
## Descripción
Formulario para que la usuaria ingrese o edite la fecha de inicio y fin de un ciclo.

## Criterios de aceptación
- [ ] Selector de fecha de inicio (date picker nativo o componente custom)
- [ ] Selector de fecha de fin (opcional)
- [ ] Validación en cliente: fecha fin >= fecha inicio
- [ ] Mensaje de error visible si la validación falla
- [ ] Feedback visual de éxito al guardar (toast o mensaje inline)
- [ ] Estado de carga mientras se espera la respuesta de la API
- [ ] Conectado a `POST /cycles` para crear y `PUT /cycles/{id}` para editar
- [ ] Al editar, el formulario pre-carga los valores actuales
- [ ] Botón de cancelar que cierra el formulario sin guardar

## Notas técnicas
El componente debe funcionar tanto para crear (sin datos iniciales) como para editar
(con datos pre-cargados). Recibe `initialData` como prop opcional.
```

---

### Issue #14 — [S2] Integración Supabase Auth en frontend
**Asignado:** Daniel | **Participa:** Meriyei | **Labels:** `frontend` `auth`

```
## Descripción
Implementar login, registro y logout con Supabase Auth en React.

## Criterios de aceptación
- [ ] Página de registro con email y contraseña
- [ ] Página de login con email y contraseña
- [ ] Token JWT almacenado de forma segura (memoria o httpOnly cookie, no localStorage)
- [ ] Hook `useAuth()` que expone: `user`, `login()`, `register()`, `logout()`, `isLoading`
- [ ] Rutas protegidas con componente `PrivateRoute` — redirigen a /login si no hay sesión
- [ ] Logout limpia la sesión correctamente
- [ ] El token se envía automáticamente en el header `Authorization: Bearer ...` en cada request
- [ ] Manejo de errores: credenciales incorrectas, email ya registrado

## Notas técnicas
**Meriyei valida** que el JWT generado por Supabase Auth se puede decodificar correctamente
en el middleware de FastAPI con `SUPABASE_JWT_SECRET`.
```

---

### Issue #15 — [S2] Tests unitarios: cycle_service.py
**Asignado:** Madeleine | **Participa:** Meriyei | **Labels:** `testing` `backend`

```
## Descripción
Cubrir la lógica de negocio del servicio de ciclos con tests unitarios.

## Criterios de aceptación
- [ ] Test: crear ciclo con fechas válidas → retorna ciclo con ID generado
- [ ] Test: crear ciclo con `end_date < start_date` → lanza excepción de validación
- [ ] Test: listar ciclos solo retorna los del usuario autenticado (no mezcla usuarios)
- [ ] Test: actualizar ciclo inexistente → lanza NotFoundError
- [ ] Test: eliminar ciclo elimina también sus daily_logs (verificar CASCADE)
- [ ] Cobertura del servicio > 80%
- [ ] Tests usan base de datos en memoria (SQLite) o mocks del repositorio
- [ ] Los tests corren con `pytest -v` sin necesidad de Supabase real

## Notas técnicas
**Meriyei revisa** los casos edge identificados durante el desarrollo del repositorio
y los agrega como casos de test adicionales.
```

---

## Sprint 3 — Síntomas

---

### Issue #16 — [S3] Tablas symptoms_catalog + daily_symptoms (3NF)
**Asignado:** Meriyei | **Labels:** `backend` `database`

```
## Descripción
Implementar el catálogo de síntomas y la tabla puente para el registro diario en 1NF.

## Criterios de aceptación
- [ ] Tabla `symptoms_catalog` creada con campos: id, name, category, common_phase
- [ ] Tabla `daily_symptoms` creada con clave primaria compuesta `(log_id, symptom_id)`
- [ ] Check constraint en `intensity` entre 1 y 5
- [ ] Foreign keys con ON DELETE CASCADE configurados
- [ ] Índices creados: `idx_daily_symptoms_log`, `idx_daily_symptoms_symptom`
- [ ] Seed de 30 síntomas ejecutado (del `DATABASE_SCHEMA.md`)
- [ ] Migración Alembic generada: `002_add_symptoms.py`
- [ ] `SELECT count(*) FROM symptoms_catalog` retorna 30

## Notas técnicas
`symptoms_catalog` es una tabla de referencia — las usuarias NO pueden agregar síntomas
propios en esta versión. Es solo lectura para los usuarios.
```

---

### Issue #17 — [S3] Endpoints CRUD /symptoms y /daily-logs
**Asignado:** Meriyei | **Labels:** `backend`

```
## Descripción
Exponer endpoints para el catálogo de síntomas y el registro diario completo.

## Criterios de aceptación
- [ ] `GET /symptoms/catalog` — lista todos los síntomas, agrupados por categoría
- [ ] `POST /daily-logs` — crea registro diario con síntomas incluidos en un solo request
- [ ] `GET /daily-logs/{cycle_id}` — lista todos los logs de un ciclo con sus síntomas
- [ ] `PUT /daily-logs/{log_id}` — actualiza log y reemplaza todos sus síntomas
- [ ] `DELETE /daily-logs/{log_id}` — elimina log y sus síntomas (CASCADE)
- [ ] Retorna 409 si ya existe un log para ese día en ese ciclo
- [ ] Retorna 404 si el ciclo no pertenece al usuario autenticado
- [ ] `ENDPOINTS.md` actualizado si hay cambios

## Notas técnicas
El `POST /daily-logs` debe crear el log y los síntomas en una sola transacción de BD.
Si falla la inserción de síntomas, debe revertir también la creación del log.
```

---

### Issue #18 — [S3] Formulario de registro diario de síntomas
**Asignado:** Daniel | **Labels:** `frontend`

```
## Descripción
Interfaz para que la usuaria registre cómo se siente cada día del ciclo.

## Criterios de aceptación
- [ ] Grid de síntomas organizados por categoría (física, emocional, digestiva)
- [ ] Al seleccionar un síntoma, aparece un slider de intensidad del 1 al 5
- [ ] Selector de nivel de flujo con 4 opciones visuales: ninguno / leve / medio / abundante
- [ ] Campo de temperatura basal (opcional, input numérico con validación 35–42°C)
- [ ] Área de notas libres (textarea)
- [ ] Botón de guardar conectado a `POST /daily-logs`
- [ ] Si ya existe un registro del día, carga los datos y usa `PUT /daily-logs/{id}`
- [ ] Estado de carga y feedback de éxito/error

## Notas técnicas
Los síntomas disponibles se obtienen de `GET /symptoms/catalog` al cargar el componente.
Cachear en Zustand store para no re-fetch en cada apertura del formulario.
```

---

### Issue #19 — [S3] Vista historial de síntomas por ciclo
**Asignado:** Daniel | **Labels:** `frontend`

```
## Descripción
Pantalla que muestra el historial de síntomas de un ciclo completo en forma visual.

## Criterios de aceptación
- [ ] Lista de días con síntomas registrados, ordenada cronológicamente
- [ ] Iconos o badges por categoría de síntoma (💪 física, 😔 emocional, 🌿 digestiva)
- [ ] Barra visual de intensidad (1–5) para cada síntoma
- [ ] Indicador del nivel de flujo por día (color según intensidad)
- [ ] Temperatura basal mostrada si fue registrada
- [ ] Navegación entre ciclos (anterior / siguiente)
- [ ] Estado vacío cuando no hay registros en el ciclo

## Notas técnicas
Conectado a `GET /daily-logs/{cycle_id}`. Si el ciclo no tiene logs,
mostrar ilustración de estado vacío con CTA para registrar.
```

---

### Issue #20 — [S3] Configurar pytest + fixtures de BD para testing
**Asignado:** Madeleine | **Participa:** Meriyei | **Labels:** `testing` `backend`

```
## Descripción
Configurar el entorno de tests del backend con base de datos de prueba y fixtures reutilizables.

## Criterios de aceptación
- [ ] pytest configurado con `pytest.ini` o `pyproject.toml`
- [ ] `pytest-asyncio` instalado para tests async
- [ ] Fixture `test_db`: base de datos SQLite en memoria que recrea el schema en cada test
- [ ] Fixture `test_user`: usuario de prueba con UUID fijo
- [ ] Fixture `test_cycle`: ciclo de prueba asociado al test_user
- [ ] Tests de endpoints de síntomas usando `httpx.AsyncClient`
- [ ] Los tests corren sin necesidad de conexión a Supabase real
- [ ] `pytest --cov=app` genera reporte de cobertura

## Notas técnicas
**Meriyei define** las fixtures según los modelos de datos que implementó.
El objetivo es que cualquier developer pueda correr `pytest -v` sin configuración adicional.
```

---

### Issue #21 — [S3] IndexedDB: modelo de datos local para offline
**Asignado:** Madeleine | **Participa:** Daniel | **Labels:** `frontend` `pwa`

```
## Descripción
Definir el esquema de IndexedDB con Dexie.js para soporte offline completo.

## Criterios de aceptación
- [ ] `dexie` instalado como dependencia
- [ ] Archivo `src/db/localDB.ts` con el schema de Dexie
- [ ] Stores definidos: `cycles`, `daily_logs`, `symptoms_catalog`, `sync_queue`
- [ ] Operaciones CRUD locales implementadas para `cycles` y `daily_logs`
- [ ] `symptoms_catalog` se pre-carga desde la API en primer uso y se cachea localmente
- [ ] `sync_queue` almacena operaciones pendientes cuando no hay conexión
- [ ] Tests básicos de las operaciones CRUD locales con Vitest

## Notas técnicas
**Daniel integra** las operaciones de Dexie con los hooks existentes (`useCycles`, `useDailyLogs`).
La lógica debe ser: intentar API → si falla, usar IndexedDB → encolar en sync_queue.
```

---

## Sprint 4 — Dashboard

---

### Issue #22 — [S4] Endpoints /analytics/summary y /analytics/symptoms
**Asignado:** Meriyei | **Labels:** `backend` `analytics`

```
## Descripción
Endpoints que calculan estadísticas del ciclo para alimentar el dashboard.

## Criterios de aceptación
- [ ] `GET /analytics/summary` retorna: total_cycles, avg_cycle_duration, avg_period_duration, cycle_variability_days, shortest_cycle, longest_cycle, last_cycle_start
- [ ] `GET /analytics/symptoms?cycles_back=3&limit=10` retorna top síntomas con frecuencia e intensidad promedio
- [ ] `GET /analytics/flow` retorna distribución de flujo por fase del ciclo
- [ ] `GET /analytics/phases` retorna duración promedio de cada fase
- [ ] Todas las queries retornan en menos de 300ms con 50 ciclos de prueba
- [ ] Retorna datos vacíos/zeros si la usuaria no tiene ciclos (no lanza 500)

## Notas técnicas
Las queries de analytics usan window functions de PostgreSQL (`LEAD`, `LAG`).
Ver las queries de referencia en `DATABASE_SCHEMA.md`, sección 9.
```

---

### Issue #23 — [S4] Optimización de queries analytics con índices
**Asignado:** Meriyei | **Labels:** `backend` `database` `performance`

```
## Descripción
Garantizar que los endpoints de analytics sean rápidos con volumen de datos real.

## Criterios de aceptación
- [ ] `EXPLAIN ANALYZE` ejecutado en las 4 queries de analytics
- [ ] Ninguna query tiene `Seq Scan` en tablas grandes (usar `Index Scan`)
- [ ] Índices adicionales agregados donde el EXPLAIN lo sugiera
- [ ] Tiempo de respuesta < 200ms con dataset de prueba: 100 ciclos, 500 daily_logs
- [ ] Script de generación de datos de prueba creado: `scripts/seed_test_data.py`
- [ ] Resultados del EXPLAIN documentados en un comentario de la issue

## Notas técnicas
Crear los datos de prueba con `seed_test_data.py` que genere ciclos sintéticos
para al menos 10 usuarios de prueba, cada uno con 8–15 ciclos.
```

---

### Issue #24 — [S4] Dashboard principal — métricas del ciclo
**Asignado:** Daniel | **Labels:** `frontend`

```
## Descripción
Pantalla principal de EVA con las estadísticas más importantes de la usuaria.

## Criterios de aceptación
- [ ] Card: "Duración promedio de tu ciclo: X días"
- [ ] Card: "Tu próximo período en: X días" (con fecha estimada)
- [ ] Card: "Fase actual: [nombre de la fase]" con descripción breve
- [ ] Card: "Ciclo actual: día X de Y"
- [ ] Resumen de los últimos 3 ciclos (fechas y duración)
- [ ] Botón de acceso rápido a "Registrar hoy"
- [ ] Carga inicial en menos de 2 segundos
- [ ] Estado vacío si la usuaria no tiene ciclos (CTA para registrar el primero)

## Notas técnicas
Consumir `GET /analytics/summary` y `GET /predictions/next` (aunque sea heurística básica).
El card de "próximo período" se actualiza cuando se implemente la predicción en Sprint 5.
```

---

### Issue #25 — [S4] Gráfico de duración de ciclos
**Asignado:** Daniel | **Participa:** Madeleine | **Labels:** `frontend` `analytics`

```
## Descripción
Visualización de la duración de los últimos ciclos como gráfico de línea histórica.

## Criterios de aceptación
- [ ] Gráfico de línea con duración (días) en el eje Y y número de ciclo en el eje X
- [ ] Línea horizontal de promedio (color diferenciado)
- [ ] Punto marcado en cada ciclo con tooltip: "Ciclo #N — X días — [fecha inicio]"
- [ ] Shading de zona "normal" (promedio ± 3 días)
- [ ] Responsive: se adapta al ancho del contenedor
- [ ] Librería: Recharts (ya incluida en el stack)

## Notas técnicas
**Madeleine define** los rangos de "zona normal" para el shading, con criterio médico.
Los datos vienen de `GET /cycles` — calcular duraciones en el frontend.
```

---

### Issue #26 — [S4] Gráfico de síntomas más frecuentes
**Asignado:** Daniel | **Labels:** `frontend` `analytics`

```
## Descripción
Gráfico de barras con los síntomas más recurrentes de la usuaria.

## Criterios de aceptación
- [ ] Gráfico de barras horizontales con top 5 síntomas
- [ ] Barras coloreadas por categoría (física=rojo, emocional=lavanda, digestiva=verde)
- [ ] Eje X: frecuencia (0% a 100%)
- [ ] Tooltip: "Apareció en X de tus últimos Y ciclos · Intensidad promedio: Z/5"
- [ ] Selector de período: "Últimos 3 ciclos / Últimos 6 ciclos / Histórico"
- [ ] Conectado a `GET /analytics/symptoms?cycles_back=N`

## Notas técnicas
Si la usuaria tiene menos de 3 ciclos, mostrar mensaje explicativo en lugar del gráfico.
```

---

### Issue #27 — [S4] Tests E2E: flujo de registro de síntomas
**Asignado:** Madeleine | **Participa:** Daniel | **Labels:** `testing`

```
## Descripción
Primeros tests end-to-end con Playwright que verifican el flujo completo de la app.

## Criterios de aceptación
- [ ] Playwright instalado y configurado
- [ ] Test: login con usuario de prueba → ver dashboard
- [ ] Test: ir a calendario → seleccionar día → abrir formulario de síntomas
- [ ] Test: seleccionar síntoma "Fatiga" con intensidad 3 → guardar
- [ ] Test: volver al historial → verificar que el síntoma aparece guardado
- [ ] Tests corren con `npx playwright test` en modo headless
- [ ] Tests integrados en el workflow de GitHub Actions

## Notas técnicas
**Daniel apoya** en los selectores CSS y en la configuración del usuario de prueba.
Usar `page.getByRole()` y `page.getByTestId()` para selectores robustos.
```

---

## Sprint 5 — Predicción básica

---

### Issue #28 — [S5] Servicio prediction_service.py — heurística promedio
**Asignado:** Meriyei | **Participa:** Madeleine | **Labels:** `backend` `ml`

```
## Descripción
Implementar el primer modelo de predicción basado en el promedio de ciclos anteriores.

## Criterios de aceptación
- [ ] Función `predict_next_cycle_heuristic(user_id)` implementada en `prediction_service.py`
- [ ] Caso 0 ciclos: retorna mensaje informativo, no lanza error
- [ ] Caso 1 ciclo: asume duración de 28 días
- [ ] Caso 2+ ciclos: calcula promedio y desviación estándar de las duraciones
- [ ] Retorna: `predicted_start_date`, `confidence_range` (early/late), `avg_cycle_length`, `cycle_variability`, `prediction_source: "heuristic"`
- [ ] SRP respetado: la lógica está en `services/`, el repo solo en `repositories/`
- [ ] Función separada de `ml_service.py` — esta es lógica de negocio, no ML

## Notas técnicas
**Madeleine valida** el algoritmo con casos de prueba: ciclos de 21, 28 y 35 días,
y ciclos con alta variabilidad (SOP simulado).
```

---

### Issue #29 — [S5] Endpoint GET /predictions/next
**Asignado:** Meriyei | **Labels:** `backend` `ml`

```
## Descripción
Exponer la predicción del próximo ciclo vía API REST.

## Criterios de aceptación
- [ ] `GET /predictions/next` llama a `prediction_service.get_next_prediction(user_id)`
- [ ] Respuesta incluye: `predicted_start_date`, `confidence_range`, `days_until_next`, `current_phase`, `current_phase_day`, `prediction_source`, `fertile_window`
- [ ] Retorna 422 con mensaje descriptivo si no hay ciclos registrados
- [ ] Calcula correctamente `current_phase` y `current_phase_day` basado en el último ciclo
- [ ] Documentado en Swagger con ejemplos de response

## Notas técnicas
La función `calculate_current_phase(last_cycle)` debe estar en `app/utils/cycle_utils.py`,
no en el servicio. Es una utilidad pura sin dependencias de BD.
```

---

### Issue #30 — [S5] Widget 'Próximo período' en el dashboard
**Asignado:** Daniel | **Labels:** `frontend`

```
## Descripción
Componente prominente en el dashboard que muestra la fecha estimada del próximo período.

## Criterios de aceptación
- [ ] Countdown visual: "Tu próximo período en X días"
- [ ] Fecha estimada: "Estimado: DD de mes"
- [ ] Rango de confianza: "Entre el DD y el DD"
- [ ] Indicador visual diferenciado: badge "Predicción básica" (Sprint 5) vs "IA activada" (Sprint 8)
- [ ] Ventana fértil mostrada como rango de fechas
- [ ] Tooltip explicando qué significa "predicción básica"
- [ ] Conectado a `GET /predictions/next`
- [ ] Se actualiza automáticamente cuando se registra un nuevo ciclo

## Notas técnicas
Este componente se actualizará en Sprint 8 para mostrar la predicción de Prophet.
Diseñarlo como `<PredictionWidget source="heuristic"|"prophet" ... />` para facilitar la extensión.
```

---

### Issue #31 — [S5] Educación contextual por fase del ciclo
**Asignado:** Daniel | **Participa:** Madeleine | **Labels:** `frontend`

```
## Descripción
Sección de artículos educativos que cambian según la fase del ciclo actual de la usuaria.

## Criterios de aceptación
- [ ] Al menos 3 artículos/tips por cada fase (menstruación, folicular, ovulación, lútea)
- [ ] Contenido con validación médica básica (revisado por Madeleine)
- [ ] Diseño de tarjetas legibles con título, icono de fase y texto corto (máx 100 palabras)
- [ ] La fase activa se obtiene de `GET /predictions/next` → campo `current_phase`
- [ ] Las tarjetas correspondientes a la fase actual se muestran primero/destacadas
- [ ] Las tarjetas de otras fases son visibles pero secundarias (collapsible o sección separada)

## Notas técnicas
**Madeleine define** el contenido médico de los 12 artículos (3 × 4 fases).
El contenido puede ser hardcodeado en un archivo `src/lib/cycleEducation.ts` por ahora.
```

---

### Issue #32 — [S5] Integrar Ollama para insights conversacionales (LLM local)
**Asignado:** Madeleine | **Participa:** Meriyei | **Labels:** `ml` `ai` `backend`

```
## Descripción
Configurar Ollama con Mistral 7B y conectarlo al backend FastAPI para generar insights
personalizados sin enviar datos a servicios externos.

## Criterios de aceptación
- [ ] Ollama instalado en el entorno de desarrollo
- [ ] Modelo `mistral` descargado y funcionando: `ollama run mistral "hola"` responde
- [ ] `llm_service.py` implementado con función `get_insight(question, cycle_context)`
- [ ] Función `_call_ollama()` implementada con timeout de 30s y manejo de errores
- [ ] Función `_call_groq()` implementada como fallback (requiere `GROQ_API_KEY` en .env)
- [ ] Sistema de fallback: Ollama → Groq → RuntimeError
- [ ] El contexto enviado al LLM NUNCA contiene email, nombre ni fecha de nacimiento
- [ ] `POST /insights` endpoint funcionando: recibe `question` y retorna insight
- [ ] Respuestas en español confirmadas

## Notas técnicas
**Meriyei define** qué datos del ciclo se incluyen en el contexto y valida
que no se filtre PII. Ver estructura de contexto en `ML_STRATEGY.md`, sección 10.
```

---

### Issue #33 — [S5] Tests unitarios: prediction_service.py
**Asignado:** Madeleine | **Labels:** `testing` `ml`

```
## Descripción
Validar la precisión y robustez del algoritmo heurístico de predicción.

## Criterios de aceptación
- [ ] Test: 3 ciclos de 28 días exactos → predicción = fecha_último + 28 días
- [ ] Test: ciclos irregulares [24, 32, 28, 30] → predicción dentro del rango esperado
- [ ] Test: 0 ciclos → retorna mensaje informativo, no lanza excepción
- [ ] Test: 1 ciclo → asume 28 días de duración
- [ ] Test: ciclos con alta variabilidad (SOP simulado: [19, 45, 23, 38]) → no lanza error
- [ ] MAE calculado con dataset sintético de 20 ciclos con variabilidad moderada → MAE < 3.0 días
- [ ] Todos los tests usan datos sintéticos, sin BD real

## Notas técnicas
Crear fixture `synthetic_cycles(n, base, noise)` reutilizable para otros tests de ML.
```

---

## Sprint 6 — PWA Offline

---

### Issue #34 — [S6] CRUD completo en IndexedDB (offline-first)
**Asignado:** Daniel | **Labels:** `frontend` `pwa`

```
## Descripción
Garantizar que todas las acciones críticas funcionen sin internet usando Dexie.js.

## Criterios de aceptación
- [ ] Crear ciclo offline: se guarda en IndexedDB y se encola en `sync_queue`
- [ ] Registrar síntomas offline: se guarda localmente y se encola
- [ ] Ver dashboard offline: usa datos cacheados de IndexedDB
- [ ] Ver historial de síntomas offline: datos locales disponibles
- [ ] Predicción heurística calculada localmente (sin llamada a API)
- [ ] Indicador visual de modo offline en el header de la app
- [ ] `symptoms_catalog` disponible offline (pre-cargado en primer uso con conexión)

## Notas técnicas
La estrategia es: siempre escribir primero en IndexedDB, luego sincronizar con la API.
En modo offline, las operaciones de lectura siempre van directo a IndexedDB.
```

---

### Issue #35 — [S6] Banner de instalación PWA + prompt nativo
**Asignado:** Daniel | **Labels:** `frontend` `pwa`

```
## Descripción
Guiar a la usuaria para instalar EVA como app nativa en su dispositivo.

## Criterios de aceptación
- [ ] Banner de instalación contextual (aparece después de 2 minutos de uso, no inmediatamente)
- [ ] Detecta si la app ya está instalada → no muestra el banner si ya lo está
- [ ] Botón "Instalar EVA" dispara el prompt nativo del navegador en Android/Chrome
- [ ] Instrucciones especiales para iOS: "Toca Compartir → Agregar a pantalla de inicio"
- [ ] Opción "No, gracias" que no vuelve a aparecer por 30 días
- [ ] El banner es accesible (no bloquea el contenido principal)

## Notas técnicas
Usar el evento `beforeinstallprompt` en Chrome. Para iOS, detectar con
`navigator.standalone` y `navigator.userAgent` y mostrar instrucciones manuales.
```

---

### Issue #36 — [S6] Service Worker con Workbox — estrategia de cache
**Asignado:** Madeleine | **Participa:** Daniel | **Labels:** `pwa` `frontend`

```
## Descripción
Implementar estrategias de cache diferenciadas para assets y llamadas a API.

## Criterios de aceptación
- [ ] Estrategia `CacheFirst` para: assets estáticos (JS, CSS, imágenes, fuentes)
- [ ] Estrategia `NetworkFirst` con fallback para: llamadas a la API de FastAPI
- [ ] Estrategia `StaleWhileRevalidate` para: `GET /symptoms/catalog` (cambia raramente)
- [ ] Página offline fallback (`/offline.html`) cuando no hay red y no hay cache
- [ ] Cache se invalida automáticamente al hacer build con nueva versión (cache busting)
- [ ] `npm run build` genera el Service Worker con las estrategias configuradas
- [ ] Verificar con DevTools → Application → Service Workers que el SW está activo

## Notas técnicas
**Daniel integra** el Service Worker con React Router para que las rutas de la SPA
funcionen correctamente en modo offline (navigate handler).
```

---

### Issue #37 — [S6] Sincronización offline → online (Background Sync)
**Asignado:** Madeleine | **Labels:** `pwa` `frontend`

```
## Descripción
Cuando la usuaria registra datos offline, sincronizarlos automáticamente al reconectar.

## Criterios de aceptación
- [ ] Al reconectar (evento `online`), se procesan todas las operaciones de `sync_queue`
- [ ] Las operaciones se envían al endpoint `POST /sync` en orden cronológico
- [ ] Indicador visual durante la sincronización ("Sincronizando X operaciones...")
- [ ] Indicador de éxito al completar ("Datos sincronizados ✓")
- [ ] Si una operación falla en el servidor, se marca como `failed` en `sync_queue` con el error
- [ ] Las operaciones exitosas se eliminan de `sync_queue`
- [ ] Background Sync API como mejora progresiva (funciona también sin soporte nativo)

## Notas técnicas
Implementar primero con el evento `online` del browser. Luego agregar
la Background Sync API como enhancement para cuando el SW lo soporte.
```

---

### Issue #38 — [S6] Tests de integración: flujos offline completos
**Asignado:** Madeleine | **Participa:** Daniel | **Labels:** `testing` `pwa`

```
## Descripción
Verificar con Playwright que todos los flujos críticos funcionan sin conexión.

## Criterios de aceptación
- [ ] Test: desconectar red → registrar síntoma → verificar en IndexedDB → reconectar → verificar en BD
- [ ] Test: desconectar red → ver dashboard → datos correctos desde cache
- [ ] Test: desconectar red → crear ciclo → reconectar → ciclo aparece en BD
- [ ] Test: abrir app sin haber tenido conexión previa → mensaje de estado vacío apropiado
- [ ] Playwright simula offline con `page.context().setOffline(true)`
- [ ] Tests pasan en CI/CD (headless)

## Notas técnicas
**Daniel configura** los datos de prueba necesarios (ciclos y síntomas pre-existentes)
para que los tests de modo offline tengan datos que mostrar en cache.
```

---

### Issue #39 — [S6] Endpoint POST /sync
**Asignado:** Meriyei | **Labels:** `backend`

```
## Descripción
Endpoint que recibe un batch de operaciones offline y las aplica de forma idempotente.

## Criterios de aceptación
- [ ] `POST /sync` acepta un array de operaciones (ver estructura en `ENDPOINTS.md`)
- [ ] Cada operación tiene un `client_id` único — si ya existe, se marca como `skipped`
- [ ] Las operaciones se aplican en orden de `client_timestamp`
- [ ] Tipos soportados: CREATE_CYCLE, UPDATE_CYCLE, DELETE_CYCLE, CREATE_DAILY_LOG, UPDATE_DAILY_LOG, DELETE_DAILY_LOG
- [ ] Respuesta incluye: `applied`, `skipped`, `failed` y el detalle por operación
- [ ] Si una operación individual falla, no interrumpe el resto del batch
- [ ] Las operaciones procesadas se guardan en tabla `sync_operations` (para auditoría)

## Notas técnicas
La idempotencia es crítica: el cliente puede reenviar el mismo batch si no recibió
respuesta. El `client_id` único garantiza que no se dupliquen datos.
```

---

## Sprint 7 — ML Real

---

### Issue #40 — [S7] ml_service.py — Prophet para predicción de series de tiempo
**Asignado:** Madeleine | **Participa:** Meriyei | **Labels:** `ml` `backend`

```
## Descripción
Implementar el modelo Prophet por usuaria para predicciones más precisas que la heurística.

## Criterios de aceptación
- [ ] `prophet` instalado en `requirements.txt`
- [ ] Función `train_model(user_id, cycles_data)` implementada (ver `ML_STRATEGY.md`)
- [ ] Función `predict_next_cycle(user_id, last_cycle_start)` implementada
- [ ] Función `_evaluate_model(model, df)` para calcular MAE con leave-one-out
- [ ] Modelo serializado como `ml_models/user_{user_id}.pkl` con joblib
- [ ] Directorio `ml_models/` en `.gitignore` (no versionar archivos .pkl)
- [ ] SRP respetado: `ml_service.py` NO hace queries a BD, recibe datos ya preparados
- [ ] Retorna `None` si no existe modelo para la usuaria (fallback a heurística)

## Notas técnicas
**Meriyei define** los features exactos que `cycles_data` debe contener,
basándose en las queries de `cycle_repo.py`.
```

---

### Issue #41 — [S7] Pipeline de features para el modelo ML
**Asignado:** Madeleine | **Labels:** `ml`

```
## Descripción
Implementar la extracción de features del ciclo para alimentar el modelo Prophet.

## Criterios de aceptación
- [ ] Función `get_cycles_with_features(user_id)` en `cycle_repo.py`
- [ ] Features calculadas: `start_date`, `avg_flow_level`, `avg_symptoms_lutea`
- [ ] `avg_flow_level`: promedio numérico (none=0, light=1, medium=2, heavy=3)
- [ ] `avg_symptoms_lutea`: promedio de síntomas registrados en días 15–28 del ciclo
- [ ] Query SQL optimizada (ver referencia en `DATABASE_SCHEMA.md`, sección 9)
- [ ] Retorna lista de dicts ordenada por `start_date` ascendente
- [ ] Maneja correctamente ciclos sin daily_logs (valores por defecto)
- [ ] Documentado en `ML_STRATEGY.md`, sección 6

## Notas técnicas
Las features deben ser numéricas normalizadas. Ninguna feature puede contener
información que identifique a la usuaria (solo estadísticas del ciclo).
```

---

### Issue #42 — [S7] Cron job de reentrenamiento nocturno (Render)
**Asignado:** Madeleine | **Participa:** Meriyei | **Labels:** `ml` `devops`

```
## Descripción
Script automático que reentrena los modelos Prophet cada noche para usuarias con datos nuevos.

## Criterios de aceptación
- [ ] Script `scripts/retrain_models.py` implementado (ver `ML_STRATEGY.md`, sección 7)
- [ ] Solo reentrena usuarias con ciclos nuevos desde el último entrenamiento
- [ ] Actualiza el registro en tabla `ml_models` después de cada reentrenamiento exitoso
- [ ] Logs claros: cuántos modelos entrenados / saltados / fallidos
- [ ] `render.yaml` configurado con cron job a las 03:00 UTC
- [ ] Script corre sin errores con `python scripts/retrain_models.py` localmente

## Notas técnicas
**Meriyei implementa** la función `get_users_with_new_cycles()` en `user_repo.py`
que retorna las usuarias que tienen ciclos más nuevos que su `ml_models.trained_at`.
```

---

### Issue #43 — [S7] Integrar LLM con datos reales del ciclo
**Asignado:** Madeleine | **Participa:** Meriyei | **Labels:** `ml` `ai` `backend`

```
## Descripción
Conectar el LLM con los datos reales de la BD para insights verdaderamente personalizados.

## Criterios de aceptación
- [ ] El endpoint `POST /insights` construye el contexto desde la BD (no hardcodeado)
- [ ] Contexto incluye: fase actual, día del ciclo, duración promedio, síntomas frecuentes, intensidad actual, días hasta siguiente período
- [ ] Contexto NUNCA incluye: email, nombre, fecha de nacimiento, user_id, IP
- [ ] Respuestas en español verificadas con al menos 5 preguntas de prueba
- [ ] Respuestas son coherentes con los datos del ciclo (no respuestas genéricas)
- [ ] Insights se guardan en tabla `llm_insights` para historial
- [ ] Tiempo de respuesta < 8 segundos con Ollama local

## Notas técnicas
**Meriyei valida** que el contexto construido no filtra PII revisando los logs
del servicio durante las pruebas.
```

---

### Issue #44 — [S7] Métricas de precisión: MAE del modelo ML
**Asignado:** Madeleine | **Labels:** `testing` `ml`

```
## Descripción
Calcular y verificar el MAE global del modelo Prophet con datos reales o sintéticos.

## Criterios de aceptación
- [ ] Script `scripts/evaluate_models.py` implementado (ver `ML_STRATEGY.md`, sección 8)
- [ ] Evalúa todos los modelos existentes con holdout del último ciclo
- [ ] MAE global < 1.5 días con dataset de prueba de 50 usuarias sintéticas con 8+ ciclos
- [ ] Reporte generado: MAE promedio, mínimo, máximo, modelos evaluados
- [ ] Comparación heurística vs Prophet documentada con números reales
- [ ] Script integrado en CI/CD para detección de regresión de precisión

## Notas técnicas
Si no hay usuarias reales con suficientes ciclos, generar datos sintéticos
con la fixture `make_cycles(n, base, noise)` del test suite.
```

---

### Issue #45 — [S7] Tests: ml_service.py con datos sintéticos
**Asignado:** Madeleine | **Labels:** `testing` `ml`

```
## Descripción
Tests unitarios que validan el entrenamiento y predicción del modelo Prophet.

## Criterios de aceptación
- [ ] Test: entrenar con 5 ciclos regulares (28 días) → predicción coherente (< 2 días de error)
- [ ] Test: entrenar con ciclos irregulares → no lanza error, MAE calculado
- [ ] Test: menos de 3 ciclos → lanza ValueError con mensaje descriptivo
- [ ] Test: `predict_next_cycle` sin modelo guardado → retorna None
- [ ] Test: serialización/deserialización del .pkl → el modelo cargado predice igual
- [ ] Test: ciclos con SOP simulado (variabilidad de ±10 días) → entrena sin error
- [ ] Los archivos .pkl de test se guardan en directorio temporal (`tmp_path` de pytest)

## Notas técnicas
Usar `monkeypatch` para redirigir `MODELS_DIR` al directorio temporal de pytest.
Así los tests no contaminan el directorio real de modelos.
```

---

### Issue #46 — [S7] UI: chat de insights con el asistente EVA
**Asignado:** Daniel | **Participa:** Madeleine | **Labels:** `frontend` `ai`

```
## Descripción
Interfaz conversacional donde la usuaria puede preguntarle a EVA sobre su ciclo.

## Criterios de aceptación
- [ ] Input de texto con placeholder: "Pregúntale algo a EVA sobre tu ciclo..."
- [ ] Botón de enviar (también funciona con Enter)
- [ ] Historial de conversación visible en la sesión actual (scroll)
- [ ] Burbuja de mensaje de la usuaria (derecha) y de EVA (izquierda) con diseño diferenciado
- [ ] Indicador de escritura ("EVA está pensando...") mientras el LLM responde
- [ ] Disclaimer visible: "EVA no reemplaza el consejo médico profesional"
- [ ] Historial persistente: `GET /insights/history` carga las últimas 10 preguntas
- [ ] Conectado a `POST /insights`

## Notas técnicas
**Madeleine define** los límites del asistente (qué preguntas responde y cuáles redirige
al médico) y los revisa en las respuestas durante las pruebas.
```

---

## Sprint 8 — ML + Exportación

---

### Issue #47 — [S8] Integrar Prophet en GET /predictions/next
**Asignado:** Meriyei | **Participa:** Madeleine | **Labels:** `backend` `ml`

```
## Descripción
Actualizar el endpoint de predicción para usar Prophet cuando está disponible.

## Criterios de aceptación
- [ ] `prediction_service.get_next_prediction()` intenta Prophet primero, heurística como fallback
- [ ] Respuesta incluye `prediction_source: "prophet"` o `"heuristic"` según el caso
- [ ] Campo `model_mae_days` incluido si el modelo existe
- [ ] Campo `cycles_used_for_training` incluido si el modelo existe
- [ ] Fallback es automático y transparente (sin error 500)
- [ ] `ENDPOINTS.md` actualizado con los nuevos campos de respuesta

## Notas técnicas
**Madeleine valida** que el modelo cargado desde disco predice correctamente
después de haber sido serializado.
```

---

### Issue #48 — [S8] Endpoint GET /export/csv
**Asignado:** Meriyei | **Labels:** `backend`

```
## Descripción
Permitir que la usuaria descargue todos sus datos en formato CSV para respaldo o médico.

## Criterios de aceptación
- [ ] `GET /export/csv` retorna un archivo CSV descargable
- [ ] Header: `Content-Disposition: attachment; filename="eva_datos_{fecha}.csv"`
- [ ] Columnas en español: Fecha inicio ciclo, Fecha fin ciclo, Duración, Fecha registro, Nivel flujo, Temperatura, Síntoma, Intensidad, Notas
- [ ] Una fila por síntoma por día (puede repetir info del ciclo en múltiples filas)
- [ ] Encoding UTF-8 con BOM para compatibilidad con Excel en Windows
- [ ] Solo datos de la usuaria autenticada
- [ ] Params opcionales: `from_date`, `to_date` para filtrar rango

## Notas técnicas
Usar el módulo `csv` de la biblioteca estándar de Python.
No usar pandas para esta tarea — es overhead innecesario para generación de CSV.
```

---

### Issue #49 — [S8] Endpoint GET /export/pdf — informe médico
**Asignado:** Meriyei | **Participa:** Daniel | **Labels:** `backend`

```
## Descripción
Generar un informe PDF profesional con el historial del ciclo para compartir con la ginecóloga.

## Criterios de aceptación
- [ ] Librería elegida e instalada: `reportlab` o `weasyprint`
- [ ] PDF incluye: portada con logo EVA + nombre de secciones
- [ ] Sección 1: Resumen (duración promedio, variabilidad, irregularidades detectadas)
- [ ] Sección 2: Tabla de ciclos de los últimos N ciclos (configurable con `cycles_back`)
- [ ] Sección 3: Top 5 síntomas más frecuentes
- [ ] Sección 4: Predicción próximo ciclo (fuente indicada: heurística o Prophet)
- [ ] Sección 5: Disclaimer médico
- [ ] Generación en menos de 5 segundos con 6 ciclos
- [ ] Header: `Content-Disposition: attachment; filename="eva_informe_{fecha}.pdf"`

## Notas técnicas
**Daniel diseña** el layout del PDF (estructura de secciones, colores).
Meriyei implementa la generación con la librería elegida.
```

---

### Issue #50 — [S8] UI de exportación de datos
**Asignado:** Daniel | **Labels:** `frontend`

```
## Descripción
Pantalla donde la usuaria gestiona su privacidad y descarga sus datos.

## Criterios de aceptación
- [ ] Sección "Mis datos": botón "Descargar mis datos (CSV)"
- [ ] Sección "Informe médico": botón "Generar informe PDF" con selector de ciclos (últimos 3/6/12)
- [ ] Indicador de carga mientras se genera el PDF
- [ ] La descarga inicia automáticamente al completarse
- [ ] Sección "Privacidad": texto explicando qué datos guarda EVA y dónde
- [ ] Botón "Eliminar mi cuenta" con modal de confirmación (doble confirmación)
- [ ] Ambos botones de descarga conectados a los endpoints de exportación

## Notas técnicas
Para la descarga del PDF, usar `URL.createObjectURL(blob)` con `<a>` tag temporal.
```

---

### Issue #51 — [S8] Actualizar UI de predicción: mostrar precisión del modelo
**Asignado:** Daniel | **Participa:** Madeleine | **Labels:** `frontend` `ml`

```
## Descripción
Mostrar a la usuaria si su predicción viene de IA real o de la heurística básica,
y cuál es la precisión del modelo.

## Criterios de aceptación
- [ ] Badge "Predicción básica" (gris) cuando `prediction_source: "heuristic"`
- [ ] Badge "IA activada" (verde/morado) cuando `prediction_source: "prophet"`
- [ ] Tooltip en el badge explicando la diferencia en lenguaje simple
- [ ] Barra de confianza visual basada en el rango early/late
- [ ] Si `model_mae_days` existe: "Precisión: ±X días en promedio"
- [ ] Mensaje motivacional cuando hay < 3 ciclos: "Registra 3 ciclos para activar la IA personalizada"

## Notas técnicas
**Madeleine define** el copy de los textos explicativos para que sean médicamente precisos
pero entendibles por cualquier usuaria.
```

---

### Issue #52 — [S8] Tests E2E: flujo de exportación PDF y CSV
**Asignado:** Madeleine | **Labels:** `testing`

```
## Descripción
Verificar que el flujo de exportación funciona correctamente end-to-end.

## Criterios de aceptación
- [ ] Test: login → ir a exportación → descargar CSV → verificar que el archivo tiene headers correctos
- [ ] Test: login → generar PDF → verificar que la descarga inicia
- [ ] Test: exportación solo incluye datos del usuario autenticado (no datos de otros)
- [ ] Test: exportación con `from_date` filtra correctamente el rango
- [ ] Tests pasan en modo headless en CI/CD

## Notas técnicas
Para verificar la descarga en Playwright usar `page.waitForEvent('download')`.
El test de privacidad requiere dos usuarios de prueba con datos diferentes.
```

---

### Issue #53 — [S8] Configurar Sentry para monitoreo de errores en producción
**Asignado:** Madeleine | **Participa:** Daniel | **Labels:** `devops` `monitoring`

```
## Descripción
Integrar Sentry (tier gratuito) para capturar y analizar errores en producción.

## Criterios de aceptación
- [ ] Cuenta Sentry creada (gratuita, 5000 errores/mes)
- [ ] SDK de Sentry integrado en FastAPI: captura excepciones no manejadas
- [ ] SDK de Sentry integrado en React: captura errores de componentes y llamadas API
- [ ] Variable `SENTRY_DSN` agregada a los `.env` y a los secrets de Render/Vercel
- [ ] Errores de prueba enviados y visibles en el dashboard de Sentry
- [ ] Los datos sensibles están scrubbed: emails, tokens, datos del ciclo NO aparecen en Sentry
- [ ] Alertas configuradas por email para errores de nivel `error` y `fatal`

## Notas técnicas
**Daniel** integra el SDK en el frontend (React ErrorBoundary + Sentry).
Configurar `beforeSend` hook para sanitizar datos sensibles antes de enviarlos.
```

---

## Sprint 9 — Pulido y lanzamiento

---

### Issue #54 — [S9] Auditoría Lighthouse: PWA score > 90
**Asignado:** Madeleine | **Participa:** Daniel | **Labels:** `testing` `pwa`

```
## Descripción
Garantizar que EVA cumple los estándares de calidad PWA antes del lanzamiento.

## Criterios de aceptación
- [ ] Lighthouse Performance > 90
- [ ] Lighthouse PWA > 90
- [ ] Lighthouse Accessibility > 85
- [ ] Lighthouse Best Practices > 90
- [ ] Lighthouse SEO > 80
- [ ] Reporte Lighthouse guardado como artefacto en CI/CD
- [ ] Los fallos de accesibilidad críticos corregidos (alt text, contrast ratio, focus visible)

## Notas técnicas
**Daniel corrige** los problemas de frontend identificados en el reporte.
Ejecutar Lighthouse con `npx lighthouse {url} --output=json --chrome-flags="--headless"`.
```

---

### Issue #55 — [S9] Tests E2E: regresión completa de la app
**Asignado:** Madeleine | **Participa:** Daniel y Meriyei | **Labels:** `testing`

```
## Descripción
Suite completa de tests de regresión que cubre todos los flujos críticos de EVA.

## Criterios de aceptación
- [ ] Flujo 1: registro nuevo usuario → primer ciclo → síntomas → ver dashboard con predicción
- [ ] Flujo 2: desconectar red → registrar síntoma offline → reconectar → verificar sincronización
- [ ] Flujo 3: login → generar informe PDF → descargar CSV
- [ ] Flujo 4: abrir chat EVA → hacer 3 preguntas → ver historial
- [ ] Flujo 5: eliminar cuenta → verificar que todos los datos fueron borrados
- [ ] Todos los tests pasan en CI/CD (headless, sin intervención manual)
- [ ] Tiempo total de la suite < 5 minutos

## Notas técnicas
**Daniel y Meriyei** revisan los casos de prueba y agregan edge cases que descubrieron
durante el desarrollo. La suite es la "red de seguridad" antes del deploy.
```

---

### Issue #56 — [S9] Revisión de privacidad y seguridad
**Asignado:** Meriyei | **Participa:** Madeleine | **Labels:** `backend` `security`

```
## Descripción
Auditoría de seguridad y privacidad antes del deploy a producción.

## Criterios de aceptación
- [ ] OWASP Top 10 revisado: SQL injection, XSS, CSRF, autenticación rota
- [ ] Sin datos sensibles en logs del servidor (confirmar con grep en los logs de prueba)
- [ ] Rate limiting activo en endpoints críticos: `/insights`, `/export/pdf`, `/predictions/retrain`
- [ ] Headers de seguridad configurados en FastAPI: HSTS, X-Content-Type-Options, CSP
- [ ] Verificar que los archivos `.pkl` no contienen PII (script de auditoría)
- [ ] RLS de Supabase verificada: un usuario no puede ver datos de otro incluso con token válido
- [ ] Checklist de privacidad completada y documentada

## Notas técnicas
**Madeleine revisa** que ningún dato del ciclo aparezca en los logs de Ollama/Groq.
Crear script `scripts/audit_pkl_privacy.py` que carga cada .pkl e inspecciona su contenido.
```

---

### Issue #57 — [S9] Deploy producción: Vercel (frontend)
**Asignado:** Daniel | **Labels:** `devops`

```
## Descripción
Configurar el deploy automático del frontend en Vercel con CI/CD desde GitHub.

## Criterios de aceptación
- [ ] Proyecto de Vercel conectado al repositorio de GitHub
- [ ] Deploy automático en cada push a rama `main`
- [ ] Preview deployments activos en cada PR (URL única por PR)
- [ ] Variables de entorno configuradas en Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
- [ ] `VITE_API_URL` apunta al backend de Render en producción
- [ ] CORS en el backend actualizado para aceptar el dominio de Vercel
- [ ] La app carga correctamente en el dominio de Vercel
- [ ] Lighthouse en la URL de Vercel confirma los scores del Sprint 9

## Notas técnicas
Usar el CLI de Vercel para el primer deploy: `npx vercel --prod`.
Después de eso, los deployments son automáticos desde GitHub.
```

---

### Issue #58 — [S9] Deploy producción: Render (backend)
**Asignado:** Meriyei | **Participa:** Madeleine | **Labels:** `devops` `backend`

```
## Descripción
Configurar el deploy del backend FastAPI en Render con el cron job de ML.

## Criterios de aceptación
- [ ] Web service de FastAPI creado en Render (plan gratuito)
- [ ] `render.yaml` configurado con el web service y el cron job de reentrenamiento
- [ ] Variables de entorno configuradas en Render: todas las del `.env.example`
- [ ] `GET /health` responde en la URL de Render
- [ ] Cron job de reentrenamiento activo y visible en el dashboard de Render
- [ ] CORS configurado para aceptar el dominio de Vercel
- [ ] Directorio `ml_models/` persiste entre deployments (Render persistent disk o volumen)

## Notas técnicas
**Madeleine valida** que el cron job de reentrenamiento corre correctamente en Render
y que los modelos `.pkl` persisten entre deployments (usar Render Disk).
```

---

### Issue #59 — [S9] Documentación final: README + guías técnicas
**Asignado:** Daniel | **Participa:** Meriyei y Madeleine | **Labels:** `docs`

```
## Descripción
Documentación completa del proyecto para el entregable final académico.

## Criterios de aceptación
- [ ] `README.md` con: descripción del proyecto, capturas de pantalla, instrucciones de setup local
- [ ] Sección de arquitectura en README con el diagrama de 3 capas
- [ ] `ENDPOINTS.md` actualizado con el estado final de todos los endpoints
- [ ] `DATABASE_SCHEMA.md` actualizado con el schema final
- [ ] `ML_STRATEGY.md` actualizado con los MAE reales obtenidos
- [ ] `PROJECT.md` actualizado con las decisiones técnicas tomadas durante el desarrollo
- [ ] Guía de contribución (`CONTRIBUTING.md`) con convenciones de commits y PRs
- [ ] Licencia MIT agregada (`LICENSE`)

## Notas técnicas
**Meriyei documenta** los endpoints de backend y el schema final.
**Madeleine documenta** la estrategia ML con los resultados reales.
```

---

### Issue #60 — [S9] Presentación demo y video walkthrough
**Asignado:** Daniel + Meriyei + Madeleine | **Labels:** `docs`

```
## Descripción
Preparar la presentación final del proyecto académico con demo en vivo y video.

## Criterios de aceptación
- [ ] Video demo de máximo 5 minutos mostrando los flujos principales
- [ ] Video incluye: login, registro de ciclo, síntomas, dashboard, predicción, chat con EVA, exportación PDF
- [ ] Slides con: problema, solución, arquitectura técnica, decisiones clave, métricas reales (MAE, Lighthouse)
- [ ] La app funciona en producción (Vercel + Render) para la demo en vivo
- [ ] Cada integrante presenta su sección: Daniel (frontend/PWA), Meriyei (backend/BD), Madeleine (ML/AI)
- [ ] Código del repositorio público y accesible

## Notas técnicas
Usar OBS o Loom para el video. Ensayar la demo en vivo al menos 2 días antes
para identificar problemas de conexión o carga en el servidor de Render.
```

---

## Resumen de criterios por developer

| Developer | Issues con criterios | Total de criterios (checkboxes) |
|---|---|---|
| Daniel | 22 issues | ~110 checkboxes |
| Meriyei | 19 issues | ~100 checkboxes |
| Madeleine | 19 issues | ~95 checkboxes |
| **Total** | **60 issues** | **~305 checkboxes** |

---

*Este archivo es el complemento de `eva_github_issues.md`.*
*Cada sección corresponde a una issue. El contenido dentro de los bloques de código*
*se pega directamente en el campo "Description" de GitHub al crear la issue.*