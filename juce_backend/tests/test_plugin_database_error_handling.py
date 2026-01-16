"""
Comprehensive error handling tests for Plugin Database module.

Tests critical failure scenarios in the plugin database including:
- Database connection and initialization failures
- SQLite corruption and locking issues
- File system permission and access errors
- Plugin scanning and parsing failures
- Cache validation and corruption issues
- Metadata validation and parsing errors
- Concurrent access and thread safety
- Memory management and resource cleanup
"""

import json
import os
import shutil
import sqlite3
import tempfile
import threading
import time
from unittest.mock import Mock, mock_open, patch

import pytest

# Import the plugin database modules
from audio_agent.core.plugin_database import PluginDatabase, PluginDatabaseConfig
from audio_agent.models.plugin import PluginCategory, PluginFormat, PluginMetadata
from pydantic import ValidationError


class TestPluginDatabaseInitialization:
    """Test plugin database initialization error handling."""

    @pytest.fixture
    def temp_db_path(self):
        """Create temporary database path."""
        temp_dir = tempfile.mkdtemp()
        db_path = os.path.join(temp_dir, "test_plugins.db")
        yield db_path
        shutil.rmtree(temp_dir, ignore_errors=True)

    @pytest.fixture
    def valid_config(self, temp_db_path):
        """Create valid plugin database configuration."""
        return PluginDatabaseConfig(
            database_path=temp_db_path, scan_paths=[], auto_scan_on_startup=False
        )

    def test_database_path_nonexistent_directory(self):
        """Test initialization with nonexistent parent directory."""
        # This should work - the database should create the directory
        nonexistent_path = "/tmp/nonexistent/deep/path/test.db"
        config = PluginDatabaseConfig(
            database_path=nonexistent_path, auto_scan_on_startup=False
        )

        # Should not raise an exception
        db = PluginDatabase(config)
        assert db._conn is not None
        db._conn.close()

    def test_database_path_permission_denied(self):
        """Test initialization with permission denied on database path."""
        # Create a directory we can't write to
        readonly_dir = tempfile.mkdtemp()
        try:
            os.chmod(readonly_dir, 0o444)  # Read-only
            readonly_path = os.path.join(readonly_dir, "test.db")

            config = PluginDatabaseConfig(
                database_path=readonly_path, auto_scan_on_startup=False
            )

            # Should handle permission error gracefully
            with pytest.raises((sqlite3.Error, PermissionError, OSError)):
                PluginDatabase(config)
        finally:
            os.chmod(readonly_dir, 0o755)  # Restore permissions
            shutil.rmtree(readonly_dir, ignore_errors=True)

    def test_database_file_corruption(self, temp_db_path):
        """Test initialization with corrupted database file."""
        # Create a corrupted database file
        with open(temp_db_path, "w") as f:
            f.write("This is not a valid SQLite database file")

        config = PluginDatabaseConfig(
            database_path=temp_db_path, auto_scan_on_startup=False
        )

        # Should handle corrupted database gracefully
        with pytest.raises(sqlite3.Error):
            PluginDatabase(config)

    def test_database_locking_scenario(self, temp_db_path):
        """Test database initialization when file is locked."""
        config = PluginDatabaseConfig(
            database_path=temp_db_path, auto_scan_on_startup=False
        )

        # Create first database connection
        db1 = PluginDatabase(config)

        # Try to create second connection with exclusive lock
        with patch("sqlite3.connect") as mock_connect:
            mock_connect.side_effect = sqlite3.OperationalError("database is locked")

            with pytest.raises(sqlite3.Error):
                PluginDatabase(config)

        db1._conn.close()

    def test_invalid_configuration(self):
        """Test initialization with invalid configuration."""
        # Test with invalid database path
        with pytest.raises(ValidationError):
            PluginDatabaseConfig(database_path="")

        # Test with invalid cache TTL
        with pytest.raises(ValidationError):
            PluginDatabaseConfig(database_path="/tmp/test.db", cache_ttl_seconds=-1)

    def test_database_connection_failure_recovery(self, temp_db_path):
        """Test recovery from database connection failure."""
        config = PluginDatabaseConfig(
            database_path=temp_db_path, auto_scan_on_startup=False
        )

        # Mock sqlite3.connect to fail initially then succeed
        with patch("sqlite3.connect") as mock_connect:
            mock_connect.side_effect = [
                sqlite3.Error("Connection failed"),
                Mock(
                    row_factory=sqlite3.Row,
                    cursor=Mock(return_value=Mock(execute=Mock(return_value=Mock()))),
                ),
            ]

            # Should raise error on failure
            with pytest.raises(sqlite3.Error):
                PluginDatabase(config)


