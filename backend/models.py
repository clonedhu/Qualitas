from sqlalchemy import Column, Integer, String, Boolean, Text
from database import Base

class ITP(Base):
    __tablename__ = "itp"

    id = Column(String, primary_key=True, index=True)
    vendor = Column(String, index=True)
    referenceNo = Column(String, index=True)  # 由後端自動產生
    description = Column(String, nullable=True)
    rev = Column(String, nullable=True)
    submit = Column(String, nullable=True)
    status = Column(String)
    remark = Column(String, nullable=True)
    hasDetails = Column(Boolean, default=False)
    submissionDate = Column(String, nullable=True)
    detail_data = Column(Text, nullable=True)  # JSON: { a: [], b: [], c: [] }


class NCR(Base):
    __tablename__ = "ncr"

    id = Column(String, primary_key=True, index=True)
    vendor = Column(String, index=True)
    documentNumber = Column(String, index=True)
    description = Column(String)
    rev = Column(String)
    submit = Column(String)
    status = Column(String)
    remark = Column(String, nullable=True)
    hasDetails = Column(Boolean, default=False)
    raiseDate = Column(String, nullable=True)
    closeoutDate = Column(String, nullable=True)
    aconex = Column(String, nullable=True)
    type = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    foundBy = Column(String, nullable=True)
    raisedBy = Column(String, nullable=True)
    foundLocation = Column(String, nullable=True)
    productDisposition = Column(String, nullable=True)
    productIntegrityRelated = Column(String, nullable=True)
    permanentProductDeviation = Column(String, nullable=True)
    impactToOM = Column(String, nullable=True)
    defectPhotos = Column(Text, nullable=True)  # JSON array as string
    improvementPhotos = Column(Text, nullable=True)
    noiNumber = Column(String, nullable=True, index=True)  # 連結到觸發此 NCR 的 NOI


class NOI(Base):
    __tablename__ = "noi"

    id = Column(String, primary_key=True, index=True)
    package = Column(String, index=True)
    referenceNo = Column(String, index=True)
    issueDate = Column(String)
    inspectionTime = Column(String)
    itpNo = Column(String, index=True)  # 連結到 ITP referenceNo
    eventNumber = Column(String, nullable=True)
    checkpoint = Column(String, nullable=True)
    inspectionDate = Column(String)
    type = Column(String)
    contractor = Column(String, index=True)
    contacts = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    status = Column(String, nullable=True)
    remark = Column(String, nullable=True)
    closeoutDate = Column(String, nullable=True)
    attachments = Column(Text, nullable=True)  # JSON array as string
    ncrNumber = Column(String, nullable=True, index=True)  # 若此 NOI 是針對 NCR 的重新檢驗


class ITR(Base):
    __tablename__ = "itr"

    id = Column(String, primary_key=True, index=True)
    vendor = Column(String, index=True)
    documentNumber = Column(String, index=True)
    description = Column(String)
    rev = Column(String)
    submit = Column(String)
    status = Column(String)
    remark = Column(String, nullable=True)
    hasDetails = Column(Boolean, default=False)
    raiseDate = Column(String, nullable=True)
    closeoutDate = Column(String, nullable=True)
    aconex = Column(String, nullable=True)
    type = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    ncrNumber = Column(String, nullable=True, index=True)  # 若檢驗失敗，連結到產生的 NCR
    raisedBy = Column(String, nullable=True)
    foundLocation = Column(String, nullable=True)
    noiNumber = Column(String, nullable=True, index=True)  # 連結到產生此 ITR 的 NOI（取代舊的 itpNo）
    eventNumber = Column(String, nullable=True)
    checkpoint = Column(String, nullable=True)
    defectPhotos = Column(Text, nullable=True)
    improvementPhotos = Column(Text, nullable=True)


class PQP(Base):
    __tablename__ = "pqp"

    id = Column(String, primary_key=True, index=True)
    pqpNo = Column(String, index=True)
    title = Column(String)
    description = Column(String)
    vendor = Column(String, index=True)
    status = Column(String)
    version = Column(String)
    createdAt = Column(String)
    updatedAt = Column(String)


class OBS(Base):
    __tablename__ = "obs"

    id = Column(String, primary_key=True, index=True)
    vendor = Column(String, index=True)
    documentNumber = Column(String, index=True)
    description = Column(String)
    rev = Column(String)
    submit = Column(String)
    status = Column(String)
    remark = Column(String, nullable=True)
    hasDetails = Column(Boolean, default=False)
    raiseDate = Column(String, nullable=True)
    closeoutDate = Column(String, nullable=True)
    aconex = Column(String, nullable=True)
    type = Column(String, nullable=True)
    subject = Column(String, nullable=True)
    foundBy = Column(String, nullable=True)
    raisedBy = Column(String, nullable=True)
    foundLocation = Column(String, nullable=True)
    productDisposition = Column(String, nullable=True)
    productIntegrityRelated = Column(String, nullable=True)
    permanentProductDeviation = Column(String, nullable=True)
    impactToOM = Column(String, nullable=True)
    defectPhotos = Column(Text, nullable=True)
    improvementPhotos = Column(Text, nullable=True)
    attachments = Column(Text, nullable=True)


class Contractor(Base):
    __tablename__ = "contractors"

    id = Column(String, primary_key=True, index=True)
    package = Column(String, nullable=True)
    name = Column(String, index=True)
    abbreviation = Column(String, nullable=True)
    scope = Column(String, nullable=True)
    contactPerson = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)
    status = Column(String, default="active")


class ReferenceSequence(Base):
    """序號表：用於自動產生 Reference No，以 (project, vendor, doc) 為 key 各自累加"""
    __tablename__ = "reference_sequences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project = Column(String, nullable=False, index=True)  # 固定 QTS
    vendor = Column(String, nullable=False, index=True)   # 廠商縮寫 (abbreviation)
    doc = Column(String, nullable=False, index=True)      # NOI/ITR/NCR/OBS/ITP/PQP
    last_seq = Column(Integer, nullable=False, default=0) # 目前已發到的最大序號


class DocumentNamingRule(Base):
    """
    文件命名規則：
    - 依 doc_type（模組別）定義前綴與流水號位數
    - 前綴中可使用 [ABBREV] 代表廠商縮寫
    """
    __tablename__ = "document_naming_rules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    doc_type = Column(String, nullable=False, unique=True, index=True)  # itp/noi/itr/ncr/obs/pqp/followup/fat
    prefix = Column(String, nullable=False)                             # 例如 QTS-[ABBREV]-ITP-
    sequence_digits = Column(Integer, nullable=False, default=6)        # 流水號位數 1~6
