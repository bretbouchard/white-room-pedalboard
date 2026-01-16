#
# song.py
# White Room Infrastructure - File Format
#
# Copyright © 2025 White Room. All rights reserved.
#
# This file is part of the White Room infrastructure layer.
# Defined once, used across all platforms.
#

"""
White Room song file format (.wrs) implementation for Python.

This module provides the complete song file structure and I/O operations
for the White Room universal file format.
"""

import json
import hashlib
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any, List, Literal
from pathlib import Path


# MARK: - Song File Errors


class SongFileErrorCode:
    """Song file error codes"""
    INVALID_EXTENSION = "invalid_extension"
    FILE_TOO_LARGE = "file_too_large"
    UNSUPPORTED_VERSION = "unsupported_version"
    INVALID_JSON = "invalid_json"
    VALIDATION_ERROR = "validation_error"


class SongFileError(Exception):
    """Song file error"""

    def __init__(self, code: str, message: Optional[str] = None):
        self.code = code
        self.message = message or code
        super().__init__(self.message)

    @classmethod
    def invalid_extension(cls) -> "SongFileError":
        return cls(
            SongFileErrorCode.INVALID_EXTENSION,
            "Invalid file extension. Expected .wrs or .whiteroom"
        )

    @classmethod
    def file_too_large(cls) -> "SongFileError":
        return cls(
            SongFileErrorCode.FILE_TOO_LARGE,
            "File size exceeds 10MB limit"
        )

    @classmethod
    def unsupported_version(cls, version: str) -> "SongFileError":
        return cls(
            SongFileErrorCode.UNSUPPORTED_VERSION,
            f"Unsupported file format version: {version}"
        )

    @classmethod
    def invalid_json(cls, message: str) -> "SongFileError":
        return cls(
            SongFileErrorCode.INVALID_JSON,
            f"Invalid JSON: {message}"
        )

    @classmethod
    def validation_error(cls, message: str) -> "SongFileError":
        return cls(
            SongFileErrorCode.VALIDATION_ERROR,
            message
        )


# MARK: - Data Models


@dataclass
class Creator:
    """Song creator information"""
    id: str = "unknown"
    platform: str = "unknown"
    version: str = "1.0.0"


@dataclass
class Metadata:
    """Song metadata"""
    title: str
    artist: Optional[str] = None
    genre: Optional[str] = None
    created: datetime = field(default_factory=datetime.utcnow)
    modified: datetime = field(default_factory=datetime.utcnow)
    creator: Creator = field(default_factory=Creator)

    def to_json(self) -> Dict[str, Any]:
        """Convert to JSON dictionary"""
        return {
            "title": self.title,
            "artist": self.artist,
            "genre": self.genre,
            "created": self.created.isoformat(),
            "modified": self.modified.isoformat(),
            "creator": {
                "id": self.creator.id,
                "platform": self.creator.platform,
                "version": self.creator.version,
            }
        }

    @classmethod
    def from_json(cls, data: Dict[str, Any]) -> "Metadata":
        """Create from JSON dictionary"""
        creator_data = data.get("creator", {})
        creator = Creator(
            id=creator_data.get("id", "unknown"),
            platform=creator_data.get("platform", "unknown"),
            version=creator_data.get("version", "1.0.0")
        )

        return cls(
            title=data["title"],
            artist=data.get("artist"),
            genre=data.get("genre"),
            created=datetime.fromisoformat(data["created"]) if data.get("created") else datetime.utcnow(),
            modified=datetime.fromisoformat(data["modified"]) if data.get("modified") else datetime.utcnow(),
            creator=creator
        )


@dataclass
class Note:
    """Musical note"""
    pitch: int
    velocity: int = 64
    duration: float = 1.0
    position: float = 0.0


@dataclass
class Rhythm:
    """Rhythm pattern"""
    id: str
    name: str
    generator: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    result: List[int] = field(default_factory=list)


@dataclass
class Harmony:
    """Harmony pattern"""
    id: str
    name: str
    generator: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    result: List[List[int]] = field(default_factory=list)


@dataclass
class Melody:
    """Melody pattern"""
    id: str
    name: str
    generator: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    result: List[Note] = field(default_factory=list)


