from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings


def _rate_limit_key(request: Request) -> str:
    try:
        auth = request.headers.get("authorization", "")
        if auth.startswith("Bearer "):
            import jwt
            payload = jwt.decode(
                auth.split(" ")[1],
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_signature": False, "verify_exp": False},
            )
            return f"user:{payload.get('sub', 'unknown')}"
    except Exception:
        pass
    return f"ip:{get_remote_address(request)}"


limiter = Limiter(key_func=_rate_limit_key)
