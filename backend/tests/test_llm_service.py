import json

import httpx
import pytest

from app.services import llm_service
from app.services.llm_service import SYSTEM_PROMPT, ProviderError, build_context_prompt, generate

PROMPT = "Contexto del ciclo actual: fase lutea. Pregunta: ¿por que estoy cansada?"


@pytest.fixture(autouse=True)
def llm_settings(monkeypatch):
    """Los dos proveedores configurados con credenciales falsas; nunca hay red real (RX-10)."""
    s = llm_service.settings
    monkeypatch.setattr(s, "LLM_PROVIDERS", "groq,cloudflare")
    monkeypatch.setattr(s, "GROQ_API_KEY", "test-groq-key")
    monkeypatch.setattr(s, "GROQ_MODEL", "openai/gpt-oss-20b")
    monkeypatch.setattr(s, "CLOUDFLARE_ACCOUNT_ID", "test-account")
    monkeypatch.setattr(s, "CLOUDFLARE_API_TOKEN", "test-cf-token")
    monkeypatch.setattr(s, "CLOUDFLARE_AI_MODEL", "@cf/openai/gpt-oss-20b")
    monkeypatch.setattr(s, "LLM_PROVIDER_COOLDOWN_SECONDS", 300)
    llm_service._cooldown_until.clear()
    yield s
    llm_service._cooldown_until.clear()


