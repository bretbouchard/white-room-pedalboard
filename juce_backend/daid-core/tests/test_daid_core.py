"""
Tests for daid-core Python package
"""

import os
import sys
from datetime import datetime

import pytest

# Add the python directory to the path so we can import daid_core
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "python"))

from daid_core import (
    DAIDComponents,
    DAIDGenerator,
    DAIDValidationResult,
    ProvenanceRecord,
)


class TestDAIDGenerator:
    """Test DAIDGenerator functionality"""

    def test_generate_daid(self):
        """Test basic DAID generation"""
        daid = DAIDGenerator.generate(
            agent_id="test-agent",
            entity_type="composition",
            entity_id="test-123",
            operation="create",
            metadata={"key": "C major"},
        )

        assert daid.startswith("daid:v1.0:")
        assert "test-agent" in daid
        assert "composition" in daid
        assert "test-123" in daid

    def test_parse_daid(self):
        """Test DAID parsing"""
        daid = DAIDGenerator.generate(
            agent_id="test-agent", entity_type="composition", entity_id="test-123"
        )

        components = DAIDGenerator.parse(daid)
        assert components is not None
        assert components.version == "v1.0"
        assert components.agent_id == "test-agent"
        assert components.entity_type == "composition"
        assert components.entity_id == "test-123"

    def test_validate_valid_daid(self):
        """Test validation of valid DAID"""
        daid = DAIDGenerator.generate(
            agent_id="test-agent", entity_type="composition", entity_id="test-123"
        )

        result = DAIDGenerator.validate(daid)
        assert result.valid
        assert result.components is not None
        assert result.errors is None

    def test_validate_invalid_daid(self):
        """Test validation of invalid DAID"""
        invalid_daid = "invalid-daid-format"
        result = DAIDGenerator.validate(invalid_daid)
        assert not result.valid
        assert result.errors is not None
        assert len(result.errors) > 0

    def test_is_valid(self):
        """Test is_valid convenience method"""
        valid_daid = DAIDGenerator.generate(
            agent_id="test-agent", entity_type="composition", entity_id="test-123"
        )

        assert DAIDGenerator.is_valid(valid_daid)
        assert not DAIDGenerator.is_valid("invalid-daid")

    def test_provenance_hash_consistency(self):
        """Test that provenance hash is consistent for same inputs"""
        ProvenanceRecord(
            entity_type="composition",
            entity_id="test-123",
            operation="create",
            agent_id="test-agent",
            parent_daids=[],
            metadata={"key": "C major"},
        )

        daid1 = DAIDGenerator.generate(
            agent_id="test-agent",
            entity_type="composition",
            entity_id="test-123",
            operation="create",
            parent_daids=[],
            metadata={"key": "C major"},
        )

        daid2 = DAIDGenerator.generate(
            agent_id="test-agent",
            entity_type="composition",
            entity_id="test-123",
            operation="create",
            parent_daids=[],
            metadata={"key": "C major"},
        )

        # Hashes should be identical for identical inputs
        hash1 = daid1.split(":")[-1]
        hash2 = daid2.split(":")[-1]
        assert hash1 == hash2

    def test_provenance_hash_uniqueness(self):
        """Test that provenance hash changes with different inputs"""
        daid1 = DAIDGenerator.generate(
            agent_id="test-agent",
            entity_type="composition",
            entity_id="test-123",
            metadata={"key": "C major"},
        )

        daid2 = DAIDGenerator.generate(
            agent_id="test-agent",
            entity_type="composition",
            entity_id="test-123",
            metadata={"key": "D major"},  # Different metadata
        )

        hash1 = daid1.split(":")[-1]
        hash2 = daid2.split(":")[-1]
        assert hash1 != hash2

    def test_parent_daids_in_provenance(self):
        """Test that parent DAIDs affect the provenance hash"""
        parent_daid = DAIDGenerator.generate(
            agent_id="parent-agent", entity_type="composition", entity_id="parent-123"
        )

        child_daid = DAIDGenerator.generate(
            agent_id="test-agent",
            entity_type="composition",
            entity_id="child-123",
            parent_daids=[parent_daid],
        )

        orphan_daid = DAIDGenerator.generate(
            agent_id="test-agent", entity_type="composition", entity_id="child-123"
        )

        assert child_daid != orphan_daid

    def test_entity_type_validation(self):
        """Test validation of entity types"""
        # Valid entity type
        daid = DAIDGenerator.generate(
            agent_id="test-agent", entity_type="composition", entity_id="test-123"
        )
        assert DAIDGenerator.is_valid(daid)

        # Invalid entity type should still generate DAID but validation might fail
        DAIDGenerator.generate(
            agent_id="test-agent", entity_type="invalid_type", entity_id="test-123"
        )
        # Note: Currently, invalid entity types are allowed in generation
        # but might be rejected by validation services

    def test_timestamp_format(self):
        """Test that timestamps are in correct ISO format"""
        daid = DAIDGenerator.generate(
            agent_id="test-agent", entity_type="composition", entity_id="test-123"
        )

        components = DAIDGenerator.parse(daid)
        assert components is not None

        # Parse the timestamp
        timestamp_str = components.timestamp
        parsed_time = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        assert parsed_time.tzinfo is not None  # Should be timezone-aware


class TestProvenanceRecord:
    """Test ProvenanceRecord data class"""

    def test_provenance_record_creation(self):
        """Test creation of ProvenanceRecord"""
        record = ProvenanceRecord(
            entity_type="composition",
            entity_id="test-123",
            operation="create",
            agent_id="test-agent",
            parent_daids=["daid:v1.0:...:parent-123:..."],
            metadata={"key": "C major", "tempo": 120},
        )

        assert record.entity_type == "composition"
        assert record.entity_id == "test-123"
        assert record.operation == "create"
        assert record.agent_id == "test-agent"
        assert len(record.parent_daids) == 1
        assert record.metadata["key"] == "C major"

    def test_provenance_record_defaults(self):
        """Test default values for ProvenanceRecord"""
        record = ProvenanceRecord(
            entity_type="composition",
            entity_id="test-123",
            operation="create",
            agent_id="test-agent",
        )

        assert record.parent_daids is None
        assert record.metadata is None
        assert record.timestamp is None


class TestDAIDValidationResult:
    """Test DAIDValidationResult data class"""

    def test_validation_result_valid(self):
        """Test valid validation result"""
        result = DAIDValidationResult(
            valid=True,
            components=DAIDComponents(
                version="v1.0",
                timestamp="2024-01-15T10:30:00+00:00",
                agent_id="test-agent",
                entity_type="composition",
                entity_id="test-123",
                provenance_hash="a1b2c3d4e5f67890",
            ),
        )

        assert result.valid
        assert result.components is not None
        assert result.errors is None

    def test_validation_result_invalid(self):
        """Test invalid validation result"""
        result = DAIDValidationResult(
            valid=False, errors=["Invalid format", "Missing components"]
        )

        assert not result.valid
        assert result.components is None
        assert len(result.errors) == 2


if __name__ == "__main__":
    pytest.main([__file__])
