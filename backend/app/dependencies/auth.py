"""
FastAPI dependencies for authentication and RBAC.

Usage in routes:
    current_user: User = Depends(get_current_user)
    admin_user:   User = Depends(require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN))
"""
import uuid
from collections.abc import Callable
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import CredentialsException, ForbiddenException
from app.core.security import decode_token
from app.models.enums import UserRole
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """
    Extract and validate the Bearer JWT from the Authorization header.
    Returns the authenticated User ORM object.
    Raises HTTP 401 on any failure.
    """
    if credentials is None:
        raise CredentialsException("Authorization header missing.")

    token = credentials.credentials

    try:
        payload = decode_token(token)
    except JWTError:
        raise CredentialsException("Token is invalid or has expired.")

    if payload.get("type") != "access":
        raise CredentialsException("Invalid token type.")

    user_id_str: str | None = payload.get("sub")
    if not user_id_str:
        raise CredentialsException("Token subject missing.")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise CredentialsException("Token subject is malformed.")

    user: User | None = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise CredentialsException("User no longer exists.")

    if not user.is_active:
        raise CredentialsException("This account has been deactivated.")

    return user


def require_roles(*roles: UserRole) -> Callable[..., User]:
    """
    Factory that returns a dependency enforcing at least one of the given roles.

    Example:
        Depends(require_roles(UserRole.ADMIN, UserRole.SUPER_ADMIN))
    """
    def _checker(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if current_user.role not in roles:
            raise ForbiddenException(
                f"Required role(s): {', '.join(r.value for r in roles)}. "
                f"Your role: {current_user.role.value}."
            )
        return current_user

    return _checker


# ── Convenience aliases ────────────────────────────────────────────────────────

def require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Shorthand: ADMIN or SUPER_ADMIN."""
    if current_user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise ForbiddenException("Admin access required.")
    return current_user


def require_super_admin(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Shorthand: SUPER_ADMIN only."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise ForbiddenException("Super-admin access required.")
    return current_user
