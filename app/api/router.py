from fastapi import APIRouter
from app.api.endpoints.core import router as endpoints_router
from app.api.endpoints.administration import router as admin_router
from app.api.endpoints.documents import router as docs_router

router = APIRouter()
router.include_router(endpoints_router, prefix="/api")
router.include_router(admin_router, prefix="/api")
router.include_router(docs_router, prefix="/api")
