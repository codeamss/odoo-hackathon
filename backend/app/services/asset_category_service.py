"""Asset Category service."""
import uuid

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.asset import Asset
from app.models.asset_category import AssetCategory
from app.schemas.asset_category import (
    AssetCategoryCreate,
    AssetCategoryListResponse,
    AssetCategoryResponse,
    AssetCategoryUpdate,
)


def _to_response(cat: AssetCategory, db: Session) -> AssetCategoryResponse:
    asset_count = (
        db.query(func.count(Asset.id))
        .filter(Asset.category_id == cat.id)
        .scalar()
        or 0
    )
    return AssetCategoryResponse(
        id=cat.id,
        name=cat.name,
        description=cat.description,
        depreciation_rate=float(cat.depreciation_rate) if cat.depreciation_rate is not None else None,
        useful_life_years=cat.useful_life_years,
        warranty_period_months=cat.warranty_period_months,
        requires_maintenance=cat.requires_maintenance,
        maintenance_interval_days=cat.maintenance_interval_days,
        is_active=cat.is_active,
        asset_count=asset_count,
        created_at=cat.created_at,
        updated_at=cat.updated_at,
    )


def _get_or_404(db: Session, cat_id: uuid.UUID) -> AssetCategory:
    cat = db.query(AssetCategory).filter(AssetCategory.id == cat_id).first()
    if not cat:
        raise NotFoundException("Asset category")
    return cat


def list_categories(
    db: Session,
    include_inactive: bool = False,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> AssetCategoryListResponse:
    q = db.query(AssetCategory)
    if not include_inactive:
        q = q.filter(AssetCategory.is_active == True)
    if search:
        q = q.filter(AssetCategory.name.ilike(f"%{search}%"))
    total = q.count()
    cats = q.order_by(AssetCategory.name).offset(offset).limit(limit).all()
    return AssetCategoryListResponse(
        total=total,
        items=[_to_response(c, db) for c in cats],
    )


def get_category(db: Session, cat_id: uuid.UUID) -> AssetCategoryResponse:
    return _to_response(_get_or_404(db, cat_id), db)


def create_category(db: Session, payload: AssetCategoryCreate) -> AssetCategoryResponse:
    existing = db.query(AssetCategory).filter(AssetCategory.name == payload.name).first()
    if existing:
        raise ConflictException(f"Category '{payload.name}' already exists.")
    cat = AssetCategory(
        id=uuid.uuid4(),
        name=payload.name,
        description=payload.description,
        depreciation_rate=payload.depreciation_rate,
        useful_life_years=payload.useful_life_years,
        warranty_period_months=payload.warranty_period_months,
        requires_maintenance=payload.requires_maintenance,
        maintenance_interval_days=payload.maintenance_interval_days,
        is_active=True,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return _to_response(cat, db)


def update_category(
    db: Session, cat_id: uuid.UUID, payload: AssetCategoryUpdate
) -> AssetCategoryResponse:
    cat = _get_or_404(db, cat_id)

    if payload.name is not None:
        clash = (
            db.query(AssetCategory)
            .filter(AssetCategory.name == payload.name, AssetCategory.id != cat_id)
            .first()
        )
        if clash:
            raise ConflictException(f"Category '{payload.name}' already exists.")
        cat.name = payload.name

    for field in (
        "description", "depreciation_rate", "useful_life_years",
        "warranty_period_months", "requires_maintenance",
        "maintenance_interval_days", "is_active",
    ):
        val = getattr(payload, field)
        if val is not None:
            setattr(cat, field, val)

    db.commit()
    db.refresh(cat)
    return _to_response(cat, db)


def delete_category(db: Session, cat_id: uuid.UUID) -> None:
    cat = _get_or_404(db, cat_id)
    asset_count = (
        db.query(func.count(Asset.id))
        .filter(Asset.category_id == cat_id)
        .scalar()
        or 0
    )
    if asset_count > 0:
        raise BadRequestException(
            f"Cannot delete: {asset_count} asset(s) are assigned to this category. "
            "Deactivate it instead."
        )
    db.delete(cat)
    db.commit()
