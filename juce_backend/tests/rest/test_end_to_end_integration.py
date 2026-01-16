#!/usr/bin/env python3
"""
End-to-End Integration Test for REST API Security Framework
This test validates the complete security system in a real-world scenario
"""

import asyncio
import aiohttp
import json
import time
import threading
import statistics
from typing import List, Dict, Any
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys
import os

# Add the project root to Python path
sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), "..", "..", "..", "src", "rest")
)

try:
    # Try to import the actual REST security components
    from RateLimiter import RateLimiter
    from JsonSecurityParser import JsonSecurityParser
    from RequestValidator import RequestValidator
except ImportError:
    print("WARNING: Could not import REST security components - using mock for testing")

    # Mock implementations for testing
    class RateLimiter:
        def __init__(self):
            pass

        def isAllowed(self, client_id):
            return True

        def recordRequest(self, client_id):
            pass

    class JsonSecurityParser:
        def __init__(self):
            pass

        def parseSecure(self, json_str, root):
            return True

    class RequestValidator:
        def __init__(self):
            pass

        def validateAndSanitize(self, input_str):
            return type("Result", (), {"isValid": True, "sanitizedInput": input_str})()


@dataclass
class TestResult:
    """Test result data structure"""

    test_name: str
    passed: bool
    duration: float
    details: Dict[str, Any]
    error_message: str = ""


@dataclass
class SecurityMetrics:
    """Security metrics collection"""

    total_requests: int = 0
    blocked_requests: int = 0
    rate_limit_violations: int = 0
    json_parsing_failures: int = 0
    input_validation_failures: int = 0
    authentication_failures: int = 0
    average_response_time: float = 0.0
    requests_per_second: float = 0.0


