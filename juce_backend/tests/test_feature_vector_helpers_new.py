import json

from src.audio_agent.core.plugin_database import PluginDatabase, PluginDatabaseConfig
from src.audio_agent.models.plugin import (
    PluginCategory,
    PluginFeatureVector,
    PluginFormat,
    PluginMetadata,
)


def _make_sample_fv() -> PluginFeatureVector:
    metadata = PluginMetadata(
        name="TestPlugin",
        manufacturer="TestMfg",
        version="1.0",
        unique_id="plugin-1",
        category=PluginCategory.UTILITY,
        format=PluginFormat.VST3,
        tags=["test"],
        input_channels=2,
        output_channels=2,
    )

    return PluginFeatureVector(
        plugin_id="plugin-1",
        plugin_metadata=metadata,
        frequency_response=[0.1 * i for i in range(1, 11)],
        harmonic_character=[0.2 * i for i in range(1, 6)],
        dynamic_behavior=[0.3 * i for i in range(1, 6)],
        spatial_properties=[0.4 * i for i in range(1, 4)],
        genre_affinity={"rock": 0.8, "pop": 0.5},
        tempo_suitability={"slow": 0.2, "fast": 0.9},
        instrument_compatibility={"guitar": 1.0, "piano": 0.6},
        feature_vector=[0.01 * i for i in range(1, 11)],
        ease_of_use=0.4,
        preset_quality=0.6,
        vintage_character=0.2,
        modern_character=0.8,
    )


def test_serialize_feature_vector_returns_json_and_scalars():
    cfg = PluginDatabaseConfig(database_path=":memory:")
    db = PluginDatabase(cfg)
    fv = _make_sample_fv()
    serialized = db._serialize_feature_vector(fv)

    assert isinstance(serialized["frequency_response"], str)
    assert json.loads(serialized["frequency_response"]) == fv.frequency_response
    assert (
        json.loads(serialized["instrument_compatibility"])
        == fv.instrument_compatibility
    )

    assert serialized["ease_of_use"] == fv.ease_of_use
    assert serialized["modern_character"] == fv.modern_character


def test_upsert_feature_vector_row_insert_and_update():
    cfg = PluginDatabaseConfig(database_path=":memory:")
    db = PluginDatabase(cfg)

    # Insert a plugin row so foreign key constraint is satisfied.
    cursor = db._conn.cursor()
    cursor.execute(
        (
            "INSERT INTO plugins (id, name, manufacturer, version, category, "
            "format, path, input_channels, output_channels, latency_samples, "
            "cpu_usage_estimate, memory_usage_mb, quality_rating, user_rating, "
            "supports_64bit, tags, metadata_json, last_scanned) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ),
        (
            "plugin-1",
            "TestPlugin",
            "TestMfg",
            "1.0",
            "utility",
            "vst3",
            "/some/path",
            2,
            2,
            0,
            0.1,
            10.0,
            0.5,
            0.5,
            1,
            "",
            "{}",
            "2025-09-30T00:00:00",
        ),
    )
    db._conn.commit()

    fv = _make_sample_fv()
    serialized = db._serialize_feature_vector(fv)

    db._upsert_feature_vector_row(
        db._conn.cursor(), "plugin-1", serialized, exists=False
    )
    db._conn.commit()

    cursor = db._conn.cursor()
    cursor.execute(
        "SELECT * FROM plugin_feature_vectors WHERE plugin_id = ?", ("plugin-1",)
    )
    row = cursor.fetchone()
    assert row is not None
    assert json.loads(row["frequency_response"]) == fv.frequency_response

    serialized2 = dict(serialized)
    serialized2["ease_of_use"] = 0.99
    db._upsert_feature_vector_row(
        db._conn.cursor(), "plugin-1", serialized2, exists=True
    )
    db._conn.commit()

    cursor.execute(
        "SELECT * FROM plugin_feature_vectors WHERE plugin_id = ?", ("plugin-1",)
    )
    row2 = cursor.fetchone()
    assert row2 is not None
    assert float(row2["ease_of_use"]) == 0.99
