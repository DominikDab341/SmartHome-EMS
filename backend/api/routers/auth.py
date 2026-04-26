"""
Authentication router – POST /api/auth/login, POST /api/auth/register
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.schemas import RegisterRequest, TokenResponse, UserPublic
from api.security import create_access_token, hash_password, verify_password
from database.database import get_db
from database.models import User, UserRole

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


@router.post(
    "/register",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(
    body: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> UserPublic:
    """
    Create a new user account with the **RESIDENT** role.

    - Returns the created user profile on success.
    - Returns **HTTP 409** if the username or email is already taken.
    """
    result = await db.execute(select(User).where(User.username == body.username))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=UserRole.RESIDENT,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return UserPublic.model_validate(user)
