"""Punto de entrada del backend en Vercel (Docs/DEPLOY.md).

Frontend y backend son un solo proyecto de Vercel: `vercel.json` reescribe `/api/*` a esta
función, y aquí la API de FastAPI se monta bajo `/api`. Así el frontend llama a `/api/...`
en su mismo dominio (sin CORS) y cada preview trae su propio backend.
En local el backend sigue corriendo sin prefijo: `uvicorn app.main:app` desde backend/.
"""

import sys
from pathlib import Path

from fastapi import FastAPI

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.main import app as eva_api  # noqa: E402

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
app.mount("/api", eva_api)
