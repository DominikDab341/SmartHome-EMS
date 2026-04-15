import enum
from sqlalchemy import Integer, String, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class UserRole(enum.Enum):
    """Roles available in the SmartHome EMS system."""
    ADMIN    = "ADMIN"      # full system access
    OWNER    = "OWNER"      # owner of the house, manages devices & residents
    RESIDENT = "RESIDENT"   # regular resident, read-only / limited control


class User(Base):
    """Represents a system user tied to a single house."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="userrole", create_type=True),
        nullable=False,
        default=UserRole.RESIDENT,
    )

    # add house_id when house model is ready
    house_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
        index=True,
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username!r} role={self.role.value}>"