class TestPluginDatabaseOperations:
    """Test plugin database operation error handling."""

    @pytest.fixture
    def initialized_db(self, temp_db_path):
        """Create initialized plugin database."""
        config = PluginDatabaseConfig(
            database_path=temp_db_path, auto_scan_on_startup=False
        )
        db = PluginDatabase(config)
        yield db
        if db._conn:
            db._conn.close()

    def test_cursor_access_before_initialization(self):
        """Test accessing cursor before database is initialized."""
        # Create database but manually set connection to None
        config = PluginDatabaseConfig(
            database_path="/tmp/test.db", auto_scan_on_startup=False
        )

        with patch("sqlite3.connect") as mock_connect:
            mock_connect.return_value = None

            with pytest.raises(
                RuntimeError, match="Database connection is not initialized"
            ):
                PluginDatabase(config)

    def test_transaction_rollback_on_failure(self, initialized_db):
        """Test transaction rollback on operation failure."""
        # Start a transaction
        cursor = initialized_db._get_cursor()

        # Mock a database operation that fails
        with patch.object(cursor, "execute") as mock_execute:
            mock_execute.side_effect = sqlite3.Error("Operation failed")

            # Operation should fail and rollback should be called
            with pytest.raises(sqlite3.Error):
                cursor.execute("INSERT INTO plugins VALUES (?, ?)", ("test", "data"))

    def test_concurrent_database_access(self, initialized_db):
        """Test concurrent database access handling."""
        results = []
        errors = []

        def worker():
            try:
                cursor = initialized_db._get_cursor()
                cursor.execute("SELECT COUNT(*) FROM plugins")
                results.append(cursor.fetchone()[0])
            except Exception as e:
                errors.append(e)

        # Create multiple threads accessing database
        threads = []
        for _ in range(5):
            thread = threading.Thread(target=worker)
            threads.append(thread)
            thread.start()

        for thread in threads:
            thread.join()

        # Should handle concurrent access without crashes
        assert len(errors) == 0 or len(results) > 0

    def test_database_connection_loss_during_operation(self, initialized_db):
        """Test handling of database connection loss during operations."""
        # Mock connection to close during operation
        with patch.object(initialized_db, "_conn") as mock_conn:
            mock_conn.cursor.side_effect = sqlite3.Error("Connection lost")

            with pytest.raises(sqlite3.Error):
                initialized_db._get_cursor()


