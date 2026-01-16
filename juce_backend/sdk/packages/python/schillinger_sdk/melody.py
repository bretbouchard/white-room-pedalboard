"""
Melody API module.

This module provides the MelodyAPI class for all melody-related operations.
"""

import logging
from typing import Any, Dict, List, Optional

from .models import (
    MelodicFragment,
    MelodicContour,
    MelodicVariation,
    MelodicAnalysis
)
from .errors import ValidationError
from .utils import sanitize_input, validate_pitch_class

logger = logging.getLogger(__name__)


class MelodyAPI:
    """API for melody generation and analysis operations."""

    def __init__(self, client):
        """Initialize Melody API.

        Args:
            client: Main SDK client instance
        """
        self.client = client
        self._endpoint = "/melody"

    async def generate_melody(
        self,
        length: int,
        scale: List[int],
        options: Optional[Dict[str, Any]] = None
    ) -> MelodicFragment:
        """Generate a melodic fragment.

        Args:
            length: Number of notes to generate
            scale: Scale degrees (pitch classes 0-11)
            options: Optional generation parameters
                - rhythm: Dict - Rhythmic pattern
                - contour: List[int] - Desired contour
                - range: tuple - Min/max pitch
                - tessitura: int - Preferred tessitura
                - complexity: float (0-1) - Melodic complexity
                - coherence: float (0-1) - Melodic coherence

        Returns:
            MelodicFragment object

        Raises:
            ValidationError: If parameters are invalid
            NetworkError: If API request fails

        Examples:
            >>> melody_api = sdk.melody
            >>> scale = [0, 2, 4, 5, 7, 9, 11]  # C major
            >>> melody = await melody_api.generate_melody(
            ...     length=16,
            ...     scale=scale,
            ...     options={"complexity": 0.5, "range": (60, 72)}
            ... )
            >>> print(f"Generated {len(melody.pitches)} notes")
        """
        # Validate inputs
        if length < 1 or length > 128:
            raise ValidationError("Length must be between 1 and 128")

        if not scale or not isinstance(scale, list):
            raise ValidationError("Scale must be a non-empty list")

        for pitch in scale:
            if not validate_pitch_class(pitch):
                raise ValidationError(f"Invalid pitch class in scale: {pitch}")

        # Prepare request
        params = {
            "length": length,
            "scale": sanitize_input(scale),
            "options": sanitize_input(options or {})
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/generate",
            json=params
        )

        # Parse response
        return MelodicFragment(**response['data'])

    async def generate_variations(
        self,
        melody: Dict[str, Any],
        techniques: List[str],
        count: int = 3,
        options: Optional[Dict[str, Any]] = None
    ) -> List[MelodicVariation]:
        """Generate variations of a melodic fragment.

        Args:
            melody: Original melody
                - pitches: List[int] - Pitch sequence
                - durations: List[float] - Duration sequence
            techniques: List of variation techniques
                - "ornamentation" - Add ornaments
                - "sequence" - Create sequences
                - "inversion" - Invert contour
                - "retrograde" - Reverse melody
                - "augmentation" - Lengthen durations
                - "diminution" - Shorten durations
                - "displacement" - Shift rhythm
            count: Number of variations to generate
            options: Optional technique parameters
                - preserve_contour: bool
                - amount: float (0-1)

        Returns:
            List of MelodicVariation objects

        Raises:
            ValidationError: If inputs are invalid
            NetworkError: If API request fails

        Examples:
            >>> melody = {"pitches": [60, 62, 64, 65], "durations": [1, 1, 1, 1]}
            >>> variations = await melody_api.generate_variations(
            ...     melody,
            ...     techniques=["ornamentation", "sequence"],
            ...     count=3
            ... )
        """
        # Validate melody
        if not isinstance(melody.get('pitches'), list):
            raise ValidationError("Melody must have pitches list")

        if not isinstance(melody.get('durations'), list):
            raise ValidationError("Melody must have durations list")

        if len(melody['pitches']) != len(melody['durations']):
            raise ValidationError("Pitches and durations must have same length")

        # Validate techniques
        valid_techniques = {
            'ornamentation', 'sequence', 'inversion',
            'retrograde', 'augmentation', 'diminution', 'displacement'
        }
        for technique in techniques:
            if technique not in valid_techniques:
                raise ValidationError(
                    f"Invalid technique: {technique}. "
                    f"Must be one of {valid_techniques}"
                )

        if count < 1 or count > 10:
            raise ValidationError("Count must be between 1 and 10")

        # Prepare request
        params = {
            "melody": sanitize_input(melody),
            "techniques": sanitize_input(techniques),
            "count": count,
            "options": sanitize_input(options or {})
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/variations",
            json=params
        )

        # Parse response
        return [MelodicVariation(**v) for v in response['data']]

    async def analyze_melody(
        self,
        melody: Dict[str, Any]
    ) -> MelodicAnalysis:
        """Analyze a melodic fragment.

        Args:
            melody: Melody to analyze
                - pitches: List[int] - Pitch sequence
                - durations: List[float] - Duration sequence

        Returns:
            MelodicAnalysis object with detailed analysis

        Raises:
            ValidationError: If melody is invalid
            NetworkError: If API request fails

        Examples:
            >>> melody = {"pitches": [60, 62, 64, 65, 67], "durations": [1, 1, 1, 1, 1]}
            >>> analysis = await melody_api.analyze_melody(melody)
            >>> print(f"Contour: {analysis.contour.contour}")
            >>> print(f"Structural tones: {analysis.structural_tones}")
        """
        # Validate melody
        if not isinstance(melody.get('pitches'), list):
            raise ValidationError("Melody must have pitches list")

        if not isinstance(melody.get('durations'), list):
            raise ValidationError("Melody must have durations list")

        if len(melody['pitches']) != len(melody['durations']):
            raise ValidationError("Pitches and durations must have same length")

        # Prepare request
        params = {"melody": sanitize_input(melody)}

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/analyze",
            json=params
        )

        # Parse response
        return MelodicAnalysis(**response['data'])

    async def extract_contour(
        self,
        melody: Dict[str, Any],
        granularity: str = "fine"
    ) -> MelodicContour:
        """Extract the contour from a melodic fragment.

        Args:
            melody: Melody to extract contour from
                - pitches: List[int] - Pitch sequence
            granularity: Contour detail level
                - "fine" - Every interval
                -medium" - Grouped by phrase
                - "coarse" - Only major direction changes

        Returns:
            MelodicContour object

        Raises:
            ValidationError: If melody or granularity is invalid
            NetworkError: If API request fails

        Examples:
            >>> melody = {"pitches": [60, 62, 64, 63, 65, 67, 66, 64]}
            >>> contour = await melody_api.extract_contour(melody)
            >>> print(f"Contour: {contour.contour}")
            >>> print(f"Peaks at: {contour.peaks}")
        """
        # Validate melody
        if not isinstance(melody.get('pitches'), list):
            raise ValidationError("Melody must have pitches list")

        # Validate granularity
        valid_granularities = {'fine', 'medium', 'coarse'}
        if granularity not in valid_granularities:
            raise ValidationError(
                f"Invalid granularity: {granularity}. "
                f"Must be one of {valid_granularities}"
            )

        # Prepare request
        params = {
            "melody": sanitize_input(melody),
            "granularity": granularity
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/extract-contour",
            json=params
        )

        # Parse response
        return MelodicContour(**response['data'])

    async def apply_contour(
        self,
        contour: List[int],
        start_pitch: int,
        scale: Optional[List[int]] = None
    ) -> MelodicFragment:
        """Apply a contour to generate a melody.

        Args:
            contour: Contour intervals
            start_pitch: Starting pitch
            scale: Optional scale to constrain pitches (0-11)

        Returns:
            MelodicFragment with applied contour

        Raises:
            ValidationError: If inputs are invalid
            NetworkError: If API request fails

        Examples:
            >>> contour = [2, 2, 1, -1, 2, 2, -2]
            >>> melody = await melody_api.apply_contour(
            ...     contour,
            ...     start_pitch=60,
            ...     scale=[0, 2, 4, 5, 7, 9, 11]
            ... )
        """
        # Validate inputs
        if not isinstance(contour, list) or not contour:
            raise ValidationError("Contour must be a non-empty list")

        if not isinstance(start_pitch, int):
            raise ValidationError("Start pitch must be an integer")

        # Validate scale if provided
        if scale:
            for pitch in scale:
                if not validate_pitch_class(pitch):
                    raise ValidationError(f"Invalid pitch class in scale: {pitch}")

        # Prepare request
        params = {
            "contour": sanitize_input(contour),
            "start_pitch": start_pitch,
            "scale": sanitize_input(scale) if scale else None
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/apply-contour",
            json=params
        )

        # Parse response
        return MelodicFragment(**response['data'])

    async def detect_phrases(
        self,
        melody: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Detect phrase boundaries in a melody.

        Args:
            melody: Melody to analyze
                - pitches: List[int] - Pitch sequence
                - durations: List[float] - Duration sequence

        Returns:
            Dictionary with:
                - phrases: List of phrase boundaries
                - phrase_types: List of phrase types (antecedent, consequent, etc.)
                - cadences: List of cadence points
                - structure: Hierarchical phrase structure

        Raises:
            ValidationError: If melody is invalid
            NetworkError: If API request fails

        Examples:
            >>> melody = {"pitches": [60, 62, 64, 65], "durations": [1, 1, 1, 2]}
            >>> phrases = await melody_api.detect_phrases(melody)
            >>> for phrase in phrases['phrases']:
            ...     print(f"Phrase: {phrase}")
        """
        # Validate melody
        if not isinstance(melody.get('pitches'), list):
            raise ValidationError("Melody must have pitches list")

        if not isinstance(melody.get('durations'), list):
            raise ValidationError("Melody must have durations list")

        # Prepare request
        params = {"melody": sanitize_input(melody)}

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/detect-phrases",
            json=params
        )

        return response['data']
