#
# firebase_storage.py
# White Room Infrastructure - Firebase Storage
#
# Copyright © 2025 White Room. All rights reserved.
#
# This file is part of the White Room infrastructure layer.
# Defined once, used across all platforms.
#

"""
Firebase storage wrapper for Python platforms (Raspberry Pi).

This module provides Firebase storage functionality for Raspberry Pi and other
Python-based platforms in the White Room ecosystem.
"""

import os
import json
import base64
import hashlib
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, Dict, Any, Callable, List
from enum import Enum

try:
    import firebase_admin
    from firebase_admin import credentials, firestore, storage as fb_storage
    from firebase_admin import auth
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("⚠️ firebase-admin not installed. Install with: pip install firebase-admin")

# MARK: - Enums


class FirebaseSyncStatus(Enum):
    """Status of Firebase sync operations"""
    IDLE = "idle"
    SYNCING = "syncing"
    SUCCESS = "success"
    ERROR = "error"


class FirebaseErrorCode(Enum):
    """Firebase-specific error codes"""
    NOT_AUTHENTICATED = "not_authenticated"
    RECORD_NOT_FOUND = "record_not_found"
    NETWORK_ERROR = "network_error"
    QUOTA_EXCEEDED = "quota_exceeded"
    PERMISSION_ERROR = "permission_error"
    VALIDATION_ERROR = "validation_error"
    UNKNOWN = "unknown"


# MARK: - Exceptions


class FirebaseError(Exception):
    """Firebase storage error"""

    def __init__(self, code: FirebaseErrorCode, message: Optional[str] = None):
        self.code = code
        self.message = message or code.value
        super().__init__(self.message)

    @classmethod
    def not_authenticated(cls) -> "FirebaseError":
        return cls(FirebaseErrorCode.NOT_AUTHENTICATED, "User is not authenticated with Firebase")

    @classmethod
    def record_not_found(cls, id: str) -> "FirebaseError":
        return cls(FirebaseErrorCode.RECORD_NOT_FOUND, f"Record not found: {id}")

    @classmethod
    def network_error(cls, error: Exception) -> "FirebaseError":
        return cls(FirebaseErrorCode.NETWORK_ERROR, f"Network error: {str(error)}")

    @classmethod
    def quota_exceeded(cls) -> "FirebaseError":
        return cls(FirebaseErrorCode.QUOTA_EXCEEDED, "Firebase quota exceeded")

    @classmethod
    def permission_error(cls, message: str) -> "FirebaseError":
        return cls(FirebaseErrorCode.PERMISSION_ERROR, f"Permission error: {message}")

    @classmethod
    def validation_error(cls, message: str) -> "FirebaseError":
        return cls(FirebaseErrorCode.VALIDATION_ERROR, f"Validation error: {message}")

    @classmethod
    def unknown(cls, message: str) -> "FirebaseError":
        return cls(FirebaseErrorCode.UNKNOWN, message)


# MARK: - Data Models


@dataclass
class FirebaseSongMetadata:
    """Metadata stored in Firebase for songs"""
    id: str
    title: str
    artist: Optional[str] = None
    genre: Optional[str] = None
    created: datetime = field(default_factory=datetime.utcnow)
    modified: datetime = field(default_factory=datetime.utcnow)
    creator_id: str = ""
    platform: str = ""
    file_size: int = 0
    is_public: bool = False
    storage_path: str = ""

    def to_json(self) -> Dict[str, Any]:
        """Convert to JSON dictionary"""
        return {
            "id": self.id,
            "title": self.title,
            "artist": self.artist,
            "genre": self.genre,
            "created": self.created.isoformat(),
            "modified": self.modified.isoformat(),
            "creator_id": self.creator_id,
            "platform": self.platform,
            "file_size": self.file_size,
            "is_public": self.is_public,
            "storage_path": self.storage_path,
        }

    @classmethod
    def from_json(cls, data: Dict[str, Any]) -> "FirebaseSongMetadata":
        """Create from JSON dictionary"""
        return cls(
            id=data["id"],
            title=data["title"],
            artist=data.get("artist"),
            genre=data.get("genre"),
            created=datetime.fromisoformat(data["created"]) if data.get("created") else datetime.utcnow(),
            modified=datetime.fromisoformat(data["modified"]) if data.get("modified") else datetime.utcnow(),
            creator_id=data["creator_id"],
            platform=data["platform"],
            file_size=data.get("file_size", 0),
            is_public=data.get("is_public", False),
            storage_path=data["storage_path"],
        )