def _mock_http(monkeypatch, handler):
    """Hace que httpx.AsyncClient use un transporte falso con `handler(request)`."""
    calls: list[httpx.Request] = []
    real_client = httpx.AsyncClient

    def recording(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        return handler(request)

    def factory(*args, **kwargs):
        kwargs["transport"] = httpx.MockTransport(recording)
        return real_client(*args, **kwargs)

    monkeypatch.setattr(llm_service.httpx, "AsyncClient", factory)
    return calls


def _openai_ok(text: str) -> httpx.Response:
    return httpx.Response(200, json={"choices": [{"message": {"role": "assistant", "content": text}}]})


def _is_groq(request: httpx.Request) -> bool:
    return request.url.host == "api.groq.com"


class TestBuildContextPrompt:
    def test_includes_question_and_context(self):
        ctx = {
            "fase_actual": "lutea",
            "dia_del_ciclo": 22,
            "duracion_promedio": 28,
            "sintomas_frecuentes": ["fatiga", "irritabilidad"],
            "intensidad_actual": "3.5",
            "dias_hasta_siguiente": 5,
        }
        prompt = build_context_prompt(ctx, "¿Por qué estoy tan cansada?")
        assert "¿Por qué estoy tan cansada?" in prompt
        assert "lutea" in prompt
        assert "fatiga" in prompt
        assert "irritabilidad" in prompt

    def test_empty_symptoms_still_works(self):
        ctx = {
            "fase_actual": None,
            "dia_del_ciclo": None,
            "duracion_promedio": 28,
            "sintomas_frecuentes": [],
            "intensidad_actual": None,
            "dias_hasta_siguiente": None,
        }
        prompt = build_context_prompt(ctx, "Hola")
        assert "ninguno registrado" in prompt


class TestSystemPromptInSpanish:
    """Criterio #43-4: Respuestas en español verificadas con 5 preguntas de prueba."""

    def test_system_prompt_contains_spanish(self):
        assert "espanol" in SYSTEM_PROMPT or "español" in SYSTEM_PROMPT
        assert "EVA" in SYSTEM_PROMPT
        assert "medico" in SYSTEM_PROMPT or "médico" in SYSTEM_PROMPT

    def test_system_prompt_has_disclaimer(self):
        assert "reemplaza" in SYSTEM_PROMPT

    def test_system_prompt_max_four_sentences(self):
        assert "4 oraciones" in SYSTEM_PROMPT or "maximo" in SYSTEM_PROMPT

    @pytest.mark.parametrize("question", [
        "¿Por qué tengo dolor abdominal antes de mi periodo?",
        "¿Es normal tener ciclos de 35 días?",
        "¿Qué significa tener flujo marrón al final de la regla?",
        "¿Cómo puedo aliviar los cólicos menstruales?",
        "¿Cuánto dura la ventana fértil?",
    ])
    def test_five_spanish_questions_generate_valid_prompt(self, question):
        ctx = {
            "fase_actual": "lutea",
            "dia_del_ciclo": 22,
            "duracion_promedio": 28,
            "sintomas_frecuentes": ["fatiga", "irritabilidad", "dolor abdominal"],
            "intensidad_actual": "3.5",
            "dias_hasta_siguiente": 5,
        }
        prompt = build_context_prompt(ctx, question)
        assert question in prompt
        assert "lutea" in prompt
        assert "fatiga" in prompt
        assert "dolor abdominal" in prompt

    @pytest.mark.parametrize("question", [
        "¿Por qué tengo dolor abdominal antes de mi periodo?",
        "¿Es normal tener ciclos de 35 días?",
        "¿Qué significa tener flujo marrón al final de la regla?",
        "¿Cómo puedo aliviar los cólicos menstruales?",
        "¿Cuánto dura la ventana fértil?",
    ])
    def test_question_preserved_in_context(self, question):
        ctx = {
            "fase_actual": "folicular",
            "dia_del_ciclo": 8,
            "duracion_promedio": 28,
            "sintomas_frecuentes": [],
            "intensidad_actual": None,
            "dias_hasta_siguiente": 18,
        }
        prompt = build_context_prompt(ctx, question)
        assert question in prompt
        assert "folicular" in prompt


class TestGenerateFailover:
    async def test_groq_ok_does_not_call_cloudflare(self, monkeypatch):
        calls = _mock_http(monkeypatch, lambda r: _openai_ok("respuesta groq"))
        result = await generate(PROMPT)
        assert result.text == "respuesta groq"
        assert result.provider == "groq"
        assert len(calls) == 1 and _is_groq(calls[0])

    @pytest.mark.parametrize("status", [429, 500, 503, 400, 404])
    async def test_groq_error_falls_back_to_cloudflare(self, monkeypatch, status):
        def handler(r):
            if _is_groq(r):
                return httpx.Response(status, json={"error": {"code": "model_decommissioned"}})
            return _openai_ok("respuesta cloudflare")

        calls = _mock_http(monkeypatch, handler)
        result = await generate(PROMPT)
        assert result.provider == "cloudflare"
        assert result.text == "respuesta cloudflare"
        assert [c.url.host for c in calls] == ["api.groq.com", "api.cloudflare.com"]

    async def test_groq_timeout_falls_back_to_cloudflare(self, monkeypatch):
        def handler(r):
            if _is_groq(r):
                raise httpx.ReadTimeout("timeout", request=r)
            return _openai_ok("respuesta cloudflare")

        _mock_http(monkeypatch, handler)
        result = await generate(PROMPT)
        assert result.provider == "cloudflare"

    async def test_groq_empty_content_falls_back(self, monkeypatch):
        def handler(r):
            if _is_groq(r):
                return httpx.Response(200, json={"choices": [{"message": {"content": ""}}]})
            return _openai_ok("respuesta cloudflare")

        _mock_http(monkeypatch, handler)
        assert (await generate(PROMPT)).provider == "cloudflare"

    async def test_groq_in_cooldown_is_skipped(self, monkeypatch):
        def handler(r):
            if _is_groq(r):
                return httpx.Response(429, headers={"retry-after": "60"})
            return _openai_ok("respuesta cloudflare")

        calls = _mock_http(monkeypatch, handler)
        await generate(PROMPT)
        calls.clear()
        result = await generate(PROMPT)
        assert result.provider == "cloudflare"
        assert [c.url.host for c in calls] == ["api.cloudflare.com"]

    async def test_cooldown_uses_retry_after(self, monkeypatch):
        monkeypatch.setattr(llm_service.time, "monotonic", lambda: 1000.0)
        _mock_http(monkeypatch, lambda r: httpx.Response(429, headers={"retry-after": "60"}) if _is_groq(r) else _openai_ok("ok"))
        await generate(PROMPT)
        assert llm_service._cooldown_until["groq"] == 1060.0

    async def test_without_groq_key_uses_cloudflare(self, monkeypatch, llm_settings):
        monkeypatch.setattr(llm_settings, "GROQ_API_KEY", "")
        calls = _mock_http(monkeypatch, lambda r: _openai_ok("respuesta cloudflare"))
        result = await generate(PROMPT)
        assert result.provider == "cloudflare"
        assert all(not _is_groq(c) for c in calls)

    async def test_without_cloudflare_credentials_only_groq(self, monkeypatch, llm_settings):
        monkeypatch.setattr(llm_settings, "CLOUDFLARE_API_TOKEN", "")
        calls = _mock_http(monkeypatch, lambda r: httpx.Response(503))
        assert await generate(PROMPT) is None
        assert [c.url.host for c in calls] == ["api.groq.com"]

    async def test_both_fail_returns_none(self, monkeypatch):
        _mock_http(monkeypatch, lambda r: httpx.Response(503))
        assert await generate(PROMPT) is None

    async def test_provider_order_follows_setting(self, monkeypatch, llm_settings):
        monkeypatch.setattr(llm_settings, "LLM_PROVIDERS", "cloudflare,groq")
        calls = _mock_http(monkeypatch, lambda r: _openai_ok("ok"))
        result = await generate(PROMPT)
        assert result.provider == "cloudflare"
        assert len(calls) == 1

    async def test_cloudflare_native_format_is_accepted(self, monkeypatch, llm_settings):
        monkeypatch.setattr(llm_settings, "LLM_PROVIDERS", "cloudflare")
        _mock_http(monkeypatch, lambda r: httpx.Response(200, json={"result": {"response": "nativo"}, "success": True}))
        assert (await generate(PROMPT)).text == "nativo"


class TestRequests:
    async def test_same_prompt_sent_to_both_providers(self, monkeypatch):
        def handler(r):
            return httpx.Response(503) if _is_groq(r) else _openai_ok("ok")

        calls = _mock_http(monkeypatch, handler)
        await generate(PROMPT)
        bodies = [json.loads(c.content) for c in calls]
        assert bodies[0]["messages"] == bodies[1]["messages"]
        assert bodies[0]["messages"][0] == {"role": "system", "content": SYSTEM_PROMPT}
        assert bodies[0]["messages"][1]["content"] == PROMPT

    async def test_request_details(self, monkeypatch):
        def handler(r):
            return httpx.Response(503) if _is_groq(r) else _openai_ok("ok")

        calls = _mock_http(monkeypatch, handler)
        await generate(PROMPT)
        groq, cf = calls
        assert groq.headers["authorization"] == "Bearer test-groq-key"
        groq_body = json.loads(groq.content)
        assert groq_body["model"] == "openai/gpt-oss-20b"
        assert groq_body["reasoning_effort"] == "low"
        assert groq_body["include_reasoning"] is False
        assert str(cf.url) == "https://api.cloudflare.com/client/v4/accounts/test-account/ai/v1/chat/completions"
        assert cf.headers["authorization"] == "Bearer test-cf-token"
        assert json.loads(cf.content)["model"] == "@cf/openai/gpt-oss-20b"

    async def test_unknown_provider_is_ignored(self, monkeypatch, llm_settings):
        monkeypatch.setattr(llm_settings, "LLM_PROVIDERS", "desconocido,groq")
        calls = _mock_http(monkeypatch, lambda r: _openai_ok("ok"))
        result = await generate(PROMPT)
        assert result.provider == "groq"
        assert len(calls) == 1

    async def test_failure_log_has_no_prompt(self, monkeypatch, caplog):
        _mock_http(monkeypatch, lambda r: httpx.Response(503))
        with caplog.at_level("WARNING"):
            await generate(PROMPT)
        assert caplog.records
        assert all(PROMPT not in rec.getMessage() and "cansada" not in rec.getMessage() for rec in caplog.records)

    def test_provider_error_defaults(self):
        err = ProviderError("timeout")
        assert err.cooldown is False and err.retry_after is None
