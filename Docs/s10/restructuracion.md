# EVA — Plan de restructuración (S10)

> **Qué es este documento:** el *qué* y el *por qué* de S10: objetivos, decisiones de diseño y arquitectura objetivo. El *cómo* paso a paso está en [`fases-tareas-restructurados.md`](fases-tareas-restructurados.md); lo que se limpia, en [`depuracion.md`](depuracion.md).
>
> **Marco:** [`restricciones.md`](restricciones.md) y [`reglas.md`](reglas.md). Responsable única: Mery (RG-01).
>
> Última revisión: 2026-10-25.

---

## 1. Punto de partida

- **Base:** `origin/Prueba3` @ `c76b2cb`. Avanza en línea recta sobre `main` (141 commits adelante, 0 atrás) y sobre `develop` (39 adelante, 0 atrás).
- **Funciona:** el build del frontend, el lint y los tipos; el backend importa; el rendimiento de daily-logs y del export ya se optimizó (`d967312`, `e392a44`, `6d5cc24`, `f9cfc1e`).
- **Roto o en riesgo:**
  1. Chatbot: solo responde con Ollama local, porque el modelo Groq configurado fue retirado (DP-01, DP-02).
  2. Borrado de cuenta: no borra los datos de salud y el trigger puede reasignarlos (DP-13, DP-14).
  3. Offline: Dexie no está conectado (DP-18).
  4. E2E: la suite está pensada para Supabase y desactivada en CI (DP-28, DP-08).
  5. 10 tests rojos y 11 errores de ruff (DP-10 a DP-12).

## 2. Objetivos de S10 (medibles)

| # | Objetivo | Métrica de cierre |
|---|---|---|
| O1 | Chatbot 100 % cloud y siempre disponible | `POST /insights` responde con `source=groq/<modelo>` o `source=eva/reglas`; 0 respuestas 503 en los tests |
| O2 | Borrado total real | Test: 0 filas del usuario en todas las tablas + `.pkl` eliminado + re-registro sin datos |
| O3 | Calidad base en verde | Todos los comandos de RG-06 en verde |
| O4 | E2E restaurado | Suite Playwright en CI, con la red 100 % mockeada, en verde |
| O5 | Offline real | `offline.spec.ts` en verde: registrar sin red y sincronizar al volver |
| O6 | Latencia explicada con datos | Tabla de ms y queries por endpoint, y la decisión de región tomada con esos datos |
| O7 | Repo consolidado | `main` = `develop`, ramas viejas archivadas, docs vigentes en `Docs/s10/` |

## 3. Decisiones de diseño

### 3.1 Chatbot: Groq + respaldo por reglas

**Problema:** `llm_service.py` llama primero a Ollama (`:157`) y después a Groq con `llama3-8b-8192` (`:14`), un modelo que Groq apagó el 2025-08-30. `_call_groq` se traga el error 400 (`:83`), así que en producción el chatbot nunca responde.

**Solución:**

```
routers/insights.py ──► services/insight_service.py ──┬─► repositories/* (contexto del ciclo, guardar insight)
                                                      ├─► services/llm_service.py ──► Groq API (GROQ_MODEL)
                                                      └─► respaldo por reglas (sin red)
```

- **`llm_service.py`** contiene solo `SYSTEM_PROMPT`, `call_llm(prompt) -> str | None` y la sanitización. Usa `settings.GROQ_MODEL` (default `openai/gpt-oss-20b`), un timeout configurable y `temperature=0.5`. Rescata el prompt de `60da7fe`, sin la parte de Ollama.
- **`insight_service.py`**:
  1. Arma el contexto agregado: hoy `build_cycle_context` (`llm_service.py:87-151`), que se mueve aquí.
  2. Sanea la pregunta (quita emails, teléfonos y UUID).
  3. Llama al LLM.
  4. Si el LLM falla, usa el **respaldo por reglas**: plantillas por fase y síntoma frecuente, con `source="eva/reglas"`.
  5. Guarda el insight.
- **Frontend:** si `source` empieza por `eva/`, muestra la etiqueta "Respuesta automática" (ver `design.md`).
- **Descartado:** Gemini, por RX-03, y cualquier modelo local, por RX-03.
- **Riesgo:** los límites del free tier de Groq no se pudieron confirmar en una fuente oficial (los blogs dan entre 1.000 y 14.400 peticiones al día). El respaldo por reglas cubre el caso en que se agote la cuota.

### 3.2 Borrado total y unicidad de identidad

**Problema:** dos tablas de identidad: `"user"` (fastapi-users) y `users` (perfil, destino de las FK de datos). Además, `DELETE /auth/account` borra solo `"user"` y el trigger reasigna por email.

**Solución (SQL manual, RX-09):**
1. Agregar FK `users.id → "user".id ON DELETE CASCADE`. Así, borrar en `"user"` arrastra `users`, y por las FK existentes también cycles, daily_logs, daily_symptoms, ml_models, llm_insights y sync_operations.
2. Reescribir `create_user_profile()` sin la rama `IF FOUND` (`008_fix_profile_trigger.py:44-48`): siempre `INSERT` con el id nuevo.
3. Antes de aplicar el SQL, consultar si hay filas huérfanas en `users` (sin `"user"` correspondiente). Si las hay, Mery decide si borrarlas. NO VERIFICADO el estado actual en Neon.
4. Crear `services/account_service.py`, que borra la fila, el `.pkl` del modelo y, en el frontend, limpia IndexedDB.
5. Documentar en `DATABASE_SCHEMA.md` por qué existen las dos tablas (excepción de RG-08), o planificar unificarlas en una tarea futura.

