# EVA — Plan de restructuración (S10)

> **Qué es este documento:** el *qué* y el *por qué* de S10: objetivos, decisiones de diseño y arquitectura objetivo. El *cómo* paso a paso está en [`fases-tareas-restructurados.md`](fases-tareas-restructurados.md); lo que se limpia, en [`depuracion.md`](depuracion.md).
>
> **Marco:** [`restricciones.md`](restricciones.md) y [`reglas.md`](reglas.md). Responsable única: Mery (RG-01).
>
> Última revisión: 2026-10-26.
> - Chatbot con dos proveedores.
> - Deploy 100 % en Vercel.
> - Evaluación de la predicción.
> - Marco legal colombiano.
> - Backups diarios.

---

## 1. Punto de partida

- **Base:** `origin/Prueba3` @ `c76b2cb`. Avanza en línea recta sobre `main` (141 commits adelante, 0 atrás) y sobre `develop` (39 adelante, 0 atrás).
- **Funciona:** el build del frontend, el lint y los tipos; el backend importa; el rendimiento de daily-logs y del export ya se optimizó (`d967312`, `e392a44`, `6d5cc24`, `f9cfc1e`).
- **Roto o en riesgo:**
  1. Chatbot: solo responde con Ollama local, porque el modelo Groq configurado fue retirado (DP-01, DP-02).
  2. Borrado de cuenta: no borra los datos de salud y el trigger puede reasignarlos (DP-13, DP-14).
  3. Offline: Dexie no está conectado (DP-18).
  4. E2E: la suite está pensada para Supabase y desactivada en CI (DP-28, DP-08).
  5. 10 tests rojos y 11 errores de ruff (DP-10 a DP-12). *Actualización 2026-10-26: los tests ya están en verde (`b4bfc4d`); quedan los errores de ruff fuera de `app/`.*

## 2. Objetivos de S10 (medibles)

| # | Objetivo | Métrica de cierre |
|---|---|---|
| O1 | Chatbot 100 % cloud y siempre disponible | Con Groq caído responde Cloudflare y el frontend recibe el mismo formato; con ambos caídos, la respuesta por reglas (`is_automatic=true`); 0 respuestas 503 en los tests |
| O2 | Borrado total real | Test: 0 filas del usuario en todas las tablas + `.pkl` eliminado + re-registro sin datos |
| O3 | Calidad base en verde | Todos los comandos de RG-06 en verde |
| O4 | E2E restaurado | Suite Playwright en CI, con la red 100 % mockeada, en verde |
| O5 | Offline real | `offline.spec.ts` en verde: registrar sin red y sincronizar al volver |
| O6 | Latencia explicada con datos | Tabla de ms y queries por endpoint, y la decisión de región tomada con esos datos |
| O7 | Repo consolidado | `main` = `develop`, ramas viejas archivadas, docs vigentes en `Docs/s10/` |
| O8 | Cero Supabase y cero Render | `git grep -i "supabase\|render"` fuera de docs y migraciones históricas = 0; servicios de Render eliminados |
| O9 | Cumplimiento legal básico (Colombia) | Consentimiento expreso registrado en `consents`; política publicada y revisada por el docente o asesor |
| O10 | Datos recuperables | Backup diario cifrado en verde y una restauración de prueba documentada |
| O11 | Predicción justificada | `evaluacion-prediccion.md` con la comparación y el método elegido en producción |

## 3. Decisiones de diseño

### 3.1 Chatbot: Groq + Cloudflare Workers AI + respaldo por reglas

**Problema:** `llm_service.py` llama primero a Ollama (`:157`) y después a Groq con `llama3-8b-8192` (`:14`), un modelo que Groq apagó el 2025-08-30. `_call_groq` se traga el error 400 (`:83`), así que en producción el chatbot nunca responde.

**Solución:**

```
routers/insights.py ──► services/insight_service.py ──┬─► repositories/* (contexto del ciclo, guardar insight + proveedor usado)
                                                      ├─► services/llm_service.py.generate()
                                                      │      ├─► 1. Groq API            (GROQ_MODEL)
                                                      │      └─► 2. Cloudflare Workers AI (CLOUDFLARE_AI_MODEL)
                                                      └─► 3. respaldo por reglas (sin red, is_automatic=true)
```

- **`llm_service.py`** contiene el `SYSTEM_PROMPT` (rescatado de `60da7fe`, sin Ollama), un adaptador por proveedor y `generate(prompt)`:
  - Recorre `LLM_PROVIDERS` en orden.
  - Pasa al siguiente ante timeout, 5xx, 429, modelo retirado o respuesta vacía.
  - Un proveedor que devolvió 429 o 5xx se salta durante `LLM_PROVIDER_COOLDOWN_SECONDS`. En serverless, el enfriamiento vive en la instancia caliente; si la instancia es nueva, simplemente se vuelve a intentar.
  - Los dos usan `temperature=0.5`, el mismo prompt y el mismo límite de tokens, para que las respuestas tengan un estilo parecido.
