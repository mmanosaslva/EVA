from datetime import date
from unittest.mock import AsyncMock

import pytest
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import create_async_engine

from tests.test_metadata import test_metadata as _tm

TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000"
TEST_CYCLE_ID = "550e8400-e29b-41d4-a716-446655440001"
TEST_LOG_ID = "550e8400-e29b-41d4-a716-446655440002"
TEST_LOG2_ID = "550e8400-e29b-41d4-a716-446655440003"

SEED_SYMPTOMS = [
    {"name": "Dolor abdominal (colicos)", "category": "fisica", "common_phase": "menstruacion"},
    {"name": "Fatiga", "category": "fisica", "common_phase": "lutea"},
    {"name": "Irritabilidad", "category": "emocional", "common_phase": "lutea"},
    {"name": "Nauseas", "category": "digestiva", "common_phase": "menstruacion"},
    {"name": "Sofocos", "category": "fisica", "common_phase": "todas"},
]


# ── Data fixtures (sync, no database) ───────────────────────

@pytest.fixture
def user_data():
    return {
        "id": TEST_USER_ID,
        "email": "test@example.com",
        "birth_date": date(1995, 6, 15),
    }


@pytest.fixture
def cycle_data():
    return {
        "id": TEST_CYCLE_ID,
        "user_id": TEST_USER_ID,
        "start_date": date(2025, 6, 1),
        "end_date": date(2025, 6, 5),
    }


@pytest.fixture
def log_data():
    return {
        "id": TEST_LOG_ID,
        "cycle_id": TEST_CYCLE_ID,
        "date": date(2025, 6, 1),
        "flow_level": "medium",
        "temperature": 36.75,
        "notes": "dia con colicos",
    }


@pytest.fixture
def log2_data():
    return {
        "id": TEST_LOG2_ID,
        "cycle_id": TEST_CYCLE_ID,
        "date": date(2025, 6, 2),
        "flow_level": "light",
        "temperature": None,
        "notes": None,
    }


@pytest.fixture
def symptom_catalog_entries():
    return SEED_SYMPTOMS


@pytest.fixture
def daily_symptom_entry():
    return {
        "log_id": TEST_LOG_ID,
        "symptom_id": 1,
        "intensity": 3,
    }


@pytest.fixture
def log_with_symptoms():
    return {
        "id": TEST_LOG_ID,
        "cycle_id": TEST_CYCLE_ID,
        "date": date(2025, 6, 1),
        "flow_level": "medium",
        "temperature": 36.75,
        "notes": "dia con colicos",
        "symptoms": [
            {"symptom_id": 1, "intensity": 3, "name": "Dolor abdominal (colicos)", "category": "fisica", "common_phase": "menstruacion"},
            {"symptom_id": 2, "intensity": 2, "name": "Fatiga", "category": "fisica", "common_phase": "lutea"},
        ],
    }


# ── Mock fixtures (unit tests, no database) ─────────────────

class MockRow:
    def __init__(self, data: dict):
        self._mapping = data

    def __getattr__(self, name):
        return self._mapping.get(name)

    def __getitem__(self, key):
        return self._mapping[key]


@pytest.fixture
def mock_row(user_data):
    return MockRow(user_data)


@pytest.fixture
def mock_conn():
    conn = AsyncMock()
    return conn


@pytest.fixture
def mock_engine(monkeypatch):
    engine = AsyncMock()
    conn = AsyncMock()
    engine.connect.return_value.__aenter__.return_value = conn
    engine.connect.return_value.__aexit__.return_value = None
    monkeypatch.setattr("app.core.db.engine", engine)
    return engine


# ── SQLite fixtures (integration tests, no PostgreSQL needed) ─

SQLITE_CYCLE_COLUMNS = [
    _tm.tables["cycles"].c.id, _tm.tables["cycles"].c.user_id,
    _tm.tables["cycles"].c.start_date, _tm.tables["cycles"].c.end_date,
    _tm.tables["cycles"].c.created_at, _tm.tables["cycles"].c.updated_at,
]

SQLITE_LOG_COLUMNS = [
    _tm.tables["daily_logs"].c.id, _tm.tables["daily_logs"].c.cycle_id,
    _tm.tables["daily_logs"].c.date, _tm.tables["daily_logs"].c.flow_level,
    _tm.tables["daily_logs"].c.temperature, _tm.tables["daily_logs"].c.notes,
    _tm.tables["daily_logs"].c.created_at, _tm.tables["daily_logs"].c.updated_at,
]


@pytest.fixture(autouse=True)
async def sqlite_engine(monkeypatch):
    engine = create_async_engine("sqlite+aiosqlite://", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(_tm.create_all)

    monkeypatch.setattr("app.core.db.engine", engine)
    monkeypatch.setattr("app.repositories.cycle_repo.engine", engine)
    monkeypatch.setattr("app.repositories.daily_log_repo.engine", engine)
    monkeypatch.setattr("app.repositories.symptom_repo.engine", engine)

    monkeypatch.setattr(
        "app.repositories.cycle_repo.cycles_table", _tm.tables["cycles"]
    )
    monkeypatch.setattr(
        "app.repositories.daily_log_repo.daily_logs_table", _tm.tables["daily_logs"]
    )
    monkeypatch.setattr(
        "app.repositories.cycle_repo.CYCLE_COLUMNS", SQLITE_CYCLE_COLUMNS
    )
    monkeypatch.setattr(
        "app.repositories.daily_log_repo.LOG_COLUMNS", SQLITE_LOG_COLUMNS
    )
    yield engine
    await engine.dispose()


@pytest.fixture
async def sqlite_db(sqlite_engine):
    async with sqlite_engine.connect() as conn:
        yield conn


@pytest.fixture
async def seeded_sqlite_db(sqlite_db):
    await sqlite_db.execute(
        insert(_tm.tables["symptoms_catalog"]).values(SEED_SYMPTOMS)
    )
    await sqlite_db.commit()
    yield sqlite_db


@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer test-token"}
