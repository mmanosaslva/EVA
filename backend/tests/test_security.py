import uuid
from unittest.mock import MagicMock

from app.core.security import get_current_user


class TestGetCurrentUser:
    async def test_returns_user_id_and_email(self):
        user = MagicMock()
        user.id = uuid.UUID("550e8400-e29b-41d4-a716-446655440000")
        user.email = "test@example.com"

        result = await get_current_user(current_user=user)
        assert result == {
            "user_id": "550e8400-e29b-41d4-a716-446655440000",
            "email": "test@example.com",
        }

    async def test_returns_correct_user_id_format(self):
        user = MagicMock()
        user.id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        user.email = "another@example.com"

        result = await get_current_user(current_user=user)
        assert result["user_id"] == "00000000-0000-0000-0000-000000000001"
        assert result["email"] == "another@example.com"
