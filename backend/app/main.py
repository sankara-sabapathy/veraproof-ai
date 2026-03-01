from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import db_manager
from app.routes import router
from opentelemetry import trace
from app.telemetry import setup_telemetry, apply_fastapi_instrumentation

# Boot the OpenTelemetry Engine Provider
setup_telemetry(app_name="veraproof-backend")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting VeraProof AI Backend", extra={"event": "app_startup"})
    await db_manager.connect()
    
    # Start rate limiter cleanup
    from app.rate_limiter import rate_limiter
    rate_limiter.start_cleanup()
    
    yield
    
    # Shutdown
    logger.info("Shutting down VeraProof AI Backend", extra={"event": "app_shutdown"})
    await db_manager.disconnect()


app = FastAPI(
    title="VeraProof AI API",
    description="Physics-First Fraud Detection Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Apply OpenTelemetry Tracing to all FastAPI Routes natively
apply_fastapi_instrumentation(app)

# CORS middleware - MUST be added first to ensure headers on all responses
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler to ensure CORS headers on errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all exceptions and ensure CORS headers are present & traced"""
    # Inject exception stacktraces directly into the active OpenTelemetry Trace Span!
    current_span = trace.get_current_span()
    if current_span and current_span.is_recording():
        current_span.record_exception(exc)
        current_span.set_status(trace.status.Status(trace.status.StatusCode.ERROR))
    
    logger.error(f"Unhandled exception: {exc}", exc_info=True, extra={"path": request.url.path})
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.environment == "development" else "An error occurred"
        },
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )


@app.get("/")
async def root():
    return {
        "service": "VeraProof AI",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


# Include API routes
app.include_router(router)