@dataclass
class SchillingerData:
    """Schillinger system data"""
    rhythms: List[Rhythm] = field(default_factory=list)
    harmonies: List[Harmony] = field(default_factory=list)
    melodies: List[Melody] = field(default_factory=list)


@dataclass
class Marker:
    """Timeline marker"""
    id: str
    position: float
    name: str
    color: Optional[str] = None


@dataclass
class Timeline:
    """Song timeline"""
    tempo: float = 120.0
    time_signature: List[int] = field(default_factory=lambda: [4, 4])
    duration: float = 180.0
    loop_start: Optional[float] = None
    loop_end: Optional[float] = None
    loop_enabled: bool = False
    markers: List[Marker] = field(default_factory=list)


@dataclass
class Event:
    """Track event"""
    position: float
    duration: float
    pitch: Optional[int] = None
    velocity: Optional[int] = None
    data: Optional[Dict[str, Any]] = None


@dataclass
class Track:
    """Arrangement track"""
    id: str
    name: str
    color: Optional[str] = None
    pattern_id: Optional[str] = None
    events: List[Event] = field(default_factory=list)


@dataclass
class Arrangement:
    """Song arrangement"""
    timeline: Timeline = field(default_factory=Timeline)
    tracks: List[Track] = field(default_factory=list)


@dataclass
class Instrument:
    """Instrument definition"""
    id: str
    name: str
    type: str
    platform: str = "universal"
    parameters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Effect:
    """Audio effect"""
    id: str
    name: str
    type: str
    platform: str = "universal"
    parameters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EQ:
    """Equalizer settings"""
    low: float = 0.0
    mid: float = 0.0
    high: float = 0.0


@dataclass
class Channel:
    """Mix channel"""
    id: str
    track_id: Optional[str] = None
    volume: float = 0.8
    pan: float = 0.0
    mute: bool = False
    solo: bool = False
    effects: List[str] = field(default_factory=list)
    eq: EQ = field(default_factory=EQ)


@dataclass
class Limiter:
    """Master limiter"""
    threshold: float = -0.1
    release: float = 0.1


@dataclass
class Master:
    """Master output"""
    volume: float = 0.8
    effects: List[str] = field(default_factory=list)
    limiter: Limiter = field(default_factory=Limiter)


@dataclass
class Mixing:
    """Mix settings"""
    channels: List[Channel] = field(default_factory=list)
    master: Master = field(default_factory=Master)


@dataclass
class Format:
    """File format information"""
    name: str = "White Room Song"
    version: str = "1.0.0"
    schema: str = "SchillingerSong_v1"
    compatibility: str = "1.0.0"


