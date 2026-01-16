"""Tests for Pydantic models."""

import pytest
from datetime import datetime
from pydantic import ValidationError

from schillinger_sdk.models import (
    GeneratorProfile,
    ResultantPattern,
    Chord,
    HarmonicProgression,
    MelodicFragment,
    Composition,
    CompositionMetadata
)


class TestGeneratorProfile:
    """Test suite for GeneratorProfile model."""

    def test_valid_generator_profile(self):
        """Test creating a valid generator profile."""
        profile = GeneratorProfile(
            strikes=[0, 3, 6],
            period=8,
            symmetry=1.0,
            density=0.375,
            vector=[3, 3, 2]
        )
        assert profile.strikes == [0, 3, 6]
        assert profile.period == 8
        assert profile.symmetry == 1.0
        assert profile.density == 0.375

    def test_generator_profile_defaults(self):
        """Test generator profile with optional fields."""
        profile = GeneratorProfile(
            strikes=[0, 4],
            period=8,
            density=0.25
        )
        assert profile.symmetry is None
        assert profile.vector is None

    def test_generator_profile_invalid_period(self):
        """Test that validation fails for invalid period."""
        with pytest.raises(ValidationError):
            GeneratorProfile(
                strikes=[0, 3, 6],
                period=0,
                density=0.375
            )

    def test_generator_profile_invalid_density_range(self):
        """Test that validation fails for density outside 0-1."""
        with pytest.raises(ValidationError):
            GeneratorProfile(
                strikes=[0, 3, 6],
                period=8,
                density=1.5
            )

    def test_generator_profile_invalid_symmetry_range(self):
        """Test that validation fails for symmetry outside 0-1."""
        with pytest.raises(ValidationError):
            GeneratorProfile(
                strikes=[0, 3, 6],
                period=8,
                density=0.375,
                symmetry=1.5
            )


class TestChord:
    """Test suite for Chord model."""

    def test_valid_major_chord(self):
        """Test creating a valid major chord."""
        chord = Chord(root=0, quality="major")
        assert chord.root == 0
        assert chord.quality == "major"
        assert chord.inversion == 0

    def test_valid_minor_chord_with_extensions(self):
        """Test creating a minor chord with extensions."""
        chord = Chord(
            root=5,
            quality="minor",
            extensions=[10, 14],
            inversion=1
        )
        assert chord.root == 5
        assert chord.quality == "minor"
        assert chord.extensions == [10, 14]
        assert chord.inversion == 1

    def test_chord_invalid_root(self):
        """Test that validation fails for root outside 0-11."""
        with pytest.raises(ValidationError):
            Chord(root=12, quality="major")

    def test_chord_invalid_quality(self):
        """Test that validation fails for invalid quality."""
        with pytest.raises(ValidationError):
            Chord(root=0, quality="invalid_quality")

    def test_chord_case_insensitive_quality(self):
        """Test that quality is case-insensitive."""
        chord = Chord(root=0, quality="MAJOR")
        assert chord.quality == "major"


class TestHarmonicProgression:
    """Test suite for HarmonicProgression model."""

    def test_valid_progression(self):
        """Test creating a valid harmonic progression."""
        progression = HarmonicProgression(
            chords=[
                Chord(root=0, quality="major"),
                Chord(root=5, quality="major"),
                Chord(root=7, quality="major")
            ],
            key="C",
            scale="major"
        )
        assert len(progression.chords) == 3
        assert progression.key == "C"
        assert progression.scale == "major"

    def test_progression_defaults(self):
        """Test progression with default values."""
        progression = HarmonicProgression(
            chords=[Chord(root=0, quality="major")]
        )
        assert progression.key is None
        assert progression.scale == "major"


class TestMelodicFragment:
    """Test suite for MelodicFragment model."""

    def test_valid_melody(self):
        """Test creating a valid melodic fragment."""
        fragment = MelodicFragment(
            pitches=[60, 62, 64, 65, 67],
            durations=[1.0, 1.0, 0.5, 0.5, 2.0]
        )
        assert len(fragment.pitches) == 5
        assert len(fragment.durations) == 5

    def test_melody_with_contour(self):
        """Test melody with contour."""
        from schillinger_sdk.models import MelodicContour

        fragment = MelodicFragment(
            pitches=[60, 62, 64, 65],
            durations=[1.0, 1.0, 1.0, 1.0],
            contour=MelodicContour(
                contour=[2, 2, 1],
                peaks=[3],
                valleys=[0],
                range=7,
                centroid=62.5
            )
        )
        assert fragment.contour is not None
        assert fragment.contour.range == 7


class TestComposition:
    """Test suite for Composition model."""

    def test_valid_composition(self):
        """Test creating a valid composition."""
        metadata = CompositionMetadata(
            title="Test Composition",
            key="C",
            tempo=120
        )

        composition = Composition(
            id="test-123",
            metadata=metadata,
            sections=[]
        )
        assert composition.id == "test-123"
        assert composition.metadata.title == "Test Composition"
        assert composition.metadata.tempo == 120

    def test_metadata_default_timestamp(self):
        """Test that metadata gets default timestamp."""
        metadata = CompositionMetadata(title="Test")
        assert isinstance(metadata.created_at, datetime)

    def test_metadata_with_tags(self):
        """Test metadata with tags."""
        metadata = CompositionMetadata(
            title="Test",
            tags=["experimental", "atonal"]
        )
        assert len(metadata.tags) == 2
        assert "experimental" in metadata.tags


class TestResultantPattern:
    """Test suite for ResultantPattern model."""

    def test_valid_resultant(self):
        """Test creating a valid resultant pattern."""
        resultant = ResultantPattern(
            generators=[
                GeneratorProfile(strikes=[0, 4], period=8, density=0.25),
                GeneratorProfile(strikes=[0, 3], period=8, density=0.25)
            ],
            resultant=GeneratorProfile(strikes=[0, 3, 4], period=8, density=0.375),
            interference=[0],
            balance=0.75
        )
        assert len(resultant.generators) == 2
        assert resultant.resultant.strikes == [0, 3, 4]
        assert resultant.balance == 0.75

    def test_resultant_defaults(self):
        """Test resultant with default interference."""
        resultant = ResultantPattern(
            generators=[
                GeneratorProfile(strikes=[0, 4], period=8, density=0.25)
            ],
            resultant=GeneratorProfile(strikes=[0, 4], period=8, density=0.25),
            balance=1.0
        )
        assert resultant.interference == []
