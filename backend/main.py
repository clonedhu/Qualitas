from fastapi import FastAPI, Depends, HTTPException, status, APIRouter
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models, schemas, crud
from database import engine, get_db
from sqlalchemy import text
from fastapi import Request
from fastapi.responses import JSONResponse
import logging

# Setup Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables
models.Base.metadata.create_all(bind=engine)

# Migration: Add unique constraint to reference_sequences (project, vendor, doc)
try:
    with engine.connect() as conn:
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_ref_seq_unique ON reference_sequences (project, vendor, doc)"))
        conn.commit()
except Exception:
    pass  # index may already exist

# Migration: Add unique indexes on reference/document number columns for each table
def add_unique_index_if_not_exists(table: str, column: str):
    try:
        with engine.connect() as conn:
            conn.execute(text(f"CREATE UNIQUE INDEX IF NOT EXISTS ix_{table}_{column}_unique ON {table} ({column})"))
            conn.commit()
    except Exception:
        pass  # index may already exist or column has duplicates

add_unique_index_if_not_exists("noi", "referenceNo")
add_unique_index_if_not_exists("itr", "documentNumber")
add_unique_index_if_not_exists("ncr", "documentNumber")
add_unique_index_if_not_exists("obs", "documentNumber")
add_unique_index_if_not_exists("itp", "referenceNo")
add_unique_index_if_not_exists("pqp", "pqpNo")

# Migration: Add missing columns to noi table if not exists
try:
    with engine.connect() as conn:
        # Check if column exists
        result = conn.execute(text("PRAGMA table_info(noi)"))
        columns = [row[1] for row in result]
        for col in ["attachments", "remark", "closeoutDate", "ncrNumber"]:
            if col not in columns:
                conn.execute(text(f"ALTER TABLE noi ADD COLUMN {col} TEXT"))
                conn.commit()
except Exception:
    pass


# Default document naming rules（若資料庫尚未有規則時使用）
DEFAULT_NAMING_RULES = [
    {"doc_type": "itp", "prefix": "QTS-[ABBREV]-ITP-", "sequence_digits": 6},
    {"doc_type": "noi", "prefix": "QTS-[ABBREV]-NOI-", "sequence_digits": 6},
    {"doc_type": "itr", "prefix": "QTS-[ABBREV]-ITR-", "sequence_digits": 6},
    {"doc_type": "ncr", "prefix": "QTS-[ABBREV]-NCR-", "sequence_digits": 6},
    {"doc_type": "obs", "prefix": "QTS-[ABBREV]-OBS-", "sequence_digits": 6},
    {"doc_type": "pqp", "prefix": "QTS-[ABBREV]-PQP-", "sequence_digits": 6},
    {"doc_type": "followup", "prefix": "QTS-[ABBREV]-FUI-", "sequence_digits": 6},
    {"doc_type": "fat", "prefix": "QTS-[ABBREV]-FAT-", "sequence_digits": 6},
]

# Add detail_data column to itp if missing (migration for existing DB)
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE itp ADD COLUMN detail_data TEXT"))
        conn.commit()
except Exception:
    pass  # column may already exist

# Add attachments column to obs if missing (migration for existing DB)
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE obs ADD COLUMN attachments TEXT"))
        conn.commit()
except Exception:
    pass  # column may already exist

# Migration: Add noiNumber column to NCR table (連結到觸發此 NCR 的 NOI)
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE ncr ADD COLUMN noiNumber VARCHAR"))
        conn.commit()
except Exception:
    pass  # column may already exist

# Migration: Add ncrNumber column to NOI table (若此 NOI 是針對 NCR 的重新檢驗)
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE noi ADD COLUMN ncrNumber VARCHAR"))
        conn.commit()
except Exception:
    pass  # column may already exist

# Migration: Rename itpNo to noiNumber in ITR table (連結到產生此 ITR 的 NOI)
# SQLite doesn't support RENAME COLUMN in older versions, so we add new column if missing
try:
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE itr ADD COLUMN noiNumber VARCHAR"))
        conn.commit()
except Exception:
    pass  # column may already exist

