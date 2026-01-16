import sqlite3
from pathlib import Path

from src.audio_agent.core.plugin_database import (
    PluginDatabase,
    PluginDatabaseConfig,
)
from src.audio_agent.models.plugin import (
    PluginCategory,
    PluginFormat,
    PluginMetadata,
)


def make_sample_plugin() -> PluginMetadata:
    return PluginMetadata(
        name="Cached Plugin",
        manufacturer="CacheCo",
        version="1.2.3",
        unique_id="cacheco_cached_plugin",
        category=PluginCategory.UTILITY,
        format=PluginFormat.VST3,
        input_channels=2,
        output_channels=2,
        latency_samples=0,
        cpu_usage_estimate=0.1,
        memory_usage_mb=10.0,
        quality_rating=0.5,
        user_rating=0.5,
        tags=["cached"],
        supported_sample_rates=[44100, 48000],
        supports_64bit=True,
    )


def test_cache_write_and_load(tmp_path: Path):
    db_path = str(tmp_path / "plugins.db")
    cache_path = str(tmp_path / "plugins_cache.json")

    cfg = PluginDatabaseConfig(
        database_path=db_path,
        scan_paths=[],
        auto_scan_on_startup=False,
        cache_path=cache_path,
        cache_ttl_seconds=3600,
        cache_version=1,
    )

    db = PluginDatabase(cfg)

    # Prepare a plugin and write cache (without adding to DB)
    plugin = make_sample_plugin()
    db._write_to_cache([plugin])
    db.close()

    # Create a new DB instance and load from cache via scan_plugins
    db2 = PluginDatabase(cfg)
    loaded = db2.scan_plugins()
    assert loaded == 1

    # Plugin should now be present in DB
    retrieved = db2.get_plugin_by_id(plugin.unique_id)
    assert retrieved is not None
    assert retrieved.name == plugin.name

    db2.close()


def test_cache_version_invalidation(tmp_path: Path):
    db_path = str(tmp_path / "plugins.db")
    cache_path = str(tmp_path / "plugins_cache.json")

    # Write cache with version 1
    cfg1 = PluginDatabaseConfig(
        database_path=db_path,
        scan_paths=[],
        auto_scan_on_startup=False,
        cache_path=cache_path,
        cache_ttl_seconds=3600,
        cache_version=1,
    )

    db1 = PluginDatabase(cfg1)
    plugin = make_sample_plugin()
    db1._write_to_cache([plugin])
    db1.close()

    # Now create config with different cache_version -> should invalidate cache
    cfg2 = PluginDatabaseConfig(
        database_path=db_path,
        scan_paths=[],
        auto_scan_on_startup=False,
        cache_path=cache_path,
        cache_ttl_seconds=3600,
        cache_version=2,
    )

    db2 = PluginDatabase(cfg2)
    loaded = db2.scan_plugins()
    # Since cache version mismatched, loader should not load from cache
    assert loaded == 0
    assert db2.get_plugin_by_id(plugin.unique_id) is None
    db2.close()


def test_db_user_version_invalidation(tmp_path: Path):
    db_path = str(tmp_path / "plugins.db")
    cache_path = str(tmp_path / "plugins_cache.json")

    # Create initial DB and cache
    cfg = PluginDatabaseConfig(
        database_path=db_path,
        scan_paths=[],
        auto_scan_on_startup=False,
        cache_path=cache_path,
        cache_ttl_seconds=3600,
        cache_version=1,
    )

    db = PluginDatabase(cfg)
    plugin = make_sample_plugin()
    db._write_to_cache([plugin])

    # Simulate a DB migration by bumping PRAGMA user_version
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("PRAGMA user_version = 42")
    conn.commit()
    conn.close()

    # New DB instance should detect mismatch between cached db_user_version and current PRAGMA
    db2 = PluginDatabase(cfg)
    loaded = db2.scan_plugins()
    assert loaded == 0
    assert db2.get_plugin_by_id(plugin.unique_id) is None
    db2.close()
