"""
Quick smoke-test for UserRole enum, User model and permission helpers.
Run from the backend/ directory:
    python test_smoke.py
No database connection required.
"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(__file__))

from database.models import User, UserRole
from database.permissions import check_permission, require_role, PermissionDeniedError

PASS  = "\033[92mOK\033[0m"
FAIL  = "\033[91mFAIL\033[0m"
errors = 0


def ok(msg: str) -> None:
    print(f"  {PASS}  {msg}")


def fail(msg: str, exc: Exception) -> None:
    global errors
    errors += 1
    print(f"  {FAIL}  {msg}: {exc}")


print("\n[1] UserRole enum")
try:
    assert UserRole.ADMIN.value    == "ADMIN"
    assert UserRole.OWNER.value    == "OWNER"
    assert UserRole.RESIDENT.value == "RESIDENT"
    ok("All three roles exist with correct values")
except AssertionError as e:
    fail("Role values mismatch", e)


print("\n[2] User model")
try:
    admin = User(
        id=1, username="admin", email="admin@example.com",
        hashed_password="$2b$12$fakehash", role=UserRole.ADMIN, house_id=None,
    )
    owner = User(
        id=2, username="owner", email="owner@example.com",
        hashed_password="$2b$12$fakehash", role=UserRole.OWNER, house_id=1,
    )
    resident = User(
        id=3, username="res", email="res@example.com",
        hashed_password="$2b$12$fakehash", role=UserRole.RESIDENT, house_id=1,
    )
    ok("User objects created (ADMIN, OWNER, RESIDENT)")
    ok(f"repr OK: {repr(admin)}")
except Exception as e:
    fail("User instantiation failed", e)


print("\n[3] check_permission -- should PASS")
cases_pass = [
    (admin,    UserRole.ADMIN,    "ADMIN    >= ADMIN"),
    (admin,    UserRole.OWNER,    "ADMIN    >= OWNER"),
    (admin,    UserRole.RESIDENT, "ADMIN    >= RESIDENT"),
    (owner,    UserRole.OWNER,    "OWNER    >= OWNER"),
    (owner,    UserRole.RESIDENT, "OWNER    >= RESIDENT"),
    (resident, UserRole.RESIDENT, "RESIDENT >= RESIDENT"),
]
for user, role, label in cases_pass:
    try:
        check_permission(user, role)
        ok(label)
    except PermissionDeniedError as e:
        fail(label, e)


print("\n[4] check_permission -- should RAISE")
cases_deny = [
    (resident, UserRole.OWNER, "RESIDENT < OWNER"),
    (resident, UserRole.ADMIN, "RESIDENT < ADMIN"),
    (owner,    UserRole.ADMIN, "OWNER    < ADMIN"),
]
for user, role, label in cases_deny:
    try:
        check_permission(user, role)
        fail(label, AssertionError("No exception raised!"))
    except PermissionDeniedError:
        ok(f"{label} => PermissionDeniedError raised correctly")


print("\n[5] @require_role decorator -- sync")

@require_role(UserRole.OWNER)
def owner_only(user: User, value: int) -> str:
    return f"ok:{value}"

try:
    result = owner_only(owner, 42)
    assert result == "ok:42"
    ok("OWNER can call owner_only()")
except Exception as e:
    fail("Unexpected error", e)

try:
    owner_only(resident, 42)
    fail("RESIDENT should be denied", AssertionError("No exception raised!"))
except PermissionDeniedError:
    ok("RESIDENT blocked from owner_only()")


print("\n[6] @require_role decorator -- async")

@require_role(UserRole.ADMIN)
async def admin_only(user: User) -> str:
    return "secret"

try:
    result = asyncio.run(admin_only(admin))
    assert result == "secret"
    ok("ADMIN can call admin_only()")
except Exception as e:
    fail("Unexpected error", e)

try:
    asyncio.run(admin_only(owner))
    fail("OWNER should be denied", AssertionError("No exception raised!"))
except PermissionDeniedError:
    ok("OWNER blocked from admin_only()")


print()
if errors == 0:
    print("\033[92mAll checks passed!\033[0m\n")
else:
    print(f"\033[91m{errors} check(s) FAILED\033[0m\n")
    sys.exit(1)
