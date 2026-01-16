"""
Composition API module.

This module provides the CompositionAPI class for all composition-related operations.
"""

import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

from .models import (
    Composition,
    CompositionSection,
    CompositionMetadata,
    UserEncoding,
    CompositionAnalysis
)
from .errors import ValidationError, OfflineError
from .utils import sanitize_input, generate_request_id

logger = logging.getLogger(__name__)


class CompositionAPI:
    """API for composition creation and analysis operations."""

    def __init__(self, client):
        """Initialize Composition API.

        Args:
            client: Main SDK client instance
        """
        self.client = client
        self._endpoint = "/composition"

    async def create(
        self,
        title: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Composition:
        """Create a new composition.

        Args:
            title: Composition title
            metadata: Optional composition metadata
                - key: str - Key
                - tempo: int - Tempo in BPM
                - time_signature: str - Time signature
                - tags: List[str] - Descriptive tags

        Returns:
            Composition object

        Raises:
            ValidationError: If title is invalid
            NetworkError: If API request fails

        Examples:
            >>> comp_api = sdk.composition
            >>> composition = await comp_api.create(
            ...     "My Composition",
            ...     metadata={"key": "C", "tempo": 120}
            ... )
            >>> print(f"Created: {composition.id}")
        """
        # Validate title
        if not title or not isinstance(title, str):
            raise ValidationError("Title must be a non-empty string")

        # Prepare request
        params = {
            "title": sanitize_input(title),
            "metadata": sanitize_input(metadata or {})
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/create",
            json=params
        )

        # Parse response
        return Composition(**response['data'])

    async def generate_section(
        self,
        composition_id: str,
        section_name: str,
        bars: int,
        parameters: Optional[Dict[str, Any]] = None
    ) -> CompositionSection:
        """Generate a section for a composition.

        Args:
            composition_id: Composition to add section to
            section_name: Name for the section
            bars: Number of bars in section
            parameters: Optional generation parameters
                - generate_melody: bool
                - generate_harmony: bool
                - generate_rhythm: bool
                - key: str - Section key
                - mood: str - Desired mood
                - energy: float (0-1) - Energy level
                - density: float (0-1) - Note density

        Returns:
            CompositionSection object

        Raises:
            ValidationError: If parameters are invalid
            NetworkError: If API request fails

        Examples:
            >>> section = await comp_api.generate_section(
            ...     composition_id="abc123",
            ...     section_name="Verse 1",
            ...     bars=16,
            ...     parameters={"generate_melody": True, "energy": 0.7}
            ... )
        """
        # Validate inputs
        if not composition_id or not isinstance(composition_id, str):
            raise ValidationError("Composition ID must be a non-empty string")

        if not section_name or not isinstance(section_name, str):
            raise ValidationError("Section name must be a non-empty string")

        if bars < 1 or bars > 256:
            raise ValidationError("Bars must be between 1 and 256")

        # Prepare request
        params = {
            "composition_id": sanitize_input(composition_id),
            "section_name": sanitize_input(section_name),
            "bars": bars,
            "parameters": sanitize_input(parameters or {})
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/generate-section",
            json=params
        )

        # Parse response
        return CompositionSection(**response['data'])

    async def analyze_composition(
        self,
        composition_id: str
    ) -> CompositionAnalysis:
        """Analyze a composition.

        Args:
            composition_id: Composition to analyze

        Returns:
            CompositionAnalysis object with detailed analysis

        Raises:
            ValidationError: If composition_id is invalid
            NetworkError: If API request fails

        Examples:
            >>> analysis = await comp_api.analyze_composition("abc123")
            >>> print(f"Coherence: {analysis.coherence_score}")
            >>> print(f"Form: {analysis.formal_structure}")
        """
        # Validate composition_id
        if not composition_id or not isinstance(composition_id, str):
            raise ValidationError("Composition ID must be a non-empty string")

        # Prepare request
        params = {"composition_id": sanitize_input(composition_id)}

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/analyze",
            json=params
        )

        # Parse response
        return CompositionAnalysis(**response['data'])

    async def encode_user_input(
        self,
        input_type: str,
        data: Any,
        options: Optional[Dict[str, Any]] = None
    ) -> UserEncoding:
        """Encode user input into structured format.

        Args:
            input_type: Type of input
                - "contour" - Melodic contour
                - "rhythm" - Rhythmic pattern
                - "chords" - Chord progression
                - "midi" - MIDI file data
                - "audio" - Audio features
            data: Input data (format depends on type)
            options: Optional encoding parameters
                - tolerance: float - Error tolerance
                - quantization: str - Quantization level

        Returns:
            UserEncoding object

        Raises:
            ValidationError: If input is invalid
            NetworkError: If API request fails

        Examples:
            >>> # Encode a melodic contour
            >>> contour = [2, 2, -1, 2, -2, 2, -1]
            >>> encoded = await comp_api.encode_user_input(
            ...     input_type="contour",
            ...     data=contour
            ... )
            >>> print(f"Confidence: {encoded.confidence}")
        """
        # Validate input_type
        valid_types = {'contour', 'rhythm', 'chords', 'midi', 'audio'}
        if input_type not in valid_types:
            raise ValidationError(
                f"Invalid input_type: {input_type}. Must be one of {valid_types}"
            )

        # Validate data based on type
        if input_type == "contour":
            if not isinstance(data, list):
                raise ValidationError("Contour data must be a list")
            for item in data:
                if not isinstance(item, int):
                    raise ValidationError("Contour intervals must be integers")

        elif input_type == "rhythm":
            if not isinstance(data, dict):
                raise ValidationError("Rhythm data must be a dict")
            if not isinstance(data.get('strikes'), list):
                raise ValidationError("Rhythm must have strikes list")

        # Prepare request
        params = {
            "input_type": sanitize_input(input_type),
            "data": sanitize_input(data),
            "options": sanitize_input(options or {})
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/encode",
            json=params
        )

        # Parse response
        return UserEncoding(**response['data'])

    async def decode_encoding(
        self,
        encoding: UserEncoding,
        output_format: str = "json"
    ) -> Dict[str, Any]:
        """Decode an encoded user input.

        Args:
            encoding: Encoding to decode
            output_format: Desired output format
                - "json" - JSON format
                - "midi" - MIDI file data
                - "musicxml" - MusicXML format
                - "abc" - ABC notation

        Returns:
            Dictionary with decoded data

        Raises:
            ValidationError: If format is invalid
            NetworkError: If API request fails

        Examples:
            >>> decoded = await comp_api.decode_encoding(
            ...     encoded,
            ...     output_format="musicxml"
            ... )
        """
        # Validate output_format
        valid_formats = {'json', 'midi', 'musicxml', 'abc'}
        if output_format not in valid_formats:
            raise ValidationError(
                f"Invalid output_format: {output_format}. "
                f"Must be one of {valid_formats}"
            )

        # Prepare request
        params = {
            "encoding": encoding.model_dump(),
            "output_format": sanitize_input(output_format)
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/decode",
            json=params
        )

        return response['data']

    async def export_composition(
        self,
        composition_id: str,
        format: str,
        options: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """Export a composition to various formats.

        Args:
            composition_id: Composition to export
            format: Export format
                - "midi" - MIDI file
                - "musicxml" - MusicXML file
                - "abc" - ABC notation
                - "pdf" - Sheet music (PDF)
                - "json" - JSON format
            options: Optional export parameters
                - include_lyrics: bool
                - title: str - Custom title
                - composer: str - Composer name

        Returns:
            Exported data (format-specific)

        Raises:
            ValidationError: If parameters are invalid
            NetworkError: If API request fails

        Examples:
            >>> midi_data = await comp_api.export_composition(
            ...     "abc123",
            ...     format="midi"
            ... )
            >>> with open("composition.mid", "wb") as f:
            ...     f.write(midi_data)
        """
        # Validate inputs
        if not composition_id or not isinstance(composition_id, str):
            raise ValidationError("Composition ID must be a non-empty string")

        valid_formats = {'midi', 'musicxml', 'abc', 'pdf', 'json'}
        if format not in valid_formats:
            raise ValidationError(
                f"Invalid format: {format}. Must be one of {valid_formats}"
            )

        # Prepare request
        params = {
            "composition_id": sanitize_input(composition_id),
            "format": format,
            "options": sanitize_input(options or {})
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/export",
            json=params
        )

        # Return data (could be base64 encoded binary data)
        return response['data']

    async def list_compositions(
        self,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Dict[str, Any]:
        """List compositions with optional filtering.

        Args:
            filters: Optional filter criteria
                - key: str - Filter by key
                - tags: List[str] - Filter by tags
                - date_from: str - Start date (ISO format)
                - date_to: str - End date (ISO format)
            limit: Maximum number of results
            offset: Pagination offset

        Returns:
            Dictionary with:
                - compositions: List of composition summaries
                - total: Total count
                - limit: Current limit
                - offset: Current offset

        Raises:
            ValidationError: If parameters are invalid
            NetworkError: If API request fails

        Examples:
            >>> result = await comp_api.list_compositions(
            ...     filters={"key": "C"},
            ...     limit=20
            ... )
            >>> for comp in result['compositions']:
            ...     print(f"{comp['title']} - {comp['id']}")
        """
        # Validate pagination
        if limit < 1 or limit > 100:
            raise ValidationError("Limit must be between 1 and 100")

        if offset < 0:
            raise ValidationError("Offset must be non-negative")

        # Prepare request
        params = {
            "filters": sanitize_input(filters or {}),
            "limit": limit,
            "offset": offset
        }

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/list",
            json=params
        )

        return response['data']

    async def delete_composition(
        self,
        composition_id: str
    ) -> bool:
        """Delete a composition.

        Args:
            composition_id: Composition to delete

        Returns:
            True if deleted successfully

        Raises:
            ValidationError: If composition_id is invalid
            NetworkError: If API request fails

        Examples:
            >>> success = await comp_api.delete_composition("abc123")
            >>> print(f"Deleted: {success}")
        """
        # Validate composition_id
        if not composition_id or not isinstance(composition_id, str):
            raise ValidationError("Composition ID must be a non-empty string")

        # Prepare request
        params = {"composition_id": sanitize_input(composition_id)}

        # Make API request
        response = await self.client._make_request(
            "POST",
            f"{self._endpoint}/delete",
            json=params
        )

        return response['data'].get('success', False)
