"""
FastAPI dependencies for SmartHome EMS.

get_current_user
----------------
Extracts and validates the JWT Bearer token from the ``Authorization`` header,
then returns the matching ``User`` ORM object.

Usage in route handlers::

    @router.get("/me")
    async def me(user: User = Depends(get_current_user)):
        ...
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import PyJWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.security import decode_access_token
from database.database import get_db
from database.models import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def _credentials_exception() -> HTTPException:
    """Return a fresh 401 HTTPException for invalid/missing credentials."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Validate the Bearer token and return the authenticated ``User``.

    Raises
    ------
    HTTPException (401)
        If the token is missing, malformed, expired, or the user no longer
        exists in the database.
    """
    try:
        payload = decode_access_token(token)
        username: str | None = payload.get("sub")
        if username is None:
            raise _credentials_exception()
    except PyJWTError:
        raise _credentials_exception()

    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if user is None:
        raise _credentials_exception()

    return user


def house_scope_id(user: User) -> int:
    """Return the owner/house id used to scope EMS data for a user."""
    return user.house_id or user.id


async def get_current_owner(
    current_user: User = Depends(get_current_user),
) -> User:
    """Return the current user only if they can manage the house."""
    if current_user.role not in {UserRole.ADMIN, UserRole.OWNER}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner permissions required",
        )
    return current_user
