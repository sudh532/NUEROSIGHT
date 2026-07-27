import os
import logging
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.router import router as api_router
from app.api.middleware import AuditLogMiddleware
from app.database.models import init_tables
from app.core.exceptions import OcularTrackingException

# Production Logging Configuration (OPTIMIZE.MD Phase 1)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("neurosight_prod")

app = FastAPI(
    title="NEUROSIGHT Ocular Diagnostics Platform Core",
    description="Advanced Drugged Eye Identification & Ocular Telemetry Platform",
    version="2.0.0",
    debug=True
)

# 1. Gzip Compression for Fast API Payload Transfers
app.add_middleware(GZipMiddleware, minimum_size=1000)

# 2. CORS and Process Audit Logging Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditLogMiddleware)

# 3. Model Warm-Up & Database Initialization on Application Startup
@app.on_event("startup")
async def startup_event():
    logger.info("Initializing NEUROSIGHT Production Engine...")
    
    # 3a. Initialize DB tables safely
    try:
        init_tables()
        logger.info("[DB SUCCESS] Database schema initialized and verified.")
    except Exception as e:
        logger.error(f"[DB ERROR] Database initialization failed: {e}")

    # 3b. Pre-load and warm up ML inference pipelines
    try:
        from app.services.inference import warmup_model
        warmup_model()
    except Exception as e:
        logger.error(f"[ML WARMUP ERROR] Warm-up failed: {e}")

# 4. Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"CRITICAL SYSTEM FAILURE ON ROUTE: {request.url.path}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error", "details": str(exc)},
    )

@app.exception_handler(OcularTrackingException)
async def ocular_tracking_exception_handler(request: Request, exc: OcularTrackingException):
    logger.warning(f"Ocular tracking exception caught: {exc}")
    return JSONResponse(
        status_code=400,
        content={"message": "Ocular tracking coordinates resolution failure.", "details": str(exc)},
    )

# Custom 401 response handler omitting WWW-Authenticate header to prevent native browser popup
@app.exception_handler(401)
async def custom_401_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=401,
        content={"message": "Unauthorized access", "details": str(exc)}
    )

# Disable static file caching during local development (bypasses HTTP 304)
@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    if path.startswith("/css") or path.startswith("/js") or path.startswith("/static") or path == "/" or path.endswith(".html"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

# 5. Include Unified Router
app.include_router(api_router)

# 6. Serve Official NEUROSIGHT Emblem Logo Image Asset
@app.get("/static/images/neurosight-logo.png")
@app.get("/static/images/neurosight-logo.jpg")
async def get_neurosight_logo():
    logo_path = r"C:\Users\sudha\.gemini\antigravity-ide\brain\09c9482a-aad1-40b9-b7ed-b739fd40ebc6\media__1785004488574.png"
    if os.path.exists(logo_path):
        return FileResponse(logo_path, media_type="image/png")
    fallback_static = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "images", "neurosight-logo.svg")
    return FileResponse(fallback_static, media_type="image/svg+xml")

# 7. Mount Static Client Assets (Serves index.html at Root)
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if os.path.exists(static_dir):
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
