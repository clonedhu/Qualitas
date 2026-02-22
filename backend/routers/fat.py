
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import crud
import schemas
from core.dependencies import RoleChecker
from core.perms import FAT_CREATE, FAT_DELETE, FAT_UPDATE, FAT_VIEW
from database import get_db

router = APIRouter(
    prefix="/fat",
    tags=["fat"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", response_model=schemas.FAT)
def create_fat(
    fat: schemas.FATCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(RoleChecker(FAT_CREATE))
):
    return crud.create_fat(db=db, fat=fat, user_id=current_user.id, username=current_user.username)

@router.get("/", response_model=list[schemas.FAT])
def read_fats(
    skip: int = 0,
    limit: int = 100,
    search: str = None,
    status: str = None,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(RoleChecker(FAT_VIEW))
):
    fats = crud.get_fats(
        db,
        skip=skip,
        limit=limit,
        search=search,
        status=status,
        start_date=start_date,
        end_date=end_date
    )
    return fats

@router.get("/{fat_id}", response_model=schemas.FAT)
def read_fat(
    fat_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(RoleChecker(FAT_VIEW))
):
    db_fat = crud.get_fat(db, fat_id=fat_id)
    if db_fat is None:
        raise HTTPException(status_code=404, detail="FAT not found")
    return db_fat

@router.put("/{fat_id}", response_model=schemas.FAT)
def update_fat(
    fat_id: str,
    fat: schemas.FATUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(RoleChecker(FAT_UPDATE))
):
    db_fat = crud.update_fat(db, fat_id=fat_id, fat=fat, user_id=current_user.id, username=current_user.username)
    if db_fat is None:
        raise HTTPException(status_code=404, detail="FAT not found")
    return db_fat

@router.delete("/{fat_id}")
def delete_fat(
    fat_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(RoleChecker(FAT_DELETE))
):
    db_fat = crud.delete_fat(db, fat_id=fat_id, user_id=current_user.id, username=current_user.username)
    if db_fat is None:
        raise HTTPException(status_code=404, detail="FAT not found")
    return {"ok": True}

@router.put("/{fat_id}/details", response_model=schemas.FAT)
def update_fat_detail(
    fat_id: str,
    details: list[schemas.FATDetailItem],
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(RoleChecker(FAT_UPDATE))
):
    details_data = [item.dict() for item in details]
    db_fat = crud.update_fat_detail(db, fat_id=fat_id, details=details_data, user_id=current_user.id, username=current_user.username)
    if db_fat is None:
        raise HTTPException(status_code=404, detail="FAT not found")
    return db_fat
