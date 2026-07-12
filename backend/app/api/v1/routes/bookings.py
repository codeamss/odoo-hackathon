"""Bookings router."""
import uuid
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.booking import (
    BookingCreate, BookingListResponse, BookingResponse,
    BookingUpdate, CalendarSlot,
)
from app.services import booking_service

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.get("", response_model=BookingListResponse)
def list_bookings(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    asset_id: Optional[uuid.UUID] = Query(default=None),
    status: Optional[str] = Query(default=None),
    my_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> BookingListResponse:
    return booking_service.list_bookings(db, current_user, asset_id, status, my_only, limit, offset)


@router.get("/calendar/{asset_id}", response_model=list[CalendarSlot])
def get_calendar(
    asset_id: uuid.UUID,
    _: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> list[CalendarSlot]:
    return booking_service.get_calendar(db, asset_id)


@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: BookingCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> BookingResponse:
    return booking_service.create_booking(db, payload, current_user)


@router.patch("/{booking_id}", response_model=BookingResponse)
def update_booking(
    booking_id: uuid.UUID,
    payload: BookingUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> BookingResponse:
    return booking_service.update_booking(db, booking_id, payload, current_user)


@router.post("/{booking_id}/cancel", response_model=BookingResponse)
def cancel_booking(
    booking_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> BookingResponse:
    return booking_service.cancel_booking(db, booking_id, current_user)
