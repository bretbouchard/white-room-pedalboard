"""Tests for the Rhythm API."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from schillinger_sdk import SchillingerSDK
from schillinger_sdk.models import GeneratorProfile, ResultantPattern, RhythmicVariation
from schillinger_sdk.errors import ValidationError


@pytest.mark.asyncio
class TestRhythmAPI:
    """Test suite for RhythmAPI."""

    async def setup_method(self):
        """Set up test fixtures."""
        self.sdk = SchillingerSDK(
            base_url="https://api.schillinger.io",
            api_key="test-key"
        )
        await self.sdk.start()

    async def teardown_method(self):
        """Clean up after tests."""
        await self.sdk.stop()

    async def test_generate_resultant_success(self):
        """Test successful resultant generation."""
        generators = [
            {"strikes": [0, 3, 6], "period": 8},
            {"strikes": [0, 2, 4, 6], "period": 8}
        ]

        mock_response = {
            "data": {
                "generators": [
                    {
                        "strikes": [0, 3, 6],
                        "period": 8,
                        "density": 0.375,
                        "symmetry": 1.0
                    },
                    {
                        "strikes": [0, 2, 4, 6],
                        "period": 8,
                        "density": 0.5,
                        "symmetry": 1.0
                    }
                ],
                "resultant": {
                    "strikes": [0, 2, 3, 4, 6],
                    "period": 8,
                    "density": 0.625,
                    "symmetry": 0.8
                },
                "interference": [0, 6],
                "balance": 0.75
            }
        }

        with patch.object(self.sdk, '_make_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response

            result = await self.sdk.rhythm.generate_resultant(generators)

            assert isinstance(result, ResultantPattern)
            assert len(result.generators) == 2
            assert result.resultant.strikes == [0, 2, 3, 4, 6]
            assert result.interference == [0, 6]
            assert result.balance == 0.75

    async def test_generate_resultant_validation_error(self):
        """Test that validation fails for invalid generators."""
        with pytest.raises(ValidationError) as exc_info:
            await self.sdk.rhythm.generate_resultant([])

        assert "At least 2 generators required" in str(exc_info.value)

    async def test_generate_resultant_invalid_period(self):
        """Test that validation fails for invalid period."""
        generators = [
            {"strikes": [0, 3, 6], "period": -1},
            {"strikes": [0, 2, 4], "period": 8}
        ]

        with pytest.raises(ValidationError) as exc_info:
            await self.sdk.rhythm.generate_resultant(generators)

        assert "positive period" in str(exc_info.value)

    async def test_generate_variation_success(self):
        """Test successful variation generation."""
        pattern = {"strikes": [0, 2, 4, 6], "period": 8}
        technique = "displacement"

        mock_response = {
            "data": {
                "original": {
                    "strikes": [0, 2, 4, 6],
                    "period": 8,
                    "density": 0.5,
                    "symmetry": 1.0
                },
                "variation": {
                    "strikes": [1, 3, 5, 7],
                    "period": 8,
                    "density": 0.5,
                    "symmetry": 1.0
                },
                "technique": "displacement",
                "transformation": {"amount": 0.25}
            }
        }

        with patch.object(self.sdk, '_make_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response

            result = await self.sdk.rhythm.generate_variation(pattern, technique)

            assert isinstance(result, RhythmicVariation)
            assert result.technique == "displacement"
            assert result.variation.strikes == [1, 3, 5, 7]

    async def test_generate_variation_invalid_technique(self):
        """Test that validation fails for invalid technique."""
        pattern = {"strikes": [0, 2, 4], "period": 8}

        with pytest.raises(ValidationError) as exc_info:
            await self.sdk.rhythm.generate_variation(pattern, "invalid_technique")

        assert "Invalid technique" in str(exc_info.value)

    async def test_analyze_pattern_success(self):
        """Test successful pattern analysis."""
        pattern = {"strikes": [0, 3, 6], "period": 8}

        mock_response = {
            "data": {
                "profile": {
                    "strikes": [0, 3, 6],
                    "period": 8,
                    "density": 0.375,
                    "symmetry": 1.0
                },
                "generators": [
                    {
                        "strikes": [0, 4],
                        "period": 8,
                        "density": 0.25,
                        "symmetry": 1.0
                    }
                ],
                "fit_quality": 0.85,
                "complexity": 0.6,
                "classification": "resultant"
            }
        }

        with patch.object(self.sdk, '_make_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response

            result = await self.sdk.rhythm.analyze_pattern(pattern)

            assert result.complexity == 0.6
            assert result.classification == "resultant"
            assert result.fit_quality == 0.85

    async def test_infer_generators_success(self):
        """Test successful generator inference."""
        pattern = {"strikes": [0, 1, 3, 4, 6, 7], "period": 8}

        mock_response = {
            "data": [
                {
                    "strikes": [0, 4],
                    "period": 8,
                    "density": 0.25,
                    "symmetry": 1.0
                },
                {
                    "strikes": [0, 3],
                    "period": 8,
                    "density": 0.25,
                    "symmetry": 1.0
                }
            ]
        }

        with patch.object(self.sdk, '_make_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response

            result = await self.sdk.rhythm.infer_generators(pattern, max_generators=2)

            assert len(result) == 2
            assert all(isinstance(gen, GeneratorProfile) for gen in result)

    async def test_infer_generators_invalid_max(self):
        """Test that validation fails for invalid max_generators."""
        pattern = {"strikes": [0, 3, 6], "period": 8}

        with pytest.raises(ValidationError) as exc_info:
            await self.sdk.rhythm.infer_generators(pattern, max_generators=10)

        assert "max_generators must be between 1 and 5" in str(exc_info.value)

    async def test_find_best_fit_success(self):
        """Test successful best fit finding."""
        target_pattern = {"strikes": [0, 2, 4, 6], "period": 8}
        candidates = [
            {"strikes": [0, 4], "period": 8},
            {"strikes": [0, 2, 4, 6], "period": 8}
        ]

        mock_response = {
            "data": {
                "best_fit": [
                    {
                        "strikes": [0, 2, 4, 6],
                        "period": 8,
                        "density": 0.5,
                        "symmetry": 1.0
                    }
                ],
                "fit_quality": 1.0,
                "analysis": {"exact_match": True}
            }
        }

        with patch.object(self.sdk, '_make_request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = mock_response

            result = await self.sdk.rhythm.find_best_fit(target_pattern, candidates)

            assert result["fit_quality"] == 1.0
            assert len(result["best_fit"]) == 1
            assert result["best_fit"][0].strikes == [0, 2, 4, 6]

    async def test_find_best_fit_no_candidates(self):
        """Test that validation fails with no candidates."""
        target_pattern = {"strikes": [0, 2, 4], "period": 8}

        with pytest.raises(ValidationError) as exc_info:
            await self.sdk.rhythm.find_best_fit(target_pattern, [])

        assert "At least one candidate generator required" in str(exc_info.value)
