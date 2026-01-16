#!/usr/bin/env python3
"""
Audio Agent JUCE Backend Connection Test Script

Tests WebSocket connectivity to the Audio Agent JUCE backend server.
Validates message exchange, measures latency, and verifies API response format.
"""

import asyncio
import websockets
import json
import time
import argparse
import sys
from typing import Dict, Any, Optional

class JUCEConnectionTester:
    def __init__(self, host: str = "localhost", port: int = 8082):
        self.host = host
        self.port = port
        self.uri = f"ws://{host}:{port}"
        self.websocket = None
        self.test_results = {}

    async def connect(self) -> bool:
        """Establish WebSocket connection to the JUCE backend."""
        try:
            self.websocket = await websockets.connect(
                self.uri,
                timeout=10,
                ping_interval=20,
                ping_timeout=10
            )
            print(f"✅ Connected to Audio Agent JUCE Backend at {self.uri}")
            return True
        except Exception as e:
            print(f"❌ Connection failed: {e}")
            return False

    async def disconnect(self):
        """Close WebSocket connection."""
        if self.websocket:
            await self.websocket.close()
            print("🔌 Disconnected from server")

    async def ping_test(self) -> Dict[str, Any]:
        """Test WebSocket ping/pong latency."""
        print("\n🏓 Testing WebSocket ping/pong...")

        try:
            start_time = time.time()
            await self.websocket.ping()
            end_time = time.time()
            latency = (end_time - start_time) * 1000  # Convert to milliseconds

            result = {
                "status": "success",
                "latency_ms": round(latency, 2),
                "timestamp": time.time()
            }

            print(f"✅ Ping latency: {latency:.2f}ms")
            self.test_results["ping_test"] = result
            return result

        except Exception as e:
            result = {
                "status": "failed",
                "error": str(e),
                "timestamp": time.time()
            }
            print(f"❌ Ping test failed: {e}")
            self.test_results["ping_test"] = result
            return result

    async def api_message_test(self) -> Dict[str, Any]:
        """Test basic API message exchange."""
        print("\n📡 Testing API message exchange...")

        # Test system status message
        test_message = {
            "type": "system_status",
            "request_id": f"test_{int(time.time())}"
        }

        try:
            start_time = time.time()
            await self.websocket.send(json.dumps(test_message))

            # Wait for response with timeout
            response = await asyncio.wait_for(
                self.websocket.recv(),
                timeout=5.0
            )
            end_time = time.time()

            response_data = json.loads(response)
            latency = (end_time - start_time) * 1000

            # Validate response format
            required_fields = ["type", "timestamp"]
            is_valid = all(field in response_data for field in required_fields)

            result = {
                "status": "success" if is_valid else "invalid_format",
                "latency_ms": round(latency, 2),
                "response_type": response_data.get("type", "unknown"),
                "response_data": response_data,
                "timestamp": time.time()
            }

            print(f"✅ API response received in {latency:.2f}ms")
            print(f"📋 Response type: {result['response_type']}")
            if not is_valid:
                print(f"⚠️  Response missing required fields: {required_fields}")

            self.test_results["api_test"] = result
            return result

        except asyncio.TimeoutError:
            result = {
                "status": "timeout",
                "error": "No response received within 5 seconds",
                "timestamp": time.time()
            }
            print(f"❌ API test timed out")
            self.test_results["api_test"] = result
            return result

        except Exception as e:
            result = {
                "status": "failed",
                "error": str(e),
                "timestamp": time.time()
            }
            print(f"❌ API test failed: {e}")
            self.test_results["api_test"] = result
            return result

    async def algorithm_test(self) -> Dict[str, Any]:
        """Test basic algorithm execution."""
        print("\n🎵 Testing algorithm execution...")

        # Test simple rhythm generation
        algorithm_message = {
            "type": "algorithm_execute",
            "algorithm": "rhythm_generator",
            "parameters": {
                "time_signature": [4, 4],
                "complexity": 0.3,
                "syncopation_level": 0.2,
                "duration_bars": 2,
                "tempo_bpm": 120
            },
            "request_id": f"algo_test_{int(time.time())}"
        }

        try:
            start_time = time.time()
            await self.websocket.send(json.dumps(algorithm_message))

            # Wait for algorithm response
            response = await asyncio.wait_for(
                self.websocket.recv(),
                timeout=10.0  # Algorithms take longer
            )

            end_time = time.time()
            response_data = json.loads(response)
            latency = (end_time - start_time) * 1000

            # Check if we got a valid algorithm response
            is_algorithm_response = (
                response_data.get("type") in ["algorithm_result", "algorithm_progress", "algorithm_error"]
            )

            result = {
                "status": "success" if is_algorithm_response else "unexpected_response",
                "latency_ms": round(latency, 2),
                "response_type": response_data.get("type", "unknown"),
                "algorithm": "rhythm_generator",
                "response_data": response_data,
                "timestamp": time.time()
            }

            print(f"✅ Algorithm response received in {latency:.2f}ms")
            print(f"🎶 Algorithm: {result['algorithm']}")
            print(f"📋 Response type: {result['response_type']}")

            if response_data.get("type") == "algorithm_error":
                print(f"⚠️  Algorithm returned error: {response_data.get('error', 'Unknown error')}")

            self.test_results["algorithm_test"] = result
            return result

        except asyncio.TimeoutError:
            result = {
                "status": "timeout",
                "error": "No algorithm response received within 10 seconds",
                "algorithm": "rhythm_generator",
                "timestamp": time.time()
            }
            print(f"❌ Algorithm test timed out")
            self.test_results["algorithm_test"] = result
            return result

        except Exception as e:
            result = {
                "status": "failed",
                "error": str(e),
                "algorithm": "rhythm_generator",
                "timestamp": time.time()
            }
            print(f"❌ Algorithm test failed: {e}")
            self.test_results["algorithm_test"] = result
            return result

    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all connection and API tests."""
        print("🚀 Starting Audio Agent JUCE Backend Connection Tests")
        print("=" * 60)

        if not await self.connect():
            return {"overall_status": "connection_failed"}

        try:
            # Run tests in sequence
            await self.ping_test()
            await self.api_message_test()
            await self.algorithm_test()

            # Calculate overall status
            successful_tests = sum(
                1 for result in self.test_results.values()
                if result.get("status") == "success"
            )
            total_tests = len(self.test_results)

            overall_status = {
                "overall_status": "success" if successful_tests == total_tests else "partial_failure",
                "successful_tests": successful_tests,
                "total_tests": total_tests,
                "test_results": self.test_results,
                "server_info": {
                    "host": self.host,
                    "port": self.port,
                    "uri": self.uri
                }
            }

            print("\n" + "=" * 60)
            print("📊 Test Summary:")
            print(f"✅ Successful tests: {successful_tests}/{total_tests}")
            print(f"🏷️  Overall status: {overall_status['overall_status']}")

            return overall_status

        finally:
            await self.disconnect()

async def main():
    parser = argparse.ArgumentParser(description="Test Audio Agent JUCE Backend Connection")
    parser.add_argument("--host", default="localhost", help="Server host (default: localhost)")
    parser.add_argument("--port", type=int, default=8082, help="Server port (default: 8082)")
    parser.add_argument("--output", help="Save test results to JSON file")
    parser.add_argument("--quiet", action="store_true", help="Suppress verbose output")

    args = parser.parse_args()

    tester = JUCEConnectionTester(args.host, args.port)

    if args.quiet:
        # Suppress print output by redirecting to devnull
        import io
        import contextlib
        f = io.StringIO()
        with contextlib.redirect_stdout(f):
            results = await tester.run_all_tests()
    else:
        results = await tester.run_all_tests()

    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)
        print(f"\n💾 Test results saved to {args.output}")

    # Exit with appropriate code
    if results.get("overall_status") == "success":
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())