from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth,
    companies,
    projects,
    master_plans,
    worker_requirements,
    material_requests,
    vendors,
    deliveries,
    public_sessions,
    public_chat,
    public_quotations,
    notifications,
    project_rag,
)

api_router = APIRouter()

# --- Authenticated routes ---
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(companies.router, prefix="/companies", tags=["Companies"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(project_rag.router, prefix="/projects", tags=["Projects - RAG"])
api_router.include_router(master_plans.router, prefix="/master-plans", tags=["Master Plans"])
api_router.include_router(worker_requirements.router, prefix="/worker-requirements", tags=["Worker Requirements"])
api_router.include_router(material_requests.router, prefix="/material-requests", tags=["Material Requests"])
api_router.include_router(vendors.router, prefix="/vendors", tags=["Vendors"])
api_router.include_router(deliveries.router, prefix="/deliveries", tags=["Deliveries"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

# --- Public AI routes (no login) ---
api_router.include_router(public_sessions.router, prefix="/public/sessions", tags=["Public - Sessions"])
api_router.include_router(public_chat.router, prefix="/public/chat", tags=["Public - RAG Chat"])
api_router.include_router(public_quotations.router, prefix="/public/quotations", tags=["Public - Quotations"])
