"""Tests for composition context models."""

import pytest
from audio_agent.models.composition import (
    CompositionContext,
    CompositionStructure,
    HarmonicProgression,
    MusicalKey,
    MusicalStyle,
    SchillingerContext,
    TimeSignature,
)
from pydantic import ValidationError


class TestTimeSignature:
    """Test TimeSignature model validation."""

    def test_valid_time_signature(self):
        """Test creation of valid time signatures."""
        ts = TimeSignature(numerator=4, denominator=4)
        assert ts.numerator == 4
        assert ts.denominator == 4
        assert ts.as_string == "4/4"
        assert ts.is_simple
        assert not ts.is_compound

    def test_compound_time_signature(self):
        """Test compound time signature."""
        ts = TimeSignature(numerator=6, denominator=8)
        assert ts.as_string == "6/8"
        assert ts.is_compound
        assert ts.is_simple  # 6 is divisible by both 2 and 3

    def test_invalid_denominator(self):
        """Test invalid denominator validation."""
        with pytest.raises(ValidationError, match="power of 2"):
            TimeSignature(numerator=4, denominator=3)

    def test_invalid_numerator(self):
        """Test invalid numerator validation."""
        with pytest.raises(ValidationError, match="greater than or equal to 1"):
            TimeSignature(numerator=0, denominator=4)


class TestHarmonicProgression:
    """Test HarmonicProgression model validation."""

    def test_valid_harmonic_progression(self):
        """Test creation of valid harmonic progression."""
        progression = HarmonicProgression(
            chords=["I", "vi", "IV", "V"],
            progression_type="vi-IV-I-V",
            harmonic_rhythm=1.0,
            modulations=["V/V"],
        )
        assert len(progression.chords) == 4
        assert progression.progression_type == "vi-IV-I-V"

    def test_chord_symbol_validation(self):
        """Test chord symbol validation."""
        # Valid chord symbols should pass
        progression = HarmonicProgression(
            chords=["Cmaj7", "Am", "F", "G7"],
            progression_type="I-vi-IV-V",
            harmonic_rhythm=2.0,
        )
        assert len(progression.chords) == 4

    def test_empty_chords_validation(self):
        """Test empty chords list validation."""
        with pytest.raises(ValidationError, match="at least 1 item"):
            HarmonicProgression(
                chords=[], progression_type="empty", harmonic_rhythm=1.0
            )


class TestSchillingerContext:
    """Test SchillingerContext model validation."""

    def test_valid_schillinger_context(self):
        """Test creation of valid Schillinger context."""
        context = SchillingerContext(
            composition_id="comp_123",
            rhythmic_patterns=["2+3", "3+2"],
            pitch_scales=["chromatic", "diatonic"],
            interference_patterns=[
                {"type": "rhythmic", "elements": ["2", "3"]},
                {"type": "melodic", "elements": ["C", "D", "E"]},
            ],
            correlation_techniques=["symmetric", "asymmetric"],
        )
        assert context.composition_id == "comp_123"
        assert len(context.rhythmic_patterns) == 2

    def test_empty_elements_validation(self):
        """Test validation of empty elements."""
        with pytest.raises(ValidationError, match="Empty Schillinger element"):
            SchillingerContext(rhythmic_patterns=["", "valid_pattern"])


class TestCompositionStructure:
    """Test CompositionStructure model validation."""

    def test_valid_composition_structure(self):
        """Test creation of valid composition structure."""
        structure = CompositionStructure(
            sections=["verse", "chorus", "verse", "chorus", "bridge", "chorus"],
            section_lengths={"verse": 16.0, "chorus": 8.0, "bridge": 8.0},
            form="verse-chorus",
            total_measures=64,
        )
        assert len(structure.sections) == 6
        assert structure.total_duration_measures == 32.0  # 16+8+8

    def test_negative_section_length(self):
        """Test validation of negative section lengths."""
        with pytest.raises(ValidationError, match="must be positive"):
            CompositionStructure(
                sections=["verse"],
                section_lengths={"verse": -5.0},
                form="simple",
                total_measures=16,
            )


