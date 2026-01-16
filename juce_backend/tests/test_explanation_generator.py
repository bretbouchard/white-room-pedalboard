"""Tests for AI Decision Explanation System."""

import pytest

from src.audio_agent.core.explanation_generator import (
    Explanation,
    ExplanationCategory,
    ExplanationGenerator,
    ExplanationHistory,
    ExplanationLevel,
    ExplanationTemplate,
)


@pytest.fixture
def explanation_generator():
    """Create an explanation generator for testing."""
    return ExplanationGenerator()


@pytest.fixture
def eq_context():
    """Create a context for EQ explanations."""
    return {
        "filter_type": "bell",
        "frequency": 1000,
        "gain": 3.0,
        "q_value": 1.2,
        "issue": "frequency masking",
        "effect_description": "reduces the buildup of mid frequencies",
        "result": "improved clarity",
        "action": "boosted",
        "frequency_range": "mid",
        "purpose": "bring out the vocal presence",
        "benefit": "make the vocals more intelligible",
        "preservation": "overall tonal balance",
        "frequency_description": "middle frequencies",
        "instrument": "vocal",
        "result_description": "clearer and more present",
        "tags": ["eq", "vocal", "clarity"],
        "concepts": ["eq", "frequency_masking", "q_factor"],
    }


@pytest.fixture
def dynamics_context():
    """Create a context for dynamics explanations."""
    return {
        "compressor_type": "VCA",
        "ratio": 4.0,
        "threshold": -18.0,
        "attack": 10.0,
        "release": 100.0,
        "effect_description": "controls the dynamic range",
        "result": "more consistent levels",
        "gain_reduction": 6.0,
        "purpose": "control the dynamic range",
        "threshold_description": "moderate",
        "ratio_description": "medium",
        "benefit": "maintain consistent levels",
        "preservation": "transient detail",
        "action": "compressed",
        "instrument": "drum kit",
        "result_description": "more punchy and controlled",
        "tags": ["dynamics", "compression", "drums"],
        "concepts": ["compression", "threshold", "ratio"],
    }


