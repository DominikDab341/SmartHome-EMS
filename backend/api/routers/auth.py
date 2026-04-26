"""
Authentication router – POST /api/auth/login
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.schemas import TokenResponse
from api.security import create_access_token, hash_password, verify_password
from database.database import get_db
from database.models import User

router = APIRouter(prefix="/api/auth", tags=["auth"])


# Lazy-initialized dummy hash used when the requested user does not exist.
# Ensures bcrypt always runs, preventing timing-based username enumeration.
# Initialized on first use (not at import time) to avoid blocking module load.
_DUMMY_HASH: str | None = None


def _get_dummy_hash() -> str:
    """Return (and cache) a bcrypt hash used for constant-time rejection."""
    global _DUMMY_HASH
    if _DUMMY_HASH is None:
        _DUMMY_HASH = hash_password("dummy-timing-protection-value")
    return _DUMMY_HASH


@router.post("/login", response_model=TokenResponse, summary="Login and obtain a JWT token")
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate with **username** + **password**.

    - Returns a JWT ``access_token`` on success.
    - Returns **HTTP 401** if credentials are invalid.
    """
    result = await db.execute(select(User).where(User.username == form_data.username))
    user: User | None = result.scalar_one_or_none()

    # Always run bcrypt – prevents timing-based username enumeration.
    hashed = user.hashed_password if user is not None else _get_dummy_hash()
    password_ok = verify_password(form_data.password, hashed)

    if user is None or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username})
    return TokenResponse(access_token=access_token)
