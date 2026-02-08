
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import schemas
import crud
from database import get_db
from middleware.auth import PermissionChecker, Permission

router = APIRouter(
    prefix="/itr",
    tags=["itr"],
    responses={404: {"description": "Not found"}},
)

# 讀取操作 - 無需認證
@router.get("/", response_model=List[schemas.ITR])
def read_itrs(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    return crud.get_itrs(db, skip=skip, limit=limit)

@router.get("/{itr_id}", response_model=schemas.ITR)
def read_itr(itr_id: str, db: Session = Depends(get_db)):
    db_itr = crud.get_itr(db, itr_id=itr_id)
    if db_itr is None:
        raise HTTPException(status_code=404, detail="ITR not found")
    return db_itr

# 寫入操作 - 需要認證
@router.post("/", response_model=schemas.ITR)
def create_itr(
    itr: schemas.ITRCreate, 
    db: Session = Depends(get_db),
    _: bool = Depends(PermissionChecker([Permission.WRITE]))
):
    return crud.create_itr(db=db, itr=itr)

@router.put("/{itr_id}", response_model=schemas.ITR)
def update_itr(
    itr_id: str, 
    itr: schemas.ITRUpdate, 
    db: Session = Depends(get_db),
    _: bool = Depends(PermissionChecker([Permission.WRITE]))
):
    db_itr = crud.update_itr(db, itr_id=itr_id, itr=itr)
    if db_itr is None:
        raise HTTPException(status_code=404, detail="ITR not found")
    return db_itr

@router.delete("/{itr_id}")
def delete_itr(
    itr_id: str, 
    db: Session = Depends(get_db),
    _: bool = Depends(PermissionChecker([Permission.DELETE]))
):
    if crud.delete_itr(db, itr_id=itr_id) is None:
        raise HTTPException(status_code=404, detail="ITR not found")
    return {"ok": True}
