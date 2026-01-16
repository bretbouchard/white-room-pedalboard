# 🐍 Python Backend Integration Guide

## Overview

This guide helps the Python backend team integrate the new Schillinger SDK features into Python applications for server-side processing, API development, and data science workflows.

## 🆕 **NEW FEATURES TO INTEGRATE**

### 1. Python SDK Wrapper & Bridge

#### **Installation & Setup**
```python
# requirements.txt
schillinger-sdk>=1.0.0
node>=18.0.0
websockets>=11.0.0
aiofiles>=23.0.0
pydantic>=2.0.0
```

```python
# schillinger_python/__init__.py
import subprocess
import json
import asyncio
import logging
from typing import Dict, List, Optional, Any, Callable
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum
import websockets
import aiofiles

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SchillingerSDK:
    """Python wrapper for the Schillinger TypeScript SDK"""

    def __init__(self, node_path: str = "node"):
        self.node_path = node_path
        self.process = None
        self.websocket_server = None
        self.is_initialized = False

    async def initialize(self) -> None:
        """Initialize the Schillinger SDK"""
        try:
            # Check if Node.js is available
            result = subprocess.run(
                [self.node_path, "--version"],
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                raise RuntimeError(f"Node.js not found at {self.node_path}")

            # Start Node.js process with Schillinger SDK
            await self._start_node_process()

            # Initialize SDK modules
            await self._initialize_modules()

            self.is_initialized = True
            logger.info("Schillinger SDK initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize Schillinger SDK: {e}")
            raise

    async def _start_node_process(self) -> None:
        """Start Node.js process with Schillinger SDK"""
        startup_script = '''
const { SchillingerSDK } = require('@schillinger-sdk/core');
const WebSocket = require('ws');

class SchillingerNodeBridge {
    constructor() {
        this.sdk = new SchillingerSDK();
        this.ws = null;
        this.commands = new Map();
        this.commandId = 0;
    }

    async initialize() {
        // Initialize all SDK components
        this.ws = new WebSocket('ws://localhost:8765');

        this.ws.on('open', () => {
            console.log('WebSocket connection established');
            process.send('ready');
        });

        this.ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
        });
    }

    handleMessage(message) {
        const { id, method, params, result, error } = message;

        if (id) {
            const command = this.commands.get(id);
            if (command) {
                if (error) {
                    command.reject(new Error(error));
                } else {
                    command.resolve(result);
                }
                this.commands.delete(id);
            }
        }
    }

    async callMethod(method, params = {}) {
        return new Promise((resolve, reject) => {
            const id = ++this.commandId;
            this.commands.set(id, { resolve, reject });

            this.ws.send(JSON.stringify({
                id,
                method,
                params
            }));
        });
    }
}

const bridge = new SchillingerNodeBridge();

bridge.initialize().then(() => {
    console.log('Schillinger Node Bridge ready');
}).catch(console.error);

// Listen for commands from Python
process.stdin.on('data', async (data) => {
    try {
        const command = JSON.parse(data.toString());
        const result = await bridge.callMethod(command.method, command.params);
        process.send(JSON.stringify({ id: command.id, result }));
    } catch (error) {
        process.send(JSON.stringify({ id: command.id, error: error.message }));
    }
});
        '''

        # Write startup script to temporary file
        script_path = Path("schillinger_node_bridge.js")
        async with aiofiles.open(script_path, 'w') as f:
            await f.write(startup_script)

        # Start Node.js process
        self.process = subprocess.Popen(
            [self.node_path, str(script_path)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        # Wait for ready signal
        await self._wait_for_ready()

    async def _wait_for_ready(self, timeout: int = 30) -> None:
        """Wait for Node.js process to be ready"""
        start_time = asyncio.get_event_loop().time()

        while asyncio.get_event_loop().time() - start_time < timeout:
            if self.process and self.process.poll() is None:
                line = self.process.stdout.readline()
                if line == "ready\n":
                    return
            await asyncio.sleep(0.1)

        raise TimeoutError("Node.js process failed to initialize within timeout")

    async def _initialize_modules(self) -> None:
        """Initialize SDK modules"""
        modules = [
            'rhythm',
            'harmony',
            'melody',
            'counterpoint',
            'orchestration',
            'form',
            'collaboration',
            'audio_export',
            'visual_editor'
        ]

        for module in modules:
            try:
                await self._call_sdk_method(f'initialize_{module}', {})
                logger.info(f"Initialized {module} module")
            except Exception as e:
                logger.warning(f"Failed to initialize {module} module: {e}")

    async def _call_sdk_method(self, method: str, params: Dict[str, Any]) -> Any:
        """Call a method on the Schillinger SDK"""
        if not self.is_initialized:
            raise RuntimeError("Schillinger SDK not initialized")

        command = {
            "method": method,
            "params": params,
            "id": id(params)  # Use hash as command ID
        }

        command_str = json.dumps(command)

        try:
            self.process.stdin.write(command_str + '\n')
            self.process.stdin.flush()

            # Wait for response
            response = await self._wait_for_response(command["id"])
            return response.get("result", response.get("error"))

        except Exception as e:
            logger.error(f"Error calling SDK method {method}: {e}")
            raise

    async def _wait_for_response(self, command_id: str, timeout: int = 30) -> Dict[str, Any]:
        """Wait for response from Node.js process"""
        start_time = asyncio.get_event_loop().time()

        while asyncio.get_event_loop().time() - start_time < timeout:
            if self.process and self.process.poll() is None:
                line = self.process.stdout.readline()
                if line:
                    try:
                        response = json.loads(line.strip())
                        if response.get("id") == command_id:
                            return response
                    except json.JSONDecodeError:
                        continue
            await asyncio.sleep(0.01)

        raise TimeoutError(f"Timeout waiting for response to command {command_id}")

    async def cleanup(self) -> None:
        """Cleanup resources"""
        if self.process:
            self.process.terminate()
            await self.process.wait()
            self.process = None

        self.is_initialized = False

# Global SDK instance
sdk = SchillingerSDK()
```

