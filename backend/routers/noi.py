
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import schemas
import crud
from database import get_db

router = APIRouter(
    prefix="/noi",
    tags=["noi"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.NOI])
def read_nois(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    return crud.get_nois(db, skip=skip, limit=limit)

@router.post("/", response_model=schemas.NOI)
def create_noi(noi: schemas.NOICreate, db: Session = Depends(get_db)):
    return crud.create_noi(db=db, noi=noi)

@router.post("/bulk/", response_model=List[schemas.NOI])
def create_nois_bulk(nois: List[schemas.NOICreate], db: Session = Depends(get_db)):
    """批次建立多筆 NOI，每筆都會自動產生 Reference No"""
    created = []
    for noi in nois:
        created.append(crud.create_noi(db=db, noi=noi))
    return created

@router.get("/{noi_id}", response_model=schemas.NOI)
def read_noi(noi_id: str, db: Session = Depends(get_db)):
    db_noi = crud.get_noi(db, noi_id=noi_id)
    if db_noi is None:
        raise HTTPException(status_code=404, detail="NOI not found")
    return db_noi

@router.put("/{noi_id}", response_model=schemas.NOI)
def update_noi(noi_id: str, noi: schemas.NOIUpdate, db: Session = Depends(get_db)):
    db_noi = crud.update_noi(db, noi_id=noi_id, noi=noi)
    if db_noi is None:
        raise HTTPException(status_code=404, detail="NOI not found")
    return db_noi

@router.delete("/{noi_id}")
def delete_noi(noi_id: str, db: Session = Depends(get_db)):
    if crud.delete_noi(db, noi_id=noi_id) is None:
        raise HTTPException(status_code=404, detail="NOI not found")
    return {"ok": True}
