import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

class AuditLogMiddleware(BaseHTTPMiddleware):
    """Logs process execution times inside HTTP response headers."""
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}s"
        return response
