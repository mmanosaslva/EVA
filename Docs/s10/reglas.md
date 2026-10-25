# EVA — Reglas de trabajo (S10)

> **Qué es este documento:** cómo se trabaja dentro de los límites de [`restricciones.md`](restricciones.md). Las reglas **no redefinen** restricciones: cuando una regla toca un tema restringido, solo la referencia (RX-nn).
>
> **Precedencia:** `restricciones.md` > `reglas.md` > `design.md` / `e2e.md` > resto de `Docs/`.
> `Docs/contextoopencode.md`, `Docs/PROJECT.md`, `eva_contexto` y los docs de Fase 2 quedan como **históricos**: se consultan, pero no mandan.
>
> Última revisión: 2026-10-25.

---

## Proceso

### RG-01 — Responsable única
- En S10, **solo Mery** modifica el repositorio: código, docs, CI y base de datos.
- Los agentes IA asisten (diagnóstico, propuestas, ediciones locales), pero **no hacen commit ni push** sin permiso explícito y **no tocan `main`** sin permiso explícito.

### RG-02 — Una tarea a la vez
Ciclo obligatorio por tarea:
1. Crear la rama de la tarea.
2. Implementar.
3. Verificar (RG-06).
4. Explicar el cambio y proponer el mensaje de commit.
5. Mery hace commit y push.
6. PR y merge.
7. Solo entonces se autoriza la siguiente tarea.

### RG-03 — Ramas
- Base: `develop` (después de la tarea T0 de `fases-tareas-restructurados.md`).
- Nombre: `<tipo>/meriyei/s10-<descripcion-corta>`, con `<tipo>` = `feat`, `fix`, `chore`, `docs`, `test`, `perf` o `refactor`.
- `main` solo recibe PR desde `develop`.
- Las ramas viejas (`Prueba1`, `Rama_prueba`, `e2e_fail`…) **no se mergean**. Si se rescata algo, se copia el archivo y se cita el hash de origen en el commit.

### RG-04 — Commits
- Formato: `[S10] tipo(scope): descripción` (Conventional Commits con prefijo de sprint).
  Ejemplo: `[S10] fix(llm): migrar chatbot a Groq con respaldo por reglas`.
- Descripción en español, en imperativo, sin punto final.
- El cuerpo cita la tarea (`Tarea: T3`) y, si aplica, el hash rescatado.

### RG-05 — Pull requests
Todo PR incluye:
- El diff completo y verificable.
- La salida de los comandos de RG-06.
- El SQL comentado si hay cambio de esquema (RX-09).
- Una casilla marcada para cada restricción afectada.

### RG-06 — Definición de "hecho"
Una tarea solo está hecha si, sobre la rama de la tarea:

| Comando | Resultado esperado |
|---|---|
| `cd backend && pytest -q` | 0 fallos |
| `cd backend && ruff check .` | 0 errores |
| `cd frontend && npx vitest run` | 0 fallos |
| `cd frontend && npx eslint .` | 0 errores |
| `cd frontend && npx tsc --noEmit` | 0 errores |
| `cd frontend && npm run build` | OK |
| `cd frontend && npx playwright test` | 0 fallos (cuando la tarea T8 esté hecha) |

Además, se cumple el criterio específico de la tarea y se actualizan los docs afectados (RG-15).

---

## Arquitectura

### RG-07 — Capas (SRP)
`routers/` → `services/` → `repositories/` → `core/`

| Capa | Hace | No hace |
|---|---|---|
| `routers/` | HTTP: validar entrada, status codes, dependencias de auth | Importar `repositories/`, lógica de negocio |
| `services/` | Lógica y orquestación | SQL directo |
| `repositories/` | Queries SQLAlchemy Core | Lógica, HTTP |
| `core/` | Config, DB engine, seguridad, middleware | Lógica de dominio |

Servicios con contrato especial:
- `ml_service.py`: solo entrena y predice. No importa `repositories/`. Lo orquesta `prediction_service.py`.
- `llm_service.py`: solo la llamada HTTP al proveedor y el `SYSTEM_PROMPT`. No importa `repositories/`. Lo orquesta `insight_service.py`. Contenido permitido: RX-06.

### RG-08 — Base de datos
- SQLAlchemy **Core**, sin ORM.
  - **Excepción documentada:** `backend/app/auth/` usa el modelo ORM que exige fastapi-users. El ORM no se usa en ninguna otra carpeta.
