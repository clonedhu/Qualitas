
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import crud
import schemas
from core.dependencies import RoleChecker
from core.perms import AUDIT_CREATE, AUDIT_DELETE, AUDIT_UPDATE, AUDIT_VIEW
from database import get_db

router = APIRouter(
    prefix="/audit",
    tags=["audit"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=list[schemas.Audit])
def read_audits(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: schemas.User = Depends(RoleChecker(AUDIT_VIEW))):
    return crud.get_audits(db, skip=skip, limit=limit)

@router.get("/{audit_id}", response_model=schemas.Audit)
def read_audit(audit_id: str, db: Session = Depends(get_db), current_user: schemas.User = Depends(RoleChecker(AUDIT_VIEW))):
    db_audit = crud.get_audit(db, audit_id=audit_id)
    if db_audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")
    return db_audit

@router.post("/", response_model=schemas.Audit)
def create_audit(
    audit: schemas.AuditCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(RoleChecker(AUDIT_CREATE))
):
    return crud.create_audit(db=db, audit=audit)

@router.put("/{audit_id}", response_model=schemas.Audit)
def update_audit(
    audit_id: str,
    audit: schemas.AuditUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(RoleChecker(AUDIT_UPDATE))
):
    db_audit = crud.update_audit(db, audit_id=audit_id, audit=audit)
    if db_audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")
    return db_audit

@router.delete("/{audit_id}")
def delete_audit(
    audit_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(RoleChecker(AUDIT_DELETE))
):
    if crud.delete_audit(db, audit_id=audit_id) is None:
        raise HTTPException(status_code=404, detail="Audit not found")
    return {"ok": True}
