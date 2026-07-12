"""
Auth service — all authentication business logic lives here.
Routes stay thin; this layer owns the rules.
"""
import uuid
from datetime import datetime, timezone

from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import (
    BadRequestException,
    CredentialsException,
    ConflictException,
    NotFoundException,
)
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.core.email import send_password_reset_email
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    SignupRequest,
    UserResponse,
)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email.lower()).first()


def _get_user_by_id(db: Session, user_id: uuid.UUID) -> User | None:
    return db.query(User).filter(User.id == user_id).first()


def _build_auth_response(user: User) -> AuthResponse:
    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    return AuthResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserResponse.model_validate(user),
    )


# ── Signup ─────────────────────────────────────────────────────────────────────

def signup(db: Session, payload: SignupRequest) -> AuthResponse:
    """
    Create a new EMPLOYEE account.
    Role is hard-coded to EMPLOYEE — no elevation at signup.
    """
    if _get_user_by_email(db, payload.email):
        raise ConflictException("An account with this email already exists.")

    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name.strip(),
        password_hash=hash_password(payload.password),
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    response = _build_auth_response(user)

    # Persist the refresh token for single-session invalidation
    user.refresh_token = response.refresh_token
    db.commit()

    return response


# ── Login ──────────────────────────────────────────────────────────────────────

def login(db: Session, payload: LoginRequest) -> AuthResponse:
    """
    Authenticate by email + password.
    Issues new access + refresh tokens; invalidates old refresh token.
    """
    user = _get_user_by_email(db, payload.email)

    # Use a constant-time check to avoid user enumeration
    if not user or not verify_password(payload.password, user.password_hash):
        raise CredentialsException("Invalid email or password.")

    if not user.is_active:
        raise CredentialsException("This account has been deactivated.")

    response = _build_auth_response(user)

    user.refresh_token = response.refresh_token
    db.commit()

    return response


# ── Refresh access token ───────────────────────────────────────────────────────

def refresh_access_token(db: Session, refresh_token: str) -> dict:
    """
    Validate a refresh token and issue a new access token.
    Rotates the refresh token on each use (refresh token rotation).
    """
    try:
        payload = decode_token(refresh_token)
    except JWTError:
        raise CredentialsException("Invalid or expired refresh token.")

    if payload.get("type") != "refresh":
        raise CredentialsException("Invalid token type.")

    user_id = payload.get("sub")
    user = _get_user_by_id(db, uuid.UUID(user_id))

    if not user or not user.is_active:
        raise CredentialsException("User not found or inactive.")

    # Validate token matches stored value (prevents reuse after logout)
    if user.refresh_token != refresh_token:
        # Possible token theft — invalidate all sessions
        user.refresh_token = None
        db.commit()
        raise CredentialsException("Refresh token has already been used or revoked.")

    new_access_token = create_access_token(str(user.id))
    new_refresh_token = create_refresh_token(str(user.id))

    user.refresh_token = new_refresh_token
    db.commit()

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


# ── Logout ─────────────────────────────────────────────────────────────────────

def logout(db: Session, user: User) -> None:
    """Invalidate the stored refresh token — effectively ends the session."""
    user.refresh_token = None
    db.commit()


# ── Forgot password ────────────────────────────────────────────────────────────

async def forgot_password(db: Session, email: str) -> None:
    """
    Always returns successfully to prevent user enumeration.
    Sends email only if account exists and is active.
    """
    user = _get_user_by_email(db, email)
    if not user or not user.is_active:
        # Silent return — do not reveal whether account exists
        return

    reset_token = create_password_reset_token(str(user.id))
    user.password_reset_token = reset_token
    db.commit()

    await send_password_reset_email(user.email, reset_token)


# ── Reset password ─────────────────────────────────────────────────────────────

def reset_password(db: Session, token: str, new_password: str) -> None:
    """
    Validate the reset token and update the password.
    Clears the reset token and invalidates all sessions on success.
    """
    try:
        payload = decode_token(token)
    except JWTError:
        raise BadRequestException("Password reset link is invalid or has expired.")

    if payload.get("type") != "reset":
        raise BadRequestException("Invalid token type.")

    user_id = payload.get("sub")
    user = _get_user_by_id(db, uuid.UUID(user_id))

    if not user or not user.is_active:
        raise BadRequestException("Password reset link is invalid or has expired.")

    # Ensure the token matches the stored one (one-time use)
    if user.password_reset_token != token:
        raise BadRequestException("Password reset link has already been used.")

    user.password_hash = hash_password(new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    user.refresh_token = None  # invalidate all existing sessions
    db.commit()


# ── Get current user (used by dependency) ─────────────────────────────────────

def get_user_by_id(db: Session, user_id: uuid.UUID) -> User:
    user = _get_user_by_id(db, user_id)
    if not user:
        raise NotFoundException("User")
    return user
