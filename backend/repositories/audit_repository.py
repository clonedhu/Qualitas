"""
Audit Repository

Data access layer for Audit module (Read-only)
"""

from typing import List, Optional
from sqlalchemy.orm import Session

import models


class AuditRepository:
    """Repository for Audit data access operations (Read-only)"""

    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, audit_id: str) -> Optional[models.Audit]:
        """
        Get Audit by ID

        Args:
            audit_id: Audit identifier

        Returns:
            Audit object if found, None otherwise
        """
        return (self.db.query(models.Audit)
                .filter(models.Audit.id == audit_id)
                .first())

    def get_all(self, skip: int = 0, limit: int = 100) -> List[models.Audit]:
        """
        Get all Audits

        Args:
            skip: Number of records to skip (pagination)
            limit: Maximum number of records to return

        Returns:
            List of Audit objects
        """
        return self.db.query(models.Audit).offset(skip).limit(limit).all()
