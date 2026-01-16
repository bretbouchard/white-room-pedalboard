#!/usr/bin/env python3
"""
Migration script to convert legacy DAID data to daid-core format.

This script migrates existing DAID records from the old format to the new
daid-core format, ensuring backward compatibility and data integrity.
"""

import asyncio
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

# Add the parent directory to the path to import daid_core
sys.path.append(str(Path(__file__).parent.parent / "python"))

from daid_core import DAIDClient, DAIDGenerator, ProvenanceRecord

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LegacyDAIDMigrator:
    """Migrates legacy DAID data to daid-core format."""

    def __init__(
        self,
        legacy_data_path: str,
        output_path: str,
        daid_client: DAIDClient | None = None,
    ):
        self.legacy_data_path = Path(legacy_data_path)
        self.output_path = Path(output_path)
        self.daid_client = daid_client
        self.migration_stats = {
            "total_records": 0,
            "migrated_records": 0,
            "failed_records": 0,
            "skipped_records": 0,
        }

    async def migrate_all(self) -> dict[str, int]:
        """Migrate all legacy DAID data."""
        logger.info("Starting DAID migration...")

        # Load legacy data
        legacy_records = await self._load_legacy_data()
        self.migration_stats["total_records"] = len(legacy_records)

        # Migrate records
        migrated_records = []
        for record in legacy_records:
            try:
                migrated_record = await self._migrate_record(record)
                if migrated_record:
                    migrated_records.append(migrated_record)
                    self.migration_stats["migrated_records"] += 1
                else:
                    self.migration_stats["skipped_records"] += 1
            except Exception as e:
                logger.error(
                    f"Failed to migrate record {record.get('id', 'unknown')}: {e}"
                )
                self.migration_stats["failed_records"] += 1

        # Save migrated data
        await self._save_migrated_data(migrated_records)

        logger.info(f"Migration completed: {self.migration_stats}")
        return self.migration_stats

    async def _load_legacy_data(self) -> list[dict[str, Any]]:
        """Load legacy DAID data from various sources."""
        records = []

        # Load from JSON files
        if self.legacy_data_path.is_file() and self.legacy_data_path.suffix == ".json":
            with open(self.legacy_data_path) as f:
                data = json.load(f)
                if isinstance(data, list):
                    records.extend(data)
                elif isinstance(data, dict) and "records" in data:
                    records.extend(data["records"])

        # Load from directory of JSON files
        elif self.legacy_data_path.is_dir():
            for json_file in self.legacy_data_path.glob("*.json"):
                with open(json_file) as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        records.extend(data)
                    elif isinstance(data, dict):
                        records.append(data)

        logger.info(f"Loaded {len(records)} legacy records")
        return records

    async def _migrate_record(
        self, legacy_record: dict[str, Any]
    ) -> dict[str, Any] | None:
        """Migrate a single legacy DAID record to daid-core format."""

        # Extract legacy DAID format
        legacy_daid = legacy_record.get("daid") or legacy_record.get("id")
        if not legacy_daid:
            logger.warning("Record missing DAID/ID, skipping")
            return None

        # Parse legacy DAID format (if it exists)
        agent_id = self._extract_agent_id(legacy_record)
        entity_type = self._extract_entity_type(legacy_record)
        entity_id = self._extract_entity_id(legacy_record)
        operation = self._extract_operation(legacy_record)
        parent_daids = self._extract_parent_daids(legacy_record)
        metadata = self._extract_metadata(legacy_record)

        # Generate new DAID using daid-core
        try:
            if self.daid_client:
                # Use client to create provenance record
                record = ProvenanceRecord(
                    entity_type=entity_type,
                    entity_id=entity_id,
                    operation=operation,
                    agent_id=agent_id,
                    parent_daids=parent_daids,
                    metadata=metadata,
                )
                new_daid = await self.daid_client.create_provenance_record(record)
            else:
                # Generate locally
                new_daid = DAIDGenerator.generate(
                    agent_id=agent_id,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    operation=operation,
                    parent_daids=parent_daids,
                    metadata=metadata,
                )

            # Create migrated record
            migrated_record = {
                "legacy_daid": legacy_daid,
                "new_daid": new_daid,
                "agent_id": agent_id,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "operation": operation,
                "parent_daids": parent_daids,
                "metadata": metadata,
                "migrated_at": datetime.utcnow().isoformat() + "Z",
                "legacy_record": legacy_record,
            }

            return migrated_record

        except Exception as e:
            logger.error(f"Failed to generate new DAID for {legacy_daid}: {e}")
            raise

    def _extract_agent_id(self, record: dict[str, Any]) -> str:
        """Extract agent ID from legacy record."""
        # Try various fields that might contain agent info
        agent_id = (
            record.get("agent_id")
            or record.get("agentId")
            or record.get("system_component")
            or record.get("source")
            or "migrated-agent"
        )
        return str(agent_id)

    def _extract_entity_type(self, record: dict[str, Any]) -> str:
        """Extract entity type from legacy record."""
        entity_type = (
            record.get("entity_type")
            or record.get("entityType")
            or record.get("type")
            or record.get("category")
            or "unknown"
        )
        return str(entity_type)

    def _extract_entity_id(self, record: dict[str, Any]) -> str:
        """Extract entity ID from legacy record."""
        entity_id = (
            record.get("entity_id")
            or record.get("entityId")
            or record.get("target_id")
            or record.get("resource_id")
            or f"migrated_{record.get('daid', 'unknown')}"
        )
        return str(entity_id)

    def _extract_operation(self, record: dict[str, Any]) -> str:
        """Extract operation from legacy record."""
        operation = (
            record.get("operation")
            or record.get("action")
            or record.get("event_type")
            or "migrate"
        )
        return str(operation)

    def _extract_parent_daids(self, record: dict[str, Any]) -> list[str]:
        """Extract parent DAIDs from legacy record."""
        parents = (
            record.get("parent_daids")
            or record.get("parentDAIDs")
            or record.get("parents")
            or record.get("dependencies")
            or []
        )

        if isinstance(parents, str):
            parents = [parents]
        elif not isinstance(parents, list):
            parents = []

        return [str(p) for p in parents if p]

    def _extract_metadata(self, record: dict[str, Any]) -> dict[str, Any]:
        """Extract metadata from legacy record."""
        # Start with operation metadata
        metadata = record.get("operation_metadata", {}).copy()

        # Add other relevant fields
        for key in ["timestamp", "user_id", "tags", "privacy_level", "batch_id"]:
            if key in record:
                metadata[key] = record[key]

        # Add migration info
        metadata.update(
            {
                "migrated_from": "legacy_daid",
                "migration_timestamp": datetime.utcnow().isoformat() + "Z",
                "legacy_format": True,
            }
        )

        return metadata

    async def _save_migrated_data(self, migrated_records: list[dict[str, Any]]):
        """Save migrated data to output file."""
        self.output_path.parent.mkdir(parents=True, exist_ok=True)

        output_data = {
            "migration_info": {
                "migrated_at": datetime.utcnow().isoformat() + "Z",
                "source": str(self.legacy_data_path),
                "stats": self.migration_stats,
                "daid_core_version": "1.0.0",
            },
            "records": migrated_records,
        }

        with open(self.output_path, "w") as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        logger.info(
            f"Saved {len(migrated_records)} migrated records to {self.output_path}"
        )