- Esquema en 3NF. Duplicar un dato entre tablas requiere justificación escrita en `Docs/DATABASE_SCHEMA.md`.
- Un solo engine y un solo pool para toda la app.
- Cambios de esquema: RX-09.

### RG-09 — Offline-first
- IndexedDB (Dexie) es la **fuente de verdad** en el cliente; la API es secundaria.
- Los servicios del frontend escriben primero en Dexie y encolan la sincronización (`syncQueue`); leen de Dexie y refrescan desde la API cuando hay red.

### RG-10 — Configuración
- Todo valor que cambie entre entornos va en variables de entorno (p. ej. `GROQ_MODEL`, `VITE_API_URL`).
- Cada variable nueva se documenta en `Docs/GUIA_ENV.md` y en el `.env.example` correspondiente, sin valores reales (RX-11).

---

## Código

### RG-11 — Idioma
- Docs, comentarios y textos de UI en **español**, tratando a la usuaria de **tú** (ver `design.md`).
- Identificadores, nombres de archivo y de rama, y mensajes de log en **inglés**.

### RG-12 — Estilo
- Python: type hints en funciones públicas, `ruff` limpio, async en I/O.
- TypeScript: `strict`, sin `any` explícito, `eslint` limpio.
- UI: solo tokens de `design.md`; nada de colores hex ni tamaños mágicos en componentes.
- Sin código muerto ni comentado en `main`.

### RG-13 — Tests
- Todo *fix* llega con un test que fallaba antes del cambio.
- Backend: pytest. Frontend: Vitest. Flujos de usuaria: Playwright según `e2e.md`.
- Entornos permitidos: RX-10.

### RG-14 — Instrumentación temporal
- Va detrás de un flag de entorno (`EVA_PERF_INSTRUMENTATION=1`) y marcada con `# TEMP-INSTRUMENTATION` (o `// TEMP-INSTRUMENTATION` en TS).
- Se elimina antes del PR `develop → main`.
- Contenido de los logs: RX-05.

---

## Documentación y evidencia

### RG-15 — Docs vivos
- Cada tarea actualiza el doc que cambia (endpoints, esquema, env, decisiones).
- Un doc que queda desactualizado lleva en su cabecera `> HISTÓRICO — reemplazado por <doc>`.

### RG-16 — Evidencia
- Toda afirmación técnica en docs o PR cita un hash, un `archivo:línea` o la salida de un comando.
- Lo que no se pudo comprobar se marca **NO VERIFICADO**.

---

## Verificación de coherencia reglas ↔ restricciones

Revisión del 2026-10-25. Cada fila es un punto donde ambos documentos tocan el mismo tema; se indica por qué no chocan.

| Tema | Restricción | Regla | ¿Chocan? | Resolución |
|---|---|---|---|---|
| Quién cambia la BD | RX-09: Mery ejecuta el SQL a mano | RG-01: solo Mery modifica el repo y la BD | No | RG-01 es más amplia y contiene a RX-09 |
| Tests y servicios reales | RX-10: nunca Neon/Groq/Brevo | RG-13: tipos de test | No | RG-13 remite a RX-10 en lugar de redefinirla |
| Playwright | RX-03 lo excluye de la lista de prohibidos | RG-06/RG-13 lo exigen | No | Ambas lo permiten; `e2e.md` define el cómo |
| ORM | RX-02: "SQLAlchemy Core" | RG-08: excepción en `app/auth/` | No | La excepción vive solo en reglas, acotada a una carpeta, porque fastapi-users (permitido en RX-02) la necesita |
| LLM | RX-06: qué datos y desde dónde | RG-07: en qué archivo | No | Una define el contenido y la otra la ubicación |
| Logs | RX-05: qué no se loguea | RG-14: instrumentación temporal | No | RG-14 remite a RX-05 |
| Sentry | RX-03 prohíbe Replay; RX-05 exige scrubbing | — | No | Sentry de errores queda permitido (RX-02) |
| Idioma | — | RG-11: español (tú), identificadores en inglés | No | Coincide con la regla global de Mery (respuestas/comentarios en español, código en inglés) |
| Formato de commit | — | RG-04: `[S10] tipo(scope):` | No | Es Conventional Commits con prefijo de sprint; cumple la regla global de usar Conventional Commits |
| Offline | RX-08 no lo cubre | RG-09: Dexie es la fuente de verdad | No | Es una regla de arquitectura, no un límite externo |
| Costo | RX-01 | RG-10: config por env | No | Cambiar de modelo vía `GROQ_MODEL` no agrega costo |
