import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from starlette.requests import Request

from app.core import rate_limit
from app.models.db_tables import rate_limits_table


@pytest.fixture
async def limits_db(sqlite_engine):
    async with sqlite_engine.begin() as conn:
        await conn.run_sync(rate_limits_table.create)
    return sqlite_engine


@pytest.fixture
def clock(monkeypatch):
    now = {"t": 1_000_000}
    monkeypatch.setattr(rate_limit.time, "time", lambda: now["t"])
    return now


def _request(headers: dict, client=("10.0.0.1", 1234)) -> Request:
    return Request({
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in headers.items()],
        "client": client,
    })


class TestHit:
    async def test_counts_within_window(self, limits_db, clock):
        assert await rate_limit.hit("insights", "ana", 3600) == 1
        assert await rate_limit.hit("insights", "ana", 3600) == 2

    async def test_new_window_starts_at_one(self, limits_db, clock):
        await rate_limit.hit("insights", "ana", 3600)
        clock["t"] += 3600
        assert await rate_limit.hit("insights", "ana", 3600) == 1

    async def test_scopes_and_people_are_independent(self, limits_db, clock):
        await rate_limit.hit("insights", "ana", 3600)
        assert await rate_limit.hit("insights", "bea", 3600) == 1
        assert await rate_limit.hit("export-pdf", "ana", 3600) == 1

    async def test_stores_hash_not_identity(self, limits_db, clock):
        await rate_limit.hit("auth-login", "203.0.113.7", 900)
        async with limits_db.connect() as conn:
            bucket = (await conn.execute(select(rate_limits_table.c.bucket))).scalar_one()
        assert "203.0.113.7" not in bucket
        assert len(bucket) == 64

    async def test_old_windows_are_cleaned(self, limits_db, clock):
        await rate_limit.hit("insights", "ana", 3600)
        clock["t"] += 3 * 24 * 3600
        await rate_limit.hit("insights", "ana", 3600)
        async with limits_db.connect() as conn:
            rows = (await conn.execute(select(func.count()).select_from(rate_limits_table))).scalar_one()
        assert rows == 1


class TestClientIp:
    def test_prefers_x_real_ip(self):
        req = _request({"x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1"})
        assert rate_limit.client_ip(req) == "203.0.113.7"

    def test_uses_first_forwarded_for(self):
        req = _request({"x-forwarded-for": "198.51.100.1, 10.0.0.2"})
        assert rate_limit.client_ip(req) == "198.51.100.1"

    def test_falls_back_to_socket(self):
        assert rate_limit.client_ip(_request({})) == "10.0.0.1"


def _app(dependency) -> FastAPI:
    app = FastAPI()

    @app.post("/limited", dependencies=[Depends(dependency)])
    async def limited():
        return {"ok": True}

    return app


async def _post(app: FastAPI, headers: dict | None = None) -> int:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return (await client.post("/limited", headers=headers or {})).status_code


class TestDependencies:
    async def test_per_ip_blocks_after_limit(self, limits_db, clock):
        app = _app(rate_limit.limit_per_ip("auth-login", 2, 900))
        headers = {"x-real-ip": "203.0.113.7"}
        assert [await _post(app, headers) for _ in range(3)] == [200, 200, 429]
        assert await _post(app, {"x-real-ip": "203.0.113.8"}) == 200

    async def test_429_has_retry_after(self, limits_db, clock):
        app = _app(rate_limit.limit_per_ip("auth-login", 0, 900))
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/limited")
        assert response.status_code == 429
        assert 0 < int(response.headers["retry-after"]) <= 900

    async def test_per_user_uses_verified_user_id(self, limits_db, clock):
        app = _app(rate_limit.limit_per_user("insights", 1, 3600))
        user = {"user_id": "ana"}
        app.dependency_overrides[rate_limit.get_current_user] = lambda: user
        assert await _post(app) == 200
        assert await _post(app) == 429
        user["user_id"] = "bea"
        assert await _post(app) == 200

    async def test_fails_open_when_table_is_missing(self, sqlite_engine, clock):
        app = _app(rate_limit.limit_per_ip("auth-login", 0, 900))
        assert await _post(app) == 200
