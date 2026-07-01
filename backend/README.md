# EVA — Backend

API REST de EVA, plataforma de salud menstrual.

Stack: FastAPI + PostgreSQL (Supabase) + Prophet + Ollama

---

## Setup rápido

```bash
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
pip install -r requirements-dev.txt
cp .env.example .env
# Editar .env con tus credenciales
uvicorn app.main:app --reload --port 8000
```

API en http://localhost:8000 — Docs en http://localhost:8000/docs

---

## Setup de ML

### Propagación condicional (Prophet)

Para predicción de ciclos menstruales con Prophet:

```bash
pip install -r requirements.txt
```

Prophet requiere una herramienta de C++ (incluida en las Build Tools de Visual Studio o en Mingw-w64). Si falla la instalación, probar:

```bash
pip install prophet --no-build-isolation
```

### Ollama (LLM local)

1. Descargar e instalar: https://ollama.ai/
2. Iniciar el servidor:
   ```bash
   ollama serve
   ```
3. Descargar el modelo Mistral (~4.4 GB):
   ```bash
   ollama pull mistral
   ```
4. Verificar que responde:
   ```bash
   ollama run mistral "Hola, ¿cómo estás?"
   ```

### Verificación del entorno

```bash
python scripts/verify_ml_env.py
```

El script comprueba:
- Prophet importable y funcional
- scikit-learn (métrica MAE)
- joblib (serialización .pkl)
- Ollama disponible
- Versiones de todas las dependencias

---

## Tests

```bash
pytest -v
```