#### **High-Level Python API**
```python
# schillinger_python/rhythm.py
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import asyncio

@dataclass
class RhythmPattern:
    """Python representation of a rhythm pattern"""
    time_signature: List[int]  # [numerator, denominator]
    duration: List[float]     # Rhythm pattern
    subdivision: int          # Subdivision level
    complexity: float         # 0.0-1.0
    accent_pattern: List[int] # Accent pattern

    def to_dict(self) -> Dict[str, Any]:
        return {
            'timeSignature': self.time_signature,
            'duration': self.duration,
            'subdivision': self.subdivision,
            'complexity': self.complexity,
            'accentPattern': self.accent_pattern
        }

class RhythmEngine:
    """Python wrapper for Schillinger Rhythm Engine"""

    def __init__(self, sdk_client):
        self.sdk = sdk_client

    async def generate_pattern(self,
                             time_signature: List[int] = [4, 4],
                             duration: Optional[List[float]] = None,
                             subdivision: int = 1,
                             complexity: float = 0.5,
                             accent_pattern: Optional[List[int]] = None
                             ) -> RhythmPattern:
        """Generate a rhythmic pattern"""

        if duration is None:
            # Generate default pattern
            duration = [1, 0, 1, 0]  # Basic quarter-rest-quarter-rest

        if accent_pattern is None:
            accent_pattern = [1, 0, 0, 0] * (len(duration) // 4)

        params = {
            'timeSignature': time_signature,
            'duration': duration,
            'subdivision': subdivision,
            'complexity': complexity,
            'accentPattern': accent_pattern
        }

        result = await self.sdk._call_sdk_method('generateRhythmPattern', params)

        return RhythmPattern(
            time_signature=result['timeSignature'],
            duration=result['duration'],
            subdivision=result['subdivision'],
            complexity=result['complexity'],
            accent_pattern=result['accentPattern']
        )

    async def generate_polyrhythm(self,
                                   primary_meter: List[int],
                                   secondary_meter: List[int],
                                   length: int = 16) -> RhythmPattern:
        """Generate a polyrhythmic pattern"""

        params = {
            'primaryMeter': primary_meter,
            'secondaryMeter': secondary_meter,
            'length': length
        }

        result = await self.sdk._call_sdk_method('generatePolyrhythm', params)

        return RhythmPattern(
            time_signature=result['timeSignature'],
            duration=result['duration'],
            subdivision=result['subdivision'],
            complexity=result['complexity'],
            accent_pattern=result['accentPattern']
        )

    async def generate_variations(self,
                                   base_pattern: List[float],
                                   techniques: List[str] = None,
                                   count: int = 5) -> List[RhythmPattern]:
        """Generate variations of a base rhythm pattern"""

        if techniques is None:
            techniques = ['augmentation', 'diminution', 'retrograde', 'inversion']

        params = {
            'basePattern': base_pattern,
            'techniques': techniques,
            'count': count
        }

        results = await self.sdk._call_sdk_method('generateRhythmVariations', params)

        return [
            RhythmPattern(
                time_signature=result['timeSignature'],
                duration=result['duration'],
                subdivision=result['subdivision'],
                complexity=result['complexity'],
                accent_pattern=result['accentPattern']
            )
            for result in results
        ]

# schillinger_python/harmony.py
@dataclass
class ChordProgression:
    """Python representation of a chord progression"""
    key: str
    length: int
    chords: List[Dict[str, Any]]
    complexity: float
    style: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            'key': self.key,
            'length': self.length,
            'chords': self.chords,
            'complexity': self.complexity,
            'style': self.style
        }

class HarmonyEngine:
    """Python wrapper for Schillinger Harmony Engine"""

    def __init__(self, sdk_client):
        self.sdk = sdk_client

    async def generate_progression(self,
                                   key: str = 'C major',
                                   length: int = 8,
                                   complexity: float = 0.5,
                                   style: str = 'classical') -> ChordProgression:
        """Generate a chord progression"""

        params = {
            'key': key,
            'length': length,
            'complexity': complexity,
            'style': style
        }

        result = await self.sdk._call_sdk_method('generateChordProgression', params)

        return ChordProgression(
            key=result['key'],
            length=result['length'],
            chords=result['chords'],
            complexity=result['complexity'],
            style=result['style']
        )

    async def analyze_harmony(self, notes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze harmonic structure of notes"""

        params = {'notes': notes}

        return await self.sdk._call_sdk_method('analyzeHarmony', params)

# schillinger_python/composition.py
@dataclass
class Composition:
    """Python representation of a musical composition"""
    id: str
    name: str
    tempo: int
    key: str
    time_signature: str
    duration: int
    tracks: List[Dict[str, Any]]
    metadata: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'tempo': self.tempo,
            'key': self.key,
            'timeSignature': self.time_signature,
            'duration': self.duration,
            'tracks': self.tracks,
            'metadata': self.metadata
        }

class CompositionPipeline:
    """Python wrapper for Schillinger Composition Pipeline"""

    def __init__(self, sdk_client):
        self.sdk = sdk_client
        self.rhythm_engine = RhythmEngine(sdk_client)
        self.harmony_engine = HarmonyEngine(sdk_client)

    async def generate_composition(self,
                                   name: str = "Untitled",
                                   tempo: int = 120,
                                   key: str = "C major",
                                   duration: int = 32,
                                   style: str = "classical",
                                   complexity: float = 0.5) -> Composition:
        """Generate a complete musical composition"""

        # Generate rhythm
        rhythm = await self.rhythm_engine.generate_pattern(
            time_signature=[4, 4],
            complexity=complexity
        )

        # Generate harmony
        harmony = await self.harmony_engine.generate_progression(
            key=key,
            length=duration,
            complexity=complexity,
            style=style
        )

        # Create composition
        params = {
            'name': name,
            'tempo': tempo,
            'key': key,
            'timeSignature': '4/4',
            'duration': duration,
            'rhythm': rhythm.to_dict(),
            'harmony': harmony.to_dict(),
            'style': style
        }

        result = await self.sdk._call_sdk_method('generateComposition', params)

        return Composition(
            id=result['id'],
            name=result['name'],
            tempo=result['tempo'],
            key=result['key'],
            timeSignature=result['timeSignature'],
            duration=result['duration'],
            tracks=result['tracks'],
            metadata=result['metadata']
        )

    async def quick_compose(self,
                             themes: List[List[int]],
                             duration: List[int],
                             style: str,
                             ensemble: str) -> Composition:
        """Quick composition with minimal parameters"""

        params = {
            'themes': themes,
            'duration': duration,
            'style': style,
            'ensemble': ensemble
        }

        result = await self.sdk._call_sdk_method('quickCompose', params)

        return Composition(
            id=result['id'],
            name=result['name'],
            tempo=result['tempo'],
            key=result['key'],
            timeSignature=result['timeSignature'],
            duration=result['duration'],
            tracks=result['tracks'],
            metadata=result['metadata']
        )
```