# Migration: Create document_naming_rules table if not exists
try:
    with engine.connect() as conn:
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS document_naming_rules (
                id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                doc_type VARCHAR NOT NULL,
                prefix VARCHAR NOT NULL,
                sequence_digits INTEGER NOT NULL DEFAULT 6
            )
        """))
        conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_document_naming_rules_doc_type ON document_naming_rules (doc_type)"))
        conn.commit()
except Exception:
    pass

# Seed default contractors if empty
def seed_default_contractors():
    from database import SessionLocal
    db = SessionLocal()
    try:
        if crud.get_contractors(db, limit=1) == []:
            for c in [
                {"package": "", "name": "廠商A", "abbreviation": "A", "scope": "電氣工程", "contactPerson": "張三", "email": "vendor-a@example.com", "phone": "02-1234-5678", "address": "台北市信義區信義路一段100號", "status": "active"},
                {"package": "", "name": "廠商B", "abbreviation": "B", "scope": "機械工程", "contactPerson": "李四", "email": "vendor-b@example.com", "phone": "02-2345-6789", "address": "新北市板橋區文化路二段200號", "status": "active"},
                {"package": "", "name": "廠商C", "abbreviation": "C", "scope": "土木工程", "contactPerson": "王五", "email": "vendor-c@example.com", "phone": "02-3456-7890", "address": "桃園市中壢區中正路三段300號", "status": "active"},
            ]:
                crud.create_contractor(db, schemas.ContractorCreate(**c))
    finally:
        db.close()

seed_default_contractors()

def seed_default_pqp():
    from database import SessionLocal
    db = SessionLocal()
    try:
        if crud.get_pqps(db, skip=0, limit=1) == []:
            today = datetime.now().strftime("%Y-%m-%d")
            crud.create_pqp(db, schemas.PQPCreate(
                pqpNo="PQP-001",
                title="範例品質計劃",
                description="這是一個範例品質計劃描述",
                vendor="廠商A",
                status="Approved",
                version="Rev1.0",
                createdAt=today,
                updatedAt=today,
            ))
    finally:
        db.close()

seed_default_pqp()

app = FastAPI()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global Exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )

# Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "your-secret-key-keep-it-secret"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Fake Users DB
fake_users_db = {
    "admin@example.com": {
        "username": "admin@example.com",
        "password": pwd_context.hash("admin"),
        "disabled": False,
    }
}

# Auth Models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class User(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    disabled: Optional[bool] = None

# Auth Functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user_dict = fake_users_db.get(token_data.username)
    if user_dict is None:
        raise credentials_exception
    return User(**user_dict)

# All API routes under /api prefix
api = APIRouter(prefix="/api")

@api.post("/auth/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user_dict = fake_users_db.get(form_data.username)
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not verify_password(form_data.password, user_dict["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_dict["username"]}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api.get("/auth/verify")
async def auth_verify(current_user: User = Depends(get_current_user)):
    return {"ok": True}

@api.get("/user/profile", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@api.get("/settings/naming-rules", response_model=List[schemas.NamingRule])
def get_naming_rules(db: Session = Depends(get_db)):
    """
    取得目前文件命名規則。
    若資料表為空，會先寫入預設規則後再回傳。
    """
    rules = db.query(models.DocumentNamingRule).all()
    if not rules:
        for r in DEFAULT_NAMING_RULES:
            # 避免重複建立相同 doc_type
            if not db.query(models.DocumentNamingRule).filter(
                models.DocumentNamingRule.doc_type == r["doc_type"]
            ).first():
                db.add(models.DocumentNamingRule(**r))
        db.commit()
        rules = db.query(models.DocumentNamingRule).all()
    return rules


@api.put("/settings/naming-rules", response_model=List[schemas.NamingRule])
def update_naming_rules(
    rules: List[schemas.NamingRuleBase],
    db: Session = Depends(get_db),
):
    """
    更新文件命名規則：
    - 依 doc_type 小寫為 key 做 upsert
    """
    try:
        for rule in rules:
            doc_type_normalized = (rule.doc_type or "").strip().lower()
            if not doc_type_normalized:
                continue
            seq_digits = rule.sequence_digits
            if seq_digits is None or seq_digits < 1 or seq_digits > 6:
                seq_digits = 6
            db_rule = db.query(models.DocumentNamingRule).filter(
                models.DocumentNamingRule.doc_type == doc_type_normalized
            ).first()
            if db_rule:
                db_rule.prefix = rule.prefix or ""
                db_rule.sequence_digits = seq_digits
            else:
                db.add(
                    models.DocumentNamingRule(
                        doc_type=doc_type_normalized,
                        prefix=rule.prefix or "",
                        sequence_digits=seq_digits,
                    )
                )
        db.commit()
        return db.query(models.DocumentNamingRule).all()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ITP Routes
@api.post("/itp/", response_model=schemas.ITP)
def create_itp(itp: schemas.ITPCreate, db: Session = Depends(get_db)):
    return crud.create_itp(db=db, itp=itp)

@api.get("/itp/", response_model=List[schemas.ITP])
def read_itps(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    itps = crud.get_itps(db, skip=skip, limit=limit)
    return itps

@api.get("/itp/{itp_id}", response_model=schemas.ITP)
def read_itp(itp_id: str, db: Session = Depends(get_db)):
    db_itp = crud.get_itp(db, itp_id=itp_id)
    if db_itp is None:
        raise HTTPException(status_code=404, detail="ITP not found")
    return db_itp

@api.put("/itp/{itp_id}", response_model=schemas.ITP)
def update_itp(itp_id: str, itp: schemas.ITPUpdate, db: Session = Depends(get_db)):
    db_itp = crud.update_itp(db, itp_id=itp_id, itp=itp)
    if db_itp is None:
        raise HTTPException(status_code=404, detail="ITP not found")
    return db_itp

@api.delete("/itp/{itp_id}")
def delete_itp(itp_id: str, db: Session = Depends(get_db)):
    db_itp = crud.delete_itp(db, itp_id=itp_id)
    if db_itp is None:
        raise HTTPException(status_code=404, detail="ITP not found")
    return {"ok": True}

@api.put("/itp/{itp_id}/detail", response_model=schemas.ITP)
def update_itp_detail(itp_id: str, body: schemas.ITPDetailBody, db: Session = Depends(get_db)):
    db_itp = crud.update_itp_detail(db, itp_id=itp_id, detail_body=body.dict())
    if db_itp is None:
        raise HTTPException(status_code=404, detail="ITP not found")
    return db_itp

# NCR Routes
@api.get("/ncr/", response_model=List[schemas.NCR])
def read_ncrs(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    return crud.get_ncrs(db, skip=skip, limit=limit)

@api.get("/ncr/{ncr_id}", response_model=schemas.NCR)
def read_ncr(ncr_id: str, db: Session = Depends(get_db)):
    db_ncr = crud.get_ncr(db, ncr_id=ncr_id)
    if db_ncr is None:
        raise HTTPException(status_code=404, detail="NCR not found")
    return db_ncr

@api.post("/ncr/", response_model=schemas.NCR)
def create_ncr(ncr: schemas.NCRCreate, db: Session = Depends(get_db)):
    return crud.create_ncr(db=db, ncr=ncr)

@api.put("/ncr/{ncr_id}", response_model=schemas.NCR)
def update_ncr(ncr_id: str, ncr: schemas.NCRUpdate, db: Session = Depends(get_db)):
    db_ncr = crud.update_ncr(db, ncr_id=ncr_id, ncr=ncr)
    if db_ncr is None:
        raise HTTPException(status_code=404, detail="NCR not found")
    return db_ncr

@api.delete("/ncr/{ncr_id}")
def delete_ncr(ncr_id: str, db: Session = Depends(get_db)):
    if crud.delete_ncr(db, ncr_id=ncr_id) is None:
        raise HTTPException(status_code=404, detail="NCR not found")
    return {"ok": True}

# NOI Routes
@api.get("/noi/", response_model=List[schemas.NOI])
def read_nois(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    return crud.get_nois(db, skip=skip, limit=limit)

@api.post("/noi/", response_model=schemas.NOI)
def create_noi(noi: schemas.NOICreate, db: Session = Depends(get_db)):
    return crud.create_noi(db=db, noi=noi)

@api.post("/noi/bulk/", response_model=List[schemas.NOI])
def create_nois_bulk(nois: List[schemas.NOICreate], db: Session = Depends(get_db)):
    """批次建立多筆 NOI，每筆都會自動產生 Reference No"""
    created = []
    for noi in nois:
        created.append(crud.create_noi(db=db, noi=noi))
    return created

@api.get("/noi/{noi_id}", response_model=schemas.NOI)
def read_noi(noi_id: str, db: Session = Depends(get_db)):
    db_noi = crud.get_noi(db, noi_id=noi_id)
    if db_noi is None:
        raise HTTPException(status_code=404, detail="NOI not found")
    return db_noi

@api.put("/noi/{noi_id}", response_model=schemas.NOI)
def update_noi(noi_id: str, noi: schemas.NOIUpdate, db: Session = Depends(get_db)):
    db_noi = crud.update_noi(db, noi_id=noi_id, noi=noi)
    if db_noi is None:
        raise HTTPException(status_code=404, detail="NOI not found")
    return db_noi

@api.delete("/noi/{noi_id}")
def delete_noi(noi_id: str, db: Session = Depends(get_db)):
    if crud.delete_noi(db, noi_id=noi_id) is None:
        raise HTTPException(status_code=404, detail="NOI not found")
    return {"ok": True}

# ITR Routes
@api.get("/itr/", response_model=List[schemas.ITR])
def read_itrs(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    return crud.get_itrs(db, skip=skip, limit=limit)

@api.get("/itr/{itr_id}", response_model=schemas.ITR)
def read_itr(itr_id: str, db: Session = Depends(get_db)):
    db_itr = crud.get_itr(db, itr_id=itr_id)
    if db_itr is None:
        raise HTTPException(status_code=404, detail="ITR not found")
    return db_itr

@api.post("/itr/", response_model=schemas.ITR)
def create_itr(itr: schemas.ITRCreate, db: Session = Depends(get_db)):
    return crud.create_itr(db=db, itr=itr)

@api.put("/itr/{itr_id}", response_model=schemas.ITR)
def update_itr(itr_id: str, itr: schemas.ITRUpdate, db: Session = Depends(get_db)):
    db_itr = crud.update_itr(db, itr_id=itr_id, itr=itr)
    if db_itr is None:
        raise HTTPException(status_code=404, detail="ITR not found")
    return db_itr

@api.delete("/itr/{itr_id}")
def delete_itr(itr_id: str, db: Session = Depends(get_db)):
    if crud.delete_itr(db, itr_id=itr_id) is None:
        raise HTTPException(status_code=404, detail="ITR not found")
    return {"ok": True}

# PQP Routes
@api.get("/pqp/", response_model=List[schemas.PQP])
def read_pqps(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    return crud.get_pqps(db, skip=skip, limit=limit)

@api.get("/pqp/{pqp_id}", response_model=schemas.PQP)
def read_pqp(pqp_id: str, db: Session = Depends(get_db)):
    db_pqp = crud.get_pqp(db, pqp_id=pqp_id)
    if db_pqp is None:
        raise HTTPException(status_code=404, detail="PQP not found")
    return db_pqp

@api.post("/pqp/", response_model=schemas.PQP)
def create_pqp(pqp: schemas.PQPCreate, db: Session = Depends(get_db)):
    return crud.create_pqp(db=db, pqp=pqp)

@api.put("/pqp/{pqp_id}", response_model=schemas.PQP)
def update_pqp(pqp_id: str, pqp: schemas.PQPUpdate, db: Session = Depends(get_db)):
    db_pqp = crud.update_pqp(db, pqp_id=pqp_id, pqp=pqp)
    if db_pqp is None:
        raise HTTPException(status_code=404, detail="PQP not found")
    return db_pqp

@api.delete("/pqp/{pqp_id}")
def delete_pqp(pqp_id: str, db: Session = Depends(get_db)):
    if crud.delete_pqp(db, pqp_id=pqp_id) is None:
        raise HTTPException(status_code=404, detail="PQP not found")
    return {"ok": True}

# OBS Routes
@api.get("/obs/", response_model=List[schemas.OBS])
def read_obss(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    return crud.get_obss(db, skip=skip, limit=limit)

@api.get("/obs/{obs_id}", response_model=schemas.OBS)
def read_obs(obs_id: str, db: Session = Depends(get_db)):
    db_obs = crud.get_obs(db, obs_id=obs_id)
    if db_obs is None:
        raise HTTPException(status_code=404, detail="OBS not found")
    return db_obs

@api.post("/obs/", response_model=schemas.OBS)
def create_obs(obs: schemas.OBSCreate, db: Session = Depends(get_db)):
    return crud.create_obs(db=db, obs=obs)

@api.put("/obs/{obs_id}", response_model=schemas.OBS)
def update_obs(obs_id: str, obs: schemas.OBSUpdate, db: Session = Depends(get_db)):
    db_obs = crud.update_obs(db, obs_id=obs_id, obs=obs)
    if db_obs is None:
        raise HTTPException(status_code=404, detail="OBS not found")
    return db_obs

@api.delete("/obs/{obs_id}")
def delete_obs(obs_id: str, db: Session = Depends(get_db)):
    if crud.delete_obs(db, obs_id=obs_id) is None:
        raise HTTPException(status_code=404, detail="OBS not found")
    return {"ok": True}

# Contractors Routes
@api.get("/contractors/", response_model=List[schemas.Contractor])
def read_contractors(skip: int = 0, limit: int = 500, db: Session = Depends(get_db)):
    return crud.get_contractors(db, skip=skip, limit=limit)

@api.get("/contractors/{contractor_id}", response_model=schemas.Contractor)
def read_contractor(contractor_id: str, db: Session = Depends(get_db)):
    db_c = crud.get_contractor(db, contractor_id=contractor_id)
    if db_c is None:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return db_c

@api.post("/contractors/", response_model=schemas.Contractor)
def create_contractor(contractor: schemas.ContractorCreate, db: Session = Depends(get_db)):
    return crud.create_contractor(db=db, contractor=contractor)

@api.put("/contractors/{contractor_id}", response_model=schemas.Contractor)
def update_contractor(contractor_id: str, contractor: schemas.ContractorUpdate, db: Session = Depends(get_db)):
    db_c = crud.update_contractor(db, contractor_id=contractor_id, contractor=contractor)
    if db_c is None:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return db_c

@api.delete("/contractors/{contractor_id}")
def delete_contractor(contractor_id: str, db: Session = Depends(get_db)):
    if crud.delete_contractor(db, contractor_id=contractor_id) is None:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return {"ok": True}

# Mount API router
app.include_router(api)

@app.get("/")
def read_root():
    return {"message": "Qualitas API is running"}