class TestExplanationGenerator:
    """Tests for ExplanationGenerator."""

    def test_initialization(self, explanation_generator):
        """Test explanation generator initialization."""
        assert explanation_generator._templates is not None
        assert len(explanation_generator._templates) > 0
        assert explanation_generator._history == {}

    def test_generate_explanation_eq_technical(self, explanation_generator, eq_context):
        """Test generating a technical EQ explanation."""
        explanation = explanation_generator.generate_explanation(
            category=ExplanationCategory.EQ,
            context=eq_context,
            level=ExplanationLevel.TECHNICAL,
        )

        assert explanation is not None
        assert explanation.category == ExplanationCategory.EQ
        assert explanation.level == ExplanationLevel.TECHNICAL
        assert "bell" in explanation.text
        assert "1000" in explanation.text
        assert "3.0" in explanation.text
        assert "frequency masking" in explanation.text
        assert explanation.template_id is not None
        assert len(explanation.references) > 0
        assert explanation.quality_score is not None

    def test_generate_explanation_eq_educational(
        self, explanation_generator, eq_context
    ):
        """Test generating an educational EQ explanation."""
        explanation = explanation_generator.generate_explanation(
            category=ExplanationCategory.EQ,
            context=eq_context,
            level=ExplanationLevel.EDUCATIONAL,
        )

        assert explanation is not None
        assert explanation.category == ExplanationCategory.EQ
        assert explanation.level == ExplanationLevel.EDUCATIONAL
        assert "boosted" in explanation.text
        assert "mid" in explanation.text
        assert "1000" in explanation.text
        assert "bring out the vocal presence" in explanation.text
        assert explanation.template_id is not None
        assert len(explanation.references) > 0
        assert explanation.quality_score is not None

    def test_generate_explanation_eq_simplified(
        self, explanation_generator, eq_context
    ):
        """Test generating a simplified EQ explanation."""
        explanation = explanation_generator.generate_explanation(
            category=ExplanationCategory.EQ,
            context=eq_context,
            level=ExplanationLevel.SIMPLIFIED,
        )

        assert explanation is not None
        assert explanation.category == ExplanationCategory.EQ
        assert explanation.level == ExplanationLevel.SIMPLIFIED
        assert "boosted" in explanation.text
        assert "middle frequencies" in explanation.text
        assert "vocal" in explanation.text
        assert "clearer" in explanation.text
        assert explanation.template_id is not None
        assert len(explanation.references) > 0
        assert explanation.quality_score is not None

    def test_generate_explanation_dynamics(
        self, explanation_generator, dynamics_context
    ):
        """Test generating a dynamics explanation."""
        explanation = explanation_generator.generate_explanation(
            category=ExplanationCategory.DYNAMICS,
            context=dynamics_context,
            level=ExplanationLevel.TECHNICAL,
        )

        assert explanation is not None
        assert explanation.category == ExplanationCategory.DYNAMICS
        assert explanation.level == ExplanationLevel.TECHNICAL
        assert "VCA" in explanation.text
        assert "4.0:1" in explanation.text
        assert "-18.0" in explanation.text
        assert "10.0" in explanation.text
        assert "100.0" in explanation.text
        assert explanation.template_id is not None
        assert len(explanation.references) > 0
        assert explanation.quality_score is not None

    def test_generate_explanation_with_missing_context(self, explanation_generator):
        """Test generating an explanation with missing context."""
        # Create context with missing variables
        context = {"instrument": "vocal", "result_description": "clearer"}

        explanation = explanation_generator.generate_explanation(
            category=ExplanationCategory.EQ,
            context=context,
            level=ExplanationLevel.SIMPLIFIED,
        )

        assert explanation is not None
        assert explanation.category == ExplanationCategory.EQ
        assert explanation.level == ExplanationLevel.SIMPLIFIED
        assert "vocal" in explanation.text
        assert "clearer" in explanation.text
        # Should have placeholders for missing variables
        assert "[" in explanation.text or "I made the sound clearer" in explanation.text
        assert explanation.quality_score is not None

    def test_generate_explanation_with_user_history(
        self, explanation_generator, eq_context
    ):
        """Test generating an explanation with user history."""
        # Generate first explanation
        explanation1 = explanation_generator.generate_explanation(
            category=ExplanationCategory.EQ,
            context=eq_context,
            level=ExplanationLevel.EDUCATIONAL,
            clerk_user_id="user_123",
        )

        # Generate second explanation
        explanation2 = explanation_generator.generate_explanation(
            category=ExplanationCategory.EQ,
            context=eq_context,
            level=ExplanationLevel.EDUCATIONAL,
            clerk_user_id="user_123",
        )

        # Check that explanations are different
        assert (
            explanation1.text != explanation2.text
            or explanation1.template_id != explanation2.template_id
        )

        # Check that history was updated
        assert "user_123" in explanation_generator._history
        assert len(explanation_generator._history["user_123"].explanations) == 2
        assert (
            explanation_generator._history["user_123"].explanations[0].explanation_id
            == explanation1.explanation_id
        )
        assert (
            explanation_generator._history["user_123"].explanations[1].explanation_id
            == explanation2.explanation_id
        )

    def test_get_explanation_history(
        self, explanation_generator, eq_context, dynamics_context
    ):
        """Test getting explanation history."""
        # Generate explanations
        explanation_generator.generate_explanation(
            category=ExplanationCategory.EQ,
            context=eq_context,
            level=ExplanationLevel.EDUCATIONAL,
            clerk_user_id="user_123",
        )

        explanation_generator.generate_explanation(
            category=ExplanationCategory.DYNAMICS,
            context=dynamics_context,
            level=ExplanationLevel.TECHNICAL,
            clerk_user_id="user_123",
        )

        # Get history
        history = explanation_generator.get_explanation_history("user_123")

        assert len(history) == 2
        assert history[0].category == ExplanationCategory.DYNAMICS
        assert history[1].category == ExplanationCategory.EQ

        # Get history with category filter
        eq_history = explanation_generator.get_explanation_history(
            "user_123", category=ExplanationCategory.EQ
        )

        assert len(eq_history) == 1
        assert eq_history[0].category == ExplanationCategory.EQ

    def test_set_get_user_preference(self, explanation_generator):
        """Test setting and getting user preference."""
        # Set preference
        result = explanation_generator.set_user_preference(
            clerk_user_id="user_123", level=ExplanationLevel.TECHNICAL
        )

        assert result is True

        # Get preference
        level = explanation_generator.get_user_preference("user_123")

        assert level == ExplanationLevel.TECHNICAL

        # Get non-existent preference
        level = explanation_generator.get_user_preference("user_456")

        assert level is None

    def test_generate_explanation_with_user_preference(
        self, explanation_generator, eq_context
    ):
        """Test generating an explanation with user preference."""
        # Set preference
        explanation_generator.set_user_preference(
            clerk_user_id="user_123", level=ExplanationLevel.TECHNICAL
        )

        # Generate explanation without specifying level
        explanation = explanation_generator.generate_explanation(
            category=ExplanationCategory.EQ,
            context=eq_context,
            clerk_user_id="user_123",
        )

        assert explanation.level == ExplanationLevel.TECHNICAL

    def test_find_templates(self, explanation_generator):
        """Test finding templates."""
        # Find EQ technical templates
        templates = explanation_generator._find_templates(
            category=ExplanationCategory.EQ, level=ExplanationLevel.TECHNICAL
        )

        assert len(templates) > 0
        assert all(t.category == ExplanationCategory.EQ for t in templates)
        assert all(t.level == ExplanationLevel.TECHNICAL for t in templates)

        # Find templates with tags
        templates = explanation_generator._find_templates(
            category=ExplanationCategory.EQ, tags=["filter"]
        )

        assert len(templates) > 0
        assert all(t.category == ExplanationCategory.EQ for t in templates)
        assert all("filter" in t.tags for t in templates)

    def test_fill_template(self, explanation_generator):
        """Test filling template."""
        template = ExplanationTemplate(
            template_id="test_template",
            category=ExplanationCategory.EQ,
            level=ExplanationLevel.EDUCATIONAL,
            template="I {action} the {frequency_range} to {purpose}.",
            required_variables=["action", "frequency_range", "purpose"],
        )

        context = {
            "action": "boosted",
            "frequency_range": "mid frequencies",
            "purpose": "improve clarity",
        }

        text = explanation_generator._fill_template(template, context)

        assert text == "I boosted the mid frequencies to improve clarity."

        # Test with missing variables
        context = {"action": "boosted", "purpose": "improve clarity"}

        text = explanation_generator._fill_template(template, context)

        assert text == "I boosted the [frequency_range] to improve clarity."

    def test_assess_explanation_quality(self, explanation_generator):
        """Test assessing explanation quality."""
        # Good explanation
        good_explanation = Explanation(
            explanation_id="test_1",
            category=ExplanationCategory.EQ,
            level=ExplanationLevel.EDUCATIONAL,
            text="I boosted the mid frequencies to improve clarity and make the vocals more present.",
            context={},
            template_id="eq_educational_1",
            references=["Understanding Equalization in Audio Mixing"],
        )

        good_score = explanation_generator._assess_explanation_quality(good_explanation)
        assert good_score > 0.5

        # Incomplete explanation
        incomplete_explanation = Explanation(
            explanation_id="test_2",
            category=ExplanationCategory.EQ,
            level=ExplanationLevel.EDUCATIONAL,
            text="I boosted the [frequency_range] to improve clarity.",
            context={},
            template_id="eq_educational_1",
            references=[],
        )

        incomplete_score = explanation_generator._assess_explanation_quality(
            incomplete_explanation
        )
        assert incomplete_score < 0.5

        # Too short explanation
        short_explanation = Explanation(
            explanation_id="test_3",
            category=ExplanationCategory.EQ,
            level=ExplanationLevel.EDUCATIONAL,
            text="I boosted the EQ.",
            context={},
            template_id="eq_educational_1",
            references=[],
        )

        short_score = explanation_generator._assess_explanation_quality(
            short_explanation
        )
        assert short_score < 0.5

    def test_generate_generic_explanation(self, explanation_generator):
        """Test generating a generic explanation."""
        context = {"instrument": "vocal", "purpose": "improve clarity"}

        explanation = explanation_generator._generate_generic_explanation(
            category=ExplanationCategory.EQ,
            level=ExplanationLevel.EDUCATIONAL,
            context=context,
        )

        assert explanation is not None
        assert explanation.category == ExplanationCategory.EQ
        assert explanation.level == ExplanationLevel.EDUCATIONAL
        assert "frequency" in explanation.text.lower()
        assert "vocal" in explanation.text
        assert "improve clarity" in explanation.text
        assert explanation.template_id is None
        assert len(explanation.references) > 0
        assert explanation.quality_score == 0.5


