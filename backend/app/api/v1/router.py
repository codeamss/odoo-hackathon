"""
Aggregates all v1 route modules into a single APIRouter.
New feature routers are registered here as they are built.
"""
from fastapi import APIRouter

from app.api.v1.routes import auth

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
# Future routers will be added here:
# api_router.include_router(users.router)
# api_router.include_router(departments.router)
# api_router.include_router(assets.router)
# ...
