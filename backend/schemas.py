from pydantic import BaseModel, field_validator
from typing import Optional, List, Any
import json

class ITPBase(BaseModel):
    vendor: str
    referenceNo: Optional[str] = None  # 由後端自動產生
    description: Optional[str] = ''
    rev: Optional[str] = ''
    submit: Optional[str] = ''
    status: str
    remark: Optional[str] = None
    hasDetails: Optional[bool] = False
    submissionDate: Optional[str] = None
    detail_data: Optional[str] = None

class ITPCreate(ITPBase):
    id: Optional[str] = None

class ITPUpdate(BaseModel):
    """ITP 更新用 schema，referenceNo 不可更新"""
    vendor: Optional[str] = None
    # referenceNo 不可更新（由後端自動產生，建立後不可變）
    description: Optional[str] = None
    rev: Optional[str] = None
    submit: Optional[str] = None
    status: Optional[str] = None
    remark: Optional[str] = None
    hasDetails: Optional[bool] = None
    submissionDate: Optional[str] = None
    detail_data: Optional[str] = None

class ITP(ITPBase):
    id: str

    class Config:
        from_attributes = True


class ITPDetailBody(BaseModel):
    a: List[Any] = []
    b: List[Any] = []
    c: List[Any] = []
    checklist: List[Any] = []
    self_inspection: Optional[Any] = None  # 自主檢查表


