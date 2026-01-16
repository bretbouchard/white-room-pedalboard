"""
Test maintainability review and improvement utilities.

This module provides utilities for reviewing and improving test maintainability,
including code quality checks, refactoring suggestions, and best practices enforcement.
"""

import ast
import re
from dataclasses import dataclass
from typing import Any


@dataclass
class MaintainabilityIssue:
    """Represents a maintainability issue found in test code."""

    file_path: str
    line_number: int
    issue_type: str
    description: str
    severity: str  # low, medium, high, critical
    suggestion: str


class TestMaintainabilityReviewer:
    """Reviews test code for maintainability issues and suggests improvements."""

    def __init__(self):
        self.issues: list[MaintainabilityIssue] = []
        self.best_practices = {
            "test_naming": r"^test_[a-zA-Z][a-zA-Z0-9_]*$",
            "assert_message": r'assert.*,\s*["\'][^"\']*["\']',  # assert with message
            "docstring": r'^\s*""".*?"""',  # multiline docstring
            "test_size": 50,  # max lines per test function
        }

    def review_file(self, file_path: str) -> list[MaintainabilityIssue]:
        """Review a single test file for maintainability issues."""
        self.issues = []

        with open(file_path, encoding="utf-8") as f:
            content = f.read()
            lines = content.split("\n")

        # Parse AST for structural analysis
        try:
            tree = ast.parse(content)
        except SyntaxError as e:
            self.add_issue(
                file_path,
                e.lineno or 0,
                "syntax_error",
                f"Syntax error: {e}",
                "critical",
                f"Fix syntax: {e}",
            )
            return self.issues

        # Review different aspects
        self._review_test_functions(file_path, tree, lines)
        self._review_imports(file_path, tree, lines)
        self._review_code_structure(file_path, tree, lines)
        self._review_naming_conventions(file_path, tree, lines)
        self._review_assertions(file_path, tree, lines)
        self._review_documentation(file_path, tree, lines)
        self._review_test_isolation(file_path, tree, lines)

        return self.issues

    def _review_test_functions(self, file_path: str, tree: ast.AST, lines: list[str]):
        """Review test function structure and size."""
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name.startswith("test_"):
                # Check test function size
                start_line = node.lineno
                end_line = self._get_end_line(node, lines)
                size = end_line - start_line + 1

                if size > self.best_practices["test_size"]:
                    self.add_issue(
                        file_path,
                        start_line,
                        "large_test",
                        f"Test function too large: {size} lines (max: {self.best_practices['test_size']})",
                        "medium",
                        "Consider breaking test into smaller functions or using helper methods",
                    )

                # Check for too many assertions
                assertion_count = self._count_assertions(node)
                if assertion_count > 10:
                    self.add_issue(
                        file_path,
                        start_line,
                        "too_many_assertions",
                        f"Too many assertions: {assertion_count} (consider multiple test cases)",
                        "medium",
                        "Split into multiple focused tests",
                    )

    def _review_imports(self, file_path: str, tree: ast.AST, lines: list[str]):
        """Review import statements for organization and unused imports."""
        imports = []
        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                imports.append(node)

        # Check for duplicate imports
        import_names = []
        for imp in imports:
            if isinstance(imp, ast.Import):
                for alias in imp.names:
                    name = alias.asname if alias.asname else alias.name
                    if name in import_names:
                        self.add_issue(
                            file_path,
                            imp.lineno,
                            "duplicate_import",
                            f"Duplicate import: {name}",
                            "low",
                            "Remove duplicate import",
                        )
                    import_names.append(name)

    def _review_code_structure(self, file_path: str, tree: ast.AST, lines: list[str]):
        """Review overall code structure."""
        # Check for complex functions
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                complexity = self._calculate_complexity(node)
                if complexity > 10:
                    self.add_issue(
                        file_path,
                        node.lineno,
                        "high_complexity",
                        f"Function complexity too high: {complexity}",
                        "medium",
                        "Consider simplifying or breaking into smaller functions",
                    )

    def _review_naming_conventions(
        self, file_path: str, tree: ast.AST, lines: list[str]
    ):
        """Review naming conventions."""
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                if not re.match(self.best_practices["test_naming"], node.name):
                    self.add_issue(
                        file_path,
                        node.lineno,
                        "naming_convention",
                        f"Test function name doesn't follow convention: {node.name}",
                        "medium",
                        "Use snake_case starting with 'test_'",
                    )

    def _review_assertions(self, file_path: str, tree: ast.AST, lines: list[str]):
        """Review assertion quality."""
        for i, line in enumerate(lines, 1):
            if (
                "assert" in line
                and "==" in line
                and '"' not in line
                and "'" not in line
            ):
                self.add_issue(
                    file_path,
                    i,
                    "missing_assert_message",
                    "Assertion without descriptive message",
                    "low",
                    'Add descriptive message to assertion: assert condition, "message"',
                )

    def _review_documentation(self, file_path: str, tree: ast.AST, lines: list[str]):
        """Review documentation quality."""
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name.startswith("Test"):
                # Check if class has docstring
                if not ast.get_docstring(node):
                    self.add_issue(
                        file_path,
                        node.lineno,
                        "missing_docstring",
                        f"Test class {node.name} missing docstring",
                        "medium",
                        "Add class docstring describing test purpose",
                    )

            elif isinstance(node, ast.FunctionDef) and node.name.startswith("test_"):
                # Check if test function has docstring
                if not ast.get_docstring(node):
                    self.add_issue(
                        file_path,
                        node.lineno,
                        "missing_docstring",
                        f"Test function {node.name} missing docstring",
                        "low",
                        "Add function docstring describing test scenario",
                    )

    def _review_test_isolation(self, file_path: str, tree: ast.AST, lines: list[str]):
        """Review test isolation practices."""
        # Check for shared state between tests
        class_globals = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef) and node.name.startswith("Test"):
                # Look for class-level variables that might cause test coupling
                for item in node.body:
                    if isinstance(item, ast.Assign):
                        for target in item.targets:
                            if isinstance(target, ast.Name):
                                class_globals.add(target.id)

        if len(class_globals) > 3:
            self.add_issue(
                file_path,
                1,
                "shared_state",
                f"Too much shared state in test class: {len(class_globals)} variables",
                "high",
                "Consider using fixtures or setup/teardown methods to manage state",
            )

    def _get_end_line(self, node: ast.AST, lines: list[str]) -> int:
        """Get the end line number of an AST node."""
        if hasattr(node, "end_lineno") and node.end_lineno:
            return node.end_lineno

        # Fallback: find the last line number in the node
        max_line = node.lineno
        for child in ast.walk(node):
            if hasattr(child, "lineno") and child.lineno > max_line:
                max_line = child.lineno
        return max_line

    def _count_assertions(self, node: ast.FunctionDef) -> int:
        """Count assertions in a function."""
        count = 0
        for child in ast.walk(node):
            if isinstance(child, ast.Assert):
                count += 1
        return count

    def _calculate_complexity(self, node: ast.AST) -> int:
        """Calculate cyclomatic complexity of a function."""
        complexity = 1  # Base complexity

        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.For, ast.While, ast.With, ast.Try)):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
            elif isinstance(child, ast.ListComp) or isinstance(child, ast.DictComp):
                complexity += 1

        return complexity

    def add_issue(
        self,
        file_path: str,
        line: int,
        issue_type: str,
        description: str,
        severity: str,
        suggestion: str,
    ):
        """Add a maintainability issue to the list."""
        issue = MaintainabilityIssue(
            file_path=file_path,
            line_number=line,
            issue_type=issue_type,
            description=description,
            severity=severity,
            suggestion=suggestion,
        )
        self.issues.append(issue)

    def generate_report(self) -> dict[str, Any]:
        """Generate a maintainability report."""
        total_issues = len(self.issues)
        severity_counts = {}
        issue_type_counts = {}

        for issue in self.issues:
            severity_counts[issue.severity] = severity_counts.get(issue.severity, 0) + 1
            issue_type_counts[issue.issue_type] = (
                issue_type_counts.get(issue.issue_type, 0) + 1
            )

        return {
            "total_issues": total_issues,
            "severity_breakdown": severity_counts,
            "issue_type_breakdown": issue_type_counts,
            "issues": self.issues,
            "recommendations": self._get_recommendations(),
        }

    def _get_recommendations(self) -> list[str]:
        """Get high-level recommendations based on issues found."""
        recommendations = []

        critical_issues = [i for i in self.issues if i.severity == "critical"]
        if critical_issues:
            recommendations.append(
                "CRITICAL: Fix syntax errors and critical issues immediately"
            )

        high_issues = [i for i in self.issues if i.severity == "high"]
        if high_issues:
            recommendations.append(
                "HIGH: Address high severity issues to improve test reliability"
            )

        large_tests = [i for i in self.issues if i.issue_type == "large_test"]
        if len(large_tests) > 3:
            recommendations.append(
                "Consider breaking down large tests for better maintainability"
            )

        doc_issues = [i for i in self.issues if i.issue_type == "missing_docstring"]
        if len(doc_issues) > 5:
            recommendations.append(
                "Add documentation to improve test understanding and maintainability"
            )

        if not recommendations:
            recommendations.append("Test code shows good maintainability practices")

        return recommendations


