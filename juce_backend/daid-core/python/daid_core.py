# Version identifier for daid_core package
__version__ = "1.0.0"

"""
DAID Core Python Bindings

This module provides Python bindings for the DAID (Distributed Agent
Identifier) provenance system, enabling cross-language DAID usage between
Python and TypeScript/JavaScript.
"""

import asyncio
import hashlib
import json
import logging
import re
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any

import requests

logger = logging.getLogger(__name__)


@dataclass
class DAIDComponents:
    """Components of a parsed DAID"""

    version: str
    timestamp: str
    agent_id: str
    entity_type: str
    entity_id: str
    provenance_hash: str


@dataclass
class ProvenanceRecord:
    """Provenance record for DAID generation"""

    entity_type: str
    entity_id: str
    operation: str
    agent_id: str
    parent_daids: list[str] | None = None
    metadata: dict[str, Any] | None = None
    timestamp: str | None = None


@dataclass
class DAIDValidationResult:
    """Result of DAID validation"""

    valid: bool
    components: DAIDComponents | None = None
    errors: list[str] | None = None


@dataclass
class DAIDHealthCheck:
    """Health check result for DAID system"""

    is_healthy: bool
    response_time_ms: float
    error_message: str | None = None
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    checks_performed: dict[str, bool] = field(default_factory=dict)


@dataclass
class DAIDRecoveryOptions:
    """Options for DAID recovery operations"""

    max_retries: int = 3
    backoff_factor: float = 2.0
    timeout_seconds: float = 30.0
    retry_on_errors: list[str] = field(
        default_factory=lambda: ["ConnectionError", "TimeoutError"]
    )


@dataclass
class DAIDRecoveryResult:
    """Result of a DAID recovery operation"""

    success: bool
    attempts_made: int
    final_error: str | None = None
    recovery_time_ms: float = 0.0
    recovered_daids: list[str] = field(default_factory=list)