class TestExplanationTemplate:
    """Tests for ExplanationTemplate."""

    def test_validation(self):
        """Test template validation."""
        # Valid template
        template = ExplanationTemplate(
            template_id="test_template",
            category=ExplanationCategory.EQ,
            level=ExplanationLevel.EDUCATIONAL,
            template="I {action} the {frequency_range} to {purpose}.",
            required_variables=["action", "frequency_range", "purpose"],
        )

        assert template.template_id == "test_template"
        assert template.category == ExplanationCategory.EQ
        assert template.level == ExplanationLevel.EDUCATIONAL
        assert template.template == "I {action} the {frequency_range} to {purpose}."
        assert template.required_variables == ["action", "frequency_range", "purpose"]

        # Invalid template (no placeholders)
        with pytest.raises(ValueError):
            ExplanationTemplate(
                template_id="test_template",
                category=ExplanationCategory.EQ,
                level=ExplanationLevel.EDUCATIONAL,
                template="This template has no placeholders.",
                required_variables=[],
            )

        # Invalid template (empty)
        with pytest.raises(ValueError):
            ExplanationTemplate(
                template_id="test_template",
                category=ExplanationCategory.EQ,
                level=ExplanationLevel.EDUCATIONAL,
                template="",
                required_variables=[],
            )

    def test_placeholders(self):
        """Test extracting placeholders."""
        template = ExplanationTemplate(
            template_id="test_template",
            category=ExplanationCategory.EQ,
            level=ExplanationLevel.EDUCATIONAL,
            template="I {action} the {frequency_range} to {purpose}.",
            required_variables=["action", "frequency_range", "purpose"],
        )

        assert template.placeholders == ["action", "frequency_range", "purpose"]

        # Template with repeated placeholders
        template = ExplanationTemplate(
            template_id="test_template",
            category=ExplanationCategory.EQ,
            level=ExplanationLevel.EDUCATIONAL,
            template="I {action} the {frequency_range} to {purpose}. This {action} helps {purpose}.",
            required_variables=["action", "frequency_range", "purpose"],
        )

        assert template.placeholders == [
            "action",
            "frequency_range",
            "purpose",
            "action",
            "purpose",
        ]