class TestRefactoringHelper:
    """Helper class for refactoring tests to improve maintainability."""

    @staticmethod
    def extract_helper_methods(file_path: str) -> list[str]:
        """Suggest helper methods that can be extracted from tests."""
        suggestions = []

        with open(file_path, encoding="utf-8") as f:
            content = f.read()

        # Look for repeated patterns
        patterns = {
            "audio_data_generation": r"np\.random\.random\(",
            "mock_setup": r"Mock\(\)",
            "assertion_pattern": r"assert.*\[(.*)\]",
        }

        for pattern_name, pattern in patterns.items():
            matches = re.findall(pattern, content)
            if len(matches) > 3:
                suggestions.append(
                    f"Extract '{pattern_name}' logic into helper method (found {len(matches)} occurrences)"
                )

        return suggestions

    @staticmethod
    def suggest_test_fixtures(file_path: str) -> list[str]:
        """Suggest pytest fixtures that could improve test organization."""
        suggestions = []

        with open(file_path, encoding="utf-8") as f:
            content = f.read()

        # Look for repeated setup code
        setup_patterns = [
            (r"tempfile\.NamedTemporaryFile", "temp_file"),
            (r"np\.random\.random", "random_audio_data"),
            (r"Mock\(\)", "mock_objects"),
        ]

        for pattern, fixture_name in setup_patterns:
            if len(re.findall(pattern, content)) > 2:
                suggestions.append(
                    f"Consider creating a '{fixture_name}' fixture for repeated setup code"
                )

        return suggestions

    @staticmethod
    def generate_refactored_test_template(
        original_content: str, suggestions: list[str]
    ) -> str:
        """Generate a refactored test template based on suggestions."""
        refactored = "# Refactored test file with improved maintainability\n\n"

        # Add imports
        refactored += "import pytest\n"
        refactored += "import numpy as np\n"
        refactored += "from unittest.mock import Mock\n\n"

        # Add helper functions section
        if any("helper method" in s for s in suggestions):
            refactored += "# Helper Functions\n"
            refactored += (
                "def create_test_audio(duration_seconds: float = 1.0) -> np.ndarray:\n"
            )
            refactored += '    """Create test audio data for testing."""\n'
            refactored += "    sample_rate = 44100\n"
            refactored += "    samples = int(duration_seconds * sample_rate)\n"
            refactored += "    return np.random.random(samples).astype(np.float32)\n\n"

        # Add fixtures section
        if any("fixture" in s for s in suggestions):
            refactored += "# Pytest Fixtures\n"
            refactored += "@pytest.fixture\n"
            refactored += "def mock_service():\n"
            refactored += '    """Mock service fixture."""\n'
            refactored += "    return Mock()\n\n"

        # Add improved test class template
        refactored += "class TestExample:\n"
        refactored += '    """Example test class with improved structure."""\n\n'
        refactored += "    def test_example_scenario(self, mock_service):\n"
        refactored += '        """Test example scenario with proper structure."""\n'
        refactored += "        # Arrange\n"
        refactored += "        test_data = create_test_audio()\n"
        refactored += "        \n"
        refactored += "        # Act\n"
        refactored += "        result = process_data(test_data)\n"
        refactored += "        \n"
        refactored += "        # Assert\n"
        refactored += (
            '        assert result is not None, "Processing should return result"\n'
        )
        refactored += '        assert len(result) > 0, "Result should not be empty"\n'

        return refactored