async def main():
    """Main migration function."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Migrate legacy DAID data to daid-core format"
    )
    parser.add_argument("input", help="Path to legacy DAID data (file or directory)")
    parser.add_argument("output", help="Path to output migrated data")
    parser.add_argument(
        "--agent-id", default="migration-agent", help="Agent ID for migration"
    )
    parser.add_argument("--base-url", help="Base URL for DAID service (optional)")
    parser.add_argument("--api-key", help="API key for DAID service (optional)")

    args = parser.parse_args()

    # Create DAID client if service URL provided
    daid_client = None
    if args.base_url:
        daid_client = DAIDClient(
            agent_id=args.agent_id, base_url=args.base_url, api_key=args.api_key
        )

    # Run migration
    migrator = LegacyDAIDMigrator(
        legacy_data_path=args.input, output_path=args.output, daid_client=daid_client
    )

    stats = await migrator.migrate_all()

    print("\n" + "=" * 50)
    print("MIGRATION SUMMARY")
    print("=" * 50)
    print(f"Total records: {stats['total_records']}")
    print(f"Migrated: {stats['migrated_records']}")
    print(f"Failed: {stats['failed_records']}")
    print(f"Skipped: {stats['skipped_records']}")
    print(
        f"Success rate: {stats['migrated_records'] / stats['total_records'] * 100:.1f}%"
    )
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