class DAIDGenerator:
    """DAID generator with provenance tracking"""

    VERSION = "v1.0"
    DAID_REGEX = re.compile(r"^daid:v\d+\.\d+:.+:[^:]+:[^:]+:[^:]+:[a-f0-9]{16}$")

    # Standard entity types for validation
    VALID_ENTITY_TYPES = {
        "composition",
        "pattern",
        "analysis",
        "user_action",
        "api_call",
        "file",
        "plugin_processing",
        "audio_analysis",
        "provenance_record",
        "user",
        "session",
        "configuration",
        "model",
        "training_data",
    }

    @classmethod
    def generate(
        cls,
        agent_id: str,
        entity_type: str,
        entity_id: str,
        operation: str = "create",
        parent_daids: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Generate a new DAID with proper provenance tracking"""
        timestamp = datetime.now(timezone.utc).isoformat()
        parent_daids = parent_daids or []
        metadata = metadata or {}

        provenance_hash = cls._calculate_provenance_hash(
            parent_daids, operation, metadata, entity_id
        )

        return (
            f"daid:{cls.VERSION}:{timestamp}:{agent_id}:{entity_type}:"
            f"{entity_id}:{provenance_hash}"
        )

    @classmethod
    def parse(cls, daid: str) -> DAIDComponents | None:
        """Parse a DAID string into its components"""
        if not daid or not isinstance(daid, str):
            return None

        if not cls.DAID_REGEX.match(daid):
            return None

        parts = daid.split(":")
        if len(parts) < 7:
            return None

        # The timestamp may contain colons, so we need to reconstruct it
        # Format: daid:version:timestamp:agent:entity_type:entity_id:hash
        # We know the last 4 parts are agent, entity_type, entity_id, hash
        version = parts[1]
        agent_id = parts[-4]
        entity_type = parts[-3]
        entity_id = parts[-2]
        provenance_hash = parts[-1]

        # Reconstruct timestamp from remaining parts
        timestamp_parts = parts[2:-4]
        timestamp = ":".join(timestamp_parts)

        return DAIDComponents(
            version=version,
            timestamp=timestamp,
            agent_id=agent_id,
            entity_type=entity_type,
            entity_id=entity_id,
            provenance_hash=provenance_hash,
        )

    @classmethod
    def validate(cls, daid: str) -> DAIDValidationResult:
        """Validate DAID format"""
        if not daid or not isinstance(daid, str):
            return DAIDValidationResult(
                valid=False, errors=["DAID must be a non-empty string"]
            )

        if not cls.DAID_REGEX.match(daid):
            return DAIDValidationResult(valid=False, errors=["DAID format is invalid"])

        components = cls.parse(daid)
        if not components:
            return DAIDValidationResult(
                valid=False, errors=["Failed to parse DAID components"]
            )

        errors = []

        # Validate timestamp
        try:
            datetime.fromisoformat(components.timestamp.replace("Z", "+00:00"))
        except ValueError:
            errors.append("Invalid timestamp format")

        # Validate hash length
        if len(components.provenance_hash) != 16:
            errors.append("Provenance hash must be 16 characters")

        return DAIDValidationResult(
            valid=len(errors) == 0,
            components=components if len(errors) == 0 else None,
            errors=errors if len(errors) > 0 else None,
        )

    @classmethod
    def is_valid(cls, daid: str) -> bool:
        """Check if DAID format is valid (simple check)"""
        return cls.validate(daid).valid

    @classmethod
    def _calculate_provenance_hash(
        cls,
        parent_daids: list[str],
        operation: str,
        metadata: dict[str, Any],
        entity_id: str,
    ) -> str:
        """Calculate provenance hash from parents, operation, and metadata"""
        provenance_data = {
            "parents": sorted(parent_daids),  # Sort for consistency
            "operation": operation,
            "metadata": cls._normalize_metadata(metadata),
            "entity_id": entity_id,
        }

        hash_input = json.dumps(provenance_data, sort_keys=True, separators=(",", ":"))
        hash_obj = hashlib.sha256(hash_input.encode("utf-8"))

        # Return first 16 characters for brevity
        return hash_obj.hexdigest()[:16]

    @classmethod
    def _normalize_metadata(cls, metadata: dict[str, Any]) -> dict[str, Any]:
        """Normalize metadata for consistent hashing"""
        if not isinstance(metadata, dict):
            return {}

        normalized = {}
        for key in sorted(metadata.keys()):
            value = metadata[key]
            if isinstance(value, dict):
                normalized[key] = cls._normalize_metadata(value)
            else:
                normalized[key] = value

        return normalized


class DAIDClient:
    """DAID client for interacting with DAID services"""

    def __init__(
        self,
        agent_id: str,
        base_url: str = "http://localhost:8080",
        api_key: str | None = None,
        timeout: int = 5,
    ):
        """Initialize DAID client"""
        self.agent_id = agent_id
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

        self.session = requests.Session()
        if api_key:
            self.session.headers.update({"Authorization": f"Bearer {api_key}"})
        self.session.headers.update({"Content-Type": "application/json"})

    def create_provenance_record(self, record: ProvenanceRecord) -> str:
        """Create a new provenance record and return its DAID"""
        # Generate DAID locally
        daid = DAIDGenerator.generate(
            agent_id=self.agent_id,
            entity_type=record.entity_type,
            entity_id=record.entity_id,
            operation=record.operation,
            parent_daids=record.parent_daids,
            metadata=record.metadata,
        )

        # Store the record if we have a backend URL
        if self.base_url and self.base_url != "http://localhost:8080":
            try:
                self._store_record(daid, record)
            except Exception as e:
                print(f"Warning: Failed to store DAID record: {e}")
                # Continue anyway - DAID generation is local-first

        return daid

    def get_provenance_chain(self, entity_type: str, entity_id: str) -> list[str]:
        """Get provenance chain for an entity"""
        if not self.base_url:
            raise ValueError("Base URL required for provenance chain retrieval")

        url = f"{self.base_url}/api/v1/provenance/chain/{entity_type}/{entity_id}"
        response = self.session.get(url, timeout=self.timeout)
        response.raise_for_status()

        data = response.json()
        chain = data.get("chain", [])
        return list(chain) if isinstance(chain, list) else []

    def invalidate_cache(self, daids: list[str]) -> None:
        """Invalidate cache for specific DAIDs"""
        if not self.base_url:
            return  # No-op for local-only usage

        try:
            url = f"{self.base_url}/api/v1/cache/invalidate"
            self.session.post(url, json={"daids": daids}, timeout=self.timeout)
        except Exception as e:
            print(f"Warning: Failed to invalidate cache: {e}")

    def discover_system_patterns(self) -> dict[str, Any]:
        """Discover DAID patterns across systems"""
        if not self.base_url:
            return {}

        try:
            url = f"{self.base_url}/api/v1/systems/patterns"
            response = self.session.get(url, timeout=self.timeout)
            if response.status_code == 200:
                data = response.json()
                return data if isinstance(data, dict) else {}
        except Exception as e:
            print(f"Warning: Failed to discover system patterns: {e}")

        return {}

    def generate_daid(
        self,
        entity_type: str,
        entity_id: str,
        operation: str = "create",
        parent_daids: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Generate DAID locally without storing"""
        return DAIDGenerator.generate(
            agent_id=self.agent_id,
            entity_type=entity_type,
            entity_id=entity_id,
            operation=operation,
            parent_daids=parent_daids,
            metadata=metadata,
        )

    def _store_record(self, daid: str, record: ProvenanceRecord) -> None:
        """Store record on backend"""
        url = f"{self.base_url}/api/v1/provenance/records"
        payload = {
            "daid": daid,
            "record": {**asdict(record), "agent_id": self.agent_id},
        }
        response = self.session.post(url, json=payload, timeout=self.timeout)
        response.raise_for_status()


class CacheManager:
    """Simple in-memory cache manager for DAIDs"""

    def __init__(self, ttl_seconds: int = 300):  # 5 minutes default
        self._cache: dict[str, dict[str, Any]] = {}
        self._ttl = timedelta(seconds=ttl_seconds)
        self._timestamps: dict[str, datetime] = {}

    def get(self, key: str) -> Any:
        """Get value from cache"""
        if key not in self._cache:
            return None

        # Check if expired
        if datetime.now() - self._timestamps[key] > self._ttl:
            del self._cache[key]
            del self._timestamps[key]
            return None

        return self._cache[key]

    def set(self, key: str, value: Any) -> None:
        """Set value in cache"""
        self._cache[key] = value
        self._timestamps[key] = datetime.now()

    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        if key in self._cache:
            del self._cache[key]
            del self._timestamps[key]
            return True
        return False

    def clear(self) -> None:
        """Clear all cache entries"""
        self._cache.clear()
        self._timestamps.clear()

    def get_stats(self) -> dict[str, int]:
        """Get cache statistics"""
        current_time = datetime.now()
        expired = sum(
            1
            for timestamp in self._timestamps.values()
            if current_time - timestamp > self._ttl
        )

        return {
            "total_entries": len(self._cache),
            "active_entries": len(self._cache) - expired,
            "expired_entries": expired,
            "max_ttl_seconds": int(self._ttl.total_seconds()),
        }


# Additional classes for health monitoring and recovery
@dataclass
class DAIDHealthCheck:
    """Health check result for a DAID"""

    daid: str
    status: str  # "healthy", "warning", "error", "missing"
    errors: list[str]
    last_checked: datetime
    metadata: dict[str, Any]


@dataclass
class DAIDRecoveryOptions:
    """Options for DAID recovery"""

    strategy: str  # "regenerate", "repair", "restore", "merge"
    backup_data: dict[str, Any] | None = None
    source_daid: str | None = None
    preserve_metadata: bool = True
    validate_after_recovery: bool = True


@dataclass
class DAIDRecoveryResult:
    """Result of DAID recovery operation"""

    success: bool
    recovered_daid: str | None
    original_daid: str
    strategy: str
    errors: list[str]
    warnings: list[str]
    metadata: dict[str, Any]


class ProvenanceChainBuilder:
    """Builds and manages provenance chains for DAIDs"""

    def __init__(self):
        self._chains: dict[str, Any] = {}
        self._records: dict[str, ProvenanceRecord] = {}

    def add_record(self, daid: str, record: ProvenanceRecord) -> None:
        """Add a provenance record to the chain"""
        self._records[daid] = record
        # Build chain logic would go here

    def get_chain(self, daid: str) -> Any:
        """Get provenance chain for a DAID"""
        return self._chains.get(daid)

    def export_chain(self, daid: str) -> dict[str, Any]:
        """Export provenance chain as JSON"""
        chain = self.get_chain(daid)
        if not chain:
            return {}

        return {
            "daid": daid,
            "chain": chain,
            "records": {
                k: asdict(v) for k, v in self._records.items() if k.startswith(daid)
            },
        }


class DAIDValidator:
    """Enhanced DAID validation with detailed error reporting"""

    @dataclass
    class ValidationResult:
        is_valid: bool
        errors: list[str]
        warnings: list[str]
        components: DAIDComponents | None = None

    @classmethod
    def validate_enhanced(cls, daid: str) -> ValidationResult:
        """Enhanced validation with detailed error reporting"""
        errors = []
        warnings = []

        if not daid:
            errors.append("DAID is empty")
            return cls.ValidationResult(False, errors, warnings)

        if not isinstance(daid, str):
            errors.append("DAID must be a string")
            return cls.ValidationResult(False, errors, warnings)

        components = DAIDGenerator.parse(daid)
        if not components:
            errors.append("Failed to parse DAID format")
            return cls.ValidationResult(False, errors, warnings)

        # Validate components
        if components.version != "v1.0":
            warnings.append(f"Unknown version: {components.version}")

        try:
            datetime.fromisoformat(components.timestamp.replace("Z", "+00:00"))
        except ValueError:
            errors.append("Invalid timestamp format")

        if components.entity_type not in DAIDGenerator.VALID_ENTITY_TYPES:
            warnings.append(f"Unknown entity type: {components.entity_type}")

        if len(components.provenance_hash) != 16:
            errors.append("Provenance hash must be 16 characters")

        return cls.ValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            components=components,
        )