def run_maintainability_review(test_files: list[str]) -> dict[str, Any]:
    """Run maintainability review on multiple test files."""
    reviewer = TestMaintainabilityReviewer()
    all_issues = []

    for file_path in test_files:
        issues = reviewer.review_file(file_path)
        all_issues.extend(issues)

    # Generate overall report
    overall_report = {
        "total_files_reviewed": len(test_files),
        "total_issues_found": len(all_issues),
        "files_reviewed": test_files,
        "detailed_reports": {},
    }

    # Categorize issues by severity
    severity_breakdown = {
        "critical": len([i for i in all_issues if i.severity == "critical"]),
        "high": len([i for i in all_issues if i.severity == "high"]),
        "medium": len([i for i in all_issues if i.severity == "medium"]),
        "low": len([i for i in all_issues if i.severity == "low"]),
    }

    overall_report["severity_breakdown"] = severity_breakdown

    # Add recommendations
    if severity_breakdown["critical"] > 0:
        overall_report["priority"] = "CRITICAL"
    elif severity_breakdown["high"] > 0:
        overall_report["priority"] = "HIGH"
    elif severity_breakdown["medium"] > 5:
        overall_report["priority"] = "MEDIUM"
    else:
        overall_report["priority"] = "LOW"

    return overall_report


if __name__ == "__main__":
    # Example usage
    test_files = [
        "tests/test_invalid_inputs_simple.py",
        "tests/test_timeout_retry_scenarios.py",
        "tests/test_resource_cleanup_error_recovery.py",
        "tests/test_audio_performance.py",
    ]

    report = run_maintainability_review(test_files)
    print("Maintainability Review Complete")
    print(f"Priority: {report['priority']}")
    print(f"Total Issues: {report['total_issues_found']}")
    print(f"Severity Breakdown: {report['severity_breakdown']}")