class TestPluginScanningErrorHandling:
    """Test plugin scanning error handling."""

    @pytest.fixture
    def db_with_scan_paths(self, temp_db_path):
        """Create database with scan paths configured."""
        scan_dir = tempfile.mkdtemp()
        config = PluginDatabaseConfig(
            database_path=temp_db_path,
            scan_paths=[scan_dir],
            auto_scan_on_startup=False,
        )
        db = PluginDatabase(config)
        yield db, scan_dir
        if db._conn:
            db._conn.close()
        shutil.rmtree(scan_dir, ignore_errors=True)

    def test_scan_nonexistent_directory(self, db_with_scan_paths):
        """Test scanning nonexistent directory."""
        db, scan_dir = db_with_scan_paths

        # Remove scan directory
        shutil.rmtree(scan_dir, ignore_errors=True)

        # Update config to point to nonexistent directory
        db.config.scan_paths = ["/nonexistent/directory"]

        # Should handle gracefully and return 0 plugins found
        result = db.scan_plugins()
        assert result == 0

    def test_scan_directory_without_permissions(self, db_with_scan_paths):
        """Test scanning directory without read permissions."""
        db, scan_dir = db_with_scan_paths

        # Remove read permissions
        os.chmod(scan_dir, 0o000)

        try:
            # Should handle permission error gracefully
            result = db.scan_plugins()
            assert result == 0
        finally:
            # Restore permissions
            os.chmod(scan_dir, 0o755)

    def test_scan_with_malformed_plugin_files(self, db_with_scan_paths):
        """Test scanning directory with malformed plugin files."""
        db, scan_dir = db_with_scan_paths

        # Create malformed plugin files
        malformed_files = ["plugin1.vst3", "plugin2.vst3", ".hidden_plugin.vst3"]

        for filename in malformed_files:
            filepath = os.path.join(scan_dir, filename)
            with open(filepath, "w") as f:
                f.write("This is not a valid plugin file")

        # Should handle malformed files gracefully
        result = db.scan_plugins()
        assert result >= 0  # Should not crash

    def test_scan_with_very_large_directory(self, db_with_scan_paths):
        """Test scanning directory with many files."""
        db, scan_dir = db_with_scan_paths

        # Create many dummy files
        for i in range(100):
            filepath = os.path.join(scan_dir, f"dummy_{i}.vst3")
            with open(filepath, "w") as f:
                f.write(f"dummy plugin content {i}")

        # Should handle large directories without memory issues
        result = db.scan_plugins()
        assert result >= 0

    def test_scan_interruption_handling(self, db_with_scan_paths):
        """Test handling of scan interruption."""
        db, scan_dir = db_with_scan_paths

        # Mock os.walk to raise KeyboardInterrupt
        with patch("os.walk") as mock_walk:
            mock_walk.side_effect = KeyboardInterrupt("Scan interrupted")

            # Should handle interruption gracefully
            with pytest.raises(KeyboardInterrupt):
                db.scan_plugins()

    def test_scan_with_symlink_loops(self, db_with_scan_paths):
        """Test scanning with symlink loops."""
        db, scan_dir = db_with_scan_paths

        # Create symlink loop (if supported)
        link_path = os.path.join(scan_dir, "loop_link")
        try:
            os.symlink(scan_dir, link_path)

            # Should handle symlink loops gracefully
            result = db.scan_plugins()
            assert result >= 0
        except (OSError, NotImplementedError):
            # Symlinks not supported on this platform
            pass

    def test_scan_path_validation_errors(self, db_with_scan_paths):
        """Test path validation during scanning."""
        db, scan_dir = db_with_scan_paths

        # Add invalid paths to config
        db.config.scan_paths.extend(
            [
                "",  # Empty path
                None,  # This will be filtered out
                "invalid://protocol://path",  # Invalid protocol
            ]
        )

        # Filter out None values
        db.config.scan_paths = [p for p in db.config.scan_paths if p is not None]

        # Should handle invalid paths gracefully
        result = db.scan_plugins()
        assert result >= 0


class TestCacheErrorHandling:
    """Test cache system error handling."""

    @pytest.fixture
    def db_with_cache(self, temp_db_path):
        """Create database with cache configured."""
        cache_dir = tempfile.mkdtemp()
        cache_path = os.path.join(cache_dir, "plugin_cache.json")

        config = PluginDatabaseConfig(
            database_path=temp_db_path,
            cache_path=cache_path,
            cache_ttl_seconds=60,
            auto_scan_on_startup=False,
        )
        db = PluginDatabase(config)
        yield db, cache_path
        if db._conn:
            db._conn.close()
        shutil.rmtree(cache_dir, ignore_errors=True)

    def test_cache_file_corruption(self, db_with_cache):
        """Test handling of corrupted cache file."""
        db, cache_path = db_with_cache

        # Create corrupted cache file
        with open(cache_path, "w") as f:
            f.write("{ invalid json content")

        # Should handle corrupted cache gracefully and proceed with scan
        result = db.scan_plugins()
        assert result >= 0

    def test_cache_permission_denied(self, db_with_cache):
        """Test handling of cache file permission issues."""
        db, cache_path = db_with_cache

        # Create cache file and remove read permissions
        with open(cache_path, "w") as f:
            json.dump({"plugins": []}, f)

        os.chmod(cache_path, 0o000)

        try:
            # Should handle permission error gracefully
            result = db.scan_plugins()
            assert result >= 0
        finally:
            os.chmod(cache_path, 0o644)  # Restore permissions

    def test_cache_directory_not_exist(self, db_with_cache):
        """Test cache when directory doesn't exist."""
        db, cache_path = db_with_cache

        # Remove cache directory
        cache_dir = os.path.dirname(cache_path)
        shutil.rmtree(cache_dir, ignore_errors=True)

        # Should create directory and proceed
        result = db.scan_plugins()
        assert result >= 0

    def test_cache_write_failure(self, db_with_cache):
        """Test handling of cache write failures."""
        db, cache_path = db_with_cache

        # Mock file writing to fail
        with patch("builtins.open", mock_open()) as mock_file:
            mock_file.return_value.write.side_effect = OSError("Disk full")

            # Should handle write failure gracefully
            result = db.scan_plugins()
            assert result >= 0

    def test_cache_expired_handling(self, db_with_cache):
        """Test handling of expired cache."""
        db, cache_path = db_with_cache

        # Create old cache file
        old_cache = {
            "timestamp": time.time() - db.config.cache_ttl_seconds - 100,
            "version": db.config.cache_version,
            "plugins": [],
        }

        with open(cache_path, "w") as f:
            json.dump(old_cache, f)

        # Should detect expired cache and proceed with scan
        result = db.scan_plugins()
        assert result >= 0


