"""
Auth router — all public and session endpoints.

Endpoints:
  POST /auth/signup             — register as EMPLOYEE
  POST /auth/login              — email + password → tokens
  POST /auth/refresh            — rotate access + refresh tokens
  POST /auth/logout             — invalidate refresh token
  POST /auth/forgot-password    — send reset email
  POST /auth/reset-password     — consume reset token, set new password
  GET  /auth/me                 — return current user profile
"""
from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    AccessTokenResponse,
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    ResetPasswordRequest,
    SignupRequest,
    UserResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new employee account",
)
def signup(
    payload: SignupRequest,
    db: Annotated[Session, Depends(get_db)],
) -> AuthResponse:
    """
    Creates an EMPLOYEE-role account.
    Role selection is intentionally absent — admins promote users later.
    Returns JWT tokens immediately so the user is logged in after signup.
    """
    return auth_service.signup(db, payload)


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Login with email and password",
)
def login(
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
) -> AuthResponse:
    """
    Validates credentials and returns a short-lived access token and
    a long-lived refresh token. Old refresh tokens are invalidated.
    """
    return auth_service.login(db, payload)


@router.post(
    "/refresh",
    response_model=AccessTokenResponse,
    summary="Rotate tokens using a valid refresh token",
)
def refresh(
    payload: RefreshRequest,
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    """
    Issues a new access token (and rotates the refresh token).
    Implements refresh token rotation — reusing an old refresh token
    immediately invalidates the entire session.
    """
    return auth_service.refresh_access_token(db, payload.refresh_token)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Invalidate the current session",
)
def logout(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    """
    Clears the stored refresh token, preventing further token rotation.
    The client should discard both tokens.
    """
    auth_service.logout(db, current_user)
    return MessageResponse(message="Logged out successfully.")


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request a password reset email",
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    """
    Always returns 200 to prevent user enumeration.
    Sends a reset link only if the account exists and is active.
    """
    await auth_service.forgot_password(db, payload.email)
    return MessageResponse(
        message="If an account with that email exists, a reset link has been sent."
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password using a valid reset token",
)
def reset_password(
    payload: ResetPasswordRequest,
    db: Annotated[Session, Depends(get_db)],
) -> MessageResponse:
    """
    Validates the one-time reset token (from the email link) and updates
    the user's password. Invalidates all existing sessions on success.
    """
    auth_service.reset_password(db, payload.token, payload.new_password)
    return MessageResponse(message="Password reset successfully. Please log in.")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the currently authenticated user's profile",
)
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Returns the full profile of the currently authenticated user."""
    return current_user
