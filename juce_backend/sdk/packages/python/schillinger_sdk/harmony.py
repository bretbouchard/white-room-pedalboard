"""
Harmony API module.

This module provides the HarmonyAPI class for all harmony-related operations.
"""

import logging
from typing import Any, Dict, List, Optional

from .models import (
    Chord,
    HarmonicProgression,
    AxisPattern,
    HarmonicResolution
)
from .errors import ValidationError
from .utils import sanitize_input

logger = logging.getLogger(__name__)


class HarmonyAPI:
    """API for harmony generation and analysis operations."""

    def __init__(self, client):
        """Initialize Harmony API.

        Args:
            client: Main SDK client instance
        """
        self.client = client
        self._endpoint = "/harmony"

    async def generate_progression(
        self,
        key: str,
        length: int = 8,
        options: Optional[Dict[str, Any]] = None
    ) -> HarmonicProgression:
        """Generate a harmonic progression.

        Args:
            key: Key center (e.g., "C", "F# minor")
            length: Number of chords to generate
            options: Optional generation parameters
                - scale: str - Scale type ("major", "minor", etc.)
                - complexity: float (0-1) - Harmonic complexity
                - include_extensions: bool - Add 7ths, 9ths, etc.
                - functional: bool - Use functional harmony

        Returns:
            HarmonicProgression object

        Raises:
            ValidationError: If parameters are invalid
            NetworkError: If API request fails

        Examples:
            >>> harmony_api = sdk.harmony
            >>> progression = await harmony_api.generate_progression(
            ...     "C",
            ...     length=8,
            ...     options={"scale": "major", "complexity": 0.6}
            ... )
            >>> for chord in progression.chords:
            ...     print(f"{chord.root} {chord.quality}")
        """
        # Validate inputs
        if not key or not isinstance(key, str):
            raise ValidationError("Key must be a non-empty string")

        if length < 1 or length > 32:
            raise ValidationError("Length must be between 1 and 32")

        # Prepare request
        params = {
            "key": sanitize_input(key),
            "length": length,
            "options": sanitize_input(options or {})
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/progression",
            json=params
        )

        # Parse response
        return HarmonicProgression(**response['data'])

    async def analyze_progression(
        self,
        chords: List[Dict[str, Any]],
        key: Optional[str] = None
    ) -> Dict[str, Any]:
        """Analyze a harmonic progression.

        Args:
            chords: List of chord definitions
                Each chord:
                - root: int (0-11) - Root pitch class
                - quality: str - Chord quality
                - extensions: List[int] - Extension intervals
            key: Optional key for analysis (auto-detected if not provided)

        Returns:
            Dictionary with analysis results:
                - functional_analysis: Roman numeral analysis
                - tension_profile: List of tension values
                - key_detected: Detected key
                - cadences: Identified cadence points

        Raises:
            ValidationError: If chords are invalid
            NetworkError: If API request fails

        Examples:
            >>> chords = [
            ...     {"root": 0, "quality": "major"},
            ...     {"root": 5, "quality": "major"},
            ...     {"root": 7, "quality": "major"}
            ... ]
            >>> analysis = await harmony_api.analyze_progression(chords, key="C")
            >>> print(analysis['functional_analysis'])
        """
        # Validate chords
        if not chords or not isinstance(chords, list):
            raise ValidationError("At least one chord required")

        for i, chord in enumerate(chords):
            if not isinstance(chord.get('root'), int):
                raise ValidationError(f"Chord {i} must have root integer")

            root = chord.get('root')
            if root < 0 or root > 11:
                raise ValidationError(f"Chord {i} root must be 0-11")

            if not chord.get('quality'):
                raise ValidationError(f"Chord {i} must have quality")

        # Prepare request
        params = {
            "chords": [sanitize_input(c) for c in chords],
            "key": sanitize_input(key) if key else None
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/analyze-progression",
            json=params
        )

        return response['data']

    async def resolve_chord(
        self,
        chord: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> HarmonicResolution:
        """Resolve a chord to its stable resolution.

        Args:
            chord: Chord to resolve
                - root: int (0-11) - Root pitch class
                - quality: str - Chord quality
                - extensions: List[int] - Extension intervals
            context: Optional context for resolution
                - key: str - Current key
                - preceding_chord: Dict - Previous chord
                - function: str - Harmonic function

        Returns:
            HarmonicResolution object with resolution

        Raises:
            ValidationError: If chord is invalid
            NetworkError: If API request fails

        Examples:
            >>> chord = {"root": 7, "quality": "dominant"}
            >>> resolution = await harmony_api.resolve_chord(
            ...     chord,
            ...     context={"key": "C"}
            ... )
            >>> print(f"Resolution: {resolution.resolution.root}")
        """
        # Validate chord
        if not isinstance(chord.get('root'), int):
            raise ValidationError("Chord must have root integer")

        root = chord.get('root')
        if root < 0 or root > 11:
            raise ValidationError("Root must be 0-11")

        if not chord.get('quality'):
            raise ValidationError("Chord must have quality")

        # Prepare request
        params = {
            "chord": sanitize_input(chord),
            "context": sanitize_input(context or {})
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/resolve",
            json=params
        )

        # Parse response
        return HarmonicResolution(**response['data'])

    async def generate_axis_pattern(
        self,
        axis_intervals: List[int],
        rotation: int = 0,
        options: Optional[Dict[str, Any]] = None
    ) -> AxisPattern:
        """Generate a harmonic axis pattern.

        Args:
            axis_intervals: Primary axis intervals
            rotation: Rotation offset for secondary axis
            options: Optional parameters
                - secondary_axis: List[int] - Custom secondary axis
                - calculate_tension: bool - Calculate tension flow
                - length: int - Pattern length

        Returns:
            AxisPattern object

        Raises:
            ValidationError: If parameters are invalid
            NetworkError: If API request fails

        Examples:
            >>> axis = await harmony_api.generate_axis_pattern(
            ...     axis_intervals=[0, 4, 7],
            ...     rotation=3
            ... )
            >>> print(f"Tension flow: {axis.tension_flow}")
        """
        # Validate intervals
        if not axis_intervals or not isinstance(axis_intervals, list):
            raise ValidationError("axis_intervals must be a non-empty list")

        for interval in axis_intervals:
            if not isinstance(interval, int):
                raise ValidationError("All intervals must be integers")

        if rotation < 0:
            raise ValidationError("Rotation must be non-negative")

        # Prepare request
        params = {
            "axis_intervals": sanitize_input(axis_intervals),
            "rotation": rotation,
            "options": sanitize_input(options or {})
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/axis-pattern",
            json=params
        )

        # Parse response
        return AxisPattern(**response['data'])

    async def analyze_voice_leading(
        self,
        chord1: Dict[str, Any],
        chord2: Dict[str, Any],
        voicing1: Optional[List[int]] = None,
        voicing2: Optional[List[int]] = None
    ) -> Dict[str, Any]:
        """Analyze voice leading between two chords.

        Args:
            chord1: First chord
            chord2: Second chord
            voicing1: Optional voicing for first chord
            voicing2: Optional voicing for second chord

        Returns:
            Dictionary with voice leading analysis:
                - voice_movement: List of movements for each voice
                - smoothness: float (0-1) smoothness score
                - parallels: List of parallel fifth/octave occurrences
                - recommendations: Suggestions for improvement

        Raises:
            ValidationError: If chords are invalid
            NetworkError: If API request fails

        Examples:
            >>> chord1 = {"root": 0, "quality": "major"}
            >>> chord2 = {"root": 5, "quality": "major"}
            >>> analysis = await harmony_api.analyze_voice_leading(chord1, chord2)
            >>> print(f"Smoothness: {analysis['smoothness']}")
        """
        # Validate chords
        for i, chord in enumerate([chord1, chord2], 1):
            if not isinstance(chord.get('root'), int):
                raise ValidationError(f"Chord {i} must have root integer")

            root = chord.get('root')
            if root < 0 or root > 11:
                raise ValidationError(f"Chord {i} root must be 0-11")

            if not chord.get('quality'):
                raise ValidationError(f"Chord {i} must have quality")

        # Prepare request
        params = {
            "chord1": sanitize_input(chord1),
            "chord2": sanitize_input(chord2),
            "voicing1": sanitize_input(voicing1) if voicing1 else None,
            "voicing2": sanitize_input(voicing2) if voicing2 else None
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/voice-leading",
            json=params
        )

        return response['data']