class TestExplanation:
    """Tests for Explanation."""

    def test_validation(self):
        """Test explanation validation."""
        # Valid explanation
        explanation = Explanation(
            explanation_id="test_explanation",
            category=ExplanationCategory.EQ,
            level=ExplanationLevel.EDUCATIONAL,
            text="I boosted the mid frequencies to improve clarity.",
            context={
                "action": "boosted",
                "frequency_range": "mid frequencies",
                "purpose": "improve clarity",
            },
            template_id="eq_educational_1",
            references=["Understanding Equalization in Audio Mixing"],
            quality_score=0.8,
        )

        assert explanation.explanation_id == "test_explanation"
        assert explanation.category == ExplanationCategory.EQ
        assert explanation.level == ExplanationLevel.EDUCATIONAL
        assert explanation.text == "I boosted the mid frequencies to improve clarity."
        assert explanation.template_id == "eq_educational_1"
        assert explanation.references == ["Understanding Equalization in Audio Mixing"]
        assert explanation.quality_score == 0.8

        # Invalid explanation (text too short)
        with pytest.raises(ValueError):
            Explanation(
                explanation_id="test_explanation",
                category=ExplanationCategory.EQ,
                level=ExplanationLevel.EDUCATIONAL,
                text="Too short",
                context={},
            )

        # Invalid explanation (quality score out of range)
        with pytest.raises(ValueError):
            Explanation(
                explanation_id="test_explanation",
                category=ExplanationCategory.EQ,
                level=ExplanationLevel.EDUCATIONAL,
                text="I boosted the mid frequencies to improve clarity.",
                context={},
                quality_score=1.5,
            )


class TestExplanationHistory:
    """Tests for ExplanationHistory."""

    def test_validation(self):
        """Test history validation."""
        # Valid history
        history = ExplanationHistory(
            clerk_user_id="user_123",
            explanations=[],
            explained_concepts=set(),
            preferred_level=ExplanationLevel.EDUCATIONAL,
            concept_familiarity={},
        )

        assert history.clerk_user_id == "user_123"
        assert history.explanations == []
        assert history.explained_concepts == set()
        assert history.preferred_level == ExplanationLevel.EDUCATIONAL
        assert history.concept_familiarity == {}
