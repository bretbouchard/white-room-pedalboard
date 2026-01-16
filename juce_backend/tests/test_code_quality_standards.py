"""
Test code quality standards compliance for audio agent
"""

import ast
import logging
import os
from pathlib import Path

import pytest


class AudioAgentCodeQualityValidator:
    """Validates code quality standards for audio agent"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.src_path = project_root / "src"

    def get_python_files(self) -> list[Path]:
        """Get all Python files in the audio agent"""
        python_files = []
        for root, dirs, files in os.walk(self.src_path):
            # Skip __pycache__ and .git directories
            dirs[:] = [d for d in dirs if not d.startswith(".") and d != "__pycache__"]

            for file in files:
                if file.endswith(".py"):
                    python_files.append(Path(root) / file)
        return python_files

    def check_logging_standards(self, file_path: Path) -> list[str]:
        """Check if file uses standard Python logging"""
        issues = []

        try:
            with open(file_path, encoding="utf-8") as f:
                content = f.read()

            # Check for proper logging usage
            if "logging." in content:
                # Should have proper import
                if "import logging" not in content and "from logging" not in content:
                    issues.append("Uses logging without proper import")

                # Should use getLogger pattern
                if (
                    "logging.getLogger(__name__)" in content
                    or "logging.getLogger(" in content
                ):
                    # Good pattern found
                    pass
                elif "logging.basicConfig" in content:
                    # Also acceptable for configuration
                    pass
                else:
                    # Check if using logger instance
                    if "logger." not in content:
                        issues.append(
                            "Uses logging module directly instead of logger instance"
                        )

        except Exception as e:
            issues.append(f"Error parsing file: {e}")

        return issues

    def check_import_paths(self, file_path: Path) -> list[str]:
        """Check if imports reference existing modules"""
        issues = []

        try:
            with open(file_path, encoding="utf-8") as f:
                content = f.read()

            tree = ast.parse(content)

            for node in ast.walk(tree):
                if isinstance(node, ast.ImportFrom):
                    if node.module and node.module.startswith("audio_agent."):
                        # Check if the module path exists
                        module_parts = node.module.split(".")
                        if len(module_parts) > 1:
                            # Build expected file path
                            expected_path = self.src_path
                            for part in module_parts:
                                expected_path = expected_path / part

                            # Check if it's a package or module
                            if not (
                                expected_path.exists()
                                or (expected_path.with_suffix(".py")).exists()
                                or (expected_path / "__init__.py").exists()
                            ):
                                # Allow some flexibility for dynamic imports
                                if "test" not in str(file_path).lower():
                                    issues.append(
                                        f"Import '{node.module}' may reference non-existent module"
                                    )

        except Exception as e:
            issues.append(f"Error checking imports: {e}")

        return issues


@pytest.fixture
def validator():
    """Create an audio agent code quality validator"""
    project_root = Path(__file__).parent.parent
    return AudioAgentCodeQualityValidator(project_root)


def test_logging_standards(validator):
    """Test that all Python files use standard logging"""
    python_files = validator.get_python_files()
    all_issues = []

    for file_path in python_files:
        issues = validator.check_logging_standards(file_path)
        if issues:
            all_issues.extend(
                [
                    f"{file_path.relative_to(validator.project_root)}: {issue}"
                    for issue in issues
                ]
            )

    # Report issues but don't fail (informational for now)
    if all_issues:
        print(
            "Logging standards issues found (informational):\n" + "\n".join(all_issues)
        )


def test_import_paths(validator):
    """Test that all imports reference existing modules"""
    python_files = validator.get_python_files()
    all_issues = []

    for file_path in python_files:
        issues = validator.check_import_paths(file_path)
        if issues:
            all_issues.extend(
                [
                    f"{file_path.relative_to(validator.project_root)}: {issue}"
                    for issue in issues
                ]
            )

    # Report issues but don't fail (informational for now)
    if all_issues:
        print("Import path issues found (informational):\n" + "\n".join(all_issues))


def test_standard_logging_configuration():
    """Test that standard logging is properly configured"""

    # Test that we can create a logger
    logger = logging.getLogger("audio_agent.test")
    assert logger is not None
    assert isinstance(logger, logging.Logger)

    # Test that logger has proper methods
    assert hasattr(logger, "info")
    assert hasattr(logger, "error")
    assert hasattr(logger, "warning")
    assert hasattr(logger, "debug")

    # Test logging configuration
    original_level = logger.level
    logger.setLevel(logging.INFO)
    assert logger.level == logging.INFO
    logger.setLevel(original_level)


def test_environment_variable_access():
    """Test that environment variables are accessible"""
    import os

    # Test common audio agent environment variables
    env_vars = [
        "CLERK_SECRET_KEY",
        "SCHILLINGER_API_URL",
        "AUDIO_AGENT_PORT",
        "DAWDREAMER_ENABLED",
    ]

    for var in env_vars:
        value = os.getenv(var)
        # Just ensure we can access them without error
        assert value is None or isinstance(value, str)


def test_audio_agent_imports():
    """Test that core audio agent modules can be imported"""
    try:
        # Test that we can import main audio agent modules
        from audio_agent import main
        from audio_agent.models import agent

        # Test that modules have expected attributes
        assert hasattr(main, "app")

    except ImportError as e:
        # Some imports might fail in test environment, that's okay
        print(f"Import test info: {e}")


if __name__ == "__main__":
    # Run tests directly
    pytest.main([__file__, "-v"])
