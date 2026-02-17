from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