### 2. Audio Export Integration

#### **Python Audio Export Service**
```python
# schillinger_python/audio_export.py
import asyncio
import aiofiles
import subprocess
import json
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class AudioExportOptions:
    """Options for audio export"""
    format: str  # wav, mp3, flac, aac, ogg
    sample_rate: int = 48000
    bit_depth: int = 24
    channels: int = 2
    quality: str = "high"  # low, medium, high, lossless
    normalization: bool = True
    headroom: float = -3.0

@dataclass
class MIDIExportOptions:
    """Options for MIDI export"""
    format: int = 1  # 0 = single track, 1 = multi-track
    resolution: int = 480  # ticks per quarter note
    tempo_map: bool = True
    velocity_scaling: bool = True
    note_off_velocity: bool = False
    controller_data: bool = True
    metadata: Dict[str, Any] = None

class AudioExportEngine:
    """Python wrapper for Schillinger Audio Export Engine"""

    def __init__(self, sdk_client, output_dir: str = "exports"):
        self.sdk = sdk_client
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

    async def export_audio(self,
                           composition: Dict[str, Any],
                           options: AudioExportOptions,
                           progress_callback: Optional[Callable[[float], None]] = None) -> Dict[str, Any]:
        """Export composition to audio format"""

        # Prepare export request
        params = {
            'composition': composition,
            'format': options.format,
            'options': {
                'sampleRate': options.sample_rate,
                'bitDepth': options.bit_depth,
                'channels': options.channels,
                'quality': options.quality,
                'normalization': options.normalization,
                'headroom': options.headroom
            }
        }

        try:
            # Call export method via SDK
            export_id = await self.sdk._call_sdk_method('exportComposition', [
                composition,
                options.format,
                params['options']
            ])

            # Monitor progress
            if progress_callback:
                await self._monitor_export_progress(export_id, progress_callback)

            # Wait for completion
            result = await self._wait_for_export_completion(export_id)

            return result

        except Exception as e:
            logger.error(f"Audio export failed: {e}")
            raise

    async def export_midi(self,
                           composition: Dict[str, Any],
                           options: MIDIExportOptions,
                           progress_callback: Optional[Callable[[float], None]] = None) -> Dict[str, Any]:
        """Export composition to MIDI format"""

        params = {
            'composition': composition,
            'format': options.format,
            'resolution': options.resolution,
            'tempoMap': options.tempo_map,
            'velocityScaling': options.velocity_scaling,
            'noteOffVelocity': options.note_off_velocity,
            'controllerData': options.controller_data
        }

        if options.metadata:
            params['metadata'] = options.metadata

        try:
            export_id = await self.sdk._call_sdk_method('exportComposition', [
                composition,
                'midi-1' if options.format == 1 else 'midi-0',
                params
            ])

            if progress_callback:
                await self._monitor_export_progress(export_id, progress_callback)

            return await self._wait_for_export_completion(export_id)

        except Exception as e:
            logger.error(f"MIDI export failed: {e}")
            raise

    async def batch_export(self,
                           composition: Dict[str, Any],
                           formats: List[AudioExportOptions],
                           progress_callback: Optional[Callable[[float], None]] = None) -> List[Dict[str, Any]]:
        """Export composition to multiple formats"""

        results = []
        total_formats = len(formats)

        for i, options in enumerate(formats):
            try:
                format_progress = None
                if progress_callback:
                    format_progress = lambda p: progress_callback((i + p) / total_formats)

                if options.format.lower().startswith('midi'):
                    midi_options = MIDIExportOptions()
                    result = await self.export_midi(composition, midi_options, format_progress)
                else:
                    result = await self.export_audio(composition, options, format_progress)

                results.append(result)

            except Exception as e:
                logger.error(f"Failed to export to {options.format}: {e}")
                # Continue with other formats
                continue

        return results

    async def _monitor_export_progress(self, export_id: str, callback: Callable[[float], None]) -> None:
        """Monitor export progress"""

        start_time = asyncio.get_event_loop().time()
        estimated_duration = 60  # Default 60 seconds

        while True:
            try:
                progress = await self.sdk._call_sdk_method('getExportProgress', [export_id])

                current_progress = progress.get('progress', 0) / 100.0

                callback(current_progress)

                if progress.get('status') in ['completed', 'failed', 'cancelled']:
                    break

                await asyncio.sleep(0.5)

            except Exception as e:
                logger.error(f"Error monitoring export progress: {e}")
                break

    async def _wait_for_export_completion(self, export_id: str, timeout: int = 300) -> Dict[str, Any]:
        """Wait for export to complete"""

        start_time = asyncio.get_event_loop().time()

        while asyncio.get_event_loop().time() - start_time < timeout:
            try:
                progress = await self.sdk._call_sdk_method('getExportProgress', [export_id])
                status = progress.get('status')

                if status == 'completed':
                    # Get export result
                    result = await self.sdk._call_sdk_method('getExportResult', [export_id])
                    return result
                elif status in ['failed', 'cancelled']:
                    raise Exception(f"Export {status}: {progress.get('error', 'Unknown error')}")

                await asyncio.sleep(1)

            except Exception as e:
                logger.error(f"Error waiting for export completion: {e}")
                break

        raise TimeoutError(f"Export timeout after {timeout} seconds")

class AudioProcessingBridge:
    """Bridge for Python audio processing libraries (librosa, soundfile, etc.)"""

    @staticmethod
    def analyze_audio(file_path: str) -> Dict[str, Any]:
        """Analyze audio file using librosa"""
        try:
            import librosa
            import numpy as np

            # Load audio
            y, sr = librosa.load(file_path)

            # Analyze
            tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
            chroma = librosa.feature.chroma_stft(y=y, sr=sr)

            return {
                'duration': len(y) / sr,
                'sample_rate': sr,
                'tempo': float(tempo),
                'beat_count': len(beats),
                'chroma_features': chroma.tolist(),
                'rms_energy': float(np.sqrt(np.mean(y ** 2))),
                'spectral_centroid': float(librosa.feature.spectral_centroid(y=y, sr=sr).mean()),
                'zero_crossing_rate': float(librosa.feature.zero_crossing_rate(y).mean())
            }

        except ImportError:
            raise ImportError("librosa is required for audio analysis")
        except Exception as e:
            logger.error(f"Audio analysis failed: {e}")
            raise

    @staticmethod
    def apply_effects(file_path: str, effects: List[Dict[str, Any]]) -> str:
        """Apply audio effects using librosa and soundfile"""
        try:
            import librosa
            import soundfile as sf
            import numpy as np

            # Load audio
            y, sr = librosa.load(file_path)

            # Apply effects
            for effect in effects:
                if effect['type'] == 'reverb':
                    y = AudioProcessingBridge._apply_reverb(y, sr, effect)
                elif effect['type'] == 'delay':
                    y = AudioProcessingBridge._apply_delay(y, sr, effect)
                elif effect['type'] == 'eq':
                    y = AudioProcessingBridge._apply_eq(y, sr, effect)

            # Save processed audio
            output_path = file_path.replace('.', '_processed.')
            sf.write(output_path, y.T, sr)

            return output_path

        except ImportError:
            raise ImportError("librosa and soundfile are required for audio processing")
        except Exception as e:
            logger.error(f"Audio processing failed: {e}")
            raise

    @staticmethod
    def _apply_reverb(y: np.ndarray, sr: int, params: Dict[str, Any]) -> np.ndarray:
        """Apply reverb effect"""
        # Simplified reverb implementation
        delay_samples = int(params.get('delay', 0.1) * sr)
        decay = params.get('decay', 0.5)

        # Create delayed version
        delayed = np.zeros_like(y)
        delayed[delay_samples:] = y[:-delay_samples] * decay

        return y + delayed

    @staticmethod
    def _apply_delay(y: np.ndarray, sr: int, params: Dict[str, Any]) -> np.ndarray:
        """Apply delay effect"""
        delay_time = params.get('time', 0.25)  # seconds
        feedback = params.get('feedback', 0.3)

        delay_samples = int(delay_time * sr)
        delayed = np.zeros_like(y)
        delayed[delay_samples:] = y[:-delay_samples] * feedback

        return y + delayed

    @staticmethod
    def _apply_eq(y: np.ndarray, sr: int, params: Dict[str, Any]) -> np.ndarray:
        """Apply EQ effect"""
        # Simplified EQ implementation
        freq_bands = params.get('bands', [60, 250, 1000, 4000, 10000])
        gains = params.get('gains', [0, 0, 0, 0, 0])

        # Apply simple gain adjustments
        return y * np.mean([10**(g/20) for g in gains])
```