class TestCompositionContext:
    """Test complete CompositionContext model."""

    def create_valid_composition_context(self):
        """Create valid composition context for testing."""
        return CompositionContext(
            tempo=120.0,
            key_signature=MusicalKey.C_MAJOR,
            time_signature=TimeSignature(numerator=4, denominator=4),
            style=MusicalStyle.POP,
            harmonic_progression=HarmonicProgression(
                chords=["I", "vi", "IV", "V"],
                progression_type="vi-IV-I-V",
                harmonic_rhythm=1.0,
            ),
            structure=CompositionStructure(
                sections=["verse", "chorus"],
                section_lengths={"verse": 16.0, "chorus": 8.0},
                form="verse-chorus",
                total_measures=48,
            ),
            instrumentation=["piano", "guitar", "bass", "drums"],
            arrangement_density=0.7,
        )

    def test_valid_composition_context(self):
        """Test creation of valid composition context."""
        context = self.create_valid_composition_context()
        assert context.tempo == 120.0
        assert context.key_signature == MusicalKey.C_MAJOR
        assert context.is_major_key
        assert not context.is_minor_key

    def test_minor_key_detection(self):
        """Test minor key detection."""
        context = self.create_valid_composition_context()
        context.key_signature = MusicalKey.A_MINOR
        assert context.is_minor_key
        assert not context.is_major_key

    def test_tempo_validation(self):
        """Test tempo range validation."""
        context = self.create_valid_composition_context()

        # Valid tempo
        context.tempo = 60.0
        assert context.tempo == 60.0

        # Invalid tempo (too low)
        with pytest.raises(ValidationError, match="greater than or equal to 30"):
            context.tempo = 20.0

    def test_tempo_style_validation(self):
        """Test tempo validation for different styles."""
        context = self.create_valid_composition_context()

        # Unusual but allowed tempo for style
        context.style = MusicalStyle.AMBIENT
        context.tempo = 200.0  # Very fast for ambient, but allowed
        assert context.tempo == 200.0

    def test_estimated_duration(self):
        """Test estimated duration calculation."""
        context = self.create_valid_composition_context()
        duration = context.estimated_duration_minutes

        assert duration is not None
        assert duration > 0
        assert isinstance(duration, float)

    def test_schillinger_techniques(self):
        """Test Schillinger techniques extraction."""
        context = self.create_valid_composition_context()
        context.schillinger_context = SchillingerContext(
            rhythmic_patterns=["2+3", "3+2"],
            pitch_scales=["chromatic"],
            correlation_techniques=["symmetric"],
        )

        techniques = context.get_schillinger_techniques()
        assert "2+3" in techniques
        assert "chromatic" in techniques
        assert "symmetric" in techniques
        assert len(techniques) == 4

    def test_dynamic_markings_validation(self):
        """Test dynamic markings validation."""
        context = self.create_valid_composition_context()

        # Valid dynamic markings
        context.dynamic_markings = ["p", "mf", "f"]
        assert len(context.dynamic_markings) == 3

        # Invalid dynamic marking (empty)
        with pytest.raises(ValidationError, match="Empty dynamic marking"):
            context.dynamic_markings = ["p", "", "f"]

    def test_arrangement_density_range(self):
        """Test arrangement density validation."""
        context = self.create_valid_composition_context()

        # Valid density
        context.arrangement_density = 0.5
        assert context.arrangement_density == 0.5

        # Invalid density (too high)
        with pytest.raises(ValidationError, match="less than or equal to 1"):
            context.arrangement_density = 1.5

    def test_strict_validation(self):
        """Test that strict validation is enforced."""
        with pytest.raises(ValidationError):
            CompositionContext(
                tempo=120.0,
                key_signature=MusicalKey.C_MAJOR,
                time_signature=TimeSignature(numerator=4, denominator=4),
                style=MusicalStyle.POP,
                extra_field="should_fail",  # Extra field not allowed
            )

    def test_audio_analysis_compatibility(self):
        """Test compatibility checking with audio analysis."""
        context = self.create_valid_composition_context()

        # Mock audio analysis object
        class MockAudioAnalysis:
            def __init__(self, tempo=120.0, key="C"):
                self.estimated_tempo = tempo
                self.estimated_key = key

        # Compatible analysis
        compatible_analysis = MockAudioAnalysis(tempo=125.0, key="C")
        assert context.is_compatible_with_audio_analysis(compatible_analysis)

        # Incompatible tempo
        incompatible_analysis = MockAudioAnalysis(tempo=200.0, key="C")
        assert not context.is_compatible_with_audio_analysis(incompatible_analysis)

        # Analysis without tempo/key attributes
        basic_analysis = object()
        assert context.is_compatible_with_audio_analysis(basic_analysis)
