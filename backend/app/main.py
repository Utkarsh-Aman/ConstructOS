from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import structlog
import traceback

from app.core.config import get_settings
from app.db.session import engine, Base
from app.api.v1.router import api_router

logger = structlog.get_logger()
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ConstructOS backend starting up", env=settings.env)
    # Create all tables (use Alembic in production)
    # async with engine.begin() as conn:
    #     await conn.run_sync(Base.metadata.create_all)
    yield
    logger.info("ConstructOS backend shutting down")


def create_app() -> FastAPI:
    app = FastAPI(
        title="ConstructOS API",
        description="Backend API for ConstructOS — Construction Company/Worker/Vendor/Public-AI Platform",
        version="0.1.0",
        lifespan=lifespan,
    )

    # CORS — allow the Next.js frontend and Railway deployment domains
    frontend_origins = [
        settings.frontend_url.rstrip("/"),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    if settings.frontend_url and settings.frontend_url not in frontend_origins:
        frontend_origins.append(settings.frontend_url)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=frontend_origins,
        allow_origin_regex=r"https://.*(\.railway\.app|\.up\.railway\.app)",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global exception handler — ensures CORS headers on 500 errors
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(
            "Unhandled exception",
            path=str(request.url),
            method=request.method,
            error=str(exc),
            traceback=traceback.format_exc(),
        )
        return JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {str(exc)}"},
        )

    # Mount all API routes
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/health")
    async def health():
        return {"status": "ok", "env": settings.env}

    return app


app = create_app()
