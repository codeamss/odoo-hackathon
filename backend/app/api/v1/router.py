"""Aggregates all v1 route modules into a single APIRouter."""
from fastapi import APIRouter

from app.api.v1.routes import auth, dashboard, departments, asset_categories, users, assets, allocations

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(departments.router)
api_router.include_router(asset_categories.router)
api_router.include_router(users.router)
api_router.include_router(assets.router)
api_router.include_router(allocations.router)
