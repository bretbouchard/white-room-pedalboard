# Version identifier for daid_core package
__version__ = "1.0.0"

"""
DAID Core Python Bindings

This module provides Python bindings for the DAID (Distributed Agent
Identifier) provenance system, enabling cross-language DAID usage between
Python and TypeScript/JavaScript.
"""

import hashlib
import json
import re
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any


import requests

  

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
    parent_daids: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None


@dataclass
class DAIDValidationResult:
    """Result of DAID validation"""

    valid: bool
    components: Optional[DAIDComponents] = None
    errors: Optional[List[str]] = None


class DAIDGenerator:
    """DAID generator with provenance tracking"""

    VERSION = "v1.0"
    DAID_REGEX = re.compile(
        r'^daid:v\d+\.\d+:.+:[^:]+:[^:]+:[^:]+:[a-f0-9]{16}$'
    )
    
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
    def generate(cls,
                 agent_id: str,
                 entity_type: str,
                 entity_id: str,
                 operation: str = "create",
                 parent_daids: Optional[List[str]] = None,
                 metadata: Optional[Dict[str, Any]] = None) -> str:
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
    def parse(cls, daid: str) -> Optional[DAIDComponents]:
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
        parent_daids: List[str],
        operation: str,
        metadata: Dict[str, Any],
        entity_id: str,
    ) -> str:
        """Calculate provenance hash from parents, operation, and metadata"""
        provenance_data = {
            "parents": sorted(parent_daids),  # Sort for consistency
            "operation": operation,
            "metadata": cls._normalize_metadata(metadata),
            "entity_id": entity_id,
        }
        
        hash_input = json.dumps(
            provenance_data, sort_keys=True, separators=(',', ':')
        )
        hash_obj = hashlib.sha256(hash_input.encode('utf-8'))
        
        # Return first 16 characters for brevity
        return hash_obj.hexdigest()[:16]

    @classmethod
    def _normalize_metadata(cls, metadata: Dict[str, Any]) -> Dict[str, Any]:
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
        api_key: Optional[str] = None,
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
    
    def get_provenance_chain(self, entity_type: str,
                             entity_id: str) -> List[str]:
        """Get provenance chain for an entity"""
        if not self.base_url:
            raise ValueError(
                "Base URL required for provenance chain retrieval"
            )
        
        url = (
            f"{self.base_url}/api/v1/provenance/chain/"
            f"{entity_type}/{entity_id}"
        )
        response = self.session.get(url, timeout=self.timeout)
        response.raise_for_status()

        data = response.json()
        chain = data.get("chain", [])
        return list(chain) if isinstance(chain, list) else []

    def invalidate_cache(self, daids: List[str]) -> None:
        """Invalidate cache for specific DAIDs"""
        if not self.base_url:
            return  # No-op for local-only usage

        try:
            url = f"{self.base_url}/api/v1/cache/invalidate"
            self.session.post(url, json={"daids": daids}, timeout=self.timeout)
        except Exception as e:
            print(f"Warning: Failed to invalidate cache: {e}")

    def discover_system_patterns(self) -> Dict[str, Any]:
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
        parent_daids: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
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
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._ttl = timedelta(seconds=ttl_seconds)
        self._timestamps: Dict[str, datetime] = {}

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

    def get_stats(self) -> Dict[str, int]:
        """Get cache statistics"""
        current_time = datetime.now()
        expired = sum(
            1 for timestamp in self._timestamps.values()
            if current_time - timestamp > self._ttl
        )
        
        return {
            "total_entries": len(self._cache),
            "active_entries": len(self._cache) - expired,
            "expired_entries": expired,
            "max_ttl_seconds": int(self._ttl.total_seconds())
        }


# Additional classes for health monitoring and recovery
@dataclass
class DAIDHealthCheck:
    """Health check result for a DAID"""
    daid: str
    status: str  # "healthy", "warning", "error", "missing"
    errors: List[str]
    last_checked: datetime
    metadata: Dict[str, Any]


@dataclass
class DAIDRecoveryOptions:
    """Options for DAID recovery"""
    strategy: str  # "regenerate", "repair", "restore", "merge"
    backup_data: Optional[Dict[str, Any]] = None
    source_daid: Optional[str] = None
    preserve_metadata: bool = True
    validate_after_recovery: bool = True


