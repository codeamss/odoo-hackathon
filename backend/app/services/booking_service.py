"""Booking service — overlap validation, CRUD, status computation."""
import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import BadRequestException, ConflictException, ForbiddenException, NotFoundException
from app.models.asset import Asset
from app.models.booking import Booking
from app.models.enums import BookingStatus, UserRole
from app.models.user import User
from app.schemas.booking import (
    AssetBrief, BookingCreate, BookingListResponse,
    BookingResponse, BookingUpdate, CalendarSlot, UserBrief,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _computed_status(b: Booking) -> str:
    if b.status in (BookingStatus.CANCELLED,):
        return "CANCELLED"
    now = _now()
    start = _aware(b.start_time)
    end = _aware(b.end_time)
    if now < start:
        return "UPCOMING"
    if start <= now <= end:
        return "ONGOING"
    return "COMPLETED"


def _to_response(b: Booking) -> BookingResponse:
    return BookingResponse(
        id=b.id, asset_id=b.asset_id,
        asset=AssetBrief(id=b.asset.id, asset_tag=b.asset.asset_tag,
                         name=b.asset.name, location=b.asset.location),
        booked_by_id=b.booked_by_id,
        booked_by=UserBrief.model_validate(b.booked_by),
        status=b.status.value,
        start_time=_aware(b.start_time),
        end_time=_aware(b.end_time),
        purpose=b.purpose,
        computed_status=_computed_status(b),
        created_at=b.created_at,
        updated_at=b.updated_at,
    )


def _load(db: Session, booking_id: uuid.UUID) -> Booking:
    b = db.query(Booking).options(
        joinedload(Booking.asset), joinedload(Booking.booked_by)
    ).filter(Booking.id == booking_id).first()
    if not b:
        raise NotFoundException("Booking")
    return b


def _check_overlap(db: Session, asset_id: uuid.UUID,
                   start: datetime, end: datetime,
                   exclude_id: Optional[uuid.UUID] = None) -> None:
    """Raises ConflictException if any active booking overlaps the given slot."""
    q = db.query(Booking).filter(
        Booking.asset_id == asset_id,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
        Booking.start_time < end,
        Booking.end_time > start,
    )
    if exclude_id:
        q = q.filter(Booking.id != exclude_id)
    clash = q.first()
    if clash:
        raise ConflictException(
            f"Time slot overlaps an existing booking "
            f"({_aware(clash.start_time).strftime('%H:%M')}–"
            f"{_aware(clash.end_time).strftime('%H:%M')}). "
            "Choose a different time."
        )


def list_bookings(db: Session, user: User, asset_id: Optional[uuid.UUID] = None,
                  status_filter: Optional[str] = None, my_only: bool = False,
                  limit: int = 50, offset: int = 0) -> BookingListResponse:
    q = db.query(Booking).options(joinedload(Booking.asset), joinedload(Booking.booked_by))
    if asset_id:
        q = q.filter(Booking.asset_id == asset_id)
    if status_filter:
        q = q.filter(Booking.status == status_filter)
    if my_only or user.role == UserRole.EMPLOYEE:
        q = q.filter(Booking.booked_by_id == user.id)
    total = q.count()
    items = q.order_by(Booking.start_time.desc()).offset(offset).limit(limit).all()
    return BookingListResponse(total=total, items=[_to_response(b) for b in items])


def get_calendar(db: Session, asset_id: uuid.UUID) -> list[CalendarSlot]:
    """Return all non-cancelled bookings for a resource (for calendar display)."""
    bookings = db.query(Booking).options(joinedload(Booking.booked_by)).filter(
        Booking.asset_id == asset_id,
        Booking.status.in_([BookingStatus.CONFIRMED, BookingStatus.PENDING]),
        Booking.end_time >= _now(),
    ).order_by(Booking.start_time).all()
    return [
        CalendarSlot(
            booking_id=b.id,
            booked_by_name=b.booked_by.full_name,
            status=b.status.value,
            start_time=_aware(b.start_time),
            end_time=_aware(b.end_time),
            purpose=b.purpose,
        )
        for b in bookings
    ]


def create_booking(db: Session, payload: BookingCreate, user: User) -> BookingResponse:
    asset = db.query(Asset).filter(Asset.id == payload.asset_id).first()
    if not asset:
        raise NotFoundException("Asset")
    if not asset.is_bookable:
        raise BadRequestException(f"Asset {asset.asset_tag} is not marked as bookable.")

    start = _aware(payload.start_time)
    end = _aware(payload.end_time)

    if start < _now():
        raise BadRequestException("Cannot book a slot in the past.")

    _check_overlap(db, payload.asset_id, start, end)

    b = Booking(
        id=uuid.uuid4(),
        asset_id=payload.asset_id,
        booked_by_id=user.id,
        status=BookingStatus.CONFIRMED,
        start_time=start,
        end_time=end,
        purpose=payload.purpose,
    )
    db.add(b)
    db.commit()
    return _to_response(_load(db, b.id))


def update_booking(db: Session, booking_id: uuid.UUID,
                   payload: BookingUpdate, user: User) -> BookingResponse:
    b = _load(db, booking_id)

    if b.booked_by_id != user.id and user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise ForbiddenException("You can only edit your own bookings.")

    if b.status == BookingStatus.CANCELLED:
        raise BadRequestException("Cannot modify a cancelled booking.")

    start = _aware(payload.start_time) if payload.start_time else _aware(b.start_time)
    end = _aware(payload.end_time) if payload.end_time else _aware(b.end_time)

    if payload.start_time or payload.end_time:
        _check_overlap(db, b.asset_id, start, end, exclude_id=booking_id)
        b.start_time = start
        b.end_time = end

    if payload.purpose is not None:
        b.purpose = payload.purpose

    db.commit()
    return _to_response(_load(db, booking_id))


def cancel_booking(db: Session, booking_id: uuid.UUID, user: User) -> BookingResponse:
    b = _load(db, booking_id)

    if b.booked_by_id != user.id and user.role not in (UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER):
        raise ForbiddenException("You can only cancel your own bookings.")

    if b.status == BookingStatus.CANCELLED:
        raise BadRequestException("Booking is already cancelled.")

    if _computed_status(b) == "COMPLETED":
        raise BadRequestException("Cannot cancel a completed booking.")

    b.status = BookingStatus.CANCELLED
    db.commit()
    return _to_response(_load(db, booking_id))