- **`insight_service.py`**:
  1. Arma el contexto agregado: hoy `build_cycle_context` (`llm_service.py:87-151`), que se mueve aquí.
  2. Sanea la pregunta (quita emails, teléfonos y UUID).
  3. Llama a `generate`.
  4. Si ningún proveedor responde, usa el **respaldo por reglas**: plantillas por fase y síntoma frecuente.
  5. Guarda el insight con el proveedor usado (`groq`, `cloudflare` o `rules`), solo para métricas internas.
- **Contrato con el frontend:** `{ insight, disclaimer, is_automatic }`. **No incluye proveedor ni modelo**, así que cambiar de Groq a Cloudflare es invisible para la usuaria (RX-06). Solo `is_automatic=true` muestra la etiqueta "Respuesta automática" (`design.md` §2).
- **Por qué estos dos:** según comparativas de 2026, ambos tienen plan gratuito sin tarjeta y no entrenan con datos de la API (Groq ~30 peticiones/min y ~1.000/día; Cloudflare, 10.000 "neurons"/día). Los límites cambian seguido: se verifican en la consola de cada uno al implementar.
- **Descartados:**
  - Gemini free, porque puede entrenar con los datos (RX-03).
  - Mistral free, porque las fuentes dicen que exige aceptar el entrenamiento.
  - OpenRouter free, por su límite de 50 peticiones al día.
  - Cualquier modelo local (RX-03).

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

- **Hipótesis principal:** la latencia viene de la red (hoy Render sin región declarada, posiblemente en EE. UU.; Neon en São Paulo) multiplicada por las queries secuenciales, más el cold start de Render free, que se duerme a los 15 minutos. No del lenguaje.
- **La migración a Vercel (§3.7) ataca la causa principal:** las funciones se pueden ubicar en São Paulo (`gru1`), junto a Neon (NO VERIFICADO en el plan Hobby).
- **Método** (después de T25, sobre Vercel): instrumentación temporal (RG-14):
  - Middleware con `ContextVar` que cuenta queries y tiempo de BD (eventos `before/after_cursor_execute`).
  - Header `Server-Timing`.
  - Log con la ruta como plantilla, el número de queries y los ms (RX-05).
- **Medir:**
  1. Latencia de `SELECT 1`.
  2. Respuesta en frío y en caliente.
  3. Los 5 endpoints más usados.
- **Acciones según el resultado:**
  - `asyncio.gather` en `export_pdf` (`export_service.py:98-100`), que hoy repite `get_cycles_by_user` (`:154,189`).
  - Reducir las 4 queries secuenciales de `list_logs_by_cycle` (`symptom_service.py:77-87`).
  - La migración a Go queda descartada mientras no haya evidencia (RX-03).

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

### 3.7 Deploy 100 % en Vercel

- **Decisión de Mery (2026-10-26):** sale Render. Frontend y backend se despliegan en Vercel.
- **Cómo:** FastAPI corre como función Python serverless. El frontend reescribe `/api/*` hacia el backend, así queda todo en el mismo origen y se elimina el CORS entre dominios. Si conviene un proyecto o dos, se decide en T25.
- **Lo que obliga a cambiar (RX-12, DP-43):**

| Hoy (Render, proceso persistente) | En Vercel (serverless) |
|---|---|
| Keepalive con `asyncio.create_task` en startup | No existe: se elimina. Neon se despierta solo en la primera query |
| Rate limit en memoria (slowapi) | Contador en Neon para `/insights` y `/auth/*` |
| Modelos `.pkl` en disco | Sin disco: depende de T24 (§3.8) |
| Cron de reentrenamiento en Render (de pago) | Sale. Si hace falta un job, va en GitHub Actions |
| Pool de 5+5 conexiones | Pool mínimo / `NullPool` contra el pooler de Neon |

- **Riesgos:**
  - El límite de tamaño de las funciones, de unos 250 MB (NO VERIFICADO): Prophet + cmdstan probablemente no caben.
  - El tiempo máximo por función: alcanza para las llamadas al LLM, que tienen timeout.
  - El plan Hobby es para uso no comercial, lo que es compatible con un proyecto académico.

### 3.8 Predicción: ¿Prophet o algo más simple?

