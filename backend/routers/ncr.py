
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import schemas
import crud
from database import get_db
from middleware.auth import PermissionChecker, Permission

router = APIRouter(
    prefix="/ncr",
    tags=["ncr"],
    responses={404: {"description": "Not found"}},
)

# 讀取操作 - 無需認證
@router.get("/", response_model=List[schemas.NCR])
def read_ncrs(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    return crud.get_ncrs(db, skip=skip, limit=limit)

@router.get("/{ncr_id}", response_model=schemas.NCR)
def read_ncr(ncr_id: str, db: Session = Depends(get_db)):
    db_ncr = crud.get_ncr(db, ncr_id=ncr_id)
    if db_ncr is None:
        raise HTTPException(status_code=404, detail="NCR not found")
    return db_ncr

# 寫入操作 - 需要認證
@router.post("/", response_model=schemas.NCR)
def create_ncr(
    ncr: schemas.NCRCreate, 
    db: Session = Depends(get_db),
    _: bool = Depends(PermissionChecker([Permission.WRITE]))
):
    return crud.create_ncr(db=db, ncr=ncr)

@router.put("/{ncr_id}", response_model=schemas.NCR)
def update_ncr(
    ncr_id: str, 
    ncr: schemas.NCRUpdate, 
    db: Session = Depends(get_db),
    _: bool = Depends(PermissionChecker([Permission.WRITE]))
):
    db_ncr = crud.update_ncr(db, ncr_id=ncr_id, ncr=ncr)
    if db_ncr is None:
        raise HTTPException(status_code=404, detail="NCR not found")
    return db_ncr

@router.delete("/{ncr_id}")
def delete_ncr(
    ncr_id: str, 
    db: Session = Depends(get_db),
    _: bool = Depends(PermissionChecker([Permission.DELETE]))
):
    if crud.delete_ncr(db, ncr_id=ncr_id) is None:
        raise HTTPException(status_code=404, detail="NCR not found")
    return {"ok": True}
