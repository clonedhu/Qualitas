
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import schemas
import crud
from database import get_db

router = APIRouter(
    prefix="/audit",
    tags=["audit"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.Audit])
def read_audits(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_audits(db, skip=skip, limit=limit)

@router.post("/", response_model=schemas.Audit)
def create_audit(audit: schemas.AuditCreate, db: Session = Depends(get_db)):
    return crud.create_audit(db=db, audit=audit)

@router.get("/{audit_id}", response_model=schemas.Audit)
def read_audit(audit_id: str, db: Session = Depends(get_db)):
    db_audit = crud.get_audit(db, audit_id=audit_id)
    if db_audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")
    return db_audit

@router.put("/{audit_id}", response_model=schemas.Audit)
def update_audit(audit_id: str, audit: schemas.AuditUpdate, db: Session = Depends(get_db)):
    db_audit = crud.update_audit(db, audit_id=audit_id, audit=audit)
    if db_audit is None:
        raise HTTPException(status_code=404, detail="Audit not found")
    return db_audit

@router.delete("/{audit_id}")
def delete_audit(audit_id: str, db: Session = Depends(get_db)):
    if crud.delete_audit(db, audit_id=audit_id) is None:
        raise HTTPException(status_code=404, detail="Audit not found")
    return {"ok": True}
