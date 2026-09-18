from fastapi import APIRouter
from app.api.v1.logging_app.router import router as logging_app_user_router
api_router = APIRouter()

api_router.include_router(logging_app_user_router,  tags=["logging_app"] )