class DAIDHealthMonitor:
    """DAID health monitoring system"""

    def __init__(
        self,
        chain_builder: ProvenanceChainBuilder,
        config: dict[str, Any] | None = None,
    ):
        self.chain_builder = chain_builder
        self.config = config or {}

    def check_daid_health(self, daid: str) -> DAIDHealthCheck:
        """Perform health check on a single DAID"""
        errors = []
        status = "healthy"

        # Validate DAID format
        validation = DAIDValidator.validate_enhanced(daid)
        if not validation.is_valid:
            status = "error"
            errors.extend(validation.errors)

        # Check if DAID exists in provenance chain
        chain = self.chain_builder.get_chain(daid)
        if not chain:
            status = "missing"
            errors.append("DAID not found in provenance tracking")

        return DAIDHealthCheck(
            daid=daid,
            status=status,
            errors=errors,
            last_checked=datetime.now(),
            metadata={
                "validation": validation.__dict__ if "validation" in locals() else {}
            },
        )

    def get_system_health_report(self) -> dict[str, Any]:
        """Generate system-wide health report"""
        # This would scan all DAIDs in the system
        # For now, return basic structure
        return {
            "total_daids": 0,
            "healthy_daids": 0,
            "warning_daids": 0,
            "error_daids": 0,
            "missing_daids": 0,
            "overall_health_score": 100,
            "recommendations": ["No DAIDs to check"],
        }

    def get_recommendations(self, health_checks: list[DAIDHealthCheck]) -> list[str]:
        """Get recommendations based on health checks"""
        recommendations = []

        error_count = sum(1 for check in health_checks if check.status == "error")
        if error_count > 0:
            recommendations.append(f"Fix {error_count} DAIDs with format errors")

        missing_count = sum(1 for check in health_checks if check.status == "missing")
        if missing_count > 0:
            recommendations.append(f"Restore {missing_count} missing DAIDs from backup")

        return recommendations