### 3. Collaboration Server

#### **WebSocket Collaboration Server**
```python
# schillinger_python/collaboration_server.py
import asyncio
import websockets
import json
import logging
from typing import Dict, List, Set, Any
from datetime import datetime
from dataclasses import dataclass, asdict
import uuid

logger = logging.getLogger(__name__)

@dataclass
class CollaborativeOperation:
    """Represents a collaborative operation"""
    id: str
    type: str
    target_id: str
    target_type: str
    data: Dict[str, Any]
    user_id: str
    session_id: str
    timestamp: datetime

@dataclass
class CollaborationSession:
    """Represents a collaboration session"""
    id: str
    name: str
    participants: Dict[str, Dict[str, Any]]
    operations: List[CollaborativeOperation]
    created_at: datetime
    last_activity: datetime

class CollaborationServer:
    """WebSocket server for real-time collaboration"""

    def __init__(self, host: str = "localhost", port: int = 8765):
        self.host = host
        self.port = port
        self.sessions: Dict[str, CollaborationSession] = {}
        self.connections: Dict[str, websockets.WebSocketServerProtocol] = {}

    async def start(self):
        """Start the collaboration server"""
        logging.basicConfig(level=logging.INFO)

        server = await websockets.serve(
            self.handle_client,
            self.host,
            self.port
        )

        logger.info(f"Collaboration server started on {self.host}:{self.port}")
        await server.wait_closed()

    async def handle_client(self, websocket, path):
        """Handle incoming WebSocket connections"""
        client_id = str(uuid.uuid4())
        self.connections[client_id] = websocket

        try:
            await websocket.send(json.dumps({
                'type': 'connected',
                'client_id': client_id
            }))

            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.handle_message(client_id, data)
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({
                        'type': 'error',
                        'message': 'Invalid JSON'
                    }))
                except Exception as e:
                    logger.error(f"Error handling message from {client_id}: {e}")

        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client {client_id} disconnected")
        finally:
            if client_id in self.connections:
                del self.connections[client_id]

    async def handle_message(self, client_id: str, data: Dict[str, Any]):
        """Handle incoming messages from clients"""
        message_type = data.get('type')

        try:
            if message_type == 'join_session':
                await self.handle_join_session(client_id, data)
            elif message_type == 'leave_session':
                await self.handle_leave_session(client_id, data)
            elif message_type == 'operation':
                await self.handle_operation(client_id, data)
            elif message_type == 'create_session':
                await self.handle_create_session(client_id, data)
            elif message_type == 'get_session':
                await self.handle_get_session(client_id, data)
            else:
                logger.warning(f"Unknown message type: {message_type}")

        except Exception as e:
            logger.error(f"Error handling message from {client_id}: {e}")
            await self.send_error(client_id, str(e))

    async def handle_join_session(self, client_id: str, data: Dict[str, Any]):
        """Handle joining a collaboration session"""
        session_id = data.get('session_id')
        user_info = data.get('user_info', {})

        if session_id not in self.sessions:
            await self.send_error(client_id, f"Session {session_id} not found")
            return

        session = self.sessions[session_id]
        user_id = user_info.get('id', str(uuid.uuid4()))

        # Add user to session
        session.participants[user_id] = {
            **user_info,
            'client_id': client_id,
            'joined_at': datetime.now().isoformat()
        }

        session.last_activity = datetime.now()

        # Notify other participants
        await self.broadcast_to_session(session_id, {
            'type': 'user_joined',
            'user_id': user_id,
            'user_info': user_info
        }, exclude_client_id=client_id)

        # Send session data to joining user
        await self.send_to_client(client_id, {
            'type': 'session_joined',
            'session_id': session_id,
            'session': self._session_to_dict(session),
            'operations': [asdict(op) for op in session.operations]
        })

        logger.info(f"User {user_id} joined session {session_id}")

    async def handle_operation(self, client_id: str, data: Dict[str, Any]):
        """Handle a collaborative operation"""
        operation_data = data.get('operation')
        session_id = data.get('session_id')

        if session_id not in self.sessions:
            await self.send_error(client_id, f"Session {session_id} not found")
            return

        session = self.sessions[session_id]

        # Find user ID from client ID
        user_id = None
        for uid, info in session.participants.items():
            if info.get('client_id') == client_id:
                user_id = uid
                break

        if not user_id:
            await self.send_error(client_id, "Not joined session")
            return

        # Create operation
        operation = CollaborativeOperation(
            id=str(uuid.uuid4()),
            type=operation_data.get('type'),
            target_id=operation_data.get('targetId'),
            target_type=operation_data.get('targetType'),
            data=operation_data.get('data', {}),
            user_id=user_id,
            session_id=session_id,
            timestamp=datetime.now()
        )

        # Add to session operations
        session.operations.append(operation)
        session.last_activity = datetime.now()

        # Broadcast operation to all participants
        await self.broadcast_to_session(session_id, {
            'type': 'operation',
            'operation': asdict(operation)
        })

        logger.info(f"Operation {operation.type} in session {session_id} by {user_id}")

    async def handle_create_session(self, client_id: str, data: Dict[str, Any]):
        """Handle creating a new collaboration session"""
        session_name = data.get('name', 'Untitled Session')

        session_id = str(uuid.uuid4())
        session = CollaborationSession(
            id=session_id,
            name=session_name,
            participants={},
            operations=[],
            created_at=datetime.now(),
            last_activity=datetime.now()
        )

        self.sessions[session_id] = session

        await self.send_to_client(client_id, {
            'type': 'session_created',
            'session': self._session_to_dict(session)
        })

        logger.info(f"Created session {session_id}")

    async def broadcast_to_session(self, session_id: str, message: Dict[str, Any], exclude_client_id: str = None):
        """Broadcast message to all participants in a session"""
        if session_id not in self.sessions:
            return

        session = self.sessions[session_id]
        message_json = json.dumps(message)

        for user_id, participant in session.participants.items():
            client_id = participant.get('client_id')
            if client_id and client_id != exclude_client_id:
                if client_id in self.connections:
                    try:
                        await self.connections[client_id].send(message_json)
                    except Exception as e:
                        logger.error(f"Error broadcasting to {client_id}: {e}")

    async def send_to_client(self, client_id: str, message: Dict[str, Any]):
        """Send message to specific client"""
        if client_id in self.connections:
            try:
                await self.connections[client_id].send(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending to {client_id}: {e}")

    async def send_error(self, client_id: str, error_message: str):
        """Send error message to client"""
        await self.send_to_client(client_id, {
            'type': 'error',
            'message': error_message
        })

    def _session_to_dict(self, session: CollaborationSession) -> Dict[str, Any]:
        """Convert session to dictionary"""
        return {
            'id': session.id,
            'name': session.name,
            'participants': session.participants,
            'created_at': session.created_at.isoformat(),
            'last_activity': session.last_activity.isoformat(),
            'operation_count': len(session.operations)
        }
```

