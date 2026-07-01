"""
Tests de integración para cycle_service contra SQLite in-memory.
"""

from datetime import date

import pytest
from fastapi import HTTPException
from sqlalchemy import insert

from app.repositories import cycle_repo
from app.services.cycle_service import (
    create_cycle,
    get_cycles_by_user,
    get_cycle_by_id,
    update_cycle,
    delete_cycle,
)
from tests.conftest import TEST_USER_ID, TEST_CYCLE_ID

TEST_USER_2_ID = "550e8400-e29b-41d4-a716-446655449999"
TEST_LOG_ID = "550e8400-e29b-41d4-a716-446655440002"


@pytest.fixture
def _cycles():
    from tests.test_metadata import test_metadata as _tm
    return _tm.tables["cycles"]


@pytest.fixture
def _daily_logs():
    from tests.test_metadata import test_metadata as _tm
    return _tm.tables["daily_logs"]


@pytest.fixture
async def existing_cycle(sqlite_engine, _cycles):
    async with sqlite_engine.connect() as conn:
        await conn.execute(
            insert(_cycles).values(
                id=TEST_CYCLE_ID,
                user_id=TEST_USER_ID,
                start_date=date(2025, 5, 1),
                end_date=date(2025, 5, 5),
            )
        )
        await conn.commit()


@pytest.fixture
async def existing_daily_log(sqlite_engine, existing_cycle, _daily_logs):
    async with sqlite_engine.connect() as conn:
        await conn.execute(
            insert(_daily_logs).values(
                id=TEST_LOG_ID,
                cycle_id=TEST_CYCLE_ID,
                date=date(2025, 5, 1),
                flow_level="medium",
            )
        )
        await conn.commit()


class TestCreateCycle:
    async def test_valid_dates(self):
        result = await create_cycle(
            user_id=TEST_USER_ID,
            data={"start_date": date(2025, 6, 1), "end_date": date(2025, 6, 5)},
        )
        assert result["id"] is not None
        assert result["user_id"] == TEST_USER_ID
        assert result["start_date"] == date(2025, 6, 1)
        assert result["duration_days"] == 4

    async def test_duplicate_start_date(self, existing_cycle):
        with pytest.raises(HTTPException) as exc:
            await create_cycle(
                user_id=TEST_USER_ID,
                data={"start_date": date(2025, 5, 1)},
            )
        assert exc.value.status_code == 409
        assert "already exists" in exc.value.detail

    async def test_different_user_same_date(self, existing_cycle):
        result = await create_cycle(
            user_id=TEST_USER_2_ID,
            data={"start_date": date(2025, 5, 1)},
        )
        assert result["id"] is not None
        assert result["user_id"] == TEST_USER_2_ID


class TestGetCyclesByUser:
    async def test_returns_only_user_cycles(self, sqlite_engine, _cycles):
        async with sqlite_engine.connect() as conn:
            dates = [date(2025, 6, 1), date(2025, 6, 2), date(2025, 6, 1)]
            for uid, d in zip([TEST_USER_ID, TEST_USER_ID, TEST_USER_2_ID], dates):
                await conn.execute(
                    insert(_cycles).values(user_id=uid, start_date=d)
                )
            await conn.commit()

        total, cycles = await get_cycles_by_user(TEST_USER_ID)
        assert total == 2
        assert all(c["user_id"] == TEST_USER_ID for c in cycles)

    async def test_empty_user(self):
        total, cycles = await get_cycles_by_user(TEST_USER_ID)
        assert total == 0
        assert cycles == []

    async def test_pagination(self, sqlite_engine, _cycles):
        async with sqlite_engine.connect() as conn:
            for i in range(5):
                await conn.execute(
                    insert(_cycles).values(
                        user_id=TEST_USER_ID,
                        start_date=date(2025, 5, 1 + i),
                    )
                )
            await conn.commit()

        total, cycles = await get_cycles_by_user(TEST_USER_ID, limit=2, offset=1)
        assert total == 5
        assert len(cycles) == 2


class TestGetCycleById:
    async def test_found(self, existing_cycle):
        result = await get_cycle_by_id(TEST_CYCLE_ID, TEST_USER_ID)
        assert result["id"] == TEST_CYCLE_ID
        assert result["duration_days"] == 4

    async def test_found_with_daily_logs(self, existing_daily_log):
        result = await get_cycle_by_id(TEST_CYCLE_ID, TEST_USER_ID)
        assert result["id"] == TEST_CYCLE_ID
        assert len(result["daily_logs"]) == 1
        assert result["daily_logs"][0]["flow_level"] == "medium"

    async def test_not_found(self):
        with pytest.raises(HTTPException) as exc:
            await get_cycle_by_id("nonexistent-id", TEST_USER_ID)
        assert exc.value.status_code == 404

    async def test_wrong_user_returns_404(self, existing_cycle):
        with pytest.raises(HTTPException) as exc:
            await get_cycle_by_id(TEST_CYCLE_ID, TEST_USER_2_ID)
        assert exc.value.status_code == 404


class TestUpdateCycle:
    async def test_update_valid(self, existing_cycle):
        result = await update_cycle(
            cycle_id=TEST_CYCLE_ID,
            user_id=TEST_USER_ID,
            data={"end_date": date(2025, 5, 7)},
        )
        assert result["duration_days"] == 6

    async def test_not_found(self):
        with pytest.raises(HTTPException) as exc:
            await update_cycle(
                cycle_id="nonexistent",
                user_id=TEST_USER_ID,
                data={"end_date": date(2025, 6, 5)},
            )
        assert exc.value.status_code == 404

    async def test_wrong_user_returns_404(self, existing_cycle):
        with pytest.raises(HTTPException) as exc:
            await update_cycle(
                cycle_id=TEST_CYCLE_ID,
                user_id=TEST_USER_2_ID,
                data={"end_date": date(2025, 6, 5)},
            )
        assert exc.value.status_code == 404

    async def test_duplicate_start_date(self, sqlite_engine, _cycles):
        async with sqlite_engine.connect() as conn:
            await conn.execute(
                insert(_cycles).values(
                    id=TEST_CYCLE_ID,
                    user_id=TEST_USER_ID,
                    start_date=date(2025, 5, 1),
                )
            )
            await conn.execute(
                insert(_cycles).values(
                    user_id=TEST_USER_ID,
                    start_date=date(2025, 6, 1),
                )
            )
            await conn.commit()

        with pytest.raises(HTTPException) as exc:
            await update_cycle(
                cycle_id=TEST_CYCLE_ID,
                user_id=TEST_USER_ID,
                data={"start_date": date(2025, 6, 1)},
            )
        assert exc.value.status_code == 409


class TestDeleteCycle:
    async def test_delete_success(self, existing_cycle):
        await delete_cycle(TEST_CYCLE_ID, TEST_USER_ID)
        result = await cycle_repo.get_cycle_by_id(TEST_CYCLE_ID, TEST_USER_ID)
        assert result is None

    async def test_not_found(self):
        with pytest.raises(HTTPException) as exc:
            await delete_cycle("nonexistent", TEST_USER_ID)
        assert exc.value.status_code == 404

    async def test_wrong_user_returns_404(self, existing_cycle):
        with pytest.raises(HTTPException) as exc:
            await delete_cycle(TEST_CYCLE_ID, TEST_USER_2_ID)
        assert exc.value.status_code == 404