### 3.3 Offline-first real

**Problema:** los servicios del frontend llaman a la API directamente; Dexie (`src/db/*`) no se usa.

**Solución:**
- Escritura: Dexie primero, luego `syncQueue`, luego `POST /sync` cuando hay red.
- Lectura: Dexie primero y refresco desde la API en segundo plano.
- El Service Worker cachea solo el *app shell*. Los datos viven en Dexie, no en Cache Storage (DP-20).
- Logout y borrado de cuenta vacían Dexie.

### 3.4 E2E

Restaurar Playwright con una arquitectura nueva: build de preview apuntando a una API ficticia (`http://api.e2e.invalid`), con toda la red interceptada y cualquier petición sin mock tratada como fallo. Detalle completo en [`e2e.md`](e2e.md).

### 3.5 Rendimiento

- **Hipótesis principal:** la latencia viene de la red (Render sin región declarada, posiblemente Oregon; Neon en São Paulo) multiplicada por las queries secuenciales, más el cold start de Render free. No del lenguaje.
- **Método:** instrumentación temporal (RG-14):
  - Middleware con `ContextVar` que cuenta queries y tiempo de BD (eventos `before/after_cursor_execute`).
  - Header `Server-Timing`.
  - Log con la ruta como plantilla, el número de queries y los ms (RX-05).
- **Medir:**
  1. Latencia de `SELECT 1`.
  2. `/health` en frío y en caliente.
  3. Los 5 endpoints más usados.
- **Acciones según el resultado:**
  - `asyncio.gather` en `export_pdf` (`export_service.py:98-100`), que hoy repite `get_cycles_by_user` (`:154,189`).
  - Reducir las 4 queries secuenciales de `list_logs_by_cycle` (`symptom_service.py:77-87`).
  - Decidir la región. La migración a Go queda descartada mientras no haya evidencia (RX-03).

### 3.6 Consolidación de ramas

1. PR `Prueba3 → develop` (fast-forward, sin cambios de código).
2. Todas las tareas parten de `develop` y vuelven por PR a `develop`.
3. Al cerrar S10: PR `develop → main`.
4. Ramas que se archivan sin merge:
   - Se descartan: `Prueba1`, `prueba1mt`, `feat/joshua/s9-ollama-fix`.
   - Se rescata un archivo y luego se archivan: `Rama_prueba` (`apiMocks.ts`) y `e2e_fail` (selectores).
   - Ya están integradas: `DanielS8`, `DanielS9`, `feat/madeleine/s7-insights-tests`, `feat/madeleine/s9-lighthouse-e2e`.

| Commit fuera de Prueba3 | Veredicto | Evidencia |
|---|---|---|
| `158fe22` / `fa6aed1` | Ya aplicado o descartado | El diff de CORS es solo espacios; las dependencias ya están (`requirements.txt:12,62,63`); el mensaje nuevo depende de Ollama |
| `a144135` | Descartar | Es JWKS de Supabase; no aplica al auth propio |
| `60da7fe` | **Rescatar el prompt** | Es agnóstico al proveedor; temperature 0.5 |
| `f03d2e0` | Descartar | Es un test contra Groq real (RX-10) |
| `8954784` | **Rescatar `e2e/helpers/apiMocks.ts`** | Mocks con `page.route` |
| `82968bb` | Rescatar solo los selectores y las esperas | Sigue dependiendo de Supabase |
| `cff1dca`, `389b3e0`, `84b24c5`, `4017e59` | Descartar | Ollama (RX-03) |

## 4. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Groq cambia su free tier o retira el modelo | Chatbot | `GROQ_MODEL` por env + respaldo por reglas |
| Hay datos huérfanos en Neon por el bug de borrado | Privacidad | Consulta previa (§3.2.3) y decisión de Mery |
| Conflicto al rescatar el WIP local sobre una base más nueva | Pérdida de trabajo | Tarea T1 dedicada, con stash y verificación |
| Cold start de Render free | UX | Medirlo antes de actuar; el keepalive actual solo mantiene viva la BD, no Render (NO VERIFICADO) |
| Una sola persona con todo el alcance | Plazo | Las fases priorizan lo crítico (privacidad, chatbot) antes que las mejoras |

## 5. Decisiones pendientes (de Mery)

| Decisión | Opciones | A favor | En contra |
|---|---|---|---|
| Región | Mover Neon junto a Render / dejarlo como está | Menos latencia por query | Requiere dump/restore |
| Backups | PITR de Neon free / `pg_dump` cifrado en GitHub Actions | PITR: cero trabajo / pg_dump: control | PITR: ventana corta (NO VERIFICADO) / pg_dump: datos de salud en artifacts aunque estén cifrados |
| Identidad | Mantener `"user"` + `users` documentado / unificar | Mantener: menos riesgo en S10 | Mantener: sigue la duplicación del email |
| Modelos ML | Reentrenar bajo demanda / guardarlos en la tabla `ml_models` | Bajo demanda: simple | Bajo demanda: latencia en la primera predicción |
