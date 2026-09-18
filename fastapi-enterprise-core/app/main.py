import time
import logging
from uuid import uuid4
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

# Project imports
from app.api.v1.api import api_router as main_api_auth_v1
from app.api.v1.system import router as system_router
from app.api.v1.mfa_totp import router as mfa_totp_router
from app.api.v1.logging_app.api import api_router as logging_app_api_router_v1

from app.core.rate_limit import limiter, _rate_limit_exceeded_handler
from app.core.database import engine, SessionLocal
from app.core.init_db import create_super_admin
from app.core.config import settings
from app.core.logger import logger
from app.models import user

# Initialize Database
user.Base.metadata.create_all(bind=engine)

# --- Lifespan for Startup/Shutdown ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        create_super_admin(db)
    finally:
        db.close()
    yield

# --- Initialize FastAPI App ---
app = FastAPI(
    title="Philippine Navy API",
    description="API for managing Philippine Navy applications.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT == "development" else None,
    openapi_url="/openapi.json" if settings.ENVIRONMENT == "development" else None,
)

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.DOMAIN],
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# --- Unified Logging Middleware ---
@app.middleware("http")
async def log_requests(request: Request, call_next):
    trace_id = str(uuid4())
    start_time = time.time()
    request.state.trace_id = trace_id
    
    response = await call_next(request)
    
    process_time = (time.time() - start_time) * 1000
    client_ip = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    log_msg = (
        f"Trace: {trace_id} | {request.method} {request.url.path} | "
        f"Status: {response.status_code} | Duration: {process_time:.2f}ms | "
        f"IP: {client_ip} | Agent: {user_agent}"
    )
    logger.info(log_msg)
    
    response.headers["X-Trace-ID"] = trace_id
    return response

# --- API ENDPOINTS ---
app.include_router(main_api_auth_v1, prefix="/api/v1")
app.include_router(system_router, prefix="/api/v1/system", tags=["System Admin"])
app.include_router(mfa_totp_router, prefix="/api/v1/mfa", tags=["MFA"])
app.include_router(logging_app_api_router_v1, prefix="/api/v1/logging_app", tags=["Centralized Logger"])

@app.get("/", tags=["System"])
async def root():
    return {"message": "Welcome to your Centralized Logging System!"}