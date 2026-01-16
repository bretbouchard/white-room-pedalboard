"""Tests for Composition Context Analysis."""

import pytest

from src.audio_agent.core.composition_analyzer import (
    ChordTension,
    CompositionAnalysisResult,
    CompositionAnalyzer,
    HarmonicAnalysis,
    HarmonicFunction,
    MelodicAnalysis,
    MelodicDirection,
    RhythmicAnalysis,
    RhythmicDensity,
    SectionType,
    StructuralAnalysis,
    StyleAnalysis,
    analyze_composition_for_mixing,
)
from src.audio_agent.models.composition import (
    CompositionContext,
    CompositionStructure,
    HarmonicProgression,
    MusicalKey,
    MusicalStyle,
    SchillingerContext,
    TimeSignature,
)


@pytest.fixture
def basic_composition_context():
    """Create a basic composition context for testing."""
    return CompositionContext(
        tempo=120.0,
        key_signature=MusicalKey.C_MAJOR,
        time_signature=TimeSignature(numerator=4, denominator=4),
        style=MusicalStyle.POP,
        title="Test Composition",
    )


@pytest.fixture
def detailed_composition_context():
    """Create a detailed composition context with structure and harmony."""
    return CompositionContext(
        tempo=120.0,
        key_signature=MusicalKey.C_MAJOR,
        time_signature=TimeSignature(numerator=4, denominator=4),
        style=MusicalStyle.POP,
        title="Test Composition",
        harmonic_progression=HarmonicProgression(
            chords=["I", "IV", "V", "I"], progression_type="I-IV-V", harmonic_rhythm=1.0
        ),
        structure=CompositionStructure(
            sections=["Intro", "Verse", "Chorus", "Verse", "Chorus", "Outro"],
            section_lengths={"Intro": 4, "Verse": 8, "Chorus": 8, "Outro": 4},
            form="Verse-Chorus",
            total_measures=32,
        ),
        schillinger_context=SchillingerContext(
            composition_id="comp_123456789",
            rhythmic_patterns=["rhythm_interference"],
            pitch_scales=["pitch_resultant"],
            correlation_techniques=["corr_symmetrical"],
        ),
        instrumentation=["piano", "drums", "bass", "guitar"],
    )


@pytest.fixture
def electronic_composition_context():
    """Create an electronic music composition context."""
    return CompositionContext(
        tempo=140.0,
        key_signature=MusicalKey.F_MINOR,
        time_signature=TimeSignature(numerator=4, denominator=4),
        style=MusicalStyle.ELECTRONIC,
        title="Electronic Test",
        harmonic_progression=HarmonicProgression(
            chords=["i", "VI", "VII", "i"],
            progression_type="Custom progression",
            harmonic_rhythm=0.5,
        ),
        structure=CompositionStructure(
            sections=["Intro", "Build", "Drop", "Breakdown", "Build", "Drop", "Outro"],
            section_lengths={
                "Intro": 16,
                "Build": 8,
                "Drop": 16,
                "Breakdown": 8,
                "Outro": 8,
            },
            form="Custom form",
            total_measures=72,
        ),
        instrumentation=["synth", "drums", "bass", "fx"],
    )


