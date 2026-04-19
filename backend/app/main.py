from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from opentelemetry import trace

from app.admin import router as admin_router
from app.config import settings
from app.dashboard_auth import dashboard_session_manager
from app.database import db_manager
from app.routes import router
from app.telemetry import apply_fastapi_instrumentation, setup_telemetry

setup_telemetry(app_name="veraproof-backend")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting VeraProof AI Backend", extra={"event": "app_startup"})
    await db_manager.connect()
    if db_manager.pool:
        from app.auth import local_auth_manager
        await local_auth_manager.ensure_development_bootstrap_user()
    from app.rate_limiter import rate_limiter
    rate_limiter.start_cleanup()
    yield
    logger.info("Shutting down VeraProof AI Backend", extra={"event": "app_shutdown"})
    await db_manager.disconnect()


app = FastAPI(
    title="VeraProof AI API",
    description="Physics-First Fraud Detection Platform",
    version="1.0.0",
    lifespan=lifespan,
)

apply_fastapi_instrumentation(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    if request.url.path.startswith("/api/v1") and not await dashboard_session_manager.validate_csrf(request):
        return JSONResponse(status_code=403, content={"detail": "CSRF validation failed"})

    response = await call_next(request)
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
    if settings.environment.lower() not in {"development", "local"}:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    current_span = trace.get_current_span()
    if current_span and current_span.is_recording():
        current_span.record_exception(exc)
        current_span.set_status(trace.status.Status(trace.status.StatusCode.ERROR))

    logger.error(f"Unhandled exception: {exc}", exc_info=True, extra={"path": request.url.path})
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.environment == "development" else "An error occurred",
        },
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        },
    )


@app.get("/")
async def root():
    return {"service": "VeraProof AI", "version": "1.0.0", "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


app.include_router(router)
app.include_router(admin_router)
