import json

from audio_agent.core.plugin_database import PluginDatabase, PluginDatabaseConfig
from audio_agent.models.plugin import PluginFeatureVector


def _make_sample_fv():
    return PluginFeatureVector(
        frequency_response=[0.1, 0.2, 0.3],
        harmonic_character=[0.5, 0.6],
        dynamic_behavior=[0.7],
        spatial_properties=[1.0, 0.9],
        genre_affinity=[0.2, 0.8],
        tempo_suitability=[120, 130],
        instrument_compatibility=["guitar", "piano"],
        feature_vector=[0.01, 0.02, 0.03],
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

    # List fields should be JSON strings
    assert isinstance(serialized["frequency_response"], str)
    assert json.loads(serialized["frequency_response"]) == fv.frequency_response
    assert (
        json.loads(serialized["instrument_compatibility"])
        == fv.instrument_compatibility
    )

    # Scalar fields preserved
    assert serialized["ease_of_use"] == fv.ease_of_use
    assert serialized["modern_character"] == fv.modern_character


def test_upsert_feature_vector_row_insert_and_update():
    cfg = PluginDatabaseConfig(database_path=":memory:")
    db = PluginDatabase(cfg)
    # Ensure required tables exist (PluginDatabase init should create them)

    # Insert a plugin row so foreign key constraint satisfied
    cursor = db._conn.cursor()
    cursor.execute(
        (
            "INSERT INTO plugins (id, name, manufacturer, version, category,"
            " format, path, input_channels, output_channels, latency_samples,"
            " cpu_usage_estimate, memory_usage_mb, quality_rating, user_rating,"
            " supports_64bit, tags, metadata_json, last_scanned) VALUES (?, ?,"
            " ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
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

    # Insert path
    db._upsert_feature_vector_row(
        db._conn.cursor(), "plugin-1", serialized, exists=False
    )
    db._conn.commit()

    cursor = db._conn.cursor()
    cursor.execute(
        "SELECT * FROM plugin_feature_vectors WHERE plugin_id = ?",
        ("plugin-1",),
    )
    row = cursor.fetchone()
    assert row is not None
    assert json.loads(row["frequency_response"]) == fv.frequency_response

    # Update path
    serialized2 = dict(serialized)
    # change a scalar
    serialized2["ease_of_use"] = 0.99
    db._upsert_feature_vector_row(
        db._conn.cursor(), "plugin-1", serialized2, exists=True
    )
    db._conn.commit()

    cursor.execute(
        "SELECT * FROM plugin_feature_vectors WHERE plugin_id = ?",
        ("plugin-1",),
    )
    row2 = cursor.fetchone()
    assert row2 is not None
    assert float(row2["ease_of_use"]) == 0.99