@dataclass
class FirebaseSongData:
    """Actual song file data stored in Firebase Storage"""
    id: str
    json_data: str  # Base64 encoded
    compressed_size: int
    uncompressed_size: int
    checksum: str


# MARK: - Configuration


@dataclass
class FirebaseConfiguration:
    """Firebase configuration"""
    api_key: str
    auth_domain: str
    project_id: str
    storage_bucket: str
    app_id: str
    messaging_sender_id: Optional[str] = None
    database_url: Optional[str] = None
    credentials_path: Optional[str] = None


# MARK: - Firebase Manager


class FirebaseManager:
    """
    Main Firebase storage manager for Raspberry Pi and Python platforms

    This class provides a unified interface for syncing song data via Firebase.
    It handles uploads, downloads, queries, and real-time synchronization.

    ## Usage Example
    ```python
    config = FirebaseConfiguration(
        api_key="your-api-key",
        authDomain="your-project.firebaseapp.com",
        projectId="your-project",
        storageBucket="your-project.appspot.com",
        appId="your-app-id",
        credentials_path="/path/to/service-account.json"
    )
    manager = FirebaseManager(configuration=config)

    # Upload a song
    metadata = FirebaseSongMetadata(
        id="song-1",
        title="My Song",
        creator_id="user-1",
        platform="raspberrypi",
        storage_path="songs/song-1.json"
    )
    data = FirebaseSongData(
        id="song-1",
        json_data=base64_encoded_song,
        compressed_size=1000,
        uncompressed_size=5000,
        checksum="abc123"
    )
    await manager.upload_song(metadata, data)

    # Download a song
    song = await manager.download_song("song-1")

    # Query all songs
    songs = await manager.query_songs()
    ```
    """

    def __init__(self, configuration: FirebaseConfiguration):
        """
        Initialize Firebase manager

        Args:
            configuration: Firebase configuration

        Raises:
            ImportError: If firebase-admin is not installed
        """
        if not FIREBASE_AVAILABLE:
            raise ImportError("firebase-admin is required. Install with: pip install firebase-admin")

        self.configuration = configuration
        self._sync_state = {"status": FirebaseSyncStatus.IDLE.value}
        self._state_change_callbacks: List[Callable] = []

        # Initialize Firebase
        self._initialize_firebase()

    # MARK: - Public Methods - Song Operations

    def upload_song(self, metadata: FirebaseSongMetadata, data: FirebaseSongData) -> None:
        """
        Upload a song to Firebase

        Args:
            metadata: The song metadata
            data: The song data (JSON)

        Raises:
            FirebaseError: If upload fails
        """
        self._set_state(FirebaseSyncStatus.SYNCING, progress=0.0)

        try:
            # Upload JSON data to Storage
            bucket = fb_storage.bucket()
            blob = bucket.blob(metadata.storage_path)

            # Decode base64 and upload
            json_bytes = base64.b64decode(data.json_data)
            blob.upload_from_string(json_bytes, content_type='application/json')

            self._set_state(FirebaseSyncStatus.SYNCING, progress=0.5)

            # Save metadata to Firestore
            metadata_json = metadata.to_json()
            self.db.collection('songs').document(metadata.id).set(metadata_json)

            self._set_state(FirebaseSyncStatus.SUCCESS)

        except Exception as e:
            error = FirebaseError.unknown(str(e))
            self._set_state(FirebaseSyncStatus.ERROR, error=error)
            raise error

    def download_song(self, id: str) -> tuple[FirebaseSongMetadata, FirebaseSongData]:
        """
        Download a song from Firebase

        Args:
            id: The song ID

        Returns:
            Tuple of metadata and data

        Raises:
            FirebaseError: If download fails
        """
        self._set_state(FirebaseSyncStatus.SYNCING, progress=0.0)

        try:
            # Fetch metadata from Firestore
            doc = self.db.collection('songs').document(id).get()

            if not doc.exists:
                raise FirebaseError.record_not_found(id)

            metadata = FirebaseSongMetadata.from_json(doc.to_dict())

            self._set_state(FirebaseSyncStatus.SYNCING, progress=0.5)

            # Fetch JSON data from Storage
            bucket = fb_storage.bucket()
            blob = bucket.blob(metadata.storage_path)
            json_bytes = blob.download_as_bytes()
            json_data = base64.b64encode(json_bytes).decode('utf-8')

            data = FirebaseSongData(
                id=metadata.id,
                json_data=json_data,
                compressed_size=metadata.file_size,
                uncompressed_size=metadata.file_size * 5,  # Estimate
                checksum='',  # TODO: Implement checksum
            )

            self._set_state(FirebaseSyncStatus.SUCCESS)

            return metadata, data

        except Exception as e:
            error = FirebaseError.unknown(str(e))
            self._set_state(FirebaseSyncStatus.ERROR, error=error)
            raise error

    def query_songs(
        self,
        limit: int = 50,
        sort_by: str = "modified",
        ascending: bool = False,
        filter_by_creator: Optional[str] = None,
        filter_by_genre: Optional[str] = None,
    ) -> List[FirebaseSongMetadata]:
        """
        Query songs from Firebase

        Args:
            limit: Maximum number of songs to return
            sort_by: Field to sort by
            ascending: Sort order
            filter_by_creator: Filter by creator ID
            filter_by_genre: Filter by genre

        Returns:
            Array of song metadata

        Raises:
            FirebaseError: If query fails
        """
        self._set_state(FirebaseSyncStatus.SYNCING, progress=0.0)

        try:
            # Build query
            query = self.db.collection('songs')

            # Apply filters
            if filter_by_creator:
                query = query.where('creator_id', '==', filter_by_creator)

            if filter_by_genre:
                query = query.where('genre', '==', filter_by_genre)

            # Apply sorting
            direction = 'ASCENDING' if ascending else 'DESCENDING'
            query = query.order_by(sort_by, direction=direction)

            # Apply limit
            query = query.limit(limit)

            self._set_state(FirebaseSyncStatus.SYNCING, progress=0.5)

            # Execute query
            docs = query.stream()

            songs = []
            for doc in docs:
                metadata = FirebaseSongMetadata.from_json(doc.to_dict())
                songs.append(metadata)

            self._set_state(FirebaseSyncStatus.SUCCESS)

            return songs

        except Exception as e:
            error = FirebaseError.unknown(str(e))
            self._set_state(FirebaseSyncStatus.ERROR, error=error)
            raise error

    def delete_song(self, id: str) -> None:
        """
        Delete a song from Firebase

        Args:
            id: The song ID

        Raises:
            FirebaseError: If deletion fails
        """
        self._set_state(FirebaseSyncStatus.SYNCING, progress=0.0)

        try:
            # Get metadata to find storage path
            doc = self.db.collection('songs').document(id).get()

            if not doc.exists:
                raise FirebaseError.record_not_found(id)

            metadata = FirebaseSongMetadata.from_json(doc.to_dict())

            self._set_state(FirebaseSyncStatus.SYNCING, progress=0.5)

            # Delete from Storage
            bucket = fb_storage.bucket()
            blob = bucket.blob(metadata.storage_path)
            blob.delete()

            # Delete from Firestore
            self.db.collection('songs').document(id).delete()

            self._set_state(FirebaseSyncStatus.SUCCESS)

        except Exception as e:
            error = FirebaseError.unknown(str(e))
            self._set_state(FirebaseSyncStatus.ERROR, error=error)
            raise error

    # MARK: - Public Methods - State Management

    def get_sync_state(self) -> Dict[str, Any]:
        """Get the current sync state"""
        return self._sync_state.copy()

    def on_state_change(self, callback: Callable[[Dict[str, Any]], None]) -> None:
        """
        Subscribe to sync state changes

        Args:
            callback: Function to call when state changes
        """
        self._state_change_callbacks.append(callback)

    # MARK: - Private Methods - Initialization

    def _initialize_firebase(self) -> None:
        """Initialize Firebase SDK"""
        try:
            # Check if already initialized
            if not firebase_admin._apps:
                if self.configuration.credentials_path:
                    # Use service account credentials
                    cred = credentials.Certificate(self.configuration.credentials_path)
                else:
                    # Use default credentials (for development)
                    cred = credentials.ApplicationDefault()

                firebase_admin.initialize_app(cred, {
                    'projectId': self.configuration.project_id,
                    'storageBucket': self.configuration.storage_bucket,
                })

            # Initialize services
            self.db = firestore.client()
            self.bucket = fb_storage.bucket()

            print("✅ Firebase initialized successfully")

        except Exception as e:
            print(f"⚠️ Failed to initialize Firebase: {e}")
            raise

    def _set_state(self, status: FirebaseSyncStatus, progress: float = 0.0, error: Optional[FirebaseError] = None) -> None:
        """Set sync state and notify listeners"""
        state_data = {"status": status.value}

        if status == FirebaseSyncStatus.SYNCING:
            state_data["progress"] = progress
        elif status == FirebaseSyncStatus.ERROR and error:
            state_data["error"] = error.message

        self._sync_state = state_data

        for callback in self._state_change_callbacks:
            try:
                callback(state_data)
            except Exception as e:
                print(f"State change callback error: {e}")
