"""User/Employee Directory service."""
import uuid

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import BadRequestException, ForbiddenException, NotFoundException
from app.models.department import Department
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import (
    DeptInfo,
    UpdateRoleRequest,
    UpdateUserRequest,
    UserListResponse,
    UserResponse,
    ASSIGNABLE_ROLES,
)


def _to_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department_id=user.department_id,
        department=DeptInfo.model_validate(user.department) if user.department else None,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


def _get_or_404(db: Session, user_id: uuid.UUID) -> User:
    user = (
        db.query(User)
        .options(joinedload(User.department))
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        raise NotFoundException("User")
    return user


def list_users(
    db: Session,
    role: UserRole | None = None,
    department_id: uuid.UUID | None = None,
    include_inactive: bool = False,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> UserListResponse:
    q = db.query(User).options(joinedload(User.department))

    if not include_inactive:
        q = q.filter(User.is_active == True)
    if role:
        q = q.filter(User.role == role)
    if department_id:
        q = q.filter(User.department_id == department_id)
    if search:
        q = q.filter(
            User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )

    total = q.count()
    users = q.order_by(User.full_name).offset(offset).limit(limit).all()
    return UserListResponse(total=total, items=[_to_response(u) for u in users])


def get_user(db: Session, user_id: uuid.UUID) -> UserResponse:
    return _to_response(_get_or_404(db, user_id))


def update_role(
    db: Session,
    user_id: uuid.UUID,
    payload: UpdateRoleRequest,
    acting_user: User,
) -> UserResponse:
    """
    Only ADMIN and SUPER_ADMIN can assign roles.
    ADMIN cannot assign SUPER_ADMIN.
    SUPER_ADMIN can assign any role in ASSIGNABLE_ROLES.
    """
    target = _get_or_404(db, user_id)

    # Prevent self-role-change
    if target.id == acting_user.id:
        raise BadRequestException("You cannot change your own role.")

    # Prevent demoting another SUPER_ADMIN
    if target.role == UserRole.SUPER_ADMIN:
        raise ForbiddenException("The SUPER_ADMIN role cannot be reassigned.")

    if payload.role not in ASSIGNABLE_ROLES:
        raise BadRequestException(
            f"Role '{payload.role.value}' is not assignable through this endpoint."
        )

    target.role = payload.role
    db.commit()
    return _to_response(_get_or_404(db, user_id))


def update_user(
    db: Session,
    user_id: uuid.UUID,
    payload: UpdateUserRequest,
    acting_user: User,
) -> UserResponse:
    target = _get_or_404(db, user_id)

    # Prevent editing SUPER_ADMIN unless you are SUPER_ADMIN
    if (
        target.role == UserRole.SUPER_ADMIN
        and acting_user.role != UserRole.SUPER_ADMIN
    ):
        raise ForbiddenException("Only a SUPER_ADMIN can edit another SUPER_ADMIN.")

    if payload.full_name is not None:
        target.full_name = payload.full_name

    if payload.department_id is not None:
        dept = db.query(Department).filter(Department.id == payload.department_id).first()
        if not dept:
            raise NotFoundException("Department")
        target.department_id = payload.department_id

    if payload.is_active is not None:
        if target.id == acting_user.id:
            raise BadRequestException("You cannot deactivate your own account.")
        target.is_active = payload.is_active

    db.commit()
    return _to_response(_get_or_404(db, user_id))