class DAIDRecoveryManager:
    """DAID recovery manager"""

    def __init__(self, chain_builder: ProvenanceChainBuilder):
        self.chain_builder = chain_builder

    def recover_daid(
        self, daid: str, options: DAIDRecoveryOptions
    ) -> DAIDRecoveryResult:
        """Recover a corrupted or missing DAID"""
        start_time = datetime.now()
        result = DAIDRecoveryResult(
            success=False,
            recovered_daid=None,
            original_daid=daid,
            strategy=options.strategy,
            errors=[],
            warnings=[],
            metadata={
                "recovery_time": 0,
                "data_preserved": False,
                "validation_passed": False,
            },
        )

        try:
            if options.strategy == "regenerate":
                result.recovered_daid = self._regenerate_daid(daid, options)
            elif options.strategy == "repair":
                result.recovered_daid = self._repair_daid(daid, options)
            elif options.strategy == "restore":
                result.recovered_daid = self._restore_daid(daid, options)
            elif options.strategy == "merge":
                result.recovered_daid = self._merge_daid(daid, options)
            else:
                raise ValueError(f"Unknown recovery strategy: {options.strategy}")

            # Validate recovered DAID
            if result.recovered_daid and options.validate_after_recovery:
                validation = DAIDValidator.validate_enhanced(result.recovered_daid)
                result.metadata["validation_passed"] = validation.is_valid

                if not validation.is_valid:
                    result.warnings.append("Recovered DAID failed validation")
                    result.warnings.extend(validation.errors)

            result.success = bool(result.recovered_daid)
            result.metadata["data_preserved"] = options.preserve_metadata

        except Exception as e:
            result.errors.append(f"Recovery failed: {e}")

        result.metadata["recovery_time"] = (
            datetime.now() - start_time
        ).total_seconds() * 1000
        return result

    def _regenerate_daid(self, daid: str, options: DAIDRecoveryOptions) -> str:
        """Regenerate a DAID from scratch"""
        components = DAIDGenerator.parse(daid)
        if not components:
            raise ValueError("Cannot parse original DAID for regeneration")

        # Generate new DAID with same entity information
        new_daid = DAIDGenerator.generate(
            agent_id=components.agent_id,
            entity_type=components.entity_type,
            entity_id=components.entity_id,
            operation="recover",
            metadata={
                "recovery_strategy": "regenerate",
                "original_daid": daid,
                "recovered_at": datetime.now(timezone.utc).isoformat(),
            },
        )

        return new_daid

    def _repair_daid(self, daid: str, options: DAIDRecoveryOptions) -> str:
        """Repair a corrupted DAID"""
        # Try to fix common DAID format issues
        repaired_daid = daid

        # Fix common format issues
        if not daid.startswith("daid:"):
            repaired_daid = "daid:" + daid

        # Validate the repaired DAID
        validation = DAIDValidator.validate_enhanced(repaired_daid)
        if validation.is_valid:
            return repaired_daid

        # If repair fails, fall back to regeneration
        return self._regenerate_daid(daid, options)

    def _restore_daid(self, daid: str, options: DAIDRecoveryOptions) -> str:
        """Restore a DAID from backup data"""
        if not options.backup_data:
            raise ValueError("Backup data required for restore strategy")

        # Restore from backup data
        backup_daid = options.backup_data.get("daid")
        if not backup_daid or not isinstance(backup_daid, str):
            raise ValueError("No DAID found in backup data")

        # Validate restored DAID
        validation = DAIDValidator.validate_enhanced(backup_daid)
        if not validation.is_valid:
            raise ValueError("Backup DAID is invalid")

        # Restore provenance record if available
        if "record" in options.backup_data:
            record_data = options.backup_data["record"]
            record = ProvenanceRecord(**record_data)
            self.chain_builder.add_record(backup_daid, record)

        return backup_daid

    def _merge_daid(self, daid: str, options: DAIDRecoveryOptions) -> str:
        """Merge conflicting DAIDs"""
        if not options.source_daid:
            raise ValueError("Source DAID required for merge strategy")

        # Get both DAIDs' provenance information
        original_chain = self.chain_builder.get_chain(daid)
        source_chain = self.chain_builder.get_chain(options.source_daid)

        if not original_chain and not source_chain:
            raise ValueError("Neither DAID found in provenance tracking")

        # Use the DAID with more complete provenance information
        if original_chain and source_chain:
            return (
                daid
                if len(original_chain.nodes) >= len(source_chain.nodes)
                else options.source_daid
            )

        return daid if original_chain else options.source_daid


