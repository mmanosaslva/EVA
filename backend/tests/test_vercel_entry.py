"""El punto de entrada de Vercel (api/index.py) expone la API bajo /api y nada fuera de ella."""

import importlib.util
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

ENTRY = Path(__file__).resolve().parents[2] / "api" / "index.py"


@pytest.fixture(scope="module")
def vercel_app():
    spec = importlib.util.spec_from_file_location("vercel_entry", ENTRY)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.app


@pytest.mark.parametrize("path, expected", [
    ("/api/health", 200),
    ("/api/openapi.json", 200),
    ("/health", 404),
    ("/docs", 404),
])
async def test_routes_live_under_api(vercel_app, path, expected):
    async with AsyncClient(transport=ASGITransport(app=vercel_app), base_url="http://test") as client:
        assert (await client.get(path)).status_code == expected
