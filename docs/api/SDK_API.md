# White Room SDK API

**TypeScript SDK API reference for White Room.**

---

## Table of Contents

1. [Timeline API](#timeline-api)
2. [Projection Engine API](#projection-engine-api)
3. [Transport API](#transport-api)
4. [Mixing API](#mixing-api)
5. [Instrument API](#instrument-api)
6. [File I/O API](#file-io-api)

---

## Timeline API

### Project Management

**`createProject(options: ProjectOptions): Project`**

Creates a new White Room project.

```typescript
interface ProjectOptions {
  name: string;
  tempo: number;           // 20-300 BPM
  timeSignature: [number, number];  // [numerator, denominator]
  keySignature: string;    // "C major", "A minor", etc.
  sampleRate: number;      // 44100, 48000, 96000
}

const project = createProject({
  name: "My Song",
  tempo: 120,
  timeSignature: [4, 4],
  keySignature: "C major",
  sampleRate: 44100
});
```

**`openProject(path: string): Project`**

Opens an existing project from disk.

```typescript
const project = openProject("/path/to/project.wrp");
```

**`saveProject(project: Project, path?: string): void`**

Saves a project to disk.

```typescript
saveProject(project);  // Save to existing path
saveProject(project, "/new/path.wrp");  // Save as
```

### Track Management

**`addTrack(project: Project, type: TrackType): Track`**

Adds a new track to the project.

```typescript
enum TrackType {
  SoftwareInstrument,
  Audio,
  MIDI,
  Bus,
  Master
}

const track = addTrack(project, TrackType.SoftwareInstrument);
track.name = "Piano";
```

**`removeTrack(project: Project, trackId: string): void`**

Removes a track from the project.

```typescript
removeTrack(project, track.id);
```

**`getTrack(project: Project, trackId: string): Track | null`**

Retrieves a track by ID.

```typescript
const track = getTrack(project, trackId);
if (track) {
  console.log(track.name);
}
```

### Region Management

**`addRegion(track: Track, region: Region): void`**

Adds a region to a track.

```typescript
interface Region {
  id: string;
  start: number;          // Start position in ticks
  duration: number;       // Duration in ticks
  content: RegionContent; // MIDI or audio content
}

const region: Region = {
  id: "region-1",
  start: 0,
  duration: 1920,         // 1 bar at 120 BPM, 4/4
  content: midiContent
};
addRegion(track, region);
```

**`removeRegion(track: Track, regionId: string): void`**

Removes a region from a track.

```typescript
removeRegion(track, region.id);
```

**`splitRegion(region: Region, position: number): Region[]`**

Splits a region at a specific position.

```typescript
const [left, right] = splitRegion(region, 960);
```

---

## Projection Engine API

### Time Projection

**`projectTime(time: number, fromScale: TimeScale, toScale: TimeScale): number`**

Projects time from one scale to another.

```typescript
enum TimeScale {
  Ticks,
  Seconds,
  Milliseconds,
  Samples
}

// Convert 1 bar (1920 ticks) to seconds at 120 BPM
const seconds = projectTime(1920, TimeScale.Ticks, TimeScale.Seconds);
console.log(seconds);  // 2.0 seconds
```

**`projectRegion(region: Region, fromTempo: number, toTempo: number): Region`**

Projects a region from one tempo to another (time stretching).

```typescript
const stretchedRegion = projectRegion(region, 120, 140);
// Region slows down from 120 BPM to 140 BPM
```

### Pitch Projection

**`projectPitch(note: number, fromKey: string, toKey: string): number`**

Transposes a note from one key to another.

```typescript
// Transpose C4 (60) from C major to D major
const transposed = projectPitch(60, "C major", "D major");
console.log(transposed);  // 62 (D4)
```

**`projectScale(notes: number[], fromScale: Scale, toScale: Scale): number[]`**

Projects a melody from one scale to another.

```typescript
interface Scale {
  root: number;      // MIDI note number (0-127)
  intervals: number[];  // Scale intervals (semitones)
}

const cMajor: Scale = { root: 60, intervals: [0, 2, 4, 5, 7, 9, 11] };
const dMajor: Scale = { root: 62, intervals: [0, 2, 4, 5, 7, 9, 11] };

const melody = [60, 62, 64, 65, 67];  // C major scale
const transposed = projectScale(melody, cMajor, dMajor);
console.log(transposed);  // [62, 64, 66, 67, 69] (D major)
```

---

## Transport API

### Playback Control

**`play(engine: AudioEngine): void`**

Starts playback from the current playhead position.

```typescript
play(engine);
```

**`pause(engine: AudioEngine): void`**

Pauses playback, maintaining current position.

```typescript
pause(engine);
```

**`stop(engine: AudioEngine): void`**

Stops playback and returns to the start position.

```typescript
stop(engine);
```

**`togglePlay(engine: AudioEngine): void`**

Toggles between play and pause.

```typescript
togglePlay(engine);
```

### Position Control

**`setPosition(engine: AudioEngine, position: number): void`**

Sets the playhead position (in ticks).

```typescript
setPosition(engine, 1920);  // Jump to 1 bar
```

**`getPosition(engine: AudioEngine): number`**

Gets the current playhead position (in ticks).

```typescript
const position = getPosition(engine);
console.log(`Current position: ${position} ticks`);
```

**`moveToStart(engine: AudioEngine): void`**

Jumps to the start of the project.

```typescript
moveToStart(engine);
```

**`moveToEnd(engine: AudioEngine): void`**

Jumps to the end of the project.

```typescript
moveToEnd(engine);
```

### Loop Control

**`setLoopStart(engine: AudioEngine, position: number): void`**

Sets the loop start position.

```typescript
setLoopStart(engine, 0);  // Loop from start
```

**`setLoopEnd(engine: AudioEngine, position: number): void`**

Sets the loop end position.

```typescript
setLoopEnd(engine, 7680);  // Loop to 4 bars
```

**`enableLoop(engine: AudioEngine, enabled: boolean): void`**

Enables or disables loop playback.

```typescript
enableLoop(engine, true);
```

---

## Mixing API

### Channel Strip

**`setVolume(track: Track, volume: number): void`**

Sets the track volume (0.0 to 1.0, where 1.0 = 0 dB).

```typescript
setVolume(track, 0.8);  // -2 dB
```

**`getVolume(track: Track): number`**

Gets the current track volume.

```typescript
const volume = getVolume(track);
```

**`setPan(track: Track, pan: number): void`**

Sets the stereo pan (-1.0 = left, 0.0 = center, 1.0 = right).

```typescript
setPan(track, -0.5);  // Pan left
```

**`getPan(track: Track): number`**

Gets the current stereo pan position.

```typescript
const pan = getPan(track);
```

**`setMute(track: Track, muted: boolean): void`**

Mutes or unmutes a track.

```typescript
setMute(track, true);
```

**`setSolo(track: Track, soloed: boolean): void`**

Solos or unsolos a track.

```typescript
setSolo(track, true);
```

### Effects

**`addInsert(track: Track, effect: Effect): void`**

Adds an insert effect to a track.

```typescript
interface Effect {
  type: EffectType;
  parameters: Map<string, number>;
}

enum EffectType {
  Compressor,
  EQ,
  Reverb,
  Delay,
  Chorus
}

const compressor: Effect = {
  type: EffectType.Compressor,
  parameters: new Map([
    ["threshold", -20],
    ["ratio", 4],
    ["attack", 5],
    ["release", 50]
  ])
};
addInsert(track, compressor);
```

**`removeInsert(track: Track, effectId: string): void`**

Removes an insert effect from a track.

```typescript
removeInsert(track, effect.id);
```

**`setEffectParameter(effect: Effect, parameter: string, value: number): void`**

Sets an effect parameter.

```typescript
setEffectParameter(compressor, "threshold", -15);
```

### Sends

**`addSend(track: Track, bus: Track, amount: number): void`**

Adds a send effect to a track.

```typescript
const reverbBus = getTrack(project, "reverb-bus");
addSend(track, reverbBus, 0.5);  // Send 50% to reverb
```

**`setSendAmount(track: Track, bus: Track, amount: number): void`**

Sets the send amount.

```typescript
setSendAmount(track, reverbBus, 0.7);
```

---

## Instrument API

### Instrument Selection

**`setInstrument(track: Track, instrument: Instrument): void`**

Assigns an instrument to a track.

```typescript
interface Instrument {
  name: string;
  type: InstrumentType;
  preset?: string;
}

enum InstrumentType {
  BuiltIn,
  AU,
  VST3,
  CLAP
}

const piano: Instrument = {
  name: "Grand Piano",
  type: InstrumentType.BuiltIn,
  preset: "Steinway D"
};
setInstrument(track, piano);
```

**`getInstrument(track: Track): Instrument | null`**

Gets the current instrument assigned to a track.

```typescript
const instrument = getInstrument(track);
if (instrument) {
  console.log(`Playing: ${instrument.name}`);
}
```

### Note Playback

**`playNote(engine: AudioEngine, track: Track, note: number, velocity: number): void`**

Plays a note on a track.

```typescript
playNote(engine, track, 60, 127);  // Play C4 at max velocity
```

**`stopNote(engine: AudioEngine, track: Track, note: number): void`**

Stops a note on a track.

```typescript
stopNote(engine, track, 60);  // Stop C4
```

**`allNotesOff(engine: AudioEngine, track: Track): void`**

Stops all playing notes on a track.

```typescript
allNotesOff(engine, track);
```

---

## File I/O API

### Import

**`importAudioFile(path: string): AudioRegion`**

Imports an audio file as a region.

```typescript
const region = importAudioFile("/path/to/audio.wav");
region.start = 0;
region.duration = calculateDuration(region);
addRegion(track, region);
```

**`importMIDIFile(path: string): MIDIRegion`**

Imports a MIDI file as a region.

```typescript
const region = importMIDIFile("/path/to/midi.mid");
addRegion(track, region);
```

### Export

**`exportAudio(project: Project, options: ExportOptions): void`**

Exports the project as an audio file.

```typescript
interface ExportOptions {
  format: "wav" | "aiff" | "flac" | "mp3";
  sampleRate: number;
  bitDepth: 16 | 24 | 32;
  startTime: number;
  endTime: number;
  normalize: boolean;
}

exportAudio(project, {
  format: "wav",
  sampleRate: 44100,
  bitDepth: 24,
  startTime: 0,
  endTime: 7680,
  normalize: true
});
```

**`exportMIDI(project: Project, path: string): void`**

Exports the project as a MIDI file.

```typescript
exportMIDI(project, "/path/to/export.mid");
```

**`exportStems(project: Project, directory: string): void`**

Exports each track as a separate audio file.

```typescript
exportStems(project, "/path/to/stems/");
// Creates: track-1.wav, track-2.wav, etc.
```

---

**Last Updated**: January 16, 2026
**Version**: 1.0.0
**Next**: [Swift API](SWIFT_API.md)

---

*For TypeScript type definitions, see `/sdk/src/types/`*
