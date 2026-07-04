from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi import HTTPException
from jwt.exceptions import PyJWKClientError

from app.core.security import get_current_user


class TestJWTJWKSErrorHandling:
    @patch("app.core.security._get_jwks_client")
    @patch("jwt.decode")
    async def test_jwks_unreachable_returns_401(self, mock_decode, mock_jwks):
        mock_decode.side_effect = jwt.PyJWTError("HS256 fallo")

        mock_client = MagicMock()
        mock_client.get_signing_key_from_jwt.side_effect = PyJWKClientError(
            "No se pudo conectar al JWKS"
        )
        mock_jwks.return_value = mock_client

        with pytest.raises(HTTPException) as exc:
            await get_current_user(token="fake-token")
        assert exc.value.status_code == 401
        assert exc.value.detail == "Token inv\u00e1lido o expirado"

    @patch("app.core.security._get_jwks_client")
    @patch("jwt.decode")
    async def test_jwks_invalid_key_returns_401(self, mock_decode, mock_jwks):
        mock_decode.side_effect = jwt.PyJWTError("HS256 fallo")

        mock_client = MagicMock()
        mock_client.get_signing_key_from_jwt.side_effect = jwt.PyJWKError(
            "Key not found"
        )
        mock_jwks.return_value = mock_client

        with pytest.raises(HTTPException) as exc:
            await get_current_user(token="fake-token")
        assert exc.value.status_code == 401
        assert exc.value.detail == "Token inv\u00e1lido o expirado"

    @patch("app.core.security._get_jwks_client")
    @patch("jwt.decode")
    async def test_jwks_decode_fails_returns_401(self, mock_decode, mock_jwks):
        mock_decode.side_effect = jwt.PyJWTError("HS256 fallo")

        mock_client = MagicMock()
        mock_signing_key = MagicMock()
        mock_signing_key.key = "fake-key"
        mock_client.get_signing_key_from_jwt.return_value = mock_signing_key
        mock_jwks.return_value = mock_client

        mock_decode.side_effect = [
            jwt.PyJWTError("HS256 fallo"),
            jwt.PyJWTError("ES256 fallo"),
        ]

        with pytest.raises(HTTPException) as exc:
            await get_current_user(token="fake-token")
        assert exc.value.status_code == 401
        assert exc.value.detail == "Token inv\u00e1lido o expirado"

    @patch("app.core.security._get_jwks_client")
    @patch("jwt.decode")
    async def test_no_sub_in_payload_returns_401(self, mock_decode, mock_jwks):
        mock_decode.side_effect = jwt.PyJWTError("HS256 fallo")

        mock_client = MagicMock()
        mock_signing_key = MagicMock()
        mock_signing_key.key = "fake-key"
        mock_client.get_signing_key_from_jwt.return_value = mock_signing_key
        mock_jwks.return_value = mock_client

        mock_decode.side_effect = [
            jwt.PyJWTError("HS256 fallo"),
            {"aud": "authenticated"},
        ]

        with pytest.raises(HTTPException) as exc:
            await get_current_user(token="fake-token")
        assert exc.value.status_code == 401

    @patch("app.core.security._get_jwks_client")
    @patch("jwt.decode")
    async def test_jwks_generic_exception_returns_401(self, mock_decode, mock_jwks):
        mock_decode.side_effect = jwt.PyJWTError("HS256 fallo")

        mock_client = MagicMock()
        mock_client.get_signing_key_from_jwt.side_effect = RuntimeError(
            "Unexpected error"
        )
        mock_jwks.return_value = mock_client

        with pytest.raises(HTTPException) as exc:
            await get_current_user(token="fake-token")
        assert exc.value.status_code == 401
