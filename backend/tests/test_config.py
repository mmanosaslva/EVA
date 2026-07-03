from pathlib import Path
from unittest.mock import patch

import pytest


class TestCorsOriginsList:
    def test_single_origin(self):
        with patch.dict("os.environ", {"CORS_ORIGINS": "http://localhost:5173"}):
            from app.core.config import Settings
            s = Settings()
            assert s.cors_origins_list == ["http://localhost:5173"]

    def test_multiple_origins(self):
        with patch.dict("os.environ", {
            "CORS_ORIGINS": "http://localhost:5173,https://eva.vercel.app"
        }):
            from app.core.config import Settings
            s = Settings()
            assert s.cors_origins_list == [
                "http://localhost:5173",
                "https://eva.vercel.app",
            ]

    def test_multiple_origins_with_extra_spaces(self):
        with patch.dict("os.environ", {
            "CORS_ORIGINS": "  http://localhost:5173 ,  https://eva.vercel.app  "
        }):
            from app.core.config import Settings
            s = Settings()
            assert s.cors_origins_list == [
                "http://localhost:5173",
                "https://eva.vercel.app",
            ]

    def test_empty_string_returns_empty_list(self):
        with patch.dict("os.environ", {"CORS_ORIGINS": ""}):
            from app.core.config import Settings
            s = Settings()
            assert s.cors_origins_list == []

    def test_trailing_comma_handled(self):
        with patch.dict("os.environ", {
            "CORS_ORIGINS": "http://localhost:5173,"
        }):
            from app.core.config import Settings
            s = Settings()
            assert s.cors_origins_list == ["http://localhost:5173"]

    def test_default_value(self):
        from app.core.config import Settings
        s = Settings()
        assert s.cors_origins_list == ["http://localhost:5173"]


class TestCORSNotWildcard:
    def test_no_wildcard_in_default(self):
        from app.core.config import settings
        assert "*" not in settings.cors_origins_list

    def test_main_app_no_wildcard_in_cors_config(self):
        main_py = Path(__file__).resolve().parent.parent / "app" / "main.py"
        source = main_py.read_text()
        assert 'allow_origins=["*"]' not in source
        assert 'allow_origins = ["*"]' not in source


_MAIN_PY = Path(__file__).resolve().parent.parent / "app" / "main.py"

_SENSITIVE_ENDPOINTS = ("/daily-logs", "/cycles", "/insights")


def _scrub_sentry_event(event: dict) -> dict:
    if "request" in event and "headers" in event["request"]:
        headers = event["request"]["headers"]
        if "authorization" in headers:
            headers["authorization"] = "[FILTERED]"
        if "cookie" in headers:
            headers["cookie"] = "[FILTERED]"
        url = event["request"].get("url", "")
        if any(ep in url for ep in _SENSITIVE_ENDPOINTS):
            event["request"].pop("data", None)
            event["request"].pop("json", None)
    if "extra" in event:
        for key in ("email", "user_id", "token", "password", "birth_date"):
            event["extra"].pop(key, None)
    if "user" in event:
        event["user"] = {"ip_address": "[FILTERED]"}
    return event


class TestSentryConfig:
    def test_send_default_pii_is_false(self):
        source = _MAIN_PY.read_text()
        assert "send_default_pii=False" in source

    def test_sentry_not_initialized_when_dsn_empty(self):
        source = _MAIN_PY.read_text()
        assert 'if settings.SENTRY_DSN:' in source

    def test_scrub_strips_authorization_header(self):
        scrub = _scrub_sentry_event
        event = {
            "request": {
                "headers": {"authorization": "Bearer secret-token", "content-type": "application/json"},
                "url": "http://localhost:8000/cycles",
            }
        }
        result = scrub(event)
        assert result["request"]["headers"]["authorization"] == "[FILTERED]"
        assert result["request"]["headers"]["content-type"] == "application/json"

    def test_scrub_strips_cookie_header(self):
        scrub = _scrub_sentry_event
        event = {
            "request": {
                "headers": {"cookie": "session=abc123"},
                "url": "http://localhost:8000/health",
            }
        }
        result = scrub(event)
        assert result["request"]["headers"]["cookie"] == "[FILTERED]"

    def test_scrub_strips_request_data_on_daily_logs(self):
        scrub = _scrub_sentry_event
        event = {
            "request": {
                "headers": {},
                "url": "http://localhost:8000/daily-logs",
                "data": {"symptoms": ["fatiga", "dolor"], "notes": "me siento mal"},
            }
        }
        result = scrub(event)
        assert "data" not in result["request"]

    def test_scrub_strips_request_data_on_cycles(self):
        scrub = _scrub_sentry_event
        event = {
            "request": {
                "headers": {},
                "url": "http://localhost:8000/cycles/abc",
                "data": {"start_date": "2025-01-01"},
            }
        }
        result = scrub(event)
        assert "data" not in result["request"]

    def test_scrub_strips_request_data_on_insights(self):
        scrub = _scrub_sentry_event
        event = {
            "request": {
                "headers": {},
                "url": "http://localhost:8000/insights",
                "json": {"question": "por que tengo dolor?"},
            }
        }
        result = scrub(event)
        assert "json" not in result["request"]

    def test_scrub_keeps_data_on_non_sensitive_endpoints(self):
        scrub = _scrub_sentry_event
        event = {
            "request": {
                "headers": {},
                "url": "http://localhost:8000/health",
                "data": {"status": "ok"},
            }
        }
        result = scrub(event)
        assert result["request"]["data"] == {"status": "ok"}

    def test_scrub_strips_extra_pii_fields(self):
        scrub = _scrub_sentry_event
        event = {
            "extra": {"email": "test@example.com", "user_id": "123", "token": "abc", "foo": "bar"},
        }
        result = scrub(event)
        assert "email" not in result["extra"]
        assert "user_id" not in result["extra"]
        assert "token" not in result["extra"]
        assert result["extra"]["foo"] == "bar"

    def test_scrub_filters_user_ip(self):
        scrub = _scrub_sentry_event
        event = {"user": {"id": "123", "ip_address": "192.168.1.1"}}
        result = scrub(event)
        assert result["user"]["ip_address"] == "[FILTERED]"

    def test_sensitive_endpoints_defined(self):
        source = _MAIN_PY.read_text()
        assert "/daily-logs" in source
        assert "/cycles" in source
        assert "/insights" in source