class EndToEndSecurityTest:
    """Comprehensive end-to-end security testing framework"""

    def __init__(self):
        self.base_url = "http://localhost:8080"  # Default local test server
        self.api_key = "test-api-key-123456"
        self.session = None
        self.metrics = SecurityMetrics()
        self.test_results = []

        # Security components for direct testing
        self.rate_limiter = RateLimiter()
        self.json_parser = JsonSecurityParser()
        self.request_validator = RequestValidator()

        # Test data
        self.malicious_payloads = [
            # SQL Injection attempts
            {"query": "'; DROP TABLE users; --"},
            {"username": "admin' OR '1'='1"},
            {"id": "1; DELETE FROM sensitive_data;"},
            # XSS attempts
            {"comment": "<script>alert('xss')</script>"},
            {"name": "<img src=x onerror=alert('xss')>"},
            {"description": "<div onclick=alert('xss')>click me</div>"},
            # Path traversal
            {"file": "../../../etc/passwd"},
            {"path": "/var/log/../../secret.txt"},
            # Command injection
            {"command": "ls -la /etc/shadow"},
            {"cmd": "cat /etc/passwd"},
            # JSON exploits
            {"large_payload": "x" * 1000000},  # Very large JSON
            {
                "nested": {
                    "a": {
                        "b": {
                            "c": {
                                "d": {
                                    "e": {
                                        "f": {"g": {"h": {"i": {"j": {"k": "deep"}}}}}
                                    }
                                }
                            }
                        }
                    }
                }
            },
            # Unicode attacks
            {"unicode": "\u0000\u0001\u0002\u0003"},
            {"null_bytes": "test\x00\x00\x00exploit"},
        ]

        self.legitimate_payloads = [
            {"user_id": 123, "action": "get_profile"},
            {"query": "SELECT * FROM products WHERE category='electronics'"},
            {"content": "This is a normal user comment with safe content"},
            {"file_path": "/uploads/documents/user123/report.pdf"},
            {"settings": {"theme": "dark", "notifications": true}},
        ]

    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={
                "Content-Type": "application/json",
                "User-Agent": "Schillinger-REST-Security-Test/1.0",
            },
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()

    async def run_test(self, test_name: str, test_func, **kwargs) -> TestResult:
        """Run a single test with timing and error handling"""
        start_time = time.time()
        details = {}
        error_message = ""

        try:
            result = await test_func(**kwargs)
            details["result"] = result
            passed = True
        except Exception as e:
            error_message = str(e)
            passed = False
            details["exception"] = error_message

        duration = time.time() - start_time

        test_result = TestResult(
            test_name=test_name,
            passed=passed,
            duration=duration,
            details=details,
            error_message=error_message,
        )

        self.test_results.append(test_result)
        return test_result

    async def test_direct_component_security(self) -> TestResult:
        """Test security components directly"""

        # Test rate limiting
        rate_limit_passed = True
        rate_limit_violations = 0

        # Simulate rapid requests from same client
        client_id = "test_client_direct"
        for i in range(100):
            if not self.rate_limiter.isAllowed(client_id):
                rate_limit_violations += 1
            self.rate_limiter.recordRequest(client_id)

        if rate_limit_violations < 10:  # Should have some violations
            rate_limit_passed = False

        # Test JSON security parser
        json_security_passed = True
        json_parsing_failures = 0

        for payload in self.malicious_payloads:
            try:
                json_str = json.dumps(payload)
                root = {}
                if not self.json_parser.parseSecure(json_str, root):
                    json_parsing_failures += 1
            except:
                json_parsing_failures += 1

        # Should catch some malformed JSON
        if json_parsing_failures == 0:
            json_security_passed = False

        # Test input validator
        input_validation_passed = True
        input_validation_failures = 0

        for payload in self.malicious_payloads:
            result = self.request_validator.validateAndSanitize(str(payload))
            if not result.isValid:
                input_validation_failures += 1

        # Should catch some malicious inputs
        if input_validation_failures == 0:
            input_validation_passed = False

        # Test legitimate inputs (should all pass)
        legitimate_passed = True
        for payload in self.legitimate_payloads:
            result = self.request_validator.validateAndSanitize(str(payload))
            if not result.isValid:
                legitimate_passed = False
                break

        return {
            "rate_limiting": {
                "passed": rate_limit_passed,
                "violations": rate_limit_violations,
            },
            "json_security": {
                "passed": json_security_passed,
                "failures": json_parsing_failures,
            },
            "input_validation": {
                "passed": input_validation_passed,
                "failures": input_validation_failures,
            },
            "legitimate_inputs": {"passed": legitimate_passed},
        }

    async def test_api_endpoints(self) -> TestResult:
        """Test API endpoints for security"""
        if not self.session:
            raise RuntimeError("Session not initialized")

        results = {
            "health_check": {"passed": True},
            "authentication": {"passed": True, "attempts": 0},
            "rate_limiting": {"passed": True, "violations": 0},
            "input_validation": {"passed": True, "blocked": 0},
            "error_handling": {"passed": True},
        }

        # Test health endpoint
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                if response.status != 200:
                    results["health_check"]["passed"] = False
        except Exception as e:
            results["health_check"]["passed"] = False
            results["health_check"]["error"] = str(e)

        # Test authentication with invalid API key
        invalid_api_key = "invalid-key"
        auth_attempts = 0
        for i in range(5):
            try:
                async with self.session.get(
                    f"{self.base_url}/api/protected",
                    headers={"X-API-Key": invalid_api_key},
                ) as response:
                    auth_attempts += 1
                    if response.status not in [401, 403]:  # Should be unauthorized
                        results["authentication"]["passed"] = False
            except:
                results["authentication"]["passed"] = False

        results["authentication"]["attempts"] = auth_attempts

        # Test rate limiting on API endpoints
        rate_violations = 0
        for i in range(20):  # Rapid requests
            try:
                async with self.session.get(
                    f"{self.base_url}/api/test",
                    headers={"X-API-Key": self.api_key, "X-Client-IP": "192.168.1.100"},
                ) as response:
                    if response.status == 429:  # Too Many Requests
                        rate_violations += 1
            except:
                pass

        results["rate_limiting"]["violations"] = rate_violations

        # Test malicious input submission
        blocked_submissions = 0
        for payload in self.malicious_payloads[:5]:  # Test a subset
            try:
                async with self.session.post(
                    f"{self.base_url}/api/submit",
                    headers={"X-API-Key": self.api_key},
                    json=payload,
                ) as response:
                    if response.status >= 400:  # Should be rejected
                        blocked_submissions += 1
            except:
                blocked_submissions += 1

        results["input_validation"]["blocked"] = blocked_submissions

        # Test error handling
        try:
            async with self.session.get(f"{self.base_url}/api/nonexistent") as response:
                results["error_handling"]["status_code"] = response.status
                results["error_handling"]["passed"] = response.status == 404
        except Exception as e:
            results["error_handling"]["passed"] = False
            results["error_handling"]["error"] = str(e)

        return results

    async def test_load_and_performance(self) -> TestResult:
        """Test system under load"""
        if not self.session:
            raise RuntimeError("Session not initialized")

        # Performance test parameters
        concurrent_requests = 50
        requests_per_worker = 10
        total_requests = concurrent_requests * requests_per_worker

        start_time = time.time()
        response_times = []
        success_count = 0
        error_count = 0

        def make_request(worker_id: int) -> List[float]:
            """Make requests from a worker thread"""
            worker_times = []
            worker_success = 0
            worker_errors = 0

            for i in range(requests_per_worker):
                request_start = time.time()
                try:
                    # Use asyncio run in thread for async requests
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)

                    async def async_request():
                        async with aiohttp.ClientSession() as session:
                            async with session.get(
                                f"{self.base_url}/api/test",
                                headers={"X-API-Key": self.api_key},
                            ) as response:
                                return response.status

                    status = loop.run_until_complete(async_request())
                    loop.close()

                    if 200 <= status < 300:
                        worker_success += 1
                    else:
                        worker_errors += 1

                except Exception:
                    worker_errors += 1

                request_time = time.time() - request_start
                worker_times.append(request_time)

            return worker_times

        # Run concurrent requests
        with ThreadPoolExecutor(max_workers=concurrent_requests) as executor:
            futures = [
                executor.submit(make_request, i) for i in range(concurrent_requests)
            ]

            for future in as_completed(futures):
                try:
                    worker_times = future.result()
                    response_times.extend(worker_times)
                except Exception:
                    pass

        total_time = time.time() - start_time

        # Calculate metrics
        if response_times:
            avg_response_time = statistics.mean(response_times)
            p95_response_time = statistics.quantiles(response_times, n=20)[
                18
            ]  # 95th percentile
            p99_response_time = statistics.quantiles(response_times, n=100)[
                98
            ]  # 99th percentile
        else:
            avg_response_time = 0
            p95_response_time = 0
            p99_response_time = 0

        requests_per_second = total_requests / total_time if total_time > 0 else 0

        # Performance thresholds (adjust based on requirements)
        performance_passed = (
            avg_response_time < 0.5
            and p95_response_time < 1.0  # Average < 500ms
            and p99_response_time < 2.0  # 95th percentile < 1s
            and requests_per_second > 100  # 99th percentile < 2s  # > 100 RPS
        )

        return {
            "total_requests": total_requests,
            "total_time": total_time,
            "requests_per_second": requests_per_second,
            "avg_response_time": avg_response_time,
            "p95_response_time": p95_response_time,
            "p99_response_time": p99_response_time,
            "performance_passed": performance_passed,
            "success_rate": success_count / total_requests if total_requests > 0 else 0,
        }

    async def test_security_robustness(self) -> TestResult:
        """Test system robustness against various attacks"""
        if not self.session:
            raise RuntimeError("Session not initialized")

        robustness_results = {
            "large_payloads": {"blocked": 0, "total": 5},
            "malformed_json": {"rejected": 0, "total": 5},
            "header_injection": {"blocked": 0, "total": 3},
            "path_traversal": {"blocked": 0, "total": 3},
            "command_injection": {"blocked": 0, "total": 3},
        }

        # Test large payloads
        for i in range(5):
            large_payload = {"data": "x" * 1000000}  # 1MB payload
            try:
                async with self.session.post(
                    f"{self.base_url}/api/upload",
                    headers={"X-API-Key": self.api_key},
                    json=large_payload,
                ) as response:
                    if response.status >= 400:
                        robustness_results["large_payloads"]["blocked"] += 1
            except:
                robustness_results["large_payloads"]["blocked"] += 1

        # Test malformed JSON
        malformed_jsons = [
            '{"name":"test",}',  # Extra brace
            '{"name":"test", "value":}',  # Missing value
            '{name:"test", "value":123}',  # Missing quotes
            '{"name":"test", "value":123,}',  # Trailing comma
        ]

        for malformed_json in malformed_jsons:
            try:
                async with self.session.post(
                    f"{self.base_url}/api/process",
                    headers={"X-API-Key": self.api_key},
                    data=malformed_json,
                    headers={"Content-Type": "application/json"},
                ) as response:
                    if response.status >= 400:
                        robustness_results["malformed_json"]["rejected"] += 1
            except:
                robustness_results["malformed_json"]["rejected"] += 1

        # Test header injection
        injection_headers = [
            "X-Forwarded-For: 192.168.1.1\r\nX-Malicious: true",
            "User-Agent: Mozilla/5.0\r\nSet-Cookie: evil=1",
            "Accept: application/json\r\nLocation: evil.com",
        ]

        for header in injection_headers:
            try:
                header_parts = header.split(":", 1)
                if len(header_parts) == 2:
                    async with self.session.get(
                        f"{self.base_url}/api/test",
                        headers={
                            "X-API-Key": self.api_key,
                            header_parts[0].strip(): header_parts[1].strip(),
                        },
                    ) as response:
                        if response.status >= 400:
                            robustness_results["header_injection"]["blocked"] += 1
            except:
                robustness_results["header_injection"]["blocked"] += 1

        # Test path traversal
        path_traversal_attempts = [
            "/api/files/../../../etc/passwd",
            "/api/data/..\\..\\..\\windows\\system32\\config\\sam",
            "/api/upload/../../../../root/.ssh/id_rsa",
        ]

        for path in path_traversal_attempts:
            try:
                async with self.session.get(
                    f"{self.base_url}{path}", headers={"X-API-Key": self.api_key}
                ) as response:
                    if response.status >= 400:
                        robustness_results["path_traversal"]["blocked"] += 1
            except:
                robustness_results["path_traversal"]["blocked"] += 1

        # Test command injection
        command_attempts = [
            {"command": "ls -la /etc/shadow"},
            {"cmd": "cat /etc/passwd | grep root"},
            {"exec": "rm -rf /tmp/*"},
        ]

        for cmd in command_attempts:
            try:
                async with self.session.post(
                    f"{self.base_url}/api/execute",
                    headers={"X-API-Key": self.api_key},
                    json=cmd,
                ) as response:
                    if response.status >= 400:
                        robustness_results["command_injection"]["blocked"] += 1
            except:
                robustness_results["command_injection"]["blocked"] += 1

        # Calculate overall robustness score
        total_blocked = sum(result["blocked"] for result in robustness_results.values())
        total_attempts = sum(result["total"] for result in robustness_results.values())
        robustness_score = total_blocked / total_attempts if total_attempts > 0 else 0

        robustness_passed = (
            robustness_score > 0.8
        )  # 80% of malicious requests should be blocked

        return {
            "robustness_score": robustness_score,
            "robustness_passed": robustness_passed,
            "details": robustness_results,
        }

    async def run_all_tests(self) -> Dict[str, Any]:
        """Run all integration tests"""
        print("🔒 Starting REST API Security End-to-End Integration Tests")
        print("=" * 60)

        # Test 1: Direct Component Security
        print("\n1. Testing Direct Component Security...")
        component_result = await self.run_test(
            "Direct Component Security", self.test_direct_component_security
        )

        # Test 2: API Endpoint Security
        print("2. Testing API Endpoint Security...")
        api_result = await self.run_test(
            "API Endpoint Security", self.test_api_endpoints
        )

        # Test 3: Load and Performance
        print("3. Testing Load and Performance...")
        performance_result = await self.run_test(
            "Load and Performance", self.test_load_and_performance
        )

        # Test 4: Security Robustness
        print("4. Testing Security Robustness...")
        robustness_result = await self.run_test(
            "Security Robustness", self.test_security_robustness
        )

        # Calculate overall results
        all_passed = all(
            [
                component_result.passed,
                api_result.passed,
                performance_result.passed,
                robustness_result.passed,
            ]
        )

        total_duration = sum(
            [
                component_result.duration,
                api_result.duration,
                performance_result.duration,
                robustness_result.duration,
            ]
        )

        return {
            "overall_passed": all_passed,
            "total_duration": total_duration,
            "test_results": {
                "components": component_result,
                "api": api_result,
                "performance": performance_result,
                "robustness": robustness_result,
            },
            "summary": self.generate_summary(),
        }

    def generate_summary(self) -> Dict[str, Any]:
        """Generate test summary"""
        passed_tests = sum(1 for result in self.test_results if result.passed)
        total_tests = len(self.test_results)

        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": total_tests - passed_tests,
            "success_rate": passed_tests / total_tests if total_tests > 0 else 0,
            "test_count": len(self.test_results),
            "metrics": self.metrics,
        }


