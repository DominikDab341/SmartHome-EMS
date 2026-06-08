from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import get_current_owner, get_current_user, house_scope_id
from api.schemas import ResidentCreateRequest, UserPublic
from api.security import hash_password
from database.database import get_db
from database.models import User, UserRole

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserPublic, summary="Get the currently authenticated user")
async def get_me(current_user: User = Depends(get_current_user)) -> UserPublic:
    """
    Return the profile of the currently logged-in user.

    Requires a valid ``Authorization: Bearer <token>`` header.
    Returns **HTTP 401** if the token is missing or invalid.
    """
    return UserPublic.model_validate(current_user)


@router.get(
    "/residents",
    response_model=list[UserPublic],
    summary="List resident accounts assigned to the owner's house",
)
async def list_residents(
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner),
) -> list[UserPublic]:
    house_id = house_scope_id(current_owner)
    residents = list(
        (
            await db.execute(
                select(User)
                .where(User.house_id == house_id, User.role == UserRole.RESIDENT)
                .order_by(User.username)
            )
        )
        .scalars()
        .all()
    )
    return [UserPublic.model_validate(user) for user in residents]


@router.post(
    "/residents",
    response_model=UserPublic,
    status_code=status.HTTP_201_CREATED,
    summary="Create a resident account for the owner's house",
)
async def create_resident(
    body: ResidentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner),
) -> UserPublic:
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

    house_id = house_scope_id(current_owner)
    if current_owner.house_id is None:
        current_owner.house_id = house_id

    resident = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=UserRole.RESIDENT,
        house_id=house_id,
    )
    db.add(resident)
    await db.commit()
    await db.refresh(resident)
    return UserPublic.model_validate(resident)


@router.delete(
    "/residents/{resident_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a resident account from the owner's house",
)
async def delete_resident(
    resident_id: int,
    db: AsyncSession = Depends(get_db),
    current_owner: User = Depends(get_current_owner),
) -> None:
    resident = await db.scalar(
        select(User).where(
            User.id == resident_id,
            User.house_id == house_scope_id(current_owner),
            User.role == UserRole.RESIDENT,
        )
    )
    if resident is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resident not found",
        )

    await db.delete(resident)
    await db.commit()