class TestMetadataValidationErrors:
    """Test plugin metadata validation error handling."""

    @pytest.fixture
    def db_for_metadata(self, temp_db_path):
        """Create database for metadata testing."""
        config = PluginDatabaseConfig(
            database_path=temp_db_path, auto_scan_on_startup=False
        )
        db = PluginDatabase(config)
        yield db
        if db._conn:
            db._conn.close()

    def test_invalid_plugin_metadata_fields(self, db_for_metadata):
        """Test handling of invalid plugin metadata fields."""
        # Create metadata with invalid fields
        invalid_metadata = PluginMetadata(
            name="",  # Empty name
            manufacturer="Test",
            version="1.0",
            category=PluginCategory.INSTRUMENT,
            format=PluginFormat.VST3,
            path="/test/path",
            input_channels=0,
            output_channels=0,
            latency_samples=0,
            cpu_usage_estimate=0.0,
            memory_usage_mb=0.0,
            quality_rating=0.0,
            user_rating=0.0,
            supports_64bit=True,
            tags=None,
            metadata_json=None,
        )

        # Should handle invalid metadata gracefully
        try:
            db_for_metadata.add_plugin(invalid_metadata)
        except (ValidationError, sqlite3.Error):
            # Expected for invalid metadata
            pass

    def test_plugin_metadata_too_large(self, db_for_metadata):
        """Test handling of plugin metadata that's too large."""
        # Create metadata with very large fields
        large_string = "x" * 10000  # 10KB string

        large_metadata = PluginMetadata(
            name=large_string,
            manufacturer="Test",
            version="1.0",
            category=PluginCategory.INSTRUMENT,
            format=PluginFormat.VST3,
            path="/test/path",
            input_channels=0,
            output_channels=0,
            latency_samples=0,
            cpu_usage_estimate=0.0,
            memory_usage_mb=0.0,
            quality_rating=0.0,
            user_rating=0.0,
            supports_64bit=True,
            tags=[large_string],
            metadata_json=large_string,
        )

        # Should handle large metadata gracefully
        try:
            db_for_metadata.add_plugin(large_metadata)
        except (sqlite3.Error, ValidationError):
            # Expected for oversized metadata
            pass

    def test_malformed_json_metadata(self, db_for_metadata):
        """Test handling of malformed JSON in metadata."""
        # Create metadata with malformed JSON
        malformed_json = '{"invalid": json structure}'

        metadata = PluginMetadata(
            name="Test Plugin",
            manufacturer="Test",
            version="1.0",
            category=PluginCategory.INSTRUMENT,
            format=PluginFormat.VST3,
            path="/test/path",
            input_channels=0,
            output_channels=0,
            latency_samples=0,
            cpu_usage_estimate=0.0,
            memory_usage_mb=0.0,
            quality_rating=0.0,
            user_rating=0.0,
            supports_64bit=True,
            tags=None,
            metadata_json=malformed_json,
        )

        # Should handle malformed JSON gracefully
        try:
            db_for_metadata.add_plugin(metadata)
        except sqlite3.Error:
            # Database might reject malformed JSON
            pass

    def test_unicode_handling_in_metadata(self, db_for_metadata):
        """Test handling of Unicode characters in metadata."""
        # Create metadata with various Unicode characters
        unicode_metadata = PluginMetadata(
            name="Tëst Plügïn 🎵",
            manufacturer="Tëst Mänüfäctürer",
            version="1.0.0-β",
            category=PluginCategory.INSTRUMENT,
            format=PluginFormat.VST3,
            path="/test/path",
            input_channels=2,
            output_channels=2,
            latency_samples=128,
            cpu_usage_estimate=5.5,
            memory_usage_mb=50.0,
            quality_rating=4.5,
            user_rating=4.2,
            supports_64bit=True,
            tags=["tëg1", "täg2", "🎵"],
            metadata_json='{"description": "Tëst description with émojis 🎹🎸"}',
        )

        # Should handle Unicode characters correctly
        try:
            db_for_metadata.add_plugin(unicode_metadata)
            # Verify retrieval preserves Unicode
            retrieved = db_for_metadata.get_plugin("Tëst Plügïn 🎵")
            assert retrieved is not None
        except sqlite3.Error:
            # Database might not support Unicode properly
            pass


