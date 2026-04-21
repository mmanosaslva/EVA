# EVA — Documentación de Endpoints

> Base URL desarrollo: `http://localhost:8000`
> Base URL producción: `https://eva-api.onrender.com`
> Documentación interactiva: `{BASE_URL}/docs` (Swagger UI automático de FastAPI)

---

## Autenticación

Todos los endpoints (excepto `/health`) requieren un JWT válido de Supabase en el header:

```
Authorization: Bearer {supabase_jwt_token}
```

El token se obtiene al hacer login/registro con Supabase Auth en el frontend. FastAPI lo valida con `SUPABASE_JWT_SECRET` sin llamar a Supabase en cada request.

---

## Tabla de contenidos

| Módulo | Prefijo | Sprints |
|---|---|---|
| [Health](#health) | `/` | S1 |
| [Auth (Supabase)](#auth) | Supabase SDK | S1 |
| [Ciclos](#ciclos) | `/cycles` | S2 |
| [Registros diarios](#registros-diarios) | `/daily-logs` | S3 |
| [Síntomas](#síntomas) | `/symptoms` | S3 |
| [Analytics](#analytics) | `/analytics` | S4 |
| [Predicción](#predicción) | `/predictions` | S5–S8 |
| [Insights LLM](#insights-llm) | `/insights` | S5–S7 |
| [Sincronización offline](#sincronización-offline) | `/sync` | S6 |
| [Exportación](#exportación) | `/export` | S8 |

---

## Health

### `GET /health`
Verifica que el servidor está activo. Usado por Render para health checks.

**Auth requerida:** No

**Response `200 OK`:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "environment": "development"
}
```

---

## Auth

La autenticación la maneja completamente el SDK de Supabase en el frontend. El backend solo valida el JWT.

### Registro de usuario
```typescript
// Frontend — Supabase SDK
const { data, error } = await supabase.auth.signUp({
  email: "usuario@email.com",
  password: "password123"
})
```

### Login
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: "usuario@email.com",
  password: "password123"
})
// data.session.access_token → usar como Bearer token
```

### Logout
```typescript
await supabase.auth.signOut()
```

### Validación en FastAPI (core/security.py)
```python
async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    payload = jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        audience="authenticated"
    )
    return {"user_id": payload["sub"], "email": payload["email"]}
```

---

## Ciclos

### `POST /cycles`
Crea un nuevo ciclo menstrual.

**Sprint:** S2 — Asignado: Meriyei

**Request body:**
```json
{
  "start_date": "2025-05-01",
  "end_date": "2025-05-05"
}
```

**Validaciones:**
- `start_date` requerido, formato `YYYY-MM-DD`
- `end_date` opcional; si se provee, debe ser >= `start_date`
- No puede haber dos ciclos del mismo usuario con `start_date` igual

**Response `201 Created`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "start_date": "2025-05-01",
  "end_date": "2025-05-05",
  "duration_days": 4,
  "created_at": "2025-05-01T10:30:00Z"
}
```

**Errores posibles:**
```json
// 422 — fecha inválida
{ "detail": "end_date must be greater than or equal to start_date" }

// 409 — ciclo duplicado
{ "detail": "A cycle already exists starting on this date" }
```

---

### `GET /cycles`
Lista todos los ciclos del usuario autenticado, ordenados por `start_date` descendente.

**Sprint:** S2 — Asignado: Meriyei

**Query params (opcionales):**
| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `limit` | int | 20 | Máximo de resultados |
| `offset` | int | 0 | Paginación |
| `from_date` | date | - | Filtrar desde esta fecha |

**Ejemplo:** `GET /cycles?limit=5&from_date=2025-01-01`

**Response `200 OK`:**
```json
{
  "total": 12,
  "limit": 5,
  "offset": 0,
  "cycles": [
    {
      "id": "550e8400-...",
      "start_date": "2025-05-01",
      "end_date": "2025-05-05",
      "duration_days": 4,
      "created_at": "2025-05-01T10:30:00Z"
    }
  ]
}
```

---

### `GET /cycles/{cycle_id}`
Obtiene un ciclo específico con sus registros diarios.

**Sprint:** S2 — Asignado: Meriyei

**Response `200 OK`:**
```json
{
  "id": "550e8400-...",
  "start_date": "2025-05-01",
  "end_date": "2025-05-05",
  "duration_days": 4,
  "daily_logs": [
    {
      "id": "...",
      "date": "2025-05-01",
      "flow_level": "heavy",
      "temperature": 36.5,
      "symptoms": [
        { "name": "Dolor", "category": "fisica", "intensity": 4 }
      ]
    }
  ]
}
```

**Errores posibles:**
```json
// 404 — no existe o no pertenece al usuario
{ "detail": "Cycle not found" }
```

---

### `PUT /cycles/{cycle_id}`
Actualiza un ciclo existente.

**Sprint:** S2 — Asignado: Meriyei

**Request body** (todos los campos opcionales):
```json
{
  "start_date": "2025-05-01",
  "end_date": "2025-05-06"
}
```

**Response `200 OK`:** mismo formato que `POST /cycles`

---

### `DELETE /cycles/{cycle_id}`
Elimina un ciclo y todos sus registros diarios (CASCADE).

**Sprint:** S2 — Asignado: Meriyei

**Response `204 No Content`**

---

## Registros diarios

### `POST /daily-logs`
Registra cómo se sintió la usuaria en un día específico.

**Sprint:** S3 — Asignado: Meriyei

**Request body:**
```json
{
  "cycle_id": "550e8400-...",
  "date": "2025-05-02",
  "flow_level": "medium",
  "temperature": 36.7,
  "notes": "Dolor leve por la mañana",
  "symptoms": [
    { "symptom_id": 1, "intensity": 3 },
    { "symptom_id": 5, "intensity": 2 }
  ]
}
```

**Valores válidos `flow_level`:** `"none"` | `"light"` | `"medium"` | `"heavy"`

**Response `201 Created`:**
```json
{
  "id": "abc123-...",
  "cycle_id": "550e8400-...",
  "date": "2025-05-02",
  "flow_level": "medium",
  "temperature": 36.7,
  "notes": "Dolor leve por la mañana",
  "symptoms": [
    { "symptom_id": 1, "name": "Dolor abdominal", "category": "fisica", "intensity": 3 },
    { "symptom_id": 5, "name": "Fatiga", "category": "fisica", "intensity": 2 }
  ]
}
```

**Errores posibles:**
```json
// 404 — ciclo no encontrado o no pertenece al usuario
{ "detail": "Cycle not found" }

// 409 — ya existe un log para ese día en ese ciclo
{ "detail": "A daily log already exists for this date in this cycle" }
```

---

### `GET /daily-logs/{cycle_id}`
Lista todos los registros diarios de un ciclo.

**Sprint:** S3 — Asignado: Meriyei

**Response `200 OK`:**
```json
{
  "cycle_id": "550e8400-...",
  "logs": [
    {
      "id": "abc123-...",
      "date": "2025-05-01",
      "flow_level": "heavy",
      "temperature": 36.5,
      "symptoms": [...]
    },
    {
      "id": "def456-...",
      "date": "2025-05-02",
      "flow_level": "medium",
      "temperature": 36.7,
      "symptoms": [...]
    }
  ]
}
```

---

### `PUT /daily-logs/{log_id}`
Actualiza un registro diario existente. También reemplaza todos sus síntomas.

**Sprint:** S3 — Asignado: Meriyei

**Request body:** mismo formato que `POST /daily-logs` (sin `cycle_id` ni `date`)

**Response `200 OK`:** mismo formato que `POST /daily-logs`

---

### `DELETE /daily-logs/{log_id}`
Elimina un registro diario y sus síntomas.

**Sprint:** S3 — Asignado: Meriyei

**Response `204 No Content`**

---

## Síntomas

### `GET /symptoms/catalog`
Lista todos los síntomas disponibles en el catálogo.

**Sprint:** S3 — Asignado: Meriyei

**Auth requerida:** Sí

**Response `200 OK`:**
```json
{
  "symptoms": [
    { "id": 1,  "name": "Dolor abdominal",   "category": "fisica" },
    { "id": 2,  "name": "Dolor de cabeza",   "category": "fisica" },
    { "id": 3,  "name": "Fatiga",            "category": "fisica" },
    { "id": 4,  "name": "Hinchazón",         "category": "digestiva" },
    { "id": 5,  "name": "Náuseas",           "category": "digestiva" },
    { "id": 6,  "name": "Irritabilidad",     "category": "emocional" },
    { "id": 7,  "name": "Ansiedad",          "category": "emocional" },
    { "id": 8,  "name": "Tristeza",          "category": "emocional" },
    { "id": 9,  "name": "Antojos",           "category": "digestiva" },
    { "id": 10, "name": "Acné",              "category": "fisica" },
    { "id": 11, "name": "Sensibilidad mamaria", "category": "fisica" },
    { "id": 12, "name": "Insomnio",          "category": "fisica" },
    { "id": 13, "name": "Energía alta",      "category": "fisica" },
    { "id": 14, "name": "Concentración",     "category": "emocional" },
    { "id": 15, "name": "Dolor lumbar",      "category": "fisica" }
  ]
}
```

---

## Analytics

### `GET /analytics/summary`
Resumen estadístico de todos los ciclos de la usuaria.

**Sprint:** S4 — Asignado: Meriyei

**Response `200 OK`:**
```json
{
  "user_id": "123e4567-...",
  "total_cycles": 8,
  "avg_cycle_duration": 27.3,
  "avg_period_duration": 4.8,
  "cycle_variability_days": 2.1,
  "shortest_cycle": 24,
  "longest_cycle": 31,
  "last_cycle_start": "2025-05-01",
  "data_range_months": 8
}
```

---

### `GET /analytics/symptoms`
Top síntomas más frecuentes de la usuaria con frecuencia e intensidad promedio.

**Sprint:** S4 — Asignado: Meriyei

**Query params (opcionales):**
| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `cycles_back` | int | 3 | Últimos N ciclos a considerar |
| `limit` | int | 10 | Máximo de síntomas a retornar |

**Response `200 OK`:**
```json
{
  "top_symptoms": [
    {
      "symptom_id": 1,
      "name": "Dolor abdominal",
      "category": "fisica",
      "frequency": 0.87,
      "avg_intensity": 3.4,
      "most_common_phase": "menstruacion"
    },
    {
      "symptom_id": 6,
      "name": "Irritabilidad",
      "category": "emocional",
      "frequency": 0.62,
      "avg_intensity": 2.8,
      "most_common_phase": "lutea"
    }
  ],
  "cycles_analyzed": 3
}
```

---

### `GET /analytics/flow`
Distribución del nivel de flujo por fase del ciclo.

**Sprint:** S4 — Asignado: Meriyei

**Response `200 OK`:**
```json
{
  "flow_by_phase": {
    "menstruacion": { "none": 0.05, "light": 0.25, "medium": 0.45, "heavy": 0.25 },
    "folicular":    { "none": 0.90, "light": 0.08, "medium": 0.02, "heavy": 0.00 },
    "ovulacion":    { "none": 0.70, "light": 0.25, "medium": 0.05, "heavy": 0.00 },
    "lutea":        { "none": 0.88, "light": 0.10, "medium": 0.02, "heavy": 0.00 }
  },
  "cycles_analyzed": 8
}
```

---

### `GET /analytics/phases`
Duración promedio de cada fase del ciclo de la usuaria.

**Sprint:** S4 — Asignado: Meriyei

**Response `200 OK`:**
```json
{
  "phases": {
    "menstruacion":  { "avg_days": 4.8, "range": [3, 6] },
    "folicular":     { "avg_days": 9.2, "range": [7, 12] },
    "ovulacion":     { "avg_days": 2.0, "range": [1, 3] },
    "lutea":         { "avg_days": 11.3, "range": [9, 14] }
  },
  "avg_total_cycle": 27.3
}
```

---

## Predicción

### `GET /predictions/next`
Predice la fecha de inicio del próximo ciclo.

Usa el modelo ML de Prophet si está disponible para la usuaria (mínimo 3 ciclos entrenados). Si no, usa la heurística de promedio.

**Sprint:** S5 (heurística) → S8 (ML integrado) — Asignado: Meriyei

**Response `200 OK`:**
```json
{
  "user_id": "123e4567-...",
  "predicted_start_date": "2025-06-01",
  "confidence_range": {
    "early": "2025-05-29",
    "late": "2025-06-04"
  },
  "days_until_next": 31,
  "current_phase": "lutea",
  "current_phase_day": 8,
  "prediction_source": "prophet",
  "model_mae_days": 1.2,
  "cycles_used_for_training": 7,
  "fertile_window": {
    "start": "2025-05-18",
    "end": "2025-05-22"
  }
}
```

**Nota sobre `prediction_source`:**
- `"heuristic"` — promedio simple (Sprint 5, menos de 3 ciclos o modelo no entrenado)
- `"prophet"` — modelo ML por usuaria (Sprint 8+, mínimo 3 ciclos)

**Errores posibles:**
```json
// 422 — sin ciclos registrados
{ "detail": "No cycles found. Register at least one cycle to get predictions." }
```

---

### `POST /predictions/retrain`
Fuerza el reentrenamiento del modelo Prophet para la usuaria actual.

Normalmente el reentrenamiento es automático (cron job nocturno). Este endpoint es para debugging o cuando la usuaria registra muchos ciclos nuevos.

**Sprint:** S7 — Asignado: Madeleine

**Response `200 OK`:**
```json
{
  "status": "ok",
  "message": "Model retrained successfully",
  "mae_days": 1.1,
  "cycles_used": 8,
  "trained_at": "2025-05-15T03:00:00Z"
}
```

---

## Insights LLM

### `POST /insights`
Genera un insight personalizado en lenguaje natural sobre el ciclo de la usuaria usando el LLM (Ollama/Groq).

**Sprint:** S5 — Asignado: Madeleine

**⚠️ Privacidad:** Este endpoint nunca recibe ni expone PII. Solo recibe datos del ciclo.

**Request body:**
```json
{
  "question": "¿Por qué me siento tan cansada en esta fase?",
  "context_cycles": 3
}
```

El backend construye el contexto automáticamente desde la BD — el frontend solo envía la pregunta.

**Cómo el backend construye el contexto (nunca expuesto al LLM):**
```python
# services/llm_service.py
context = {
    "fase_actual": "lutea",
    "dia_del_ciclo": 20,
    "duracion_promedio": 27,
    "sintomas_frecuentes": ["Fatiga", "Irritabilidad"],
    "intensidad_sintomas_fase_actual": 3.4,
    "dias_hasta_siguiente": 7,
}
# ❌ NUNCA se incluye: email, nombre, birth_date, user_id, IP
```

**Response `200 OK` (streaming):**
```json
{
  "insight": "Durante la fase lútea, los niveles de progesterona aumentan y luego caen bruscamente, lo que puede causar fatiga significativa. Basándome en tus ciclos, esta sensación suele aparecer alrededor del día 20, que es exactamente donde estás ahora. Es completamente normal. Considera descansar más y reducir el ejercicio intenso estos días.",
  "phase": "lutea",
  "source": "ollama/mistral",
  "disclaimer": "EVA no reemplaza el consejo médico profesional."
}
```

**Nota sobre el modelo usado:**
- Primario: Ollama con Mistral 7B (local, datos nunca salen del servidor)
- Fallback automático: Groq API si Ollama no está disponible

**Errores posibles:**
```json
// 503 — LLM no disponible
{ "detail": "AI service temporarily unavailable. Please try again later." }

// 422 — pregunta vacía
{ "detail": "question field is required" }
```

---

### `GET /insights/history`
Lista los insights generados anteriormente para la usuaria.

**Sprint:** S7 — Asignado: Madeleine

**Query params:**
| Param | Tipo | Default |
|---|---|---|
| `limit` | int | 10 |

**Response `200 OK`:**
```json
{
  "insights": [
    {
      "id": "...",
      "question": "¿Por qué me siento tan cansada?",
      "insight": "Durante la fase lútea...",
      "phase": "lutea",
      "created_at": "2025-05-15T14:30:00Z"
    }
  ]
}
```

---

## Sincronización offline

### `POST /sync`
Recibe un batch de operaciones realizadas offline y las aplica en orden.

Idempotente: si una operación ya fue aplicada (mismo `client_id`), se ignora sin error.

**Sprint:** S6 — Asignado: Meriyei

**Request body:**
```json
{
  "operations": [
    {
      "client_id": "op_abc123",
      "type": "CREATE_CYCLE",
      "payload": {
        "start_date": "2025-05-10",
        "end_date": "2025-05-14"
      },
      "client_timestamp": "2025-05-10T08:00:00Z"
    },
    {
      "client_id": "op_def456",
      "type": "CREATE_DAILY_LOG",
      "payload": {
        "cycle_client_id": "op_abc123",
        "date": "2025-05-10",
        "flow_level": "heavy",
        "symptoms": [{ "symptom_id": 1, "intensity": 4 }]
      },
      "client_timestamp": "2025-05-10T20:00:00Z"
    }
  ]
}
```

**Tipos de operación válidos:**
- `CREATE_CYCLE`
- `UPDATE_CYCLE`
- `DELETE_CYCLE`
- `CREATE_DAILY_LOG`
- `UPDATE_DAILY_LOG`
- `DELETE_DAILY_LOG`

**Response `200 OK`:**
```json
{
  "applied": 2,
  "skipped": 0,
  "failed": 0,
  "results": [
    {
      "client_id": "op_abc123",
      "status": "applied",
      "server_id": "550e8400-..."
    },
    {
      "client_id": "op_def456",
      "status": "applied",
      "server_id": "abc123-..."
    }
  ]
}
```

---

## Exportación

### `GET /export/csv`
Descarga todos los datos de la usuaria en formato CSV. Útil para ginecóloga o respaldo personal.

**Sprint:** S8 — Asignado: Meriyei

**Query params (opcionales):**
| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `from_date` | date | inicio | Exportar desde esta fecha |
| `to_date` | date | hoy | Exportar hasta esta fecha |

**Response `200 OK`:**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="eva_datos_2025-05-15.csv"

Fecha inicio ciclo,Fecha fin ciclo,Duración (días),Fecha registro,Nivel flujo,Temperatura,Síntoma,Intensidad,Notas
2025-05-01,2025-05-05,4,2025-05-01,alto,,Dolor abdominal,4,
2025-05-01,2025-05-05,4,2025-05-01,alto,,Fatiga,3,Dolor leve por la mañana
2025-05-01,2025-05-05,4,2025-05-02,medio,36.7,,,
```

---

### `GET /export/pdf`
Genera un informe médico en PDF para compartir con ginecóloga.

**Sprint:** S8 — Asignado: Meriyei

**Query params (opcionales):**
| Param | Tipo | Default | Descripción |
|---|---|---|---|
| `cycles_back` | int | 6 | Últimos N ciclos a incluir |

**Contenido del PDF:**
1. Resumen de ciclos (duración promedio, variabilidad, irregularidades)
2. Gráfico de duración de ciclos (últimos N)
3. Top 5 síntomas más frecuentes con fase
4. Predicción próximo ciclo (fuente: Prophet o heurística)
5. Notas de los registros diarios
6. Disclaimer médico

**Response `200 OK`:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="eva_informe_medico_2025-05-15.pdf"
```

**Nota de tiempo:** La generación puede tomar hasta 3 segundos si incluye muchos ciclos. El frontend debe mostrar un indicador de carga.

---

## Códigos de error globales

| Código | Significado | Cuándo ocurre |
|---|---|---|
| `400` | Bad Request | Datos de entrada con formato incorrecto |
| `401` | Unauthorized | Token JWT ausente o expirado |
| `403` | Forbidden | Token válido pero sin permisos (datos de otro usuario) |
| `404` | Not Found | Recurso no existe o no pertenece al usuario |
| `409` | Conflict | Dato duplicado (mismo ciclo, mismo log del día) |
| `422` | Unprocessable Entity | Validación de Pydantic fallida |
| `429` | Too Many Requests | Rate limiting activado |
| `500` | Internal Server Error | Error inesperado del servidor |
| `503` | Service Unavailable | LLM no disponible temporalmente |

**Formato estándar de error (FastAPI):**
```json
{
  "detail": "Mensaje de error descriptivo en español"
}
```

---

## Rate limiting

Para proteger los endpoints costosos en el plan gratuito de Render:

| Endpoint | Límite |
|---|---|
| `POST /insights` | 20 requests / hora / usuario |
| `GET /export/pdf` | 5 requests / hora / usuario |
| `POST /predictions/retrain` | 3 requests / día / usuario |
| Resto de endpoints | Sin límite (plan gratuito Render) |

---

## Notas de implementación

### Orden de implementación por sprint

```
Sprint 2: GET /health, POST /cycles, GET /cycles, GET /cycles/{id},
          PUT /cycles/{id}, DELETE /cycles/{id}

Sprint 3: POST /daily-logs, GET /daily-logs/{cycle_id},
          PUT /daily-logs/{id}, DELETE /daily-logs/{id},
          GET /symptoms/catalog

Sprint 4: GET /analytics/summary, GET /analytics/symptoms,
          GET /analytics/flow, GET /analytics/phases

Sprint 5: GET /predictions/next (heurística),
          POST /insights (Ollama básico)

Sprint 6: POST /sync

Sprint 7: GET /insights/history,
          POST /predictions/retrain (Prophet)

Sprint 8: GET /predictions/next (Prophet integrado),
          GET /export/csv, GET /export/pdf
```

### Convención de nombres

- Todos los campos en `snake_case`
- Fechas en formato `YYYY-MM-DD` (ISO 8601)
- Timestamps en `YYYY-MM-DDTHH:MM:SSZ` (UTC)
- IDs como `UUID v4`
- Respuestas siempre en español donde sea texto legible por la usuaria

### Testing de endpoints

Cada endpoint debe tener:
1. Test de caso feliz (happy path)
2. Test de autenticación fallida (401)
3. Test de acceso a datos de otro usuario (403/404)
4. Test de validación de inputs (422)

---

*Última actualización: Sprint 1 — Documento inicial*
*Responsable: Meriyei (backend) + Madeleine (ML endpoints)*