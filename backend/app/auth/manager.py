import uuid

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, UUIDIDMixin, exceptions as fu_exceptions
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy import exc as sa_exc

from app.core.config import settings
from app.auth.db import User, get_user_db
from app.auth.email import send_reset_password_email, send_verification_email


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = settings.SECRET_KEY
    verification_token_secret = settings.SECRET_KEY

    async def create(
        self, user_create, safe: bool = False, request: Request | None = None
    ):
        try:
            return await super().create(
                user_create, safe=safe, request=request
            )
        except sa_exc.IntegrityError as e:
            if "email" in str(e).lower():
                raise fu_exceptions.UserAlreadyExists()
            raise

    async def on_after_register(self, user: User, request: Request | None = None):
        await self.request_verify(user, request)

    async def on_after_forgot_password(
        self, user: User, token: str, request: Request | None = None
    ):
        await send_reset_password_email(user.email, token)

    async def on_after_request_verify(
        self, user: User, token: str, request: Request | None = None
    ):
        await send_verification_email(user.email, token)


async def get_user_manager(user_db: SQLAlchemyUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)
