from datetime import date
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.models.db_tables import metadata, symptoms_catalog_table

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


# ── Database fixtures (integration tests, requires DB) ──────

def _get_test_db_url():
    url = settings.TEST_DATABASE_URL or settings.DATABASE_URL
    if url and url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


@pytest.fixture(scope="session")
def test_db_url():
    url = _get_test_db_url()
    if not url:
        pytest.skip("No TEST_DATABASE_URL or DATABASE_URL configured")
    return url


@pytest.fixture
async def test_engine(test_db_url):
    engine = create_async_engine(test_db_url, pool_pre_ping=True)
    async with engine.begin() as conn:
        await conn.run_sync(metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(metadata.drop_all)
    await engine.dispose()


@pytest.fixture
async def test_db(test_engine):
    async with test_engine.connect() as conn:
        yield conn


@pytest.fixture
async def seeded_db(test_db):
    from sqlalchemy import insert
    await test_db.execute(insert(symptoms_catalog_table).values(SEED_SYMPTOMS))
    await test_db.commit()
    yield test_db


@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer test-token"}
