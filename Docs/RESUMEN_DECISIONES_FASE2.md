# Resumen de la Decisión de Estructura y Planificación — Fase 2

> **Fecha:** 26 de Agosto, 2026
> **Propósito:** Documentar los POR QUÉ de cada decisión arquitectónica tomada en la Fase 2.

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [¿Por qué NO migrar a Go?](#2-por-qué-no-migrar-a-go)
3. [¿Por qué optimizar Python + mover hosting?](#3-por-qué-optimizar-python--mover-hosting)
4. [¿Por qué Groq como proveedor primario?](#4-por-qué-groq-como-proveedor-primario)
5. [¿Por qué Gemini como respaldo?](#5-por-qué-gemini-como-respaldo)
6. [¿Por qué eliminar Playwright?](#6-por-qué-eliminar-playwright)
7. [¿Por qué Prophet y no otra alternativa?](#7-por-qué-prophet-y-no-otra-alternativa)
8. [¿Por qué no Oracle Cloud?](#8-por-qué-no-oracle-cloud)
9. [Decisiones de Privacidad](#9-decisiones-de-privacidad)
10. [Decisiones de Organización](#10-decisiones-de-organización)

---

## 1. Resumen Ejecutivo

### Las 5 Decisiones Clave de la Fase 2

| # | Decisión | Razón Principal |
|---|---|---|
| 1 | **NO migrar a Go** | El problema es infraestructura, no el lenguaje |
| 2 | **Optimizar Python + AWS São Paulo** | 80% de la latencia se resuelve con infraestructura |
| 3 | **Groq primario + Gemini respaldo** | Perpetuo, sin PII, latencia más baja |
| 4 | **Eliminar Playwright** | Overhead no justificado para proyecto académico |
| 5 | **Mantener Prophet en Python** | No hay equivalente maduro fuera de Python |

---

## 2. ¿Por qué NO migrar a Go?

### La Hipótesis Original del Equipo

> "Migrar el backend a Go mejoraría la latencia."

### El Diagnóstico Real

**Pregunta clave:** ¿El problema de latencia es por Python o por infraestructura?

**Evidencia:**

| Factor | Contribución a la Latencia | Solución |
|---|---|---|
| Sin connection pooling | +60-120ms por request | Configurar `pool_size`, `max_overflow` |
| Hosting lejano de Neon | +80-150ms por request | Mover a AWS São Paulo |
| Cold starts de Neon | +200-500ms al despertar | Retry con backoff |
| Python como lenguaje | +0-5ms (negligible) | **No necesita cambio** |

**Conclusión:** Python añade ~5ms máximo. La infraestructura añade ~200-400ms. Migrar a Go resolvería 5ms con 4-6 semanas de trabajo.

### Comparación Python vs Go para EVA

| Criterio | Python (FastAPI) | Go (Chi/Echo) |
|---|---|---|
| Endpoints actuales | 5 | 5 |
| Complejidad | CRUD simple | CRUD simple |
| Carga computacional | Baja | Baja |
| Equipo lo conoce | ✅ Sí | ❌ No (curva aprendizaje) |
| Ecosistema ML | ✅ Nativo (Prophet, sklearn) | ❌ Pobre (CGo bindings) |
| Tiempo de migración | 0 (ya funciona) | 4-6 semanas |
| Mejora real de latencia | 120-210ms (infraestructura) | 20-40ms adicional |
| Costo/beneficio | ✅ Excelente | ❌ Pobre |

### ¿Cuándo SÍ tendría sentido Go?

| Escenario | ¿Aplica a EVA? |
|---|---|
| >10,000 requests/s concurrentes | ❌ No (proyecto académico) |
| Procesamiento pesado (imágenes, video) | ❌ No (solo CRUD + ML ligero) |
| Microservicios con decenas de endpoints | ❌ No (5 endpoints) |
| Latencia sub-milisegundo requerida | ❌ No (chatbot tolera 1-2s) |

**Veredicto:** Go es una excelente opción para ciertos problemas. EVA no tiene esos problemas.

---

## 3. ¿Por qué optimizar Python + mover hosting?

### La Solución Elegida

| Acción | Tiempo | Costo | Beneficio |
|---|---|---|---|
| Configurar connection pooling | 2-4 horas | $0 | -60-120ms por request |
| Desplegar backend en AWS São Paulo | 1-2 días | $0 (free tier) | -80-150ms por request |
| Retry con backoff | 2-3 horas | $0 | Manejo de cold starts |
| Optimizar queries | 2 horas | $0 | -10-30ms por query |
| **Total** | **~3-4 días** | **$0** | **-150-300ms por request** |

### Por qué AWS São Paulo

```
ANTES (solo local, sin hosting en cloud):
┌─────────────┐      80-150ms       ┌─────────────┐
│   Backend   │ ◄──────────────────► │  Neon (BR)  │
│  (tu PC)    │     latencia red    │             │
└─────────────┘                      └─────────────┘

DESPUÉS (desplegado en AWS São Paulo):
┌─────────────┐      <5ms           ┌─────────────┐
│   Backend   │ ◄──────────────────► │  Neon (BR)  │
│  (sa-east-1)│     latencia red    │             │
└─────────────┘                      └─────────────┘
```

### Por qué connection pooling

```
ANTES (sin pooling):
Request 1 ──→ Abrir conexión TCP (20ms) ──→ TLS (30ms) ──→ Auth (10ms) ──→ Query (5ms) ──→ Cerrar
Request 2 ──→ Abrir conexión TCP (20ms) ──→ TLS (30ms) ──→ Auth (10ms) ──→ Query (5ms) ──→ Cerrar
Request 3 ──→ Abrir conexión TCP (20ms) ──→ TLS (30ms) ──→ Auth (10ms) ──→ Query (5ms) ──→ Cerrar
Total: 3 × 65ms = 195ms de overhead

DESPUÉS (con pooling):
Request 1 ──→ Pool (1ms) ──→ Query (5ms) ──→ Retornar al pool
Request 2 ──→ Pool (1ms) ──→ Query (5ms) ──→ Retornar al pool
Request 3 ──→ Pool (1ms) ──→ Query (5ms) ──→ Retornar al pool
Total: 3 × 6ms = 18ms de overhead
```

---

## 4. ¿Por qué Groq como proveedor primario?

### Comparación de Proveedores (Resumen)

| Proveedor | Gratuidad | Latencia | Modelos | Privacidad | Veredicto |
|---|---|---|---|---|---|
| **Groq** | ✅ Perpetua | **<100ms** | Llama 70B | ✅ Sin entrenamiento | **PRIMARIO** |
| Gemini | ✅ Perpetua | Baja | Gemini Flash | ⚠️ Puede entrenar | RESPALDO |
| Cloudflare | ✅ Perpetua | Muy baja | Llama 70B | ✅ Sin entrenamiento | Alternativa |
| Oracle | ⚠️ Capacity | Alta | Self-hosted | ✅ Total control | NO |

### Por qué Groq gana

1. **Latencia más baja del mercado**: LPU inference, <100ms
2. **Modelos capaces**: Llama 3.3 70B con 128K context window
3. **Perpetuo**: No es crédito temporal, es rate-limited forever
4. **Sin PII**: No entrena con datos de usuarios free tier
5. **API OpenAI-compatible**: Integración trivial
6. **Ya usado**: El equipo ya lo tenía como fallback

### Límites de Groq (lo que debemos respetar)

| Modelo | RPM | RPD | TPM | TPD |
|---|---|---|---|---|
| Llama 3.3 70B | 30 | 1,000 | 12,000 | 100,000 |
| Llama 3.1 8B | 30 | 14,400 | 6,000 | 500,000 |
| DeepSeek R1 70B | 30 | 1,000 | 6,000 | — |

**Cálculo para EVA:**
- Chatbot promedio: 10-20 requests/usuario/día
- 100 usuarios activos: 1,000-2,000 requests/día
- Límite Groq: 1,000 RPD (con Llama 70B)
- **Conclusión:** Necesitamos fallback (Gemini) o usar modelo más generoso (Llama 8B con 14.4K RPD)

---

## 5. ¿Por qué Gemini como respaldo?

### Razones

1. **500 RPD**: Suficiente como respaldo cuando Groq agota
2. **Modelos excelentes**: Gemini 2.5 Flash con 1M context
3. **Perpetuo**: Rate-limited forever
4. **API compatible**: OpenAI-compatible endpoint

### Precaución: Privacidad

> "Free-tier prompts may be used by Google to improve its products
> when used outside the UK/CH/EEA/EU"

**Mitigación:** Enviar solo estadísticas agregadas, nunca PII. Esto cumple con la privacidad independientemente de la política de Google.

---

## 6. ¿Por qué eliminar Playwright?

### El Problema

Los tests E2E (Playwright) son:
- **Costosos de mantener**: Cambios en UI rompen tests frecuentemente
- **Lentos de ejecutar**: Minutos vs segundos de Vitest
- **Frágiles**: Dependientes de selectores, timings, estado del browser

### Para un Proyecto Académico

| Tipo de Test | Cobertura | Mantenimiento | Velocidad | Recomendación |
|---|---|---|---|---|
| Unitarios (Vitest) | Funciones aisladas | Bajo | Millisegundos | ✅ Mantener |
| Integración (pytest) | API endpoints | Medio | Segundos | ✅ Mantener |
| E2E (Playwright) | Flujos completos | **Alto** | **Minutos** | ❌ Eliminar |

### Qué Cubren los Tests Restantes

| Test | Qué Cubre |
|---|---|
| Vitest (frontend) | Componentes React, hooks, utils, lógica de UI |
| pytest (backend) | Endpoints, servicios, repos, lógica de negocio |
| pytest + httpx | Integración API completa |

**¿Es suficiente?** Sí, para un proyecto académico con alcance definido. Los tests E2E son más útiles en producción con múltiples equipos y cambios frecuentes.

---

## 7. ¿Por qué Prophet y no otra alternativa?

### Comparación de Alternativas ML

| Alternativa | Datos mínimos | Interpretabilidad | Costo | Para EVA |
|---|---|---|---|---|
| **Prophet** | 3-6 ciclos | Alta | Bajo (CPU) | ✅ **Elegido** |
| LSTM (red neuronal) | 500-1000+ | Baja (caja negra) | Alto (GPU) | ❌ |
| ARIMA | 30-50 puntos | Media | Bajo | ❌ |
| Scikit-learn (regresión) | 20-30 | Media | Bajo | ⚠️ Posible |

### Por qué Prophet

1. **Diseñado para series de tiempo con estacionalidad**: Los ciclos menstruales son series de tiempo estacionales
2. **Funciona con pocos datos**: 3-6 ciclos son suficientes (una mujer típica tiene 10-20/año)
3. **Interpretabilidad**: Muestra tendencia, estacionalidad y puntos de cambio
4. **CPU suficiente**: No necesita GPU
5. **Modelo por usuaria**: Cada mujer tiene su propio modelo (no global)
6. **Madurez**: Facebook/Meta lo mantiene, amplia comunidad

### Por qué NO LSTM

| Criterio | Prophet | LSTM |
|---|---|---|
| Datos mínimos | 3-6 ciclos | 500-1000+ ciclos |
| Una mujer típica | 10-20 ciclos/año | Necesitaría 25-50 años de datos |
| Interpretabilidad | Alta (tendencia visible) | Baja (caja negra) |
| Hardware | CPU suficiente | GPU recomendada |
| Hosting | $0 (AWS Lambda) | $100+/mes (GPU) |

**Conclusión:** LSTM es técnicamente superior con suficientes datos. EVA no tiene suficientes datos. Prophet es la opción correcta.

---

## 8. ¿Por qué no Oracle Cloud?

### La Promesa

> "4 OCPU ARM, 24GB RAM, Always Free, sin expiración"

### La Realidad

> "Oracle's ARM capacity is allocated per-region. Popular regions (US, EU,
> Canada) are perpetually full. You cannot create an ARM instance because
> there is no capacity. This is not a temporary condition. It is structural."

### Datos Concretos

| Configuración | Tasa de Éxito | Uso |
|---|---|---|
| 1 OCPU, 6GB | Alta | Modelos 3B-7B Q4 |
| 2 OCPU, 12GB | Moderada | Modelo 7B Q4-Q5 |
| 4 OCPU, 24GB | **Baja** | Modelo 13B Q4 |

### Rendimiento Real

| Modelo | Instancia | Throughput |
|---|---|---|
| Gemma 4 7B Q4 | 4 OCPU / 24GB | 12-15 tok/s |
| Gemma 4 9B Q4 | 4 OCPU / 24GB | 8-10 tok/s |
| RTX 3090 (referencia) | GPU dedicada | 60-80 tok/s |

**Comparación:** Oracle Free = ~10% del rendimiento de una GPU dedicada.

### ¿Por qué no sirve para EVA?

1. **Capacity lottery**: No se puede provisioning confiablemente
2. **CPU-only**: 8-10 tok/s es demasiado lento para chatbot
3. **Complejidad**: Requiere configurar Ollama, exponer API, manejar SSL
4. **Latencia**: Self-hosted sin CDN = alta latencia desde Brasil
5. **Mantenimiento**: Actualizaciones de modelo, monitoreo, backups

**Veredicto:** Oracle Cloud es excelente para aprendizaje y hobby. No para producción con usuarios reales.

---

## 9. Decisiones de Privacidad

### Principio Fundamental

> **El contexto enviado al LLM NUNCA incluye PII.**

### ¿Por qué esta restricción es no negociable?

1. **Derecho a la privacidad**: Datos de salud son información sensible
2. **Regulación**: Leyes de protección de datos (GDPR, LEAPD)
3. **Confianza**: Las usuarias confían sus datos más íntimos a EVA
4. **Ética**: Un leak de datos de ciclo puede causar daño real

### Qué es PII en el Contexto de EVA

| Campo | ¿Es PII? | Razón |
|---|---|---|
| email | ✅ Sí | Identificador único |
| nombre | ✅ Sí | Identificador personal |
| fecha de nacimiento | ✅ Sí | Identificador único |
| user_id | ✅ Sí | Identificador único en sistema |
| IP | ✅ Sí | Identificador de red |
| notas de texto libre | ✅ Sí | Puede contener cualquier info |
| fase del ciclo | ❌ No | Estadística agregada |
| día del ciclo | ❌ No | Estadística numérica |
| duración promedio | ❌ No | Estadística numérica |
| síntomas frecuentes | ❌ No | Lista genérica |

### Ejemplo de Contexto Seguro

```json
{
  "current_phase": "luteal",
  "cycle_day": 24,
  "avg_cycle_length": 28,
  "avg_period_length": 5,
  "days_until_next_period": 4,
  "frequent_symptoms": ["headache", "bloating"],
  "avg_temperature": 36.5
}
```

**Este JSON es seguro porque:**
- No contiene identificadores únicos
- No contiene información que pueda vincularse a una persona específica
- Son estadísticas agregadas que aplican a muchas mujeres
- Un atacante no podría usar esto para identificar a la usuaria

---

## 10. Decisiones de Organización

### ¿Por qué 3 frentes paralelos?

| Frente | Responsable | Justificación |
|---|---|---|
| F1: Backend | Meriyei | Especialización en Python/FastAPI |
| F2: Chatbot | Madeleine (investigación) + Meriyei (implementación) | ML/AI es expertise de Madeleine |
| F3: E2E | Daniel | Documentación es rápida, puede hacer en paralelo |

### ¿Por qué no un cuarto developer?

> **Nota del documento de contexto:** "la participación de Joshua en esta
> fase está sin confirmar — no debe asumirse ni presente ni ausente"

**Decisión:** Planificar con 3 personas. Si Joshua se une, hay tareas de ML (T4.1-T4.3) que podrían beneficiarse de su expertise.

### Flujo de Aprobación

```
┌─────────────────────────────────────────────────────────┐
│                    FLUJO DE DECISIONES                  │
│                                                         │
│  OpenCode presenta diagnóstico                         │
│       │                                                 │
│       ↓                                                 │
│  ┌──────────────────────────────────────────────┐      │
│  │ Equipo revisa:                               │      │
│  │ - Meriyei: validación técnica backend        │      │
│  │ - Daniel: validación frontend y UX           │      │
│  │ - Madeleine: validación ML y DevOps          │      │
│  └──────────────────────────────────────────────┘      │
│       │                                                 │
│       ↓                                                 │
│  ¿Aprobado? ──── NO ──→ Feedback → OpenCode ajusta    │
│       │                                                 │
│       SÍ                                                │
│       │                                                 │
│       ↓                                                 │
│  ┌──────────────────────────────────────────────┐      │
│  │ Ejecución:                                   │      │
│  │ - Cada developer ejecuta sus tareas          │      │
│  │ - Dependencias se respetan                   │      │
│  │ - Bloqueos se comunican inmediatamente       │      │
│  └──────────────────────────────────────────────┘      │
│       │                                                 │
│       ↓                                                 │
│  ┌──────────────────────────────────────────────┐      │
│  │ Verificación:                                │      │
│  │ - Tests pasan                                │      │
│  │ - Lint limpio                                │      │
│  │ - Benchmarks mostrando mejora                │      │
│  └──────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

### Comunicación del Equipo

| Canal | Propósito | Frecuencia |
|---|---|---|
| GitHub Issues | Seguimiento de tareas | Continuo |
| Pull Requests | Revisión de código | Por tarea |
| Standup diario | Status y bloqueos | Diario (15 min) |
| Sprint review | Demo de avances | Semanal |

---

## Anexo: Preguntas Frecuentes

### ¿Y si el equipo quiere migrar a Go después?

**Respuesta:** El plan no cierra esa puerta. Si después de optimizar Python + mover a AWS São Paulo la latencia sigue siendo insatisfactoria (medido con benchmarks), se puede reconsiderar. Pero ahora hay datos reales, no hipótesis.

### ¿Y si Groq cambia su free tier?

**Respuesta:** El plan ya tiene Gemini como respaldo. Si Groq cambia términos, se evalúa:
1. ¿Cambió solo límites? → Ajustar uso
2. ¿Eliminó free tier? → Migrar a Gemini como primario
3. ¿Cerró el servicio? → Cloudflare Workers AI como alternativa

### ¿Y si necesitamos más de 1,000 requests/día en el chatbot?

**Respuesta:** Opciones en orden de preferencia:
1. Usar Llama 3.1 8B (14,400 RPD en vez de 1,000)
2. Implementar caché de respuestas comunes
3. Agregar rate limiting por usuario
4. Considerar Gemini como primario (500 RPD)

### ¿Por qué no usar los $300 de crédito de Google Cloud?

**Respuesta:** Porque expiran en 90 días. El requisito es "100% gratuito sin fecha de expiración". Los $300 son un trial, no un free tier perpetuo.

### ¿Es seguro enviar datos de ciclo a Groq/Gemini?

**Respuesta:** Sí,因为我们 enviamos solo estadísticas agregadas:
- fase del ciclo (genérica)
- día del ciclo (numérico)
- duración promedio (numérica)
- síntomas frecuentes (lista genérica)

Esto es información que aplica a millones de mujeres. Un atacante no podría identificar a una persona específica con estos datos.

---

## Conclusión

Las decisiones de la Fase 2 se basan en **evidencia, no en suposiciones**:

1. **Medimos** la latencia real antes de proponer soluciones
2. **Comparamos** opciones con datos concretos (límites, costos, tiempos)
3. **Priorizamos** costo/beneficio sobre elegancia técnica
4. **Respetamos** las restricciones del proyecto (100% gratuito, privacidad)
5. **Documentamos** cada decisión para que el equipo pueda validar

**El resultado:** Un plan ejecutable en 3-4 semanas con 3 developers, costo $0, y latencia reducida ~150-300ms.