@dataclass
class Song:
    """Complete White Room song"""
    format: Format
    metadata: Metadata
    schillinger: SchillingerData
    arrangement: Arrangement
    instruments: List[Instrument]
    effects: List[Effect]
    mixing: Mixing

    def to_json(self) -> Dict[str, Any]:
        """Convert to JSON dictionary"""
        return {
            "format": {
                "name": self.format.name,
                "version": self.format.version,
                "schema": self.format.schema,
                "compatibility": self.format.compatibility,
            },
            "metadata": self.metadata.to_json(),
            "schillinger": {
                "rhythms": [
                    {
                        "id": r.id,
                        "name": r.name,
                        "generator": r.generator,
                        "parameters": r.parameters,
                        "result": r.result,
                    }
                    for r in self.schillinger.rhythms
                ],
                "harmonies": [
                    {
                        "id": h.id,
                        "name": h.name,
                        "generator": h.generator,
                        "parameters": h.parameters,
                        "result": h.result,
                    }
                    for h in self.schillinger.harmonies
                ],
                "melodies": [
                    {
                        "id": m.id,
                        "name": m.name,
                        "generator": m.generator,
                        "parameters": m.parameters,
                        "result": [
                            {
                                "pitch": n.pitch,
                                "velocity": n.velocity,
                                "duration": n.duration,
                                "position": n.position,
                            }
                            for n in m.result
                        ],
                    }
                    for m in self.schillinger.melodies
                ],
            },
            "arrangement": {
                "timeline": {
                    "tempo": self.arrangement.timeline.tempo,
                    "timeSignature": self.arrangement.timeline.time_signature,
                    "duration": self.arrangement.timeline.duration,
                    "loopStart": self.arrangement.timeline.loop_start,
                    "loopEnd": self.arrangement.timeline.loop_end,
                    "loopEnabled": self.arrangement.timeline.loop_enabled,
                    "markers": [
                        {
                            "id": m.id,
                            "position": m.position,
                            "name": m.name,
                            "color": m.color,
                        }
                        for m in self.arrangement.timeline.markers
                    ],
                },
                "tracks": [
                    {
                        "id": t.id,
                        "name": t.name,
                        "color": t.color,
                        "patternId": t.pattern_id,
                        "events": [
                            {
                                "position": e.position,
                                "duration": e.duration,
                                "pitch": e.pitch,
                                "velocity": e.velocity,
                                "data": e.data,
                            }
                            for e in t.events
                        ],
                    }
                    for t in self.arrangement.tracks
                ],
            },
            "instruments": [
                {
                    "id": i.id,
                    "name": i.name,
                    "type": i.type,
                    "platform": i.platform,
                    "parameters": i.parameters,
                }
                for i in self.instruments
            ],
            "effects": [
                {
                    "id": e.id,
                    "name": e.name,
                    "type": e.type,
                    "platform": e.platform,
                    "parameters": e.parameters,
                }
                for e in self.effects
            ],
            "mixing": {
                "channels": [
                    {
                        "id": c.id,
                        "trackId": c.track_id,
                        "volume": c.volume,
                        "pan": c.pan,
                        "mute": c.mute,
                        "solo": c.solo,
                        "effects": c.effects,
                        "eq": {
                            "low": c.eq.low,
                            "mid": c.eq.mid,
                            "high": c.eq.high,
                        },
                    }
                    for c in self.mixing.channels
                ],
                "master": {
                    "volume": self.mixing.master.volume,
                    "effects": self.mixing.master.effects,
                    "limiter": {
                        "threshold": self.mixing.master.limiter.threshold,
                        "release": self.mixing.master.limiter.release,
                    },
                },
            },
        }

    @classmethod
    def from_json(cls, data: Dict[str, Any]) -> "Song":
        """Create from JSON dictionary"""
        format_data = data.get("format", {})
        format_info = Format(
            name=format_data.get("name", "White Room Song"),
            version=format_data.get("version", "1.0.0"),
            schema=format_data.get("schema", "SchillingerSong_v1"),
            compatibility=format_data.get("compatibility", "1.0.0"),
        )

        metadata = Metadata.from_json(data.get("metadata", {}))

        schillinger_data = data.get("schillinger", {})
        schillinger = SchillingerData(
            rhythms=[
                Rhythm(
                    id=r["id"],
                    name=r["name"],
                    generator=r["generator"],
                    parameters=r.get("parameters", {}),
                    result=r.get("result", []),
                )
                for r in schillinger_data.get("rhythms", [])
            ],
            harmonies=[
                Harmony(
                    id=h["id"],
                    name=h["name"],
                    generator=h["generator"],
                    parameters=h.get("parameters", {}),
                    result=h.get("result", []),
                )
                for h in schillinger_data.get("harmonies", [])
            ],
            melodies=[
                Melody(
                    id=m["id"],
                    name=m["name"],
                    generator=m["generator"],
                    parameters=m.get("parameters", {}),
                    result=[
                        Note(
                            pitch=n["pitch"],
                            velocity=n.get("velocity", 64),
                            duration=n.get("duration", 1.0),
                            position=n.get("position", 0.0),
                        )
                        for n in m.get("result", [])
                    ],
                )
                for m in schillinger_data.get("melodies", [])
            ],
        )

        arrangement_data = data.get("arrangement", {})
        timeline_data = arrangement_data.get("timeline", {})
        arrangement = Arrangement(
            timeline=Timeline(
                tempo=timeline_data.get("tempo", 120.0),
                time_signature=timeline_data.get("timeSignature", [4, 4]),
                duration=timeline_data.get("duration", 180.0),
                loop_start=timeline_data.get("loopStart"),
                loop_end=timeline_data.get("loopEnd"),
                loop_enabled=timeline_data.get("loopEnabled", False),
                markers=[
                    Marker(
                        id=m["id"],
                        position=m["position"],
                        name=m["name"],
                        color=m.get("color"),
                    )
                    for m in timeline_data.get("markers", [])
                ],
            ),
            tracks=[
                Track(
                    id=t["id"],
                    name=t["name"],
                    color=t.get("color"),
                    pattern_id=t.get("patternId"),
                    events=[
                        Event(
                            position=e["position"],
                            duration=e["duration"],
                            pitch=e.get("pitch"),
                            velocity=e.get("velocity"),
                            data=e.get("data"),
                        )
                        for e in t.get("events", [])
                    ],
                )
                for t in arrangement_data.get("tracks", [])
            ],
        )

        instruments = [
            Instrument(
                id=i["id"],
                name=i["name"],
                type=i["type"],
                platform=i.get("platform", "universal"),
                parameters=i.get("parameters", {}),
            )
            for i in data.get("instruments", [])
        ]

        effects = [
            Effect(
                id=e["id"],
                name=e["name"],
                type=e["type"],
                platform=e.get("platform", "universal"),
                parameters=e.get("parameters", {}),
            )
            for e in data.get("effects", [])
        ]

        mixing_data = data.get("mixing", {})
        master_data = mixing_data.get("master", {})
        limiter_data = master_data.get("limiter", {})
        mixing = Mixing(
            channels=[
                Channel(
                    id=c["id"],
                    track_id=c.get("trackId"),
                    volume=c.get("volume", 0.8),
                    pan=c.get("pan", 0.0),
                    mute=c.get("mute", False),
                    solo=c.get("solo", False),
                    effects=c.get("effects", []),
                    eq=EQ(
                        low=c.get("eq", {}).get("low", 0.0),
                        mid=c.get("eq", {}).get("mid", 0.0),
                        high=c.get("eq", {}).get("high", 0.0),
                    ),
                )
                for c in mixing_data.get("channels", [])
            ],
            master=Master(
                volume=master_data.get("volume", 0.8),
                effects=master_data.get("effects", []),
                limiter=Limiter(
                    threshold=limiter_data.get("threshold", -0.1),
                    release=limiter_data.get("release", 0.1),
                ),
            ),
        )

        return cls(
            format=format_info,
            metadata=metadata,
            schillinger=schillinger,
            arrangement=arrangement,
            instruments=instruments,
            effects=effects,
            mixing=mixing,
        )

    @classmethod
    def load(cls, path: str) -> "Song":
        """
        Load a song from a file path

        Args:
            path: Path to the .wrs file

        Returns:
            Song object

        Raises:
            SongFileError: If loading fails
        """
        file_path = Path(path)

        # Validate file extension
        if file_path.suffix not in [".wrs", ".whiteroom"]:
            raise SongFileError.invalid_extension()

        # Read file
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
        except Exception as e:
            raise SongFileError.invalid_json(str(e))

        # Validate file size
        if file_path.stat().st_size > 10_000_000:
            raise SongFileError.file_too_large()

        # Parse song
        song = cls.from_json(data)

        # Validate format version
        if song.format.version != "1.0.0":
            raise SongFileError.unsupported_version(song.format.version)

        return song

    def save(self, path: str) -> None:
        """
        Save a song to a file path

        Args:
            path: Path where the .wrs file should be saved

        Raises:
            SongFileError: If saving fails
        """
        file_path = Path(path)

        # Validate file extension
        if file_path.suffix not in [".wrs", ".whiteroom"]:
            raise SongFileError.invalid_extension()

        # Create parent directory if needed
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Convert to JSON and save
        json_data = self.to_json()
        with open(file_path, 'w') as f:
            json.dump(json_data, f, indent=2, sort_keys=True)

    @classmethod
    def empty(cls, title: str = "Untitled Song") -> "Song":
        """Create a new empty song with default values"""
        return cls(
            format=Format(),
            metadata=Metadata(title=title),
            schillinger=SchillingerData(),
            arrangement=Arrangement(),
            instruments=[],
            effects=[],
            mixing=Mixing(),
        )