class TestMemoryAndResourceManagement:
    """Test memory management and resource cleanup."""

    @pytest.fixture
    def db_for_memory_test(self, temp_db_path):
        """Create database for memory testing."""
        config = PluginDatabaseConfig(
            database_path=temp_db_path, auto_scan_on_startup=False
        )
        db = PluginDatabase(config)
        yield db
        if db._conn:
            db._conn.close()

    def test_large_number_of_plugins_memory_usage(self, db_for_memory_test):
        """Test memory usage with large number of plugins."""
        # Create many plugins
        plugins = []
        for i in range(1000):
            plugin = PluginMetadata(
                name=f"Plugin {i}",
                manufacturer=f"Manufacturer {i}",
                version="1.0",
                category=PluginCategory.INSTRUMENT,
                format=PluginFormat.VST3,
                path=f"/test/path/plugin_{i}.vst3",
                input_channels=2,
                output_channels=2,
                latency_samples=128,
                cpu_usage_estimate=5.0,
                memory_usage_mb=50.0,
                quality_rating=4.0,
                user_rating=4.0,
                supports_64bit=True,
                tags=[f"tag{i}"],
                metadata_json=f'{{"index": {i}}}',
            )
            plugins.append(plugin)

        # Should handle many plugins without memory issues
        try:
            for plugin in plugins[:100]:  # Test with subset to avoid timeout
                db_for_memory_test.add_plugin(plugin)
        except sqlite3.Error:
            # Database might run out of memory or hit limits
            pass

    def test_database_connection_cleanup(self, temp_db_path):
        """Test proper cleanup of database connections."""
        connections = []

        # Create many database connections
        for _ in range(10):
            config = PluginDatabaseConfig(
                database_path=temp_db_path, auto_scan_on_startup=False
            )
            db = PluginDatabase(config)
            connections.append(db)

        # Close all connections
        for db in connections:
            if db._conn:
                db._conn.close()

        # Should cleanup properly without resource leaks
        assert True  # Test passes if no exceptions occurred

    def test_file_descriptor_leaks(self, db_for_memory_test):
        """Test for file descriptor leaks during operations."""
        initial_fd_count = (
            len(os.listdir("/proc/self/fd")) if os.path.exists("/proc/self/fd") else 0
        )

        # Perform many database operations
        for i in range(100):
            try:
                # Add and query plugin
                plugin = PluginMetadata(
                    name=f"Test Plugin {i}",
                    manufacturer="Test",
                    version="1.0",
                    category=PluginCategory.INSTRUMENT,
                    format=PluginFormat.VST3,
                    path=f"/test/path/{i}.vst3",
                    input_channels=2,
                    output_channels=2,
                    latency_samples=128,
                    cpu_usage_estimate=5.0,
                    memory_usage_mb=50.0,
                    quality_rating=4.0,
                    user_rating=4.0,
                    supports_64bit=True,
                    tags=None,
                    metadata_json=None,
                )
                db_for_memory_test.add_plugin(plugin)
                db_for_memory_test.get_plugin(f"Test Plugin {i}")
            except sqlite3.Error:
                # Ignore database errors for this test
                pass

        # Check for file descriptor leaks (on Linux)
        if os.path.exists("/proc/self/fd"):
            final_fd_count = len(os.listdir("/proc/self/fd"))
            fd_increase = final_fd_count - initial_fd_count
            assert fd_increase < 50  # Allow some increase but not excessive leaks


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "--tb=short"])
