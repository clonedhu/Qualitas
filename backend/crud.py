from sqlalchemy.orm import Session
from models import (
    ITP,
    NCR,
    NOI,
    ITR,
    PQP,
    OBS,
    Contractor,
    ReferenceSequence,
    DocumentNamingRule,
)
from schemas import (
    ITPCreate, ITPUpdate,
    NCRCreate, NCRUpdate,
    NOICreate, NOIUpdate,
    ITRCreate, ITRUpdate,
    PQPCreate, PQPUpdate,
    OBSCreate, OBSUpdate,
    ContractorCreate, ContractorUpdate,
)
import uuid
import json
import re

# 固定專案代碼
PROJECT_CODE = "QTS"

def _json_serialize(d: dict, list_fields: list):
    d = d.copy()
    for k in list_fields:
        if k in d and d[k] is not None and isinstance(d[k], list):
            d[k] = json.dumps(d[k])
    return d


def get_contractor_abbreviation(db: Session, vendor_name: str) -> str:
    """根據廠商名稱取得縮寫，若找不到則用名稱前 3 字元大寫"""
    if not vendor_name:
        return "NA"
    contractor = db.query(Contractor).filter(Contractor.name == vendor_name).first()
    if contractor and contractor.abbreviation:
        return contractor.abbreviation.upper()
    # fallback: 用名稱前 3 字元
    return re.sub(r'[^A-Z0-9]', '', vendor_name.upper()[:10]) or "NA"


def generate_reference_no(db: Session, vendor_name: str, doc_type: str) -> str:
    """
    產生 Reference No：
    - 先依 doc_type 讀取 DocumentNamingRule（若存在則依規則組前綴與流水號位數）
    - 若無規則則 fallback 為 QTS-[VENDOR]-[DOC]-[SEQ6]
    - 序號以 (PROJECT, VENDOR, DOC) 為 key 各自累加
    - 使用交易確保不撞號
    """
    vendor_abbrev = get_contractor_abbreviation(db, vendor_name)

    # 嘗試讀取文件命名規則（以 doc_type 小寫對應，如 ITP -> itp）
    rule = db.query(DocumentNamingRule).filter(
        DocumentNamingRule.doc_type == doc_type.lower()
    ).first()
    seq_digits = rule.sequence_digits if rule and rule.sequence_digits else 6

    # 查詢或建立序號記錄
    seq_record = db.query(ReferenceSequence).filter(
        ReferenceSequence.project == PROJECT_CODE,
        ReferenceSequence.vendor == vendor_abbrev,
        ReferenceSequence.doc == doc_type
    ).with_for_update().first()  # 加鎖防止並發
    
    if seq_record:
        seq_record.last_seq += 1
        next_seq = seq_record.last_seq
    else:
        # 第一次建立該組合，檢查既有資料中是否有符合新格式的編號
        next_seq = 1
        seq_record = ReferenceSequence(
            project=PROJECT_CODE,
            vendor=vendor_abbrev,
            doc=doc_type,
            last_seq=next_seq
        )
        db.add(seq_record)
    
    db.flush()  # 確保序號已寫入

    # 依規則組合編號；若沒有規則則走 fallback
    if rule and rule.prefix:
        seq_str = str(next_seq).zfill(seq_digits)
        prefix = rule.prefix.replace('[ABBREV]', vendor_abbrev)
        return f"{prefix}{seq_str}"

    # Fallback：維持舊有格式 QTS-A-DOC-000001
    seq_str = str(next_seq).zfill(6)
    return f"{PROJECT_CODE}-{vendor_abbrev}-{doc_type}-{seq_str}"

# ---- ITP ----
def get_itp(db: Session, itp_id: str):
    return db.query(ITP).filter(ITP.id == itp_id).first()

def get_itps(db: Session, skip: int = 0, limit: int = 100):
    return db.query(ITP).offset(skip).limit(limit).all()

def create_itp(db: Session, itp: ITPCreate):
    data = itp.dict()
    # 自動產生 Reference No（若未提供或為空）
    if not data.get('referenceNo'):
        data['referenceNo'] = generate_reference_no(db, data.get('vendor', ''), 'ITP')
    db_itp = ITP(**data)
    if not db_itp.id:
        db_itp.id = str(uuid.uuid4())
    db.add(db_itp)
    db.commit()
    db.refresh(db_itp)
    return db_itp

def update_itp(db: Session, itp_id: str, itp: ITPUpdate):
    db_itp = db.query(ITP).filter(ITP.id == itp_id).first()
    if db_itp:
        for key, value in itp.dict().items():
            setattr(db_itp, key, value)
        db.commit()
        db.refresh(db_itp)
    return db_itp