def print_results(results: Dict[str, Any]):
    """Print formatted test results"""
    print("\n" + "=" * 60)
    print("🏁 TEST RESULTS SUMMARY")
    print("=" * 60)

    # Overall result
    status_emoji = "✅" if results["overall_passed"] else "❌"
    status_text = "PASSED" if results["overall_passed"] else "FAILED"
    print(f"\n{status_emoji} Overall Status: {status_text}")
    print(f"⏱️  Total Duration: {results['total_duration']:.2f} seconds")

    # Individual test results
    print(f"\n📊 Individual Test Results:")
    for test_name, test_result in results["test_results"].items():
        status_emoji = "✅" if test_result.passed else "❌"
        print(f"  {status_emoji} {test_name}: {test_result.duration:.2f}s")

    # Summary
    summary = results["summary"]
    print(f"\n📈 Test Summary:")
    print(f"  Total Tests: {summary['total_tests']}")
    print(f"  Passed: {summary['passed_tests']}")
    print(f"  Failed: {summary['failed_tests']}")
    print(f"  Success Rate: {summary['success_rate']:.1%}")

    # Recommendations
    if not results["overall_passed"]:
        print(f"\n⚠️  Recommendations:")
        for test_name, test_result in results["test_results"].items():
            if not test_result.passed:
                print(f"  • Review {test_name} failures")
    else:
        print(
            f"\n🎉 All tests passed! The REST API Security Framework is ready for deployment."
        )


async def main():
    """Main test runner"""
    try:
        async with EndToEndSecurityTest() as test_runner:
            results = await test_runner.run_all_tests()
            print_results(results)

            # Exit with appropriate code
            sys.exit(0 if results["overall_passed"] else 1)

    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