@dataclass
class DAIDRecoveryResult:
    """Result of DAID recovery operation"""
    success: bool
    recovered_daid: Optional[str]
    original_daid: str
    strategy: str
    errors: List[str]
    warnings: List[str]
    metadata: Dict[str, Any]


class ProvenanceChainBuilder:
    """Builds and manages provenance chains for DAIDs"""
    
    def __init__(self):
        self._chains: Dict[str, Any] = {}
        self._records: Dict[str, ProvenanceRecord] = {}
    
    def add_record(self, daid: str, record: ProvenanceRecord) -> None:
        """Add a provenance record to the chain"""
        self._records[daid] = record
        # Build chain logic would go here
    
    def get_chain(self, daid: str) -> Any:
        """Get provenance chain for a DAID"""
        return self._chains.get(daid)
    
    def export_chain(self, daid: str) -> Dict[str, Any]:
        """Export provenance chain as JSON"""
        chain = self.get_chain(daid)
        if not chain:
            return {}
        
        return {
            "daid": daid,
            "chain": chain,
            "records": {k: asdict(v) for k, v in self._records.items() if k.startswith(daid)}
        }


class DAIDValidator:
    """Enhanced DAID validation with detailed error reporting"""
    
    @dataclass
    class ValidationResult:
        is_valid: bool
        errors: List[str]
        warnings: List[str]
        components: Optional[DAIDComponents] = None
    
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
            components=components
        )


class DAIDHealthMonitor:
    """DAID health monitoring system"""
    
    def __init__(self, chain_builder: ProvenanceChainBuilder, config: Optional[Dict[str, Any]] = None):
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
            metadata={"validation": validation.__dict__ if 'validation' in locals() else {}}
        )
    
    def get_system_health_report(self) -> Dict[str, Any]:
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
            "recommendations": ["No DAIDs to check"]
        }
    
    def get_recommendations(self, health_checks: List[DAIDHealthCheck]) -> List[str]:
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
    
    def recover_daid(self, daid: str, options: DAIDRecoveryOptions) -> DAIDRecoveryResult:
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
        
        result.metadata["recovery_time"] = (datetime.now() - start_time).total_seconds() * 1000
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
            return daid if len(original_chain.nodes) >= len(source_chain.nodes) else options.source_daid
        
        return daid if original_chain else options.source_daid


class DAIDSynchronizationManager:
    """DAID synchronization manager"""
    
    def __init__(self, chain_builder: ProvenanceChainBuilder, remote_endpoint: Optional[str] = None):
        self.chain_builder = chain_builder
        self.remote_endpoint = remote_endpoint
    
    def check_sync_status(self, daid: str) -> Dict[str, Any]:
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


# Utility functions for DAID monitoring and recovery
def create_daid_health_monitor(chain_builder: ProvenanceChainBuilder, **config: Any) -> DAIDHealthMonitor:
    """Factory function for creating DAID health monitor"""
    return DAIDHealthMonitor(chain_builder, config)


def create_daid_recovery_manager(chain_builder: ProvenanceChainBuilder) -> DAIDRecoveryManager:
    """Factory function for creating DAID recovery manager"""
    return DAIDRecoveryManager(chain_builder)


def create_daid_sync_manager(chain_builder: ProvenanceChainBuilder, remote_endpoint: Optional[str] = None) -> DAIDSynchronizationManager:
    """Factory function for creating DAID synchronization manager"""
    return DAIDSynchronizationManager(chain_builder, remote_endpoint)


def perform_daid_health_check(daid: str, chain_builder: ProvenanceChainBuilder) -> DAIDHealthCheck:
    """Perform a quick health check on a DAID"""
    monitor = DAIDHealthMonitor(chain_builder)
    return monitor.check_daid_health(daid)


def recover_corrupted_daid(daid: str, chain_builder: ProvenanceChainBuilder, strategy: str = "repair") -> DAIDRecoveryResult:
    """Recover a corrupted DAID using the specified strategy"""
    recovery_manager = DAIDRecoveryManager(chain_builder)
    options = DAIDRecoveryOptions(strategy=strategy)
    return recovery_manager.recover_daid(daid, options)
