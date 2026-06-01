from fastapi import APIRouter, Depends

from api.dependencies import get_current_user
from api.schemas import UserPublic
from database.models import User

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserPublic, summary="Get the currently authenticated user")
async def get_me(current_user: User = Depends(get_current_user)) -> UserPublic:
    """
    Return the profile of the currently logged-in user.

    Requires a valid ``Authorization: Bearer <token>`` header.
    Returns **HTTP 401** if the token is missing or invalid.
    """
    return UserPublic.model_validate(current_user)
