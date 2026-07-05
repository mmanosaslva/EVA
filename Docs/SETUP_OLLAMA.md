# Setup de Ollama para EVA

> Guía de instalación y configuración de Ollama con el modelo Mistral
> para el asistente conversacional de EVA (Issue #76)

## ¿Qué es Ollama?

Ollama es un motor de LLMs (Large Language Models) que permite ejecutar
modelos como Mistral 7B localmente, sin enviar datos a servidores externos.

EVA lo usa como backend principal para `POST /insights`. Si Ollama no está
disponible, el sistema cae automáticamente a Groq (fallback).

## Requisitos

- Windows 10/11, macOS, o Linux
- 8 GB+ de RAM (Mistral 7B usa ~4 GB)
- 5 GB de espacio libre en disco (para el modelo mistral)
- Conexión a internet para la descarga inicial

## Instalación

### 1. Descargar e instalar Ollama

**Windows / macOS:**
Descargar el instalador desde https://ollama.ai/ e instalarlo.

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Iniciar el servidor de Ollama

El servidor debe estar corriendo para que el backend de EVA pueda usarlo.

**Windows:**
Ollama se inicia automáticamente como servicio al instalarse.
Verificar en el administrador de tareas que `ollama.exe` está corriendo.
Si no, ejecutar en terminal:

```powershell
ollama serve
```

**macOS / Linux:**
```bash
ollama serve &
```

### 3. Descargar el modelo Mistral

El modelo Mistral 7B (~4.4 GB) es el recomendado para EVA:

```bash
ollama pull mistral
```

Modelos alternativos (más ligeros pero menos precisos):

```bash
ollama pull llama3.2:3b    # ~2 GB, más rápido, menos preciso
ollama pull phi3:3.8b      # ~2.3 GB, buena relación calidad/velocidad
```

### 4. Verificar que funciona

```bash
ollama run mistral "Hola, ¿qué es la fase lútea?"
```

Si el modelo responde en español, está listo.

## Verificación con EVA

### Script de verificación del entorno ML

```bash
python backend/scripts/verify_ml_env.py
```

La sección "Ollama" del script muestra:
- `[OK] Ollama disponible. Modelos: [mistral]` → Todo correcto
- `[WARN] Ollama no encontrado en PATH` → Ollama no instalado
- `[WARN] Ollama no responde (timeout)` → Ollama instalado pero no corriendo

### Probar el endpoint de insights

Con el backend corriendo (`uvicorn app.main:app --reload`):

```bash
curl -X POST http://localhost:8000/insights \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <tu-token-jwt>" \
  -d '{"question": "¿Qué síntomas son normales en la fase lútea?"}'
```

Respuesta esperada (200):
```json
{
  "insight": "...",
  "phase": "lutea",
  "source": "ollama/mistral",
  "disclaimer": "EVA no reemplaza el consejo médico profesional."
}
```

Si Ollama no está corriendo, devuelve 503.

## Solución de problemas

### Error: `ollama` no se reconoce como comando

**Windows:** Asegurarse de que Ollama esté instalado y agregado al PATH.
Reiniciar la terminal después de instalar. Verificar en:
`C:\Users\<usuario>\AppData\Local\Programs\Ollama\ollama.exe`

### Error: `model "mistral" not found`

El modelo no se descargó correctamente:
```bash
ollama pull mistral
```

### Error: timeout en `/api/generate`

El modelo puede tardar en cargar la primera vez (especialmente en HDD vs SSD).
Aumentar el timeout en `llm_service.py` (por defecto 30s).

### Error: "not enough memory"

Mistral 7B requiere ~4 GB de RAM/VRAM. Cerrar otras aplicaciones o usar un
modelo más pequeño:
```bash
ollama pull llama3.2:3b
```
Luego cambiar `OLLAMA_MODEL = "llama3.2:3b"` en `backend/app/services/llm_service.py`.

## Arquitectura

```
POST /insights
       │
       ▼
llm_service.py
       │
       ├── ¿Ollama disponible?
       │     ├── Sí → llama a _call_ollama() → responde local
       │     └── No  → fallback a Groq
       │
       └── ¿Groq disponible? (GROQ_API_KEY)
             ├── Sí → llama a _call_groq()
             └── No  → 503 Service Unavailable
```

## Referencias

- [Ollama](https://ollama.ai/)
- [Mistral 7B](https://mistral.ai/)
- [EVA ML Strategy](ML_STRATEGY.md)
- [EVA Endpoints](ENDPOINTS.md)
