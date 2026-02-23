"""
Audit Service

Business logic layer for Audit module (Read-only)
"""

import logging
from typing import List, Optional

import models
from repositories.audit_repository import AuditRepository

logger = logging.getLogger(__name__)


class AuditService:
    """Service layer for Audit business logic (Read-only)"""

    def __init__(self, repo: AuditRepository):
        self.repo = repo

    def get_audits(self, skip: int = 0, limit: int = 100) -> List[models.Audit]:
        """
        Get list of Audits

        Args:
            skip: Number of records to skip
            limit: Maximum number of records

        Returns:
            List of Audit objects
        """
        return self.repo.get_all(skip, limit)

    def get_audit(self, audit_id: str) -> Optional[models.Audit]:
        """
        Get a single Audit by ID

        Args:
            audit_id: Audit identifier

        Returns:
            Audit object if found, None otherwise
        """
        return self.repo.get_by_id(audit_id)