# NCR
class NCRBase(BaseModel):
    vendor: str
    documentNumber: Optional[str] = None  # 由後端自動產生
    description: str
    rev: str
    submit: str
    status: str
    remark: Optional[str] = None
    hasDetails: Optional[bool] = False
    raiseDate: Optional[str] = None
    closeoutDate: Optional[str] = None
    aconex: Optional[str] = None
    type: Optional[str] = None
    subject: Optional[str] = None
    foundBy: Optional[str] = None
    raisedBy: Optional[str] = None
    foundLocation: Optional[str] = None
    productDisposition: Optional[str] = None
    productIntegrityRelated: Optional[str] = None
    permanentProductDeviation: Optional[str] = None
    impactToOM: Optional[str] = None
    defectPhotos: Optional[Any] = None
    improvementPhotos: Optional[Any] = None
    noiNumber: Optional[str] = None  # 連結到觸發此 NCR 的 NOI

    @field_validator('defectPhotos', 'improvementPhotos', mode='before')
    @classmethod
    def parse_photos(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v

class NCRCreate(NCRBase):
    id: Optional[str] = None

class NCRUpdate(BaseModel):
    vendor: Optional[str] = None
    # documentNumber 不可更新（由後端自動產生，建立後不可變）
    description: Optional[str] = None
    rev: Optional[str] = None
    submit: Optional[str] = None
    status: Optional[str] = None
    remark: Optional[str] = None
    hasDetails: Optional[bool] = None
    raiseDate: Optional[str] = None
    closeoutDate: Optional[str] = None
    aconex: Optional[str] = None
    type: Optional[str] = None
    subject: Optional[str] = None
    foundBy: Optional[str] = None
    raisedBy: Optional[str] = None
    foundLocation: Optional[str] = None
    productDisposition: Optional[str] = None
    productIntegrityRelated: Optional[str] = None
    permanentProductDeviation: Optional[str] = None
    impactToOM: Optional[str] = None
    defectPhotos: Optional[Any] = None
    improvementPhotos: Optional[Any] = None
    noiNumber: Optional[str] = None

class NCR(NCRBase):
    id: str
    class Config:
        from_attributes = True


# NOI
class NOIBase(BaseModel):
    package: str
    referenceNo: Optional[str] = None  # 由後端自動產生
    issueDate: str
    inspectionTime: str
    itpNo: str  # 連結到 ITP referenceNo
    eventNumber: Optional[str] = None
    checkpoint: Optional[str] = None
    inspectionDate: str
    type: str
    contractor: str
    contacts: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    remark: Optional[str] = None
    closeoutDate: Optional[str] = None
    attachments: Optional[List[str]] = []
    ncrNumber: Optional[str] = None  # 若此 NOI 是針對 NCR 的重新檢驗

    @field_validator('attachments', mode='before')
    @classmethod
    def parse_attachments(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v

class NOICreate(NOIBase):
    id: Optional[str] = None

class NOIUpdate(BaseModel):
    package: Optional[str] = None
    # referenceNo 不可更新（由後端自動產生，建立後不可變）
    issueDate: Optional[str] = None
    inspectionTime: Optional[str] = None
    itpNo: Optional[str] = None
    eventNumber: Optional[str] = None
    checkpoint: Optional[str] = None
    inspectionDate: Optional[str] = None
    type: Optional[str] = None
    contractor: Optional[str] = None
    contacts: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    remark: Optional[str] = None
    closeoutDate: Optional[str] = None
    attachments: Optional[List[str]] = None
    ncrNumber: Optional[str] = None

class NOI(NOIBase):
    id: str
    class Config:
        from_attributes = True


# ITR
class ITRBase(BaseModel):
    vendor: str
    documentNumber: Optional[str] = None  # 由後端自動產生
    description: str
    rev: str
    submit: str
    status: str
    remark: Optional[str] = None
    hasDetails: Optional[bool] = False
    raiseDate: Optional[str] = None
    closeoutDate: Optional[str] = None
    aconex: Optional[str] = None
    type: Optional[str] = None
    subject: Optional[str] = None
    ncrNumber: Optional[str] = None  # 若檢驗失敗，連結到產生的 NCR
    raisedBy: Optional[str] = None
    foundLocation: Optional[str] = None
    noiNumber: Optional[str] = None  # 連結到產生此 ITR 的 NOI（取代舊的 itpNo）
    eventNumber: Optional[str] = None
    checkpoint: Optional[str] = None
    defectPhotos: Optional[Any] = None
    improvementPhotos: Optional[Any] = None

class ITRCreate(ITRBase):
    id: Optional[str] = None

class ITRUpdate(BaseModel):
    vendor: Optional[str] = None
    # documentNumber 不可更新（由後端自動產生，建立後不可變）
    description: Optional[str] = None
    rev: Optional[str] = None
    submit: Optional[str] = None
    status: Optional[str] = None
    remark: Optional[str] = None
    hasDetails: Optional[bool] = None
    raiseDate: Optional[str] = None
    closeoutDate: Optional[str] = None
    aconex: Optional[str] = None
    type: Optional[str] = None
    subject: Optional[str] = None
    ncrNumber: Optional[str] = None
    raisedBy: Optional[str] = None
    foundLocation: Optional[str] = None
    noiNumber: Optional[str] = None
    eventNumber: Optional[str] = None
    checkpoint: Optional[str] = None
    defectPhotos: Optional[Any] = None
    improvementPhotos: Optional[Any] = None

class ITR(ITRBase):
    id: str
    class Config:
        from_attributes = True


# PQP
class PQPBase(BaseModel):
    pqpNo: Optional[str] = None  # 由後端自動產生
    title: str
    description: str
    vendor: str
    status: str
    version: str
    createdAt: str
    updatedAt: str

class PQPCreate(PQPBase):
    id: Optional[str] = None
    pqpNo: Optional[str] = ''
    title: Optional[str] = ''
    description: Optional[str] = ''
    vendor: Optional[str] = ''
    status: Optional[str] = 'Approved'
    version: Optional[str] = 'Rev1.0'
    createdAt: Optional[str] = ''
    updatedAt: Optional[str] = ''

class PQPUpdate(BaseModel):
    # pqpNo 不可更新（由後端自動產生，建立後不可變）
    title: Optional[str] = None
    description: Optional[str] = None
    vendor: Optional[str] = None
    status: Optional[str] = None
    version: Optional[str] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

class PQP(PQPBase):
    id: str
    class Config:
        from_attributes = True


# OBS
class OBSBase(BaseModel):
    vendor: str
    documentNumber: Optional[str] = None  # 由後端自動產生
    description: str
    rev: str
    submit: str
    status: str
    remark: Optional[str] = None
    hasDetails: Optional[bool] = False
    raiseDate: Optional[str] = None
    closeoutDate: Optional[str] = None
    aconex: Optional[str] = None
    type: Optional[str] = None
    subject: Optional[str] = None
    foundBy: Optional[str] = None
    raisedBy: Optional[str] = None
    foundLocation: Optional[str] = None
    productDisposition: Optional[str] = None
    productIntegrityRelated: Optional[str] = None
    permanentProductDeviation: Optional[str] = None
    impactToOM: Optional[str] = None
    defectPhotos: Optional[Any] = None
    improvementPhotos: Optional[Any] = None
    attachments: Optional[Any] = None

class OBSCreate(OBSBase):
    id: Optional[str] = None

class OBSUpdate(BaseModel):
    vendor: Optional[str] = None
    # documentNumber 不可更新（由後端自動產生，建立後不可變）
    description: Optional[str] = None
    rev: Optional[str] = None
    submit: Optional[str] = None
    status: Optional[str] = None
    remark: Optional[str] = None
    hasDetails: Optional[bool] = None
    raiseDate: Optional[str] = None
    closeoutDate: Optional[str] = None
    aconex: Optional[str] = None
    type: Optional[str] = None
    subject: Optional[str] = None
    foundBy: Optional[str] = None
    raisedBy: Optional[str] = None
    foundLocation: Optional[str] = None
    productDisposition: Optional[str] = None
    productIntegrityRelated: Optional[str] = None
    permanentProductDeviation: Optional[str] = None
    impactToOM: Optional[str] = None
    defectPhotos: Optional[Any] = None
    improvementPhotos: Optional[Any] = None
    attachments: Optional[Any] = None

class OBS(OBSBase):
    id: str
    class Config:
        from_attributes = True


# Contractor
class ContractorBase(BaseModel):
    package: Optional[str] = None
    name: str
    abbreviation: Optional[str] = None
    scope: Optional[str] = None
    contactPerson: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    status: str = "active"

class ContractorCreate(ContractorBase):
    id: Optional[str] = None

class ContractorUpdate(BaseModel):
    package: Optional[str] = None
    name: Optional[str] = None
    abbreviation: Optional[str] = None
    scope: Optional[str] = None
    contactPerson: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    status: Optional[str] = None

class Contractor(ContractorBase):
    id: str
    class Config:
        from_attributes = True


# Document Naming Rules
class NamingRuleBase(BaseModel):
    doc_type: str
    prefix: str
    sequence_digits: int


class NamingRule(NamingRuleBase):
    id: int

    class Config:
        from_attributes = True