def delete_itp(db: Session, itp_id: str):
    db_itp = db.query(ITP).filter(ITP.id == itp_id).first()
    if db_itp:
        db.delete(db_itp)
        db.commit()
    return db_itp

def update_itp_detail(db: Session, itp_id: str, detail_body: dict):
    db_itp = db.query(ITP).filter(ITP.id == itp_id).first()
    if db_itp:
        db_itp.detail_data = json.dumps(detail_body) if detail_body else None
        db.commit()
        db.refresh(db_itp)
    return db_itp

# ---- NCR ----
def get_ncr(db: Session, ncr_id: str):
    return db.query(NCR).filter(NCR.id == ncr_id).first()

def get_ncrs(db: Session, skip: int = 0, limit: int = 500):
    return db.query(NCR).offset(skip).limit(limit).all()

def create_ncr(db: Session, ncr: NCRCreate):
    d = _json_serialize(ncr.dict(), ['defectPhotos', 'improvementPhotos'])
    # 自動產生 Reference No（若未提供或為空）
    if not d.get('documentNumber'):
        d['documentNumber'] = generate_reference_no(db, d.get('vendor', ''), 'NCR')
    db_ncr = NCR(**d)
    if not db_ncr.id:
        db_ncr.id = str(uuid.uuid4())
    db.add(db_ncr)
    db.commit()
    db.refresh(db_ncr)
    return db_ncr

def update_ncr(db: Session, ncr_id: str, ncr: NCRUpdate):
    db_ncr = db.query(NCR).filter(NCR.id == ncr_id).first()
    if db_ncr:
        d = ncr.dict(exclude_unset=True)
        d = _json_serialize(d, ['defectPhotos', 'improvementPhotos'])
        for key, value in d.items():
            setattr(db_ncr, key, value)
        db.commit()
        db.refresh(db_ncr)
    return db_ncr

def delete_ncr(db: Session, ncr_id: str):
    db_ncr = db.query(NCR).filter(NCR.id == ncr_id).first()
    if db_ncr:
        db.delete(db_ncr)
        db.commit()
        return db_ncr
    return None

# ---- NOI ----
def get_noi(db: Session, noi_id: str):
    return db.query(NOI).filter(NOI.id == noi_id).first()

def get_nois(db: Session, skip: int = 0, limit: int = 500):
    return db.query(NOI).offset(skip).limit(limit).all()

def create_noi(db: Session, noi: NOICreate):
    data = _json_serialize(noi.dict(), ['attachments'])
    # 自動產生 Reference No（若未提供或為空）
    if not data.get('referenceNo'):
        data['referenceNo'] = generate_reference_no(db, data.get('contractor', ''), 'NOI')
    db_noi = NOI(**data)
    if not db_noi.id:
        db_noi.id = str(uuid.uuid4())
    db.add(db_noi)
    db.commit()
    db.refresh(db_noi)
    return db_noi

def update_noi(db: Session, noi_id: str, noi: NOIUpdate):
    db_noi = db.query(NOI).filter(NOI.id == noi_id).first()
    if db_noi:
        d = _json_serialize(noi.dict(exclude_unset=True), ['attachments'])
        for key, value in d.items():
            setattr(db_noi, key, value)
        db.commit()
        db.refresh(db_noi)
    return db_noi

def delete_noi(db: Session, noi_id: str):
    db_noi = db.query(NOI).filter(NOI.id == noi_id).first()
    if db_noi:
        db.delete(db_noi)
        db.commit()
        return db_noi
    return None

# ---- ITR ----
def get_itr(db: Session, itr_id: str):
    return db.query(ITR).filter(ITR.id == itr_id).first()

def get_itrs(db: Session, skip: int = 0, limit: int = 500):
    return db.query(ITR).offset(skip).limit(limit).all()

def create_itr(db: Session, itr: ITRCreate):
    d = _json_serialize(itr.dict(), ['defectPhotos', 'improvementPhotos'])
    # 自動產生 Reference No（若未提供或為空）
    if not d.get('documentNumber'):
        d['documentNumber'] = generate_reference_no(db, d.get('vendor', ''), 'ITR')
    db_itr = ITR(**d)
    if not db_itr.id:
        db_itr.id = str(uuid.uuid4())
    db.add(db_itr)
    db.commit()
    db.refresh(db_itr)
    return db_itr

