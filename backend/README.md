# EVA — Backend

API REST de EVA, plataforma de salud menstrual.

Stack: FastAPI + PostgreSQL (Neon) + Prophet + LLM cloud (Groq y Cloudflare Workers AI)

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

### Chatbot (LLM cloud)

El chatbot usa dos proveedores gratuitos con failover automático, en este orden: Groq, luego Cloudflare Workers AI y, si ambos fallan, una respuesta por reglas. Las reglas están en `Docs/s10/restricciones.md` (RX-06).

1. Crear una API key en https://console.groq.com y activar Zero Data Retention (Settings → Data Controls).
2. Crear en Cloudflare un API token con permiso solo de Workers AI y copiar el Account ID.
3. Completar en `.env`: `GROQ_API_KEY`, `CLOUDFLARE_ACCOUNT_ID` y `CLOUDFLARE_API_TOKEN`. Los modelos y el orden tienen valores por defecto (ver `.env.example`).

Sin ninguna key el chatbot sigue funcionando, solo con la respuesta por reglas.

### Verificación del entorno

```bash
python scripts/verify_ml_env.py
```

El script comprueba:
- Prophet importable y funcional
- scikit-learn (métrica MAE)
- joblib (serialización .pkl)
- Versiones de todas las dependencias

---

## Tests

```bash
pytest -v
```
