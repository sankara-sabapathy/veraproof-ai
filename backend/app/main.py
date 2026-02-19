from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.database import db_manager
from app.routes import router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting VeraProof AI Backend")
    await db_manager.connect()
    logger.info("Database connected")
    
    # Start rate limiter cleanup
    from app.rate_limiter import rate_limiter
    rate_limiter.start_cleanup()
    
    yield
    
    # Shutdown
    logger.info("Shutting down VeraProof AI Backend")
    await db_manager.disconnect()
    logger.info("Database disconnected")


app = FastAPI(
    title="VeraProof AI API",
    description="Physics-First Fraud Detection Platform",
    version="1.0.0",
    lifespan=lifespan
)

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
    """Handle all exceptions and ensure CORS headers are present"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    
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