### 4. FastAPI Integration

#### **FastAPI Application**
```python
# main.py
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import asyncio
import json

from schillinger_python import SchillingerSDK, RhythmEngine, HarmonyEngine, CompositionPipeline
from schillinger_python.audio_export import AudioExportEngine, AudioExportOptions
from schillinger_python.collaboration_server import CollaborationServer

app = FastAPI(title="Schillinger SDK API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SDK
sdk = SchillingerSDK()
rhythm_engine = None
harmony_engine = None
composition_pipeline = None
audio_export_engine = None
collaboration_server = None

# Pydantic models
class RhythmRequest(BaseModel):
    time_signature: List[int] = [4, 4]
    duration: Optional[List[float]] = None
    subdivision: int = 1
    complexity: float = 0.5
    accent_pattern: Optional[List[int]] = None

class HarmonyRequest(BaseModel):
    key: str = "C major"
    length: int = 8
    complexity: float = 0.5
    style: str = "classical"

class CompositionRequest(BaseModel):
    name: str = "Untitled"
    tempo: int = 120
    key: str = "C major"
    duration: int = 32
    style: str = "classical"
    complexity: float = 0.5

class AudioExportRequest(BaseModel):
    composition: dict
    format: str  # wav, mp3, flac, etc.
    options: dict = {}

@app.on_event("startup")
async def startup_event():
    """Initialize SDK on startup"""
    global rhythm_engine, harmony_engine, composition_pipeline, audio_export_engine, collaboration_server

    try:
        await sdk.initialize()
        rhythm_engine = RhythmEngine(sdk)
        harmony_engine = HarmonyEngine(sdk)
        composition_pipeline = CompositionPipeline(sdk)
        audio_export_engine = AudioExportEngine(sdk)
        collaboration_server = CollaborationServer()

        # Start collaboration server in background
        asyncio.create_task(collaboration_server.start())

        print("Schillinger SDK initialized successfully")

    except Exception as e:
        print(f"Failed to initialize Schillinger SDK: {e}")
        raise

@app.get("/")
async def root():
    return {"message": "Schillinger SDK API", "version": "1.0.0"}

@app.post("/rhythm/generate")
async def generate_rhythm(request: RhythmRequest):
    """Generate a rhythm pattern"""
    try:
        pattern = await rhythm_engine.generate_pattern(
            time_signature=request.time_signature,
            duration=request.duration,
            subdivision=request.subdivision,
            complexity=request.complexity,
            accent_pattern=request.accent_pattern
        )

        return {"pattern": pattern.to_dict()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/harmony/generate")
async def generate_harmony(request: HarmonyRequest):
    """Generate a chord progression"""
    try:
        progression = await harmony_engine.generate_progression(
            key=request.key,
            length=request.length,
            complexity=request.complexity,
            style=request.style
        )

        return {"progression": progression.to_dict()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/composition/generate")
async def generate_composition(request: CompositionRequest):
    """Generate a complete composition"""
    try:
        composition = await composition_pipeline.generate_composition(
            name=request.name,
            tempo=request.tempo,
            key=request.key,
            duration=request.duration,
            style=request.style,
            complexity=request.complexity
        )

        return {"composition": composition.to_dict()}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/audio/export")
async def export_audio(request: AudioExportRequest):
    """Export composition to audio format"""
    try:
        # Prepare export options
        options = AudioExportOptions(
            format=request.options.get('format', 'wav'),
            sample_rate=request.options.get('sampleRate', 48000),
            bit_depth=request.options.get('bitDepth', 24),
            channels=request.options.get('channels', 2),
            quality=request.options.get('quality', 'high'),
            normalization=request.options.get('normalization', True),
            headroom=request.options.get('headroom', -3.0)
        )

        result = await audio_export_engine.export_audio(
            composition=request.composition,
            options=options
        )

        return {"export_result": result}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket endpoint for real-time collaboration"""
    await websocket.accept()

    try:
        # Store connection for broadcasting
        collaboration_server.connections[client_id] = websocket

        # Keep connection alive
        while True:
            try:
                message = await websocket.receive_text()
                data = json.loads(message)
                await collaboration_server.handle_message(client_id, data)
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"WebSocket error: {e}")
                break

    finally:
        if client_id in collaboration_server.connections:
            del collaboration_server.connections[client_id]

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "sdk_initialized": sdk.is_initialized,
        "collaboration_running": collaboration_server is not None
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## 🔧 **IMPLEMENTATION CHECKLIST**

### **Phase 1: Core Integration**
- [ ] Set up Python SDK wrapper with Node.js bridge
- [ ] Implement rhythm, harmony, and composition engines
- [ ] Create FastAPI application with proper error handling
- [ ] Add comprehensive logging and monitoring

### **Phase 2: Audio Processing**
- [ ] Install and configure audio processing libraries
- [ ] Implement audio export with progress tracking
- [ ] Add audio analysis and effects processing
- [ ] Handle different audio formats and quality settings

### **Phase 3: Collaboration**
- [ ] Set up WebSocket collaboration server
- [ ] Implement real-time operation broadcasting
- [ ] Create session management and user tracking
- [ ] Add conflict resolution and synchronization

### **Phase 4: Production Deployment**
- [ ] Docker containerization
- [ ] Load balancing and scaling
- [ ] Security and authentication
- - [ ] Monitoring and alerting

## 🚀 **PERFORMANCE TARGETS**

- **API Response Time**: <200ms for most operations
- **Audio Export**: Real-time with progress updates
- **Collaboration Latency**: <50ms for operation broadcasting
- **Memory Usage**: <500MB for typical workloads
- **Concurrent Users**: Support 100+ simultaneous collaborations

## 🐍 **ENVIRONMENT SETUP**

### **Development Environment**
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn websockets aiofiles pydantic
pip install librosa soundfile numpy

# Install Node.js (required for SDK bridge)
# Follow installation instructions for your platform

# Install Schillinger SDK
npm install -g @schillinger-sdk/core
```

### **Production Environment**
```dockerfile
# Dockerfile
FROM python:3.11-slim

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Schillinger SDK
RUN npm install -g @schillinger-sdk/core

# Copy application code
COPY . /app
WORKDIR /app

# Start application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

*This guide is specifically for the Python backend team integrating the new Schillinger SDK features into server-side applications and APIs.*