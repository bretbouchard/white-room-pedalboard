# Schillinger SDK Integration Guide

Platform-specific integration guides for the Schillinger SDK.

## Table of Contents

- [Platform Support](#platform-support)
- [Node.js Integration](#nodejs-integration)
- [Web Browser Integration](#web-browser-integration)
- [React Integration](#react-integration)
- [Dart/Flutter Integration](#dartflutter-integration)
- [FFI Integration](#ffi-integration)
- [Audio Layer Integration](#audio-layer-integration)
- [Testing Integration](#testing-integration)

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| Node.js 18+ | ✅ Full support | Primary target |
| Web browsers | ✅ Full support | Modern browsers with ES2022+ |
| React | ✅ Full support | React 18+ with hooks |
| Dart/Flutter | 🚧 In development | Via FFI bridge |
| Python | 📋 Planned | Via FFI bridge |

## Node.js Integration

### Installation

```bash
npm install @schillinger-sdk/core-v1
```

### Basic Setup

```typescript
import { SchillingerSong_v1, realize, reconcile } from '@schillinger-sdk/core-v1';

async function main() {
  const song: SchillingerSong_v1 = {
    // ... theory definition
  };

  const { songModel } = await realize(song, 12345);
  console.log(`Generated ${songModel.notes.length} notes`);
}

main();
```

### Performance Considerations

- Use `worker_threads` for parallel realization
- Enable derivation records only when needed
- Cache realized models for replay

**Example with Worker Threads:**

```typescript
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';

if (isMainThread) {
  // Main thread: spawn workers
  const worker = new Worker(__filename, {
    workerData: { song: mySong, seed: 12345 }
  });

  worker.on('message', (result) => {
    console.log('Realization complete:', result);
  });
} else {
  // Worker thread: perform realization
  const { song, seed } = workerData;
  const result = await realize(song, seed);
  parentPort?.postMessage(result);
}
```

### File I/O

**Save Theory to JSON:**

```typescript
import fs from 'fs/promises';

await fs.writeFile(
  'song-theory.json',
  JSON.stringify(song, null, 2)
);
```

**Load Theory from JSON:**

```typescript
import { SchillingerSong_v1 } from '@schillinger-sdk/core-v1';

const data = await fs.readFile('song-theory.json', 'utf-8');
const song: SchillingerSong_v1 = JSON.parse(data);
```

**Export Realized Model to MIDI:**

```typescript
import { exportToMidi } from '@schillinger-sdk/core-v1';
import fs from 'fs';

const midiBuffer = exportToMidi(songModel);
fs.writeFileSync('song.mid', midiBuffer);
```

## Web Browser Integration

### Installation

```bash
npm install @schillinger-sdk/core-v1
```

### Bundling with Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    polyfillDynamicImport: false
  },
  optimizeDeps: {
    exclude: ['@schillinger-sdk/core-v1']
  }
});
```

### Basic Usage

```typescript
import { SchillingerSong_v1, realize } from '@schillinger-sdk/core-v1';

async function generateSong() {
  const song: SchillingerSong_v1 = {
    // ... theory definition
  };

  const { songModel } = await realize(song, 12345);
  return songModel;
}
```

### Web Audio API Integration

```typescript
import { SongModel_v1 } from '@schillinger-sdk/core-v1';

async function playSong(songModel: SongModel_v1) {
  const audioContext = new AudioContext();

  for (const note of songModel.notes) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 440 * Math.pow(2, (note.pitch - 69) / 12);
    oscillator.start(note.startBeat * (60 / songModel.tempo));
    oscillator.stop((note.startBeat + note.durationBeats) * (60 / songModel.tempo));
  }
}
```

### Service Worker for Caching

```typescript
// sw.ts
import { realize } from '@schillinger-sdk/core-v1';

self.addEventListener('message', async (event) => {
  const { song, seed } = event.data;
  const result = await realize(song, seed);
  self.postMessage(result);
});
```

## React Integration

### Installation

```bash
npm install @schillinger-sdk/core-v1
```

### Hook for Realization

```typescript
import { useState, useCallback } from 'react';
import { SchillingerSong_v1, realize, SongModel_v1 } from '@schillinger-sdk/core-v1';

export function useRealization() {
  const [isRealizing, setIsRealizing] = useState(false);
  const [songModel, setSongModel] = useState<SongModel_v1 | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const realizeSong = useCallback(async (song: SchillingerSong_v1, seed: number) => {
    setIsRealizing(true);
    setError(null);

    try {
      const result = await realize(song, seed);
      setSongModel(result.songModel);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsRealizing(false);
    }
  }, []);

  return { isRealizing, songModel, error, realizeSong };
}
```

### React Component

```typescript
import { useRealization } from './useRealization';
import { SchillingerSong_v1 } from '@schillinger-sdk/core-v1';

function SongGenerator() {
  const { isRealizing, songModel, error, realizeSong } = useRealization();

  const handleGenerate = async () => {
    const song: SchillingerSong_v1 = {
      // ... theory definition
    };

    await realizeSong(song, 12345);
  };

  return (
    <div>
      <button onClick={handleGenerate} disabled={isRealizing}>
        {isRealizing ? 'Generating...' : 'Generate Song'}
      </button>

      {error && <div>Error: {error.message}</div>}

      {songModel && (
        <div>
          <h2>Generated Song</h2>
          <p>Notes: {songModel.notes.length}</p>
          <p>Duration: {songModel.durationBars} bars</p>
        </div>
      )}
    </div>
  );
}
```

### Next.js Integration

```typescript
// pages/api/generate.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { SchillingerSong_v1, realize } from '@schillinger-sdk/core-v1';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { song, seed } = req.body;

  try {
    const { songModel } = await realize(song, seed);
    res.status(200).json(songModel);
  } catch (error) {
    res.status(500).json({ error: 'Realization failed' });
  }
}
```

## Dart/Flutter Integration

The SDK provides a Dart FFI bridge for Flutter apps.

### Installation

```yaml
# pubspec.yaml
dependencies:
  schillinger_sdk:
    path: ../sdk/packages/dart
```

### Basic Usage

```dart
import 'package:schillinger_sdk/schillinger_sdk.dart';

Future<void> main() async {
  // Create theory
  final song = SchillingerSong(
    schemaVersion: '1.0',
    songId: Uuid().v4(),
    // ... theory parameters
  );

  // Realize
  final result = await realize(song, seed: 12345);

  print('Generated ${result.songModel.notes.length} notes');
}
```

### Flutter Widget

```dart
class SongGenerator extends StatefulWidget {
  @override
  _SongGeneratorState createState() => _SongGeneratorState();
}

class _SongGeneratorState extends State<SongGenerator> {
  SongModel? _songModel;
  bool _isRealizing = false;

  Future<void> _generateSong() async {
    setState(() => _isRealizing = true);

    try {
      final song = SchillingerSong(/* ... */);
      final result = await realize(song, seed: 12345);
      setState(() => _songModel = result.songModel);
    } finally {
      setState(() => _isRealizing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ElevatedButton(
          onPressed: _isRealizing ? null : _generateSong,
          child: Text(_isRealizing ? 'Generating...' : 'Generate'),
        ),
        if (_songModel != null)
          Text('Generated ${_songModel!.notes.length} notes'),
      ],
    );
  }
}
```

## FFI Integration

The SDK provides FFI bridges for:

- **JUCE** (C++) - Desktop audio engines
- **PureDSP** (C) - Embedded systems
- **Python** - Data science workflows

### JUCE FFI

**C++ Side (JUCE Plugin):**

```cpp
// JuceFFI.cpp
#include "JuceFFI.h"

extern "C" {
  // Realize song
  char* realize_song(const char* theory_json, int seed) {
    auto theory = nlohmann::json::parse(theory_json);
    auto result = schillinger::realize(theory, seed);
    return strdup(result.dump().c_str());
  }

  // Free memory
  void free_string(char* str) {
    free(str);
  }
}
```

**TypeScript Side:**

```typescript
import { realize } from '@schillinger-sdk/core-v1';
import { ffi } from 'ffi-napi';

const lib = ffi.Library('schillinger_ffi', {
  'realize_song': ['string', ['string', 'int']],
  'free_string': ['void', ['string']]
});

async function realizeWithFFI(song: SchillingerSong_v1, seed: number) {
  const theoryJson = JSON.stringify(song);
  const resultJson = lib.realize_song(theoryJson, seed);
  const result = JSON.parse(resultJson);
  lib.free_string(resultJson);
  return result;
}
```

### Python FFI

**Python Side:**

```python
import ctypes
import json

# Load FFI library
schillinger = ctypes.CDLL('./libschillinger.so')

# Define function signatures
schillinger.realize_song.restype = ctypes.c_char_p
schillinger.realize_song.argtypes = [ctypes.c_char_p, ctypes.c_int]

schillinger.free_string.restype = None
schillinger.free_string.argtypes = [ctypes.c_char_p]

def realize_song(song, seed):
    theory_json = json.dumps(song).encode('utf-8')
    result_json = schillinger.realize_song(theory_json, seed)
    result = json.loads(result_json.decode('utf-8'))
    schillinger.free_string(result_json)
    return result

# Usage
song = {"schemaVersion": "1.0", "songId": "..."}
result = realize_song(song, 12345)
print(f"Generated {len(result['notes'])} notes")
```

## Audio Layer Integration

The SDK generates note data but doesn't play audio directly. Integrate with audio engines:

### Web Audio API

```typescript
import { SongModel_v1 } from '@schillinger-sdk/core-v1';

function playWithWebAudio(songModel: SongModel_v1) {
  const audioContext = new AudioContext();
  const nextNoteTime = audioContext.currentTime;

  songModel.notes.forEach(note => {
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.connect(gain);
    gain.connect(audioContext.destination);

    const startTime = nextNoteTime + note.startBeat * (60 / songModel.tempo);
    const duration = note.durationBeats * (60 / songModel.tempo);

    osc.frequency.value = 440 * Math.pow(2, (note.pitch - 69) / 12);
    gain.gain.setValueAtTime(0.5, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}
```

### Tone.js Integration

```typescript
import * as Tone from 'tone';
import { SongModel_v1 } from '@schillinger-sdk/core-v1';

async function playWithTone(songModel: SongModel_v1) {
  await Tone.start();

  const synth = new Tone.PolySynth(Tone.Synth).toDestination();

  const now = Tone.now();
  songModel.notes.forEach(note => {
    const startTime = now + note.startBeat * (60 / songModel.tempo);
    const duration = note.durationBeats * (60 / songModel.tempo);

    synth.triggerAttackRelease(
      Tone.Frequency(note.pitch, 'midi').toFrequency(),
      duration,
      startTime
    );
  });
}
```

### Max/MSP Integration

```javascript
// Max/MSP external
#include "ext.h"
#include "ext_obex.h"

void schillinger_realize(t_symbol *s, long argc, t_atom *argv) {
    // Parse theory from Max message
    // Call SDK realize function
    // Output notes as Max list

    // Output: note1_pitch note1_start note1_duration note2_pitch...
}
```

## Testing Integration

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { SchillingerSong_v1, realize, validate } from '@schillinger-sdk/core-v1';

describe('Song Realization', () => {
  it('should generate notes deterministically', async () => {
    const song: SchillingerSong_v1 = {
      // ... theory definition
    };

    const seed = 12345;
    const result1 = await realize(song, seed);
    const result2 = await realize(song, seed);

    expect(result1.songModel).toEqual(result2.songModel);
  });

  it('should validate theory', async () => {
    const song: SchillingerSong_v1 = {
      // ... theory definition
    };

    const result = await validate(song);
    expect(result.valid).toBe(true);
  });
});
```

### Integration Tests

```typescript
import { describe, it, expect } from 'vitest';
import { SchillingerSong_v1, realize, reconcile } from '@schillinger-sdk/core-v1';

describe('Round-Trip Editing', () => {
  it('should reconcile edits with high confidence', async () => {
    const song: SchillingerSong_v1 = { /* ... */ };
    const { songModel } = await realize(song, 12345);

    // Edit notes
    songModel.notes[0].velocity = 127;
    songModel.notes[1].pitch += 2;

    // Reconcile
    const report = await reconcile(song, songModel);

    expect(report.confidenceSummary.overall).toBeGreaterThan(0.8);
  });
});
```

### Performance Tests

```typescript
import { describe, it, expect } from 'vitest';
import { SchillingerSong_v1, realize } from '@schillinger-sdk/core-v1';

describe('Performance', () => {
  it('should realize 5-minute song in <10s', async () => {
    const song: SchillingerSong_v1 = {
      // ... 300 bars of music
    };

    const start = performance.now();
    await realize(song, 12345);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(10000); // 10 seconds
  });
});
```

## Best Practices

### Error Handling

```typescript
import {
  ErrorHandler,
  withErrorHandling,
  WhiteRoomError
} from '@schillinger-sdk/core-v1';

const handler = new ErrorHandler({
  enableLogging: true,
  enableRecovery: true
});

try {
  const result = await realize(song, seed);
} catch (error) {
  if (error instanceof WhiteRoomError) {
    console.error(`[${error.severity}] ${error.code}: ${error.message}`);
  }
  throw error;
}
```

### Determinism Testing

```typescript
// Always test determinism
function assertDeterminism(song: SchillingerSong_v1, seed: number) {
  const results = Promise.all([
    realize(song, seed),
    realize(song, seed),
    realize(song, seed)
  ]);

  results.forEach(({ songModel }) => {
    expect(songModel).toEqual(results[0].songModel);
  });
}
```

### Memory Management

```typescript
// For large songs, process in chunks
async function realizeLargeSong(song: SchillingerSong_v1, seed: number) {
  const chunkSize = 100; // bars

  for (let offset = 0; offset < song.durationBars; offset += chunkSize) {
    const chunk = extractChunk(song, offset, chunkSize);
    const result = await realize(chunk, seed + offset);
    // Process chunk...
  }
}
```

## Troubleshooting

### Common Issues

**Issue**: Realization is slow
- **Solution**: Disable derivation records if not needed
- **Solution**: Use worker threads for parallel processing

**Issue**: Low reconciliation confidence
- **Solution**: Edit in smaller batches
- **Solution**: Avoid conflicting edits

**Issue**: Browser CORS errors
- **Solution**: Ensure proper CORS configuration for API endpoints

### Debug Logging

```typescript
import { setLogLevel, LogLevel } from '@schillinger-sdk/core-v1';

setLogLevel(LogLevel.DEBUG);

// Now all SDK operations will log debug information
const result = await realize(song, seed);
```

## Next Steps

- Explore [API documentation](api.md)
- Try the [examples](docs/examples/)
- Read the [quickstart guide](quickstart.md)
