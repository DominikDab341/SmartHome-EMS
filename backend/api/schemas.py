"""
Pydantic schemas for the auth / user API layer.
"""

from pydantic import BaseModel

from database.models import UserRole


class TokenResponse(BaseModel):
    """Response body returned on successful login."""
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    """Public representation of a user (no password fields)."""
    id: int
    username: str
    email: str
    role: UserRole

    model_config = {"from_attributes": True}