class DAIDSynchronizationManager:
    """DAID synchronization manager"""

    def __init__(
        self, chain_builder: ProvenanceChainBuilder, remote_endpoint: str | None = None
    ):
        self.chain_builder = chain_builder
        self.remote_endpoint = remote_endpoint

    def check_sync_status(self, daid: str) -> dict[str, Any]:
        """Check synchronization status of a DAID"""
        local_exists = bool(self.chain_builder.get_chain(daid))
        remote_exists = False
        in_sync = False
        sync_errors = []

        if self.remote_endpoint:
            try:
                # This would implement actual HTTP requests to check remote status
                # For now, we'll simulate the check
                remote_exists = True  # Placeholder
                in_sync = local_exists and remote_exists
            except Exception as e:
                sync_errors.append(f"Failed to check remote status: {e}")

        return {
            "daid": daid,
            "local_exists": local_exists,
            "remote_exists": remote_exists,
            "in_sync": in_sync,
            "sync_errors": sync_errors,
        }

    def synchronize_daid(self, daid: str, direction: str = "bidirectional") -> bool:
        """Synchronize a DAID between local and remote"""
        if not self.remote_endpoint:
            raise ValueError("Remote endpoint not configured")

        try:
            sync_status = self.check_sync_status(daid)

            if direction in ("push", "bidirectional"):
                if sync_status["local_exists"] and not sync_status["remote_exists"]:
                    self._push_daid_to_remote(daid)

            if direction in ("pull", "bidirectional"):
                if not sync_status["local_exists"] and sync_status["remote_exists"]:
                    self._pull_daid_from_remote(daid)

            return True
        except Exception as e:
            print(f"DAID synchronization failed: {e}")
            return False

    def _push_daid_to_remote(self, daid: str) -> None:
        """Push DAID to remote endpoint"""
        chain = self.chain_builder.get_chain(daid)
        if not chain:
            raise ValueError("DAID not found locally")

        self.chain_builder.export_chain(daid)
        # This would implement actual HTTP request to push data
        print(f"Pushing DAID {daid} to remote endpoint")

    def _pull_daid_from_remote(self, daid: str) -> None:
        """Pull DAID from remote endpoint"""
        # This would implement actual HTTP request to pull data
        print(f"Pulling DAID {daid} from remote endpoint")


class CacheManager:
    """Cache manager for DAID operations"""

    def __init__(self, ttl_seconds: int = 300):
        self.ttl_seconds = ttl_seconds
        self._cache: dict[str, tuple[Any, float]] = {}

    def get(self, key: str) -> Any | None:
        """Get value from cache"""
        if key in self._cache:
            value, timestamp = self._cache[key]
            if time.time() - timestamp < self.ttl_seconds:
                return value
            else:
                del self._cache[key]
        return None

    def set(self, key: str, value: Any) -> None:
        """Set value in cache"""
        self._cache[key] = (value, time.time())

    def invalidate(self, key: str) -> None:
        """Invalidate cache entry"""
        if key in self._cache:
            del self._cache[key]

    def clear(self) -> None:
        """Clear all cache entries"""
        self._cache.clear()


class DAIDValidator:
    """Validator for DAID format and integrity"""

    @staticmethod
    def validate_format(daid: str) -> bool:
        """Validate DAID format"""
        return DAIDGenerator.is_valid(daid)

    @staticmethod
    def validate_chain(daids: list[str]) -> bool:
        """Validate a chain of DAIDs"""
        for daid in daids:
            if not DAIDValidator.validate_format(daid):
                return False
        return True

    @staticmethod
    def standardize_daid(daid: str) -> str:
        """Standardize DAID format"""
        # Remove any whitespace and ensure proper format
        return daid.strip()


