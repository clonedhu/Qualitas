
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import schemas
import crud
from database import get_db

router = APIRouter(
    prefix="/pqp",
    tags=["pqp"],
    responses={404: {"description": "Not found"}},
)

@router.get("/", response_model=List[schemas.PQP])
def read_pqps(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    return crud.get_pqps(db, skip=skip, limit=limit)

@router.get("/{pqp_id}", response_model=schemas.PQP)
def read_pqp(pqp_id: str, db: Session = Depends(get_db)):
    db_pqp = crud.get_pqp(db, pqp_id=pqp_id)
    if db_pqp is None:
        raise HTTPException(status_code=404, detail="PQP not found")
    return db_pqp

@router.post("/", response_model=schemas.PQP)
def create_pqp(pqp: schemas.PQPCreate, db: Session = Depends(get_db)):
    return crud.create_pqp(db=db, pqp=pqp)

@router.put("/{pqp_id}", response_model=schemas.PQP)
def update_pqp(pqp_id: str, pqp: schemas.PQPUpdate, db: Session = Depends(get_db)):
    db_pqp = crud.update_pqp(db, pqp_id=pqp_id, pqp=pqp)
    if db_pqp is None:
        raise HTTPException(status_code=404, detail="PQP not found")
    return db_pqp

@router.delete("/{pqp_id}")
def delete_pqp(pqp_id: str, db: Session = Depends(get_db)):
    if crud.delete_pqp(db, pqp_id=pqp_id) is None:
        raise HTTPException(status_code=404, detail="PQP not found")
    return {"ok": True}
