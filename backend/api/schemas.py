"""
Pydantic schemas for the auth / user API layer.
"""

from pydantic import BaseModel, EmailStr, Field

from database.models import UserRole


class TokenResponse(BaseModel):
    """Response body returned on successful login."""
    access_token: str
    token_type: str = "bearer"


class RegisterRequest(BaseModel):
    """Request body for POST /api/auth/register."""
    username: str = Field(min_length=3, max_length=64)
    email: EmailStr
    password: str = Field(min_length=8, description="At least 8 characters")


class UserPublic(BaseModel):
    """Public representation of a user (no password fields)."""
    id: int
    username: str
    email: str
    role: UserRole

    model_config = {"from_attributes": True}