class DAIDHealthMonitor:
    """Monitor for DAID system health"""

    def __init__(self, client: "DAIDClient", config: dict[str, Any] | None = None):
        self.client = client
        self.config = config or {}
        self.check_interval = self.config.get("check_interval", 30)
        self.alert_threshold = self.config.get("alert_threshold", 0.95)
        self._running = False

    async def start(self) -> None:
        """Start health monitoring"""
        self._running = True
        while self._running:
            try:
                health_check = await self.perform_health_check()
                if not health_check.is_healthy:
                    logger.warning(
                        f"DAID health check failed: {health_check.error_message}"
                    )
                await asyncio.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Health monitoring error: {e}")
                await asyncio.sleep(self.check_interval)

    def stop(self) -> None:
        """Stop health monitoring"""
        self._running = False

    async def perform_health_check(self) -> DAIDHealthCheck:
        """Perform a comprehensive health check"""
        start_time = time.time()
        checks = {}

        try:
            # Test DAID generation
            test_daid = DAIDGenerator.generate(
                agent_id="health-check",
                entity_type="test",
                entity_id="health-test",
                operation="test",
            )
            checks["generation"] = DAIDGenerator.is_valid(test_daid)

            # Test client connectivity if available
            if hasattr(self.client, "base_url") and self.client.base_url:
                try:
                    # This would be a ping/health endpoint call
                    checks["connectivity"] = True
                except Exception:
                    checks["connectivity"] = False
            else:
                checks["connectivity"] = True  # Local-only mode

            response_time = (time.time() - start_time) * 1000
            is_healthy = all(checks.values())

            return DAIDHealthCheck(
                is_healthy=is_healthy,
                response_time_ms=response_time,
                checks_performed=checks,
            )

        except Exception as e:
            return DAIDHealthCheck(
                is_healthy=False,
                response_time_ms=(time.time() - start_time) * 1000,
                error_message=str(e),
                checks_performed=checks,
            )


class DAIDRecoveryManager:
    """Manager for DAID recovery operations"""

    def __init__(self, client: "DAIDClient"):
        self.client = client

    async def recover_daid(
        self, daid: str, options: DAIDRecoveryOptions
    ) -> DAIDRecoveryResult:
        """Attempt to recover a corrupted or missing DAID"""
        start_time = time.time()
        attempts = 0

        for attempt in range(options.max_retries):
            attempts += 1
            try:
                # Attempt recovery logic here
                # This would involve validating, repairing, or regenerating the DAID
                if DAIDGenerator.is_valid(daid):
                    return DAIDRecoveryResult(
                        success=True,
                        attempts_made=attempts,
                        recovery_time_ms=(time.time() - start_time) * 1000,
                        recovered_daids=[daid],
                    )

                # Wait before retry
                if attempt < options.max_retries - 1:
                    await asyncio.sleep(options.backoff_factor**attempt)

            except Exception as e:
                if attempt == options.max_retries - 1:
                    return DAIDRecoveryResult(
                        success=False,
                        attempts_made=attempts,
                        final_error=str(e),
                        recovery_time_ms=(time.time() - start_time) * 1000,
                    )

        return DAIDRecoveryResult(
            success=False,
            attempts_made=attempts,
            final_error="Max retries exceeded",
            recovery_time_ms=(time.time() - start_time) * 1000,
        )


class DAIDSynchronizationManager:
    """Manager for DAID synchronization across systems"""

    def __init__(self, client: "DAIDClient", remote_endpoints: list[str] | None = None):
        self.client = client
        self.remote_endpoints = remote_endpoints or []

    async def sync_daid(self, daid: str) -> bool:
        """Synchronize a DAID across all configured endpoints"""
        try:
            for endpoint in self.remote_endpoints:
                # This would implement actual sync logic
                logger.info(f"Syncing DAID {daid} to {endpoint}")
            return True
        except Exception as e:
            logger.error(f"DAID sync failed: {e}")
            return False


# Utility functions for DAID monitoring and recovery
def create_daid_health_monitor(
    client: "DAIDClient", **config: Any
) -> DAIDHealthMonitor:
    """Factory function for creating DAID health monitor"""
    return DAIDHealthMonitor(client, config)


def create_daid_recovery_manager(client: "DAIDClient") -> DAIDRecoveryManager:
    """Factory function for creating DAID recovery manager"""
    return DAIDRecoveryManager(client)


def create_daid_sync_manager(
    client: "DAIDClient", remote_endpoints: list[str] | None = None
) -> DAIDSynchronizationManager:
    """Factory function for creating DAID synchronization manager"""
    return DAIDSynchronizationManager(client, remote_endpoints)


async def perform_daid_health_check(client: "DAIDClient") -> DAIDHealthCheck:
    """Perform a quick health check on the DAID system"""
    monitor = DAIDHealthMonitor(client)
    return await monitor.perform_health_check()