- **Hoy:** Prophet entrena un modelo por usuaria (`ml_models/user_{id}.pkl`, mínimo 3 ciclos). Si no hay modelo, se usa la heurística: el promedio de la duración entre ciclos, ± la desviación estándar.
- **En la práctica Prophet casi no se usa:** el disco de Render se borra, y el cron entrena en otra máquina.
- **Pregunta:** ¿Prophet predice mejor que un método simple con las pocas observaciones que tiene cada usuaria (3 a 12 ciclos)?
- **Evaluación (T24):**
  - Datos sintéticos y validación *walk-forward*.
  - Se compara contra mediana, promedio móvil ponderado y suavizado exponencial simple.
  - Métricas: MAE en días, % dentro de ±2 días, tiempo y memoria.
- **Regla:** si Prophet no gana por ≥ 0,5 días de MAE en ciclos irregulares, se elimina. Así se simplifica el backend y cabe en Vercel. Los métodos simples se calculan al vuelo desde los ciclos de la BD, no necesitan archivos ni cron, y siguen siendo **individuales por usuaria**.

### 3.9 Módulo legal (Colombia)

- **Marco:** Ley 1581 de 2012 y Decreto 1377 de 2013. Los datos de salud son sensibles: requieren autorización previa, expresa e informada, y facultativa (RX-14).
- **Qué se construye (T22):**
  - Política de tratamiento y términos versionados.
  - Consentimiento separado y registrado (`consents`).
  - Autorización de transferencia internacional (Neon y Vercel están fuera de Colombia).
  - Declaración de mayoría de edad.
  - Verificación de email obligatoria.
  - Derechos de la titular, conectados con lo que ya existe: export = acceso; borrado total = supresión y revocación.
- **Validación:** los textos los revisa el docente o un asesor antes de recibir usuarias reales. No es asesoría legal.

### 3.10 Backups

- **Hoy no hay ninguno** (DP-42). Neon free solo permite volver atrás 6 horas y guardar 1 snapshot manual.
- **Plan (T23, RX-13):**
  - Backup diario con GitHub Actions: `pg_dump` con un rol de solo lectura, cifrado con `age` dentro del runner y subido a Google Drive de Mery.
  - Retención: 7 diarios + 4 semanales.
  - Sin artifacts, porque el repo es público.
  - Snapshot manual de Neon antes de cada SQL.
  - Restauración de prueba mensual.

## 4. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Groq o Cloudflare cambian su free tier o retiran el modelo | Chatbot | Failover entre los dos + modelos por env + respaldo por reglas |
| El backend no cabe en una función de Vercel | Deploy | T24 antes que T25; eliminar Prophet si no aporta |
| Se pierde la clave privada de `age` | Los backups no se pueden leer | Guardarla en dos lugares offline (p. ej. gestor de contraseñas + papel) |
| Hay datos huérfanos en Neon por el bug de borrado | Privacidad | Consulta previa (§3.2.3) y decisión de Mery |
| Conflicto al rescatar el WIP local sobre una base más nueva | Pérdida de trabajo | Tarea T1 dedicada, con stash y verificación |
| Cold start de las funciones de Vercel | UX | Medirlo en T15; suele ser menor que el sueño de 15 minutos de Render free (NO VERIFICADO) |
| Una sola persona con todo el alcance | Plazo | Las fases priorizan lo crítico (privacidad, chatbot) antes que las mejoras |

## 5. Decisiones

### Tomadas (2026-10-26)

| Decisión | Resultado |
|---|---|
| Proveedores de LLM | Groq + Cloudflare Workers AI, con failover transparente (§3.1) |
| Hosting | 100 % Vercel; sale Render (§3.7) |
| Jobs programados | Solo GitHub Actions (RX-13) |
| Backups | Diarios, cifrados, en Google Drive + snapshot antes de cada SQL (§3.10) |
| Región | Se resuelve con la migración: funciones en São Paulo junto a Neon, si el plan lo permite (§3.7) |
| Marco legal | Colombia, Ley 1581 de 2012 (§3.9) |
| Modelos ML | Se decide con la evaluación de T24 (§3.8) |

### Pendientes

| Decisión | Opciones | A favor | En contra |
|---|---|---|---|
| Identidad | Mantener `"user"` + `users` documentado / unificar | Mantener: menos riesgo en S10 | Mantener: sigue la duplicación del email |
| Proyectos en Vercel | Uno (frontend + `/api`) / dos (frontend y backend separados con rewrite) | Uno: un solo deploy | Uno: build más complejo |
| Usuarias menores de 18 | Fuera de S10 / flujo con autorización del representante legal | Fuera: más simple | Fuera: deja afuera a adolescentes, que son parte del público de la app |