def update_itr(db: Session, itr_id: str, itr: ITRUpdate):
    db_itr = db.query(ITR).filter(ITR.id == itr_id).first()
    if db_itr:
        d = itr.dict(exclude_unset=True)
        d = _json_serialize(d, ['defectPhotos', 'improvementPhotos'])
        for key, value in d.items():
            setattr(db_itr, key, value)
        db.commit()
        db.refresh(db_itr)
    return db_itr

def delete_itr(db: Session, itr_id: str):
    db_itr = db.query(ITR).filter(ITR.id == itr_id).first()
    if db_itr:
        db.delete(db_itr)
        db.commit()
        return db_itr
    return None

# ---- PQP ----
def get_pqp(db: Session, pqp_id: str):
    return db.query(PQP).filter(PQP.id == pqp_id).first()

def get_pqps(db: Session, skip: int = 0, limit: int = 500):
    return db.query(PQP).offset(skip).limit(limit).all()

def create_pqp(db: Session, pqp: PQPCreate):
    data = pqp.dict()
    # 自動產生 Reference No（若未提供或為空）
    if not data.get('pqpNo'):
        data['pqpNo'] = generate_reference_no(db, data.get('vendor', ''), 'PQP')
    db_pqp = PQP(**data)
    if not db_pqp.id:
        db_pqp.id = str(uuid.uuid4())
    db.add(db_pqp)
    db.commit()
    db.refresh(db_pqp)
    return db_pqp

def update_pqp(db: Session, pqp_id: str, pqp: PQPUpdate):
    db_pqp = db.query(PQP).filter(PQP.id == pqp_id).first()
    if db_pqp:
        for key, value in pqp.dict(exclude_unset=True).items():
            setattr(db_pqp, key, value)
        db.commit()
        db.refresh(db_pqp)
    return db_pqp

def delete_pqp(db: Session, pqp_id: str):
    db_pqp = db.query(PQP).filter(PQP.id == pqp_id).first()
    if db_pqp:
        db.delete(db_pqp)
        db.commit()
        return db_pqp
    return None

# ---- OBS ----
def get_obs(db: Session, obs_id: str):
    return db.query(OBS).filter(OBS.id == obs_id).first()

def get_obss(db: Session, skip: int = 0, limit: int = 500):
    return db.query(OBS).offset(skip).limit(limit).all()

def create_obs(db: Session, obs: OBSCreate):
    d = _json_serialize(obs.dict(), ['defectPhotos', 'improvementPhotos', 'attachments'])
    # 自動產生 Reference No（若未提供或為空）
    if not d.get('documentNumber'):
        d['documentNumber'] = generate_reference_no(db, d.get('vendor', ''), 'OBS')
    db_obs = OBS(**d)
    if not db_obs.id:
        db_obs.id = str(uuid.uuid4())
    db.add(db_obs)
    db.commit()
    db.refresh(db_obs)
    return db_obs

def update_obs(db: Session, obs_id: str, obs: OBSUpdate):
    db_obs = db.query(OBS).filter(OBS.id == obs_id).first()
    if db_obs:
        d = obs.dict(exclude_unset=True)
        d = _json_serialize(d, ['defectPhotos', 'improvementPhotos', 'attachments'])
        for key, value in d.items():
            setattr(db_obs, key, value)
        db.commit()
        db.refresh(db_obs)
    return db_obs

def delete_obs(db: Session, obs_id: str):
    db_obs = db.query(OBS).filter(OBS.id == obs_id).first()
    if db_obs:
        db.delete(db_obs)
        db.commit()
        return db_obs
    return None

# ---- Contractor ----
def get_contractor(db: Session, contractor_id: str):
    return db.query(Contractor).filter(Contractor.id == contractor_id).first()

def get_contractors(db: Session, skip: int = 0, limit: int = 500):
    return db.query(Contractor).offset(skip).limit(limit).all()

def create_contractor(db: Session, contractor: ContractorCreate):
    db_c = Contractor(**contractor.dict())
    if not db_c.id:
        db_c.id = str(uuid.uuid4())
    db.add(db_c)
    db.commit()
    db.refresh(db_c)
    return db_c

def update_contractor(db: Session, contractor_id: str, contractor: ContractorUpdate):
    db_c = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if db_c:
        for key, value in contractor.dict(exclude_unset=True).items():
            setattr(db_c, key, value)
        db.commit()
        db.refresh(db_c)
    return db_c

def delete_contractor(db: Session, contractor_id: str):
    db_c = db.query(Contractor).filter(Contractor.id == contractor_id).first()
    if db_c:
        db.delete(db_c)
        db.commit()
        return db_c
    return None