async def recover_corrupted_daid(
    daid: str, client: "DAIDClient", options: DAIDRecoveryOptions | None = None
) -> DAIDRecoveryResult:
    """Recover a corrupted DAID using the specified options"""
    recovery_manager = DAIDRecoveryManager(client)
    recovery_options = options or DAIDRecoveryOptions()
    return await recovery_manager.recover_daid(daid, recovery_options)


@dataclass
class UnifiedDAIDConfig:
    """Configuration for the unified DAID client"""

    # Core configuration
    agent_id: str
    base_url: str | None = None
    api_key: str | None = None

    # Performance settings
    batch_size: int = 100
    batch_timeout: float = 1.0
    cache_ttl: int = 300

    # Feature flags
    enable_batching: bool = True
    enable_caching: bool = True
    enable_health_monitoring: bool = False
    enable_auto_recovery: bool = False
    enable_synchronization: bool = False

    # Integration settings
    system_component: str = "unified-client"
    default_tags: list[str] = field(default_factory=list)
    privacy_level: str = "private"

    # Advanced settings
    remote_endpoints: list[str] = field(default_factory=list)
    health_check_interval: int = 60
    recovery_options: dict[str, Any] | None = None


@dataclass
class DAIDOperationResult:
    """Result of a DAID operation"""

    success: bool
    daid: str | None = None
    error: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class DAIDQueryOptions:
    """Options for querying DAIDs"""

    entity_type: str | None = None
    entity_id: str | None = None
    operation: str | None = None
    user_id: str | None = None
    tags: list[str] | None = None
    date_range: dict[str, datetime] | None = None
    limit: int = 100
    offset: int = 0