class TestCompositionAnalyzer:
    """Tests for CompositionAnalyzer."""

    def test_analyze_basic_composition(self, basic_composition_context):
        """Test analyzing a basic composition without structure or harmony."""
        analyzer = CompositionAnalyzer()
        result = analyzer.analyze_composition(basic_composition_context)

        assert isinstance(result, CompositionAnalysisResult)
        assert result.style_analysis.primary_style == MusicalStyle.POP
        assert isinstance(result.harmonic_analysis, HarmonicAnalysis)
        assert isinstance(result.melodic_analysis, MelodicAnalysis)
        assert isinstance(result.rhythmic_analysis, RhythmicAnalysis)
        assert isinstance(result.structural_analysis, StructuralAnalysis)

        # Check mixing recommendations
        recommendations = result.get_mixing_recommendations()
        assert "dynamic_range" in recommendations
        assert "style_specific" in recommendations
        assert recommendations["style_specific"]["compression"] == "moderate_to_heavy"

    def test_analyze_detailed_composition(self, detailed_composition_context):
        """Test analyzing a detailed composition with structure and harmony."""
        analyzer = CompositionAnalyzer()
        result = analyzer.analyze_composition(detailed_composition_context)

        # Check harmonic analysis
        assert len(result.harmonic_analysis.chord_functions) > 0
        assert len(result.harmonic_analysis.tension_profile) == 4
        assert result.harmonic_analysis.chord_functions["I"] == HarmonicFunction.TONIC

        # Check structural analysis
        assert len(result.structural_analysis.section_types) > 0
        assert "Chorus" in result.structural_analysis.section_types
        assert result.structural_analysis.section_types["Chorus"] == SectionType.CHORUS
        assert result.structural_analysis.climax_section == "Chorus"

        # Check mixing insights
        assert len(result.spatial_width_profile) > 0
        assert "Chorus" in result.spatial_width_profile
        assert (
            result.spatial_width_profile["Chorus"]
            > result.spatial_width_profile["Verse"]
        )
        assert len(result.automation_points) > 0

    def test_analyze_electronic_composition(self, electronic_composition_context):
        """Test analyzing an electronic music composition."""
        analyzer = CompositionAnalyzer()
        result = analyzer.analyze_composition(electronic_composition_context)

        # Check style-specific analysis
        assert result.style_analysis.primary_style == MusicalStyle.ELECTRONIC
        assert result.rhythmic_analysis.density == RhythmicDensity.DENSE

        # Check structural analysis
        assert "Drop" in result.structural_analysis.section_types
        assert result.structural_analysis.section_types["Drop"] == SectionType.DROP
        assert result.structural_analysis.climax_section == "Drop"

        # Check frequency balance profile
        assert "Drop" in result.frequency_balance_profile
        assert (
            result.frequency_balance_profile["Drop"]["low"] > 0.8
        )  # Bass heavy in drop

        # Check mixing recommendations
        recommendations = result.get_mixing_recommendations()
        assert (
            recommendations["dynamic_range"] < 10.0
        )  # Electronic music has compressed dynamic range
        assert recommendations["style_specific"]["compression"] == "heavy"

    def test_harmonic_analysis(self, detailed_composition_context):
        """Test harmonic analysis functions."""
        analyzer = CompositionAnalyzer()
        harmonic_analysis = analyzer._analyze_harmonic_content(
            detailed_composition_context
        )

        assert isinstance(harmonic_analysis, HarmonicAnalysis)
        assert harmonic_analysis.chord_functions["I"] == HarmonicFunction.TONIC
        assert harmonic_analysis.chord_functions["IV"] == HarmonicFunction.SUBDOMINANT
        assert harmonic_analysis.chord_functions["V"] == HarmonicFunction.DOMINANT

        # Test tension profile
        assert harmonic_analysis.tension_profile[0] == ChordTension.LOW  # I chord
        assert harmonic_analysis.tension_profile[2] == ChordTension.MEDIUM  # V chord

        # Test cadence points
        assert 3 in harmonic_analysis.cadence_points  # V-I cadence

    def test_structural_analysis(self, detailed_composition_context):
        """Test structural analysis functions."""
        analyzer = CompositionAnalyzer()
        structural_analysis = analyzer._analyze_structure(detailed_composition_context)

        assert isinstance(structural_analysis, StructuralAnalysis)
        assert structural_analysis.section_types["Intro"] == SectionType.INTRO
        assert structural_analysis.section_types["Verse"] == SectionType.VERSE
        assert structural_analysis.section_types["Chorus"] == SectionType.CHORUS
        assert structural_analysis.section_types["Outro"] == SectionType.OUTRO

        # Test energy profile
        assert (
            structural_analysis.energy_profile["Chorus"]
            > structural_analysis.energy_profile["Verse"]
        )
        assert (
            structural_analysis.energy_profile["Intro"]
            < structural_analysis.energy_profile["Verse"]
        )

        # Test transitions
        assert len(structural_analysis.transitions) > 0
        assert structural_analysis.transitions[0]["from_section"] == "Intro"
        assert structural_analysis.transitions[0]["to_section"] == "Verse"

    def test_rhythmic_analysis(self, detailed_composition_context):
        """Test rhythmic analysis functions."""
        analyzer = CompositionAnalyzer()
        rhythmic_analysis = analyzer._analyze_rhythmic_content(
            detailed_composition_context
        )

        assert isinstance(rhythmic_analysis, RhythmicAnalysis)
        assert rhythmic_analysis.density == RhythmicDensity.MODERATE
        assert 0 <= rhythmic_analysis.syncopation_level <= 1
        assert rhythmic_analysis.groove_type == "straight"

    def test_melodic_analysis(self, detailed_composition_context):
        """Test melodic analysis functions."""
        analyzer = CompositionAnalyzer()
        melodic_analysis = analyzer._create_default_melodic_analysis(
            detailed_composition_context
        )

        assert isinstance(melodic_analysis, MelodicAnalysis)
        assert melodic_analysis.contour_direction == MelodicDirection.ARCH
        assert melodic_analysis.range_semitones > 0
        assert len(melodic_analysis.register_profile) == 3
        assert "low" in melodic_analysis.register_profile
        assert "mid" in melodic_analysis.register_profile
        assert "high" in melodic_analysis.register_profile

    def test_mixing_recommendations(self, detailed_composition_context):
        """Test mixing recommendations generation."""
        analyzer = CompositionAnalyzer()
        result = analyzer.analyze_composition(detailed_composition_context)
        recommendations = result.get_mixing_recommendations()

        assert isinstance(recommendations, dict)
        assert "dynamic_range" in recommendations
        assert "spatial_width" in recommendations
        assert "frequency_balance" in recommendations
        assert "automation_points" in recommendations
        assert "style_specific" in recommendations

        # Check style-specific recommendations
        style_specific = recommendations["style_specific"]
        assert "compression" in style_specific
        assert "reverb" in style_specific
        assert "eq_approach" in style_specific

    def test_analyze_composition_for_mixing_function(
        self, detailed_composition_context
    ):
        """Test the analyze_composition_for_mixing utility function."""
        recommendations = analyze_composition_for_mixing(detailed_composition_context)

        assert isinstance(recommendations, dict)
        assert "dynamic_range" in recommendations
        assert "spatial_width" in recommendations
        assert "frequency_balance" in recommendations
        assert "automation_points" in recommendations
        assert "style_specific" in recommendations


