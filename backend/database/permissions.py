"""
Permission helpers for SmartHome EMS.

Usage
-----
Direct call (sync or async views):
    check_permission(current_user, UserRole.OWNER)

As a decorator for *sync* functions:
    @require_role(UserRole.ADMIN)
    def admin_endpoint(user: User, ...): ...

As a decorator for *async* functions:
    @require_role(UserRole.OWNER)
    async def owner_endpoint(user: User, ...): ...

The decorated function MUST accept `user` as its first positional argument.
"""

import functools
import inspect
from typing import Callable

from database.models import User, UserRole



_ROLE_LEVEL: dict[UserRole, int] = {
    UserRole.RESIDENT: 0,
    UserRole.OWNER: 1,
    UserRole.ADMIN: 2,
}


class PermissionDeniedError(Exception):
    """Raised when a user lacks the required role."""

    def __init__(self, user: User, required: UserRole) -> None:
        self.user = user
        self.required = required
        super().__init__(
            f"User '{user.username}' has role '{user.role.value}' "
            f"but '{required.value}' or higher is required."
        )


def check_permission(user: User, required_role: UserRole) -> None:
    """
    Validate that *user* has at least *required_role*.

    Raises
    ------
    PermissionDeniedError
        When the user's role level is below the required level.
    ValueError
        When an unrecognised role is encountered (should never happen with
        a properly constrained DB, but good to be defensive).
    """
    if user.role not in _ROLE_LEVEL:
        raise ValueError(f"Unknown role: {user.role!r}")

    if _ROLE_LEVEL[user.role] < _ROLE_LEVEL[required_role]:
        raise PermissionDeniedError(user, required_role)


def require_role(required_role: UserRole) -> Callable:
    """
    Decorator factory that enforces *required_role* on the decorated function.

    The decorated function must accept `user: User` as its **first positional
    argument**.  Works for both regular and ``async`` functions.

    Example
    -------
    >>> @require_role(UserRole.ADMIN)
    ... async def delete_house(user: User, house_id: int): ...
    """

    def decorator(func: Callable) -> Callable:
        if inspect.iscoroutinefunction(func):
            @functools.wraps(func)
            async def async_wrapper(user: User, *args, **kwargs):
                check_permission(user, required_role)
                return await func(user, *args, **kwargs)

            return async_wrapper
        else:
            @functools.wraps(func)
            def sync_wrapper(user: User, *args, **kwargs):
                check_permission(user, required_role)
                return func(user, *args, **kwargs)

            return sync_wrapper

    return decorator