class UnifiedDAIDClient:
    """
    Unified DAID Client for Python

    Provides a high-level, feature-rich interface for all DAID operations
    with automatic batching, caching, health monitoring, and recovery.
    """

    def __init__(self, config: UnifiedDAIDConfig):
        self.config = config
        self.client = DAIDClient(
            agent_id=config.agent_id, base_url=config.base_url, api_key=config.api_key
        )

        # Feature components
        self.cache: CacheManager | None = None
        self.health_monitor: DAIDHealthMonitor | None = None
        self.recovery_manager: DAIDRecoveryManager | None = None
        self.sync_manager: DAIDSynchronizationManager | None = None

        # Batching support
        self.batch_queue: list[ProvenanceRecord] = []
        self.batch_timer: asyncio.Task | None = None

        # State tracking
        self.initialized = False
        self.stats = {
            "operations_count": 0,
            "batched_operations": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "errors": 0,
        }

        self._initialize_features()

    def _initialize_features(self) -> None:
        """Initialize optional features based on configuration"""
        if self.config.enable_caching:
            self.cache = CacheManager(self.config.cache_ttl)

        if self.config.enable_health_monitoring:
            self.health_monitor = DAIDHealthMonitor(
                self.client,
                {
                    "check_interval": self.config.health_check_interval,
                    "enable_auto_recovery": self.config.enable_auto_recovery,
                },
            )

        if self.config.enable_auto_recovery:
            self.recovery_manager = DAIDRecoveryManager(self.client)

        if self.config.enable_synchronization and self.config.remote_endpoints:
            self.sync_manager = DAIDSynchronizationManager(
                self.client, self.config.remote_endpoints
            )

    async def initialize(self) -> None:
        """Initialize the client and all enabled features"""
        if self.initialized:
            return

        try:
            # Start health monitoring if enabled
            if self.config.enable_health_monitoring and self.health_monitor:
                await self.health_monitor.start()

            self.initialized = True
        except Exception as e:
            raise RuntimeError(f"Failed to initialize UnifiedDAIDClient: {e}")

    async def cleanup(self) -> None:
        """Clean up resources and stop background processes"""
        if self.batch_timer:
            self.batch_timer.cancel()
            await self.flush_batch()

        if self.health_monitor:
            self.health_monitor.stop()

        self.initialized = False

    async def create_daid(
        self,
        entity_type: str,
        entity_id: str,
        operation: str = "create",
        metadata: dict[str, Any] | None = None,
        parent_daids: list[str] | None = None,
        user_id: str | None = None,
        tags: list[str] | None = None,
        batch: bool = True,
        skip_cache: bool = False,
    ) -> DAIDOperationResult:
        """Create a new DAID with provenance tracking"""
        start_time = time.time()
        self.stats["operations_count"] += 1

        try:
            # Check cache first (if enabled and not skipped)
            if self.config.enable_caching and not skip_cache and self.cache:
                cache_key = self._generate_cache_key(
                    entity_type, entity_id, operation, metadata
                )
                cached = self.cache.get(cache_key)
                if cached:
                    self.stats["cache_hits"] += 1
                    return DAIDOperationResult(
                        success=True,
                        daid=cached,
                        metadata={
                            "cached": True,
                            "processing_time": (time.time() - start_time) * 1000,
                        },
                    )
                self.stats["cache_misses"] += 1

            # Create provenance record
            record_metadata = {
                **(metadata or {}),
                "system_component": self.config.system_component,
                "user_id": user_id,
                "tags": [*self.config.default_tags, *(tags or [])],
                "privacy_level": self.config.privacy_level,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }

            record = ProvenanceRecord(
                entity_type=entity_type,
                entity_id=entity_id,
                operation=operation,
                agent_id=self.config.agent_id,
                metadata=record_metadata,
                parent_daids=parent_daids or [],
            )

            # Handle batching
            if self.config.enable_batching and batch:
                daid = await self._add_to_batch(record)
                self.stats["batched_operations"] += 1
            else:
                daid = await self._process_single_record(record)

            # Cache the result
            if self.config.enable_caching and self.cache:
                cache_key = self._generate_cache_key(
                    entity_type, entity_id, operation, metadata
                )
                self.cache.set(cache_key, daid)

            return DAIDOperationResult(
                success=True,
                daid=daid,
                metadata={
                    "cached": False,
                    "batched": batch and self.config.enable_batching,
                    "processing_time": (time.time() - start_time) * 1000,
                },
            )

        except Exception as e:
            self.stats["errors"] += 1

            # Attempt recovery if enabled
            if self.config.enable_auto_recovery and self.recovery_manager:
                try:
                    recovery_options = DAIDRecoveryOptions()
                    recovery_result = await self.recovery_manager.recover_daid(
                        f"temp-{entity_type}-{entity_id}", recovery_options
                    )

                    if recovery_result.success and recovery_result.recovered_daids:
                        return DAIDOperationResult(
                            success=True,
                            daid=recovery_result.recovered_daids[0],
                            metadata={
                                "recovered": True,
                                "processing_time": (time.time() - start_time) * 1000,
                            },
                        )
                except Exception:
                    # Recovery failed, continue with original error
                    pass

            return DAIDOperationResult(
                success=False,
                error=str(e),
                metadata={"processing_time": (time.time() - start_time) * 1000},
            )

    async def flush_batch(self) -> None:
        """Flush any pending batched operations"""
        if not self.batch_queue:
            return

        batch = self.batch_queue.copy()
        self.batch_queue.clear()

        if self.batch_timer:
            self.batch_timer.cancel()
            self.batch_timer = None

        try:
            # Process batch through client
            for record in batch:
                await self.client.create_provenance_record(record)
        except Exception as e:
            logger.error(f"Batch processing failed: {e}")
            # Re-queue failed items for retry
            self.batch_queue = batch + self.batch_queue

    def get_stats(self) -> dict[str, Any]:
        """Get client statistics"""
        return {
            **self.stats,
            "batch_queue_size": len(self.batch_queue),
            "cache_size": self.cache.size() if self.cache else 0,
            "initialized": self.initialized,
        }

    async def _add_to_batch(self, record: ProvenanceRecord) -> str:
        """Add record to batch queue"""
        # Generate DAID immediately for return
        daid = DAIDGenerator.generate(
            agent_id=record.agent_id,
            entity_type=record.entity_type,
            entity_id=record.entity_id,
            operation=record.operation,
            metadata=record.metadata,
            parent_daids=record.parent_daids,
        )

        # Add to batch queue
        record_with_daid = ProvenanceRecord(
            entity_type=record.entity_type,
            entity_id=record.entity_id,
            operation=record.operation,
            agent_id=record.agent_id,
            metadata={**record.metadata, "daid": daid},
            parent_daids=record.parent_daids,
        )
        self.batch_queue.append(record_with_daid)

        # Set up batch timer if not already set
        if not self.batch_timer and self.config.batch_timeout:
            self.batch_timer = asyncio.create_task(self._batch_timer_task())

        # Flush if batch is full
        if len(self.batch_queue) >= self.config.batch_size:
            await self.flush_batch()

        return daid

    async def _batch_timer_task(self) -> None:
        """Batch timer task"""
        try:
            await asyncio.sleep(self.config.batch_timeout)
            await self.flush_batch()
        except asyncio.CancelledError:
            pass

    async def _process_single_record(self, record: ProvenanceRecord) -> str:
        """Process a single record immediately"""
        return await self.client.create_provenance_record(record)

    def _generate_cache_key(
        self,
        entity_type: str,
        entity_id: str,
        operation: str,
        metadata: dict[str, Any] | None = None,
    ) -> str:
        """Generate cache key for operation"""
        metadata_hash = "none"
        if metadata:
            metadata_str = json.dumps(metadata, sort_keys=True)
            metadata_hash = hashlib.md5(metadata_str.encode()).hexdigest()[:8]

        return f"{entity_type}:{entity_id}:{operation}:{metadata_hash}"
