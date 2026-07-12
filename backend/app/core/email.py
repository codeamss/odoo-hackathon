"""
Email sending utility using fastapi-mail.
Falls back gracefully in development (prints token to stdout).
"""
import logging
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_password_reset_email(email: str, reset_token: str) -> None:
    """
    Send a password reset link to the user.
    In development (MAIL_USERNAME not set) the link is logged instead.
    """
    reset_url = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

    if not settings.MAIL_USERNAME:
        # Dev fallback — avoids crashing if SMTP is not configured
        logger.warning(
            "[DEV] Password reset link for %s: %s", email, reset_url
        )
        return

    # Production path — requires fastapi-mail to be configured
    try:
        from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

        conf = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_STARTTLS=settings.MAIL_STARTTLS,
            MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
        )

        html_body = f"""
        <h2>AssetFlow — Password Reset</h2>
        <p>You requested a password reset. Click the link below to set a new password.</p>
        <p>This link expires in {settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES} minutes.</p>
        <a href="{reset_url}" style="
            display:inline-block;padding:12px 24px;
            background:#2563eb;color:#fff;border-radius:6px;
            text-decoration:none;font-weight:bold;">
          Reset My Password
        </a>
        <p>If you did not request this, you can safely ignore this email.</p>
        """

        message = MessageSchema(
            subject="AssetFlow — Password Reset Request",
            recipients=[email],
            body=html_body,
            subtype=MessageType.html,
        )

        fm = FastMail(conf)
        await fm.send_message(message)

    except Exception as exc:
        logger.error("Failed to send password reset email to %s: %s", email, exc)
        raise
