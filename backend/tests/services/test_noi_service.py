"""
Tests for NOI Service

Tests business logic for NOI module
"""

import pytest
from services.noi_service import NOIService
from repositories.noi_repository import NOIRepository
import schemas
import models


class TestNOIService:
    """Test NOI Service business logic"""

    @pytest.fixture
    def noi_service(self, db_session):
        """Create NOI service instance"""
        repo = NOIRepository(db_session)
        return NOIService(repo)

    def test_create_noi(self, noi_service, db_session, sample_contractor):
        """Test creating a NOI with auto-generated referenceNo"""
        noi_create = schemas.NOICreate(
            package="PKG-001",
            checkpoint="CP-001",
            contractor="Test Contractor",
            status="Draft"
        )

        noi = noi_service.create_noi(noi_create, user_id=1, username="testuser")

        assert noi.id is not None
        assert noi.referenceNo.startswith("QTS-")
        assert noi.package == "PKG-001"
        assert noi.vendor_id == "test-contractor-1"

    def test_update_noi_valid_transition(self, noi_service, db_session, sample_contractor):
        """Test updating NOI with valid status transition"""
        # Create NOI
        noi_create = schemas.NOICreate(
            package="PKG-001",
            checkpoint="CP-001",
            contractor="Test Contractor",
            status="Open"
        )
        noi = noi_service.create_noi(noi_create)

        # Update with valid transition: Open -> In Progress
        noi_update = schemas.NOIUpdate(status="In Progress")
        updated = noi_service.update_noi(noi.id, noi_update, user_id=1, username="testuser")

        assert updated is not None
        assert updated.status == "In Progress"

    def test_update_noi_invalid_transition(self, noi_service, db_session, sample_contractor):
        """Test updating NOI with invalid status transition raises ValueError"""
        # Create NOI
        noi_create = schemas.NOICreate(
            package="PKG-001",
            checkpoint="CP-001",
            contractor="Test Contractor",
            status="Open"
        )
        noi = noi_service.create_noi(noi_create)

        # Try invalid transition: Open -> Closed (should fail)
        noi_update = schemas.NOIUpdate(status="Closed")

        with pytest.raises(ValueError) as exc_info:
            noi_service.update_noi(noi.id, noi_update)

        assert "Invalid status transition" in str(exc_info.value)

    def test_delete_noi(self, noi_service, db_session, sample_contractor):
        """Test deleting a NOI"""
        # Create NOI
        noi_create = schemas.NOICreate(
            package="PKG-001",
            checkpoint="CP-001",
            contractor="Test Contractor"
        )
        noi = noi_service.create_noi(noi_create)

        # Delete
        deleted = noi_service.delete_noi(noi.id, user_id=1, username="testuser")
        assert deleted is True

        # Verify deleted
        found = noi_service.get_noi(noi.id)
        assert found is None

    def test_get_nois_with_filters(self, noi_service, db_session, sample_contractor):
        """Test getting NOIs with search filter"""
        # Create multiple NOIs
        noi_service.create_noi(schemas.NOICreate(
            package="PKG-001", checkpoint="CP-001", contractor="Test Contractor"
        ))
        noi_service.create_noi(schemas.NOICreate(
            package="PKG-002", checkpoint="CP-002", contractor="Test Contractor"
        ))

        # Search by package
        results = noi_service.get_nois(search="PKG-001")
        assert len(results) == 1
        assert results[0].package == "PKG-001"
