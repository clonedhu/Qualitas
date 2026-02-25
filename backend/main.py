import logging
import os
from logging.handlers import RotatingFileHandler

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

import db_migrations
import db_seeder
import models
from core.config import settings
from database import engine
from middleware.rate_limiter import RateLimitMiddleware
from routers import (
    audit,
    auth,
    checklist,
    contractors,
    fat,
    file_router,
    followup,
    iam,
    itp,
    itr,
    km,
    kpi,
    ncr,
    noi,
    obs,
    pqp,
)
from routers import settings as settings_router
from scheduler import start_scheduler

# Setup Logger with rotation
# Max 10MB per file, keep 5 backup files
rotating_handler = RotatingFileHandler(
    "backend_error.log",
    mode='a',
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5,
    encoding='utf-8'
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        rotating_handler
    ]
)
logger = logging.getLogger(__name__)

# Create tables
models.Base.metadata.create_all(bind=engine)

# Run Migrations & Seeding
db_migrations.run_migrations()
db_seeder.run_seeding()

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# Middleware
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)

# Static Files
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Event Handlers
@app.on_event("startup")
async def startup_event():
    start_scheduler()
    logger.info("Background scheduler started.")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global Exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )

# API Router
from fastapi import APIRouter

api = APIRouter(prefix="/api")

# Include Routers
# Added auth and settings_router
for router in [
    auth,
    settings_router,
    iam,
    itp, ncr, noi, itr, pqp, obs, contractors, followup, audit, checklist, kpi, file_router, fat, km
]:
    api.include_router(router.router)

app.include_router(api)

@app.get("/")
def read_root():
    return {"message": f"{settings.PROJECT_NAME} is running"}

# hot reload trigger
