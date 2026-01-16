"""
Rhythm API module.

This module provides the RhythmAPI class for all rhythm-related operations.
"""

import logging
from typing import Any, Dict, List, Optional

from .models import (
    GeneratorProfile,
    ResultantPattern,
    RhythmicVariation,
    PatternAnalysis
)
from .errors import ValidationError
from .utils import validate_interval, sanitize_input

logger = logging.getLogger(__name__)


class RhythmAPI:
    """API for rhythm generation and analysis operations."""

    def __init__(self, client):
        """Initialize Rhythm API.

        Args:
            client: Main SDK client instance
        """
        self.client = client
        self._endpoint = "/rhythm"

    async def generate_resultant(
        self,
        generators: List[Dict[str, Any]],
        options: Optional[Dict[str, Any]] = None
    ) -> ResultantPattern:
        """Generate a rhythmic resultant from multiple generators.

        Args:
            generators: List of generator definitions
                Each generator should have:
                - strikes: List[int] - Strike positions within cycle
                - period: int - Number of beats in cycle
            options: Optional generation parameters
                - include_interference: bool - Calculate interference points
                - calculate_balance: bool - Calculate balance score

        Returns:
            ResultantPattern object with generated rhythm

        Raises:
            ValidationError: If generators are invalid
            NetworkError: If API request fails

        Examples:
            >>> rhythm_api = sdk.rhythm
            >>> generators = [
            ...     {"strikes": [0, 3, 6], "period": 8},
            ...     {"strikes": [0, 2, 4, 6], "period": 8}
            ... ]
            >>> resultant = await rhythm_api.generate_resultant(generators)
            >>> print(f"Resultant strikes: {resultant.resultant.strikes}")
        """
        # Validate generators
        if not generators or len(generators) < 2:
            raise ValidationError("At least 2 generators required for resultant")

        for i, gen in enumerate(generators):
            if not isinstance(gen.get('strikes'), list):
                raise ValidationError(f"Generator {i} must have strikes list")

            period = gen.get('period')
            if not isinstance(period, int) or period <= 0:
                raise ValidationError(f"Generator {i} must have positive period")

            # Validate strike positions
            for strike in gen['strikes']:
                if not isinstance(strike, int) or strike < 0 or strike >= period:
                    raise ValidationError(
                        f"Generator {i} has invalid strike position: {strike}"
                    )

        # Prepare request
        params = {
            "generators": [sanitize_input(g) for g in generators],
            "options": sanitize_input(options or {})
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/resultant",
            json=params
        )

        # Parse response
        return ResultantPattern(**response['data'])

    async def generate_variation(
        self,
        pattern: Dict[str, Any],
        technique: str,
        options: Optional[Dict[str, Any]] = None
    ) -> RhythmicVariation:
        """Generate a variation of a rhythmic pattern.

        Args:
            pattern: Original pattern definition
                - strikes: List[int] - Strike positions
                - period: int - Period length
            technique: Variation technique to apply
                - "displacement" - Shift strike positions
                - "permutation" - Reorder strikes
                - "augmentation" - Double strike values
                - "diminution" - Halve strike values
                - "rotation" - Rotate pattern
                - "retrograde" - Reverse pattern
            options: Optional technique parameters
                - amount: float - Amount of variation (0-1)
                - preserve_density: bool - Keep density constant

        Returns:
            RhythmicVariation object with variation

        Raises:
            ValidationError: If pattern or technique is invalid
            NetworkError: If API request fails

        Examples:
            >>> pattern = {"strikes": [0, 2, 4, 6], "period": 8}
            >>> variation = await rhythm_api.generate_variation(
            ...     pattern,
            ...     technique="displacement",
            ...     options={"amount": 0.25}
            ... )
        """
        # Validate pattern
        if not isinstance(pattern.get('strikes'), list):
            raise ValidationError("Pattern must have strikes list")

        period = pattern.get('period')
        if not isinstance(period, int) or period <= 0:
            raise ValidationError("Pattern must have positive period")

        # Validate technique
        valid_techniques = {
            'displacement', 'permutation', 'augmentation',
            'diminution', 'rotation', 'retrograde'
        }
        if technique not in valid_techniques:
            raise ValidationError(
                f"Invalid technique: {technique}. Must be one of {valid_techniques}"
            )

        # Prepare request
        params = {
            "pattern": sanitize_input(pattern),
            "technique": technique,
            "options": sanitize_input(options or {})
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/variation",
            json=params
        )

        # Parse response
        return RhythmicVariation(**response['data'])

    async def analyze_pattern(
        self,
        pattern: Dict[str, Any]
    ) -> PatternAnalysis:
        """Analyze a rhythmic pattern.

        Args:
            pattern: Pattern to analyze
                - strikes: List[int] - Strike positions
                - period: int - Period length

        Returns:
            PatternAnalysis object with analysis results

        Raises:
            ValidationError: If pattern is invalid
            NetworkError: If API request fails

        Examples:
            >>> pattern = {"strikes": [0, 3, 6], "period": 8}
            >>> analysis = await rhythm_api.analyze_pattern(pattern)
            >>> print(f"Complexity: {analysis.complexity}")
            >>> print(f"Classification: {analysis.classification}")
        """
        # Validate pattern
        if not isinstance(pattern.get('strikes'), list):
            raise ValidationError("Pattern must have strikes list")

        period = pattern.get('period')
        if not isinstance(period, int) or period <= 0:
            raise ValidationError("Pattern must have positive period")

        # Prepare request
        params = {"pattern": sanitize_input(pattern)}

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/analyze",
            json=params
        )

        # Parse response
        return PatternAnalysis(**response['data'])

    async def infer_generators(
        self,
        pattern: Dict[str, Any],
        max_generators: int = 3
    ) -> List[GeneratorProfile]:
        """Infer the generators that compose a pattern.

        Args:
            pattern: Pattern to analyze
                - strikes: List[int] - Strike positions
                - period: int - Period length
            max_generators: Maximum number of generators to infer

        Returns:
            List of inferred GeneratorProfile objects

        Raises:
            ValidationError: If pattern is invalid
            NetworkError: If API request fails

        Examples:
            >>> pattern = {"strikes": [0, 1, 3, 4, 6, 7], "period": 8}
            >>> generators = await rhythm_api.infer_generators(pattern)
            >>> for i, gen in enumerate(generators):
            ...     print(f"Generator {i+1}: {gen.strikes}")
        """
        # Validate pattern
        if not isinstance(pattern.get('strikes'), list):
            raise ValidationError("Pattern must have strikes list")

        period = pattern.get('period')
        if not isinstance(period, int) or period <= 0:
            raise ValidationError("Pattern must have positive period")

        if max_generators < 1 or max_generators > 5:
            raise ValidationError("max_generators must be between 1 and 5")

        # Prepare request
        params = {
            "pattern": sanitize_input(pattern),
            "max_generators": max_generators
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/infer-generators",
            json=params
        )

        # Parse response
        return [GeneratorProfile(**g) for g in response['data']]

    async def find_best_fit(
        self,
        target_pattern: Dict[str, Any],
        candidate_generators: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Find the best combination of generators to match a target pattern.

        Args:
            target_pattern: Target pattern to match
                - strikes: List[int] - Strike positions
                - period: int - Period length
            candidate_generators: List of potential generators to test

        Returns:
            Dictionary with:
                - best_fit: List of generators that best match
                - fit_quality: float (0-1) quality score
                - analysis: Detailed comparison

        Raises:
            ValidationError: If inputs are invalid
            NetworkError: If API request fails

        Examples:
            >>> target = {"strikes": [0, 2, 4, 6], "period": 8}
            >>> candidates = [
            ...     {"strikes": [0, 4], "period": 8},
            ...     {"strikes": [0, 2, 4, 6], "period": 8}
            ... ]
            >>> result = await rhythm_api.find_best_fit(target, candidates)
            >>> print(f"Best fit quality: {result['fit_quality']}")
        """
        # Validate target pattern
        if not isinstance(target_pattern.get('strikes'), list):
            raise ValidationError("Target pattern must have strikes list")

        period = target_pattern.get('period')
        if not isinstance(period, int) or period <= 0:
            raise ValidationError("Target pattern must have positive period")

        # Validate candidates
        if not candidate_generators:
            raise ValidationError("At least one candidate generator required")

        for i, gen in enumerate(candidate_generators):
            if not isinstance(gen.get('strikes'), list):
                raise ValidationError(f"Candidate {i} must have strikes list")

            gen_period = gen.get('period')
            if not isinstance(gen_period, int) or gen_period <= 0:
                raise ValidationError(f"Candidate {i} must have positive period")

        # Prepare request
        params = {
            "target_pattern": sanitize_input(target_pattern),
            "candidate_generators": [sanitize_input(g) for g in candidate_generators]
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/find-best-fit",
            json=params
        )

        # Parse response
        data = response['data']
        data['best_fit'] = [GeneratorProfile(**g) for g in data['best_fit']]
        return data