class TestCompositionAnalysisResult:
    """Tests for CompositionAnalysisResult."""

    def test_get_mixing_recommendations(self):
        """Test getting mixing recommendations from analysis result."""
        style_analysis = StyleAnalysis(primary_style=MusicalStyle.ROCK)
        result = CompositionAnalysisResult(
            style_analysis=style_analysis,
            dynamic_range_recommendation=10.0,
            spatial_width_profile={"Verse": 0.7, "Chorus": 0.9},
            frequency_balance_profile={
                "Verse": {"low": 0.7, "mid": 0.8, "high": 0.6},
                "Chorus": {"low": 0.8, "mid": 0.9, "high": 0.7},
            },
            automation_points=[
                {
                    "parameter": "reverb_send",
                    "measure": 7,
                    "value": 0.7,
                    "curve": "linear",
                }
            ],
        )

        recommendations = result.get_mixing_recommendations()

        assert recommendations["dynamic_range"] == 10.0
        assert recommendations["spatial_width"]["Chorus"] == 0.9
        assert recommendations["frequency_balance"]["Verse"]["mid"] == 0.8
        assert len(recommendations["automation_points"]) == 1
        assert recommendations["style_specific"]["compression"] == "moderate_to_heavy"

    def test_style_specific_recommendations(self):
        """Test style-specific mixing recommendations."""
        # Test different styles
        styles = [
            MusicalStyle.CLASSICAL,
            MusicalStyle.JAZZ,
            MusicalStyle.ROCK,
            MusicalStyle.POP,
            MusicalStyle.ELECTRONIC,
            MusicalStyle.HIP_HOP,
        ]

        for style in styles:
            style_analysis = StyleAnalysis(primary_style=style)
            result = CompositionAnalysisResult(style_analysis=style_analysis)
            recommendations = result._get_style_specific_recommendations()

            assert "compression" in recommendations
            assert "reverb" in recommendations
            assert "eq_approach" in recommendations

            # Check style-specific values
            if style == MusicalStyle.CLASSICAL:
                assert recommendations["compression"] == "light"
                assert recommendations["dynamic_preservation"] == "high"
            elif style == MusicalStyle.ELECTRONIC:
                assert recommendations["compression"] == "heavy"
                assert "sub_bass" in recommendations
