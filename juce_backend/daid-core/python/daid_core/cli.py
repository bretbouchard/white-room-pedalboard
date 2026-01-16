#!/usr/bin/env python3
"""
DAID Core Command Line Interface

Provides CLI commands for DAID generation, validation, and health checks.
"""

import argparse
import asyncio
import json
import sys
from typing import Any, Dict

from . import DAIDGenerator, DAIDClient, DAIDValidator


def generate_daid(args: argparse.Namespace) -> None:
    """Generate a new DAID"""
    try:
        daid = DAIDGenerator.generate(
            agent_id=args.agent_id,
            entity_type=args.entity_type,
            entity_id=args.entity_id,
            operation=args.operation,
            parent_daids=args.parent_daids.split(',') if args.parent_daids else None,
            metadata=json.loads(args.metadata) if args.metadata else None,
        )
        print(daid)
    except Exception as e:
        print(f"Error generating DAID: {e}", file=sys.stderr)
        sys.exit(1)


def validate_daid(args: argparse.Namespace) -> None:
    """Validate a DAID"""
    try:
        validation = DAIDValidator.validate_enhanced(args.daid)

        if validation.is_valid:
            print(f"✅ DAID is valid")
            if validation.warnings:
                print(f"⚠️  Warnings: {', '.join(validation.warnings)}")
        else:
            print(f"❌ DAID is invalid")
            print(f"Errors: {', '.join(validation.errors)}")
            sys.exit(1)

    except Exception as e:
        print(f"Error validating DAID: {e}", file=sys.stderr)
        sys.exit(1)


def parse_daid(args: argparse.Namespace) -> None:
    """Parse a DAID and show its components"""
    try:
        components = DAIDGenerator.parse(args.daid)
        if not components:
            print("❌ Invalid DAID format", file=sys.stderr)
            sys.exit(1)

        print("DAID Components:")
        print(f"  Version: {components.version}")
        print(f"  Timestamp: {components.timestamp}")
        print(f"  Agent ID: {components.agent_id}")
        print(f"  Entity Type: {components.entity_type}")
        print(f"  Entity ID: {components.entity_id}")
        print(f"  Provenance Hash: {components.provenance_hash}")

    except Exception as e:
        print(f"Error parsing DAID: {e}", file=sys.stderr)
        sys.exit(1)


async def health_check(args: argparse.Namespace) -> None:
    """Perform health check on DAID service"""
    try:
        client = DAIDClient(
            agent_id="health-check",
            base_url=args.base_url,
            api_key=args.api_key,
        )

        monitor = DAIDHealthMonitor(client)
        result = await monitor.perform_health_check()

        if result.is_healthy:
            print(f"✅ Service is healthy")
            print(f"Response time: {result.response_time_ms:.2f}ms")
            if result.checks_performed:
                for check_name, passed in result.checks_performed.items():
                    status = "✅" if passed else "❌"
                    print(f"  {status} {check_name}")
        else:
            print(f"❌ Service is unhealthy")
            if result.error_message:
                print(f"Error: {result.error_message}")
            sys.exit(1)

    except Exception as e:
        print(f"Health check failed: {e}", file=sys.stderr)
        sys.exit(1)


def main() -> None:
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(
        prog="daid-cli",
        description="DAID Core Command Line Interface"
    )

    parser.add_argument(
        "--version",
        action="version",
        version="daid_core 1.0.0"
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Generate command
    generate_parser = subparsers.add_parser("generate", help="Generate a new DAID")
    generate_parser.add_argument("--agent-id", required=True, help="Agent identifier")
    generate_parser.add_argument("--entity-type", required=True, help="Entity type")
    generate_parser.add_argument("--entity-id", required=True, help="Entity identifier")
    generate_parser.add_argument("--operation", default="create", help="Operation type")
    generate_parser.add_argument("--parent-daids", help="Comma-separated parent DAIDs")
    generate_parser.add_argument("--metadata", help="JSON metadata")
    generate_parser.set_defaults(func=generate_daid)

    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate a DAID")
    validate_parser.add_argument("daid", help="DAID to validate")
    validate_parser.set_defaults(func=validate_daid)

    # Parse command
    parse_parser = subparsers.add_parser("parse", help="Parse a DAID and show components")
    parse_parser.add_argument("daid", help="DAID to parse")
    parse_parser.set_defaults(func=parse_daid)

    # Health check command
    health_parser = subparsers.add_parser("health", help="Perform health check")
    health_parser.add_argument("--base-url", default="http://localhost:8080", help="Base URL")
    health_parser.add_argument("--api-key", help="API key")
    health_parser.set_defaults(func=health_check)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    # Handle async commands
    if args.command == "health":
        asyncio.run(args.func(args))
    else:
        args.func(args)


# Import health monitor for CLI
try:
    from .monitoring import DAIDHealthMonitor
except ImportError:
    # Fallback if monitoring module not available
    class DAIDHealthMonitor:
        def __init__(self, client):
            self.client = client

        async def perform_health_check(self):
            from .. import DAIDHealthCheck
            from datetime import datetime
            import time

            start_time = time.time()
            try:
                # Test DAID generation
                test_daid = DAIDGenerator.generate(
                    agent_id="health-check",
                    entity_type="test",
                    entity_id="health-test",
                    operation="test",
                )

                return DAIDHealthCheck(
                    is_healthy=DAIDGenerator.is_valid(test_daid),
                    response_time_ms=(time.time() - start_time) * 1000,
                    timestamp=datetime.now().isoformat(),
                    checks_performed={"generation": DAIDGenerator.is_valid(test_daid)},
                )
            except Exception as e:
                return DAIDHealthCheck(
                    is_healthy=False,
                    response_time_ms=(time.time() - start_time) * 1000,
                    error_message=str(e),
                    timestamp=datetime.now().isoformat(),
                    checks_performed={},
                )


if __name__ == "__main__":
    main()