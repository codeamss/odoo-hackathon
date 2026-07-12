"""Department service — all business logic for department CRUD."""
import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import ConflictException, NotFoundException, BadRequestException
from app.models.department import Department
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.department import (
    DepartmentCreate,
    DepartmentListResponse,
    DepartmentResponse,
    DepartmentUpdate,
    ManagerInfo,
    ParentDeptInfo,
)


def _to_response(dept: Department, db: Session) -> DepartmentResponse:
    member_count = (
        db.query(func.count(User.id))
        .filter(User.department_id == dept.id, User.is_active == True)
        .scalar()
        or 0
    )
    return DepartmentResponse(
        id=dept.id,
        name=dept.name,
        description=dept.description,
        manager_id=dept.manager_id,
        manager=ManagerInfo.model_validate(dept.manager) if dept.manager else None,
        parent_dept_id=dept.parent_dept_id,
        parent=ParentDeptInfo.model_validate(dept.parent) if dept.parent else None,
        is_active=dept.is_active,
        member_count=member_count,
        created_at=dept.created_at,
        updated_at=dept.updated_at,
    )


def _get_or_404(db: Session, dept_id: uuid.UUID) -> Department:
    dept = (
        db.query(Department)
        .options(
            joinedload(Department.manager),
            joinedload(Department.parent),
        )
        .filter(Department.id == dept_id)
        .first()
    )
    if not dept:
        raise NotFoundException("Department")
    return dept


def list_departments(
    db: Session,
    include_inactive: bool = False,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> DepartmentListResponse:
    q = db.query(Department).options(
        joinedload(Department.manager),
        joinedload(Department.parent),
    )
    if not include_inactive:
        q = q.filter(Department.is_active == True)
    if search:
        q = q.filter(Department.name.ilike(f"%{search}%"))
    total = q.count()
    depts = q.order_by(Department.name).offset(offset).limit(limit).all()
    return DepartmentListResponse(
        total=total,
        items=[_to_response(d, db) for d in depts],
    )


def get_department(db: Session, dept_id: uuid.UUID) -> DepartmentResponse:
    return _to_response(_get_or_404(db, dept_id), db)


def create_department(db: Session, payload: DepartmentCreate) -> DepartmentResponse:
    existing = db.query(Department).filter(Department.name == payload.name.strip()).first()
    if existing:
        raise ConflictException(f"A department named '{payload.name}' already exists.")

    # Validate manager exists and has MANAGER role if provided
    if payload.manager_id:
        mgr = db.query(User).filter(User.id == payload.manager_id).first()
        if not mgr:
            raise NotFoundException("Manager user")
        if mgr.role not in (UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN):
            raise BadRequestException(
                "Assigned manager must have the MANAGER, ADMIN, or SUPER_ADMIN role."
            )

    # Validate parent dept exists if provided
    if payload.parent_dept_id:
        parent = db.query(Department).filter(Department.id == payload.parent_dept_id).first()
        if not parent:
            raise NotFoundException("Parent department")

    dept = Department(
        id=uuid.uuid4(),
        name=payload.name.strip(),
        description=payload.description,
        manager_id=payload.manager_id,
        parent_dept_id=payload.parent_dept_id,
        is_active=True,
    )
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return _to_response(_get_or_404(db, dept.id), db)


def update_department(
    db: Session, dept_id: uuid.UUID, payload: DepartmentUpdate
) -> DepartmentResponse:
    dept = _get_or_404(db, dept_id)

    if payload.name is not None:
        name = payload.name.strip()
        clash = (
            db.query(Department)
            .filter(Department.name == name, Department.id != dept_id)
            .first()
        )
        if clash:
            raise ConflictException(f"A department named '{name}' already exists.")
        dept.name = name

    if payload.description is not None:
        dept.description = payload.description

    if payload.manager_id is not None:
        mgr = db.query(User).filter(User.id == payload.manager_id).first()
        if not mgr:
            raise NotFoundException("Manager user")
        if mgr.role not in (UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN):
            raise BadRequestException(
                "Assigned manager must have the MANAGER, ADMIN, or SUPER_ADMIN role."
            )
        dept.manager_id = payload.manager_id

    if payload.parent_dept_id is not None:
        if payload.parent_dept_id == dept_id:
            raise BadRequestException("A department cannot be its own parent.")
        parent = db.query(Department).filter(Department.id == payload.parent_dept_id).first()
        if not parent:
            raise NotFoundException("Parent department")
        dept.parent_dept_id = payload.parent_dept_id

    if payload.is_active is not None:
        dept.is_active = payload.is_active

    db.commit()
    return _to_response(_get_or_404(db, dept_id), db)


def deactivate_department(db: Session, dept_id: uuid.UUID) -> DepartmentResponse:
    dept = _get_or_404(db, dept_id)
    if not dept.is_active:
        raise BadRequestException("Department is already inactive.")
    dept.is_active = False
    db.commit()
    return _to_response(_get_or_404(db, dept_id), db)


def assign_head(
    db: Session, dept_id: uuid.UUID, manager_id: uuid.UUID
) -> DepartmentResponse:
    dept = _get_or_404(db, dept_id)
    mgr = db.query(User).filter(User.id == manager_id, User.is_active == True).first()
    if not mgr:
        raise NotFoundException("User")
    if mgr.role not in (UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN):
        raise BadRequestException(
            "User must have the MANAGER role to be assigned as department head. "
            "Promote the user to MANAGER first."
        )
    dept.manager_id = manager_id
    db.commit()
    return _to_response(_get_or_404(db, dept_id), db)
