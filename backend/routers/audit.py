
from fastapi import APIRouter, Depends, HTTPException

import schemas
from core.dependencies import RoleChecker, get_audit_service
from core.perms import AUDIT_VIEW
from services.audit_service import AuditService

router = APIRouter(
    prefix="/audit",
    tags=["audit"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=list[schemas.Audit])
def read_audits(
    skip: int = 0,
    limit: int = 100,
    service: AuditService = Depends(get_audit_service),
    current_user: schemas.User = Depends(RoleChecker(AUDIT_VIEW))
):
    return service.get_audits(skip=skip, limit=limit)

@router.get("/{audit_id}", response_model=schemas.Audit)
def read_audit(
    audit_id: str,
    service: AuditService = Depends(get_audit_service),
    current_user: schemas.User = Depends(RoleChecker(AUDIT_VIEW))
):
    db_audit = service.get_audit(audit_id)
    if db_audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")
    return db_audit
