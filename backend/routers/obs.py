
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import schemas
import crud
from database import get_db
from middleware.auth import PermissionChecker, Permission

router = APIRouter(
    prefix="/obs",
    tags=["obs"],
    responses={404: {"description": "Not found"}},
)

# 讀取操作 - 無需認證
@router.get("/", response_model=List[schemas.OBS])
def read_obss(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    return crud.get_obss(db, skip=skip, limit=limit)

@router.get("/{obs_id}", response_model=schemas.OBS)
def read_obs(obs_id: str, db: Session = Depends(get_db)):
    db_obs = crud.get_obs(db, obs_id=obs_id)
    if db_obs is None:
        raise HTTPException(status_code=404, detail="OBS not found")
    return db_obs

# 寫入操作 - 需要認證
@router.post("/", response_model=schemas.OBS)
def create_obs(
    obs: schemas.OBSCreate, 
    db: Session = Depends(get_db),
    _: bool = Depends(PermissionChecker([Permission.WRITE]))
):
    return crud.create_obs(db=db, obs=obs)

@router.put("/{obs_id}", response_model=schemas.OBS)
def update_obs(
    obs_id: str, 
    obs: schemas.OBSUpdate, 
    db: Session = Depends(get_db),
    _: bool = Depends(PermissionChecker([Permission.WRITE]))
):
    db_obs = crud.update_obs(db, obs_id=obs_id, obs=obs)
    if db_obs is None:
        raise HTTPException(status_code=404, detail="OBS not found")
    return db_obs

@router.delete("/{obs_id}")
def delete_obs(
    obs_id: str, 
    db: Session = Depends(get_db),
    _: bool = Depends(PermissionChecker([Permission.DELETE]))
):
    if crud.delete_obs(db, obs_id=obs_id) is None:
        raise HTTPException(status_code=404, detail="OBS not found")
    return {"ok": True}
