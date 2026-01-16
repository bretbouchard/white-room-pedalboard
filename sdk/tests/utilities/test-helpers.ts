/**
 * Test Helpers for Schillinger SDK
 *
 * Utility functions for testing, including assertions, mocks, and test runners.
 */

import { validateSongState, SongModel, SchillingerSong, PerformanceState } from '@schillinger-sdk/schemas';

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Asserts that a value is a valid SongState
 */
export function assertValidSongState(state: unknown, message = 'Expected valid SongState'): void {
  try {
    const result = validateSongState(state);
    if (!result) {
      throw new Error(message);
    }
  } catch (error) {
    throw new Error(`${message}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Asserts that a value is NOT a valid SongState
 */
export function assertInvalidSongState(state: unknown, message = 'Expected invalid SongState'): void {
  try {
    const result = validateSongState(state);
    if (result) {
      throw new Error(message);
    }
  } catch (error) {
    // Expected - validation should throw
    return;
  }
  throw new Error(message);
}

/**
 * Asserts that two arrays contain the same elements (order-independent)
 */
export function assertArrayEqualIgnoringOrder<T>(
  actual: T[],
  expected: T[],
  message = 'Arrays should be equal (ignoring order)'
): void {
  const actualSorted = [...actual].sort();
  const expectedSorted = [...expected].sort();

  if (actualSorted.length !== expectedSorted.length) {
    throw new Error(
      `${message}: length mismatch (actual: ${actualSorted.length}, expected: ${expectedSorted.length})`
    );
  }

  for (let i = 0; i < actualSorted.length; i++) {
    if (actualSorted[i] !== expectedSorted[i]) {
      throw new Error(
        `${message}: element mismatch at index ${i} (actual: ${JSON.stringify(actualSorted[i])}, expected: ${JSON.stringify(expectedSorted[i])})`
      );
    }
  }
}

/**
 * Asserts that all notes in a SongModel are sorted by startTime
 */
export function assertNotesSorted(songModel: SongModel): void {
  const notes = songModel.notes;
  for (let i = 1; i < notes.length; i++) {
    if (notes[i].startTime < notes[i - 1].startTime) {
      throw new Error(
        `Notes not sorted: note ${i} (startTime: ${notes[i].startTime}) comes before note ${i - 1} (startTime: ${notes[i - 1].startTime})`
      );
    }
  }
}

/**
 * Asserts that note timing is consistent with tempo and time signature
 */
export function assertNoteTimingConsistency(songModel: SongModel): void {
  const { tempo, timeSignature, notes } = songModel;
  const [numerator, denominator] = timeSignature;

  // Calculate samples per beat
  const samplesPerBeat = (60 / tempo) * songModel.sampleRate;
  const samplesPerBar = samplesPerBeat * numerator;

  notes.forEach((note, i) => {
    // Check that note start time is aligned to beat grid (with small tolerance for rounding)
    const beatPosition = note.startTime / samplesPerBeat;
    const beatFraction = beatPosition % 1;

    if (beatFraction > 0.01 && beatFraction < 0.99) {
      throw new Error(
        `Note ${i} (id: ${note.id}) not aligned to beat grid: startTime=${note.startTime}, beatPosition=${beatPosition.toFixed(2)}`
      );
    }

    // Check that note duration is a multiple of beat grid
    const durationBeats = note.duration / samplesPerBeat;
    const durationFraction = durationBeats % 1;

    if (durationFraction > 0.01 && durationFraction < 0.99) {
      console.warn(
        `Note ${i} (id: ${note.id}) duration not aligned to beat grid: duration=${note.duration}, beats=${durationBeats.toFixed(2)}`
      );
    }
  });
}

/**
 * Asserts that all voice IDs in a SongModel are valid references
 */
export function assertVoiceIdsValid(songModel: SongModel): void {
  const validVoiceIds = new Set(songModel.voiceAssignments.map(va => va.voiceId));

  songModel.notes.forEach((note, i) => {
    if (!validVoiceIds.has(note.voiceId)) {
      throw new Error(
        `Note ${i} (id: ${note.id}) references invalid voiceId: ${note.voiceId}`
      );
    }
  });
}

/**
 * Asserts that performance state is valid
 */
export function assertPerformanceValid(performance: PerformanceState): void {
  if (!performance.id || typeof performance.id !== 'string') {
    throw new Error('Performance must have valid id');
  }

  if (!performance.name || typeof performance.name !== 'string') {
    throw new Error('Performance must have valid name');
  }

  if (performance.density < 0 || performance.density > 1) {
    throw new Error(`Performance density must be between 0 and 1, got ${performance.density}`);
  }

  // Check that mix target gains are reasonable (-60 to 0 dB)
  Object.values(performance.mixTargets).forEach((target, i) => {
    if (target.gain < -60 || target.gain > 0) {
      throw new Error(
        `Mix target ${i} gain out of range: ${target.gain} (expected -60 to 0 dB)`
      );
    }

    if (target.pan < -1 || target.pan > 1) {
      throw new Error(
        `Mix target ${i} pan out of range: ${target.pan} (expected -1 to 1)`
      );
    }
  });
}

/**
 * Asserts that timeline sections are contiguous and cover the entire duration
 */
export function assertTimelineCoverage(songModel: SongModel): void {
  const { timeline, duration } = songModel;
  const { sections } = timeline;

  if (sections.length === 0) {
    throw new Error('Timeline must have at least one section');
  }

  // Check that sections are sorted by startTime
  for (let i = 1; i < sections.length; i++) {
    if (sections[i].startTime < sections[i - 1].startTime) {
      throw new Error(
        `Sections not sorted: section ${i} (startTime: ${sections[i].startTime}) comes before section ${i - 1} (startTime: ${sections[i - 1].startTime})`
      );
    }
  }

  // Check that first section starts at 0
  if (sections[0].startTime !== 0) {
    throw new Error(`First section must start at 0, got ${sections[0].startTime}`);
  }

  // Check that sections are contiguous (no gaps)
  for (let i = 1; i < sections.length; i++) {
    const expectedStartTime = sections[i - 1].startTime + sections[i - 1].duration;
    if (sections[i].startTime !== expectedStartTime) {
      throw new Error(
        `Gap between sections ${i - 1} and ${i}: expected startTime ${expectedStartTime}, got ${sections[i].startTime}`
      );
    }
  }

  // Check that last section ends at duration
  const lastSection = sections[sections.length - 1];
  const expectedDuration = lastSection.startTime + lastSection.duration;
  if (Math.abs(duration - expectedDuration) > 1) {
    throw new Error(
      `Timeline duration mismatch: expected ${expectedDuration}, got ${duration}`
    );
  }
}

// =============================================================================
// PERFORMANCE MEASUREMENT
// =============================================================================

export interface PerformanceMeasurement {
  name: string;
  duration: number;
  memory: NodeJS.MemoryUsage;
}

const performanceMeasurements: PerformanceMeasurement[] = [];

/**
 * Measure execution time and memory for a function
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<{ result: T; measurement: PerformanceMeasurement }> {
  const memoryBefore = process.memoryUsage();
  const startTime = performance.now();

  try {
    const result = await fn();
    const endTime = performance.now();
    const memoryAfter = process.memoryUsage();

    const measurement: PerformanceMeasurement = {
      name,
      duration: endTime - startTime,
      memory: {
        rss: memoryAfter.rss - memoryBefore.rss,
        heapTotal: memoryAfter.heapTotal - memoryBefore.heapTotal,
        heapUsed: memoryAfter.heapUsed - memoryBefore.heapUsed,
        external: memoryAfter.external - memoryBefore.external,
        arrayBuffers: memoryAfter.arrayBuffers - memoryBefore.arrayBuffers,
      },
    };

    performanceMeasurements.push(measurement);

    return { result, measurement };
  } catch (error) {
    const endTime = performance.now();
    const measurement: PerformanceMeasurement = {
      name,
      duration: endTime - startTime,
      memory: memoryBefore,
    };
    performanceMeasurements.push(measurement);
    throw error;
  }
}

/**
 * Get all performance measurements
 */
export function getPerformanceMeasurements(): PerformanceMeasurement[] {
  return [...performanceMeasurements];
}

/**
 * Clear performance measurements
 */
export function clearPerformanceMeasurements(): void {
  performanceMeasurements.length = 0;
}

/**
 * Assert that a function completes within a time limit
 */
export async function assertCompletesWithin<T>(
  ms: number,
  fn: () => T | Promise<T>,
  message = `Function should complete within ${ms}ms`
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - startTime;

    if (duration > ms) {
      throw new Error(
        `${message}: took ${duration.toFixed(2)}ms (expected <= ${ms}ms)`
      );
    }

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    if (duration > ms) {
      throw new Error(
        `${message}: took ${duration.toFixed(2)}ms (expected <= ${ms}ms)`
      );
    }
    throw error;
  }
}

// =============================================================================
// MOCK OBJECTS
// =============================================================================

/**
 * Create a mock PRNG for deterministic testing
 */
export function createMockPRNG(seed: number) {
  let currentSeed = seed;
  return {
    next(): number {
      currentSeed = (currentSeed * 1103515245 + 12345) & 0x7fffffff;
      return currentSeed / 0x7fffffff;
    },
    nextInt(min: number, max: number): number {
      return Math.floor(this.next() * (max - min + 1)) + min;
    },
    nextFloat(min: number, max: number): number {
      return this.next() * (max - min) + min;
    },
    reset(newSeed: number): void {
      currentSeed = newSeed;
    },
    getSeed(): number {
      return currentSeed;
    },
  };
}

/**
 * Create a mock audio buffer for testing
 */
export function createMockAudioBuffer(
  duration: number,
  channelCount: number = 2,
  sampleRate: number = 44100
): Float32Array[] {
  const length = Math.floor(duration * sampleRate);
  return Array.from({ length: channelCount }, () => {
    const buffer = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      buffer[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.1;
    }
    return buffer;
  });
}

/**
 * Create a mock MIDI event for testing
 */
export interface MockMidiEvent {
  deltaTime: number;
  type: 'noteOn' | 'noteOff' | 'controlChange' | 'pitchBend';
  channel: number;
  noteNumber?: number;
  velocity?: number;
  controllerNumber?: number;
  controllerValue?: number;
  pitchBendValue?: number;
}

export function createMockMidiNoteOn(
  channel: number,
  noteNumber: number,
  velocity: number,
  deltaTime: number = 0
): MockMidiEvent {
  return {
    deltaTime,
    type: 'noteOn',
    channel,
    noteNumber,
    velocity,
  };
}

export function createMockMidiNoteOff(
  channel: number,
  noteNumber: number,
  deltaTime: number = 0
): MockMidiEvent {
  return {
    deltaTime,
    type: 'noteOff',
    channel,
    noteNumber,
    velocity: 0,
  };
}

// =============================================================================
// TEST DATA GENERATORS
// =============================================================================

/**
 * Generate random test data with seed
 */
export function generateRandomTestData(seed: number, size: number): Uint8Array {
  const data = new Uint8Array(size);
  const prng = createMockPRNG(seed);

  for (let i = 0; i < size; i++) {
    data[i] = prng.nextInt(0, 255);
  }

  return data;
}

/**
 * Generate random notes for testing
 */
export function generateRandomNotes(
  count: number,
  seed: number,
  duration: number
): SongModel['notes'] {
  const prng = createMockPRNG(seed);
  const notes: SongModel['notes'] = [];

  for (let i = 0; i < count; i++) {
    notes.push({
      id: `note-${seed}-${i}`,
      voiceId: `voice-${i % 4}`,
      startTime: prng.nextFloat(0, duration),
      duration: prng.nextFloat(0.1, 2.0) * 44100,
      pitch: prng.nextInt(48, 84),
      velocity: prng.nextFloat(0.5, 1.0),
    });
  }

  return notes.sort((a, b) => a.startTime - b.startTime);
}

// =============================================================================
// TEST RUNNERS
// =============================================================================

/**
 * Run a test with retries
 */
export async function runTestWithRetries<T>(
  fn: () => T | Promise<T>,
  maxRetries: number = 3,
  delay: number = 100
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }

  throw lastError || new Error('Test failed with retries');
}

/**
 * Run a test with timeout
 */
export async function runTestWithTimeout<T>(
  fn: () => T | Promise<T>,
  timeout: number,
  message = `Test timed out after ${timeout}ms`
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), timeout)
    ),
  ]);
}

// =============================================================================
// COVERAGE HELPERS
// =============================================================================

/**
 * Calculate test coverage percentage
 */
export function calculateCoverage(covered: number, total: number): number {
  if (total === 0) return 100;
  return Math.round((covered / total) * 100 * 100) / 100;
}

/**
 * Generate coverage report
 */
export interface CoverageReport {
  category: string;
  covered: number;
  total: number;
  percentage: number;
}

export function generateCoverageReport(
  categories: Record<string, { covered: number; total: number }>
): CoverageReport[] {
  return Object.entries(categories).map(([category, { covered, total }]) => ({
    category,
    covered,
    total,
    percentage: calculateCoverage(covered, total),
  }));
}

// =============================================================================
// DEBUGGING HELPERS
// =============================================================================

/**
 * Pretty print SongModel for debugging
 */
export function debugPrintSongModel(songModel: SongModel, label = 'SongModel'): void {
  console.log(`\n=== ${label} ===`);
  console.log(`ID: ${songModel.id}`);
  console.log(`Source: ${songModel.sourceSongId}`);
  console.log(`Duration: ${songModel.duration} samples (${(songModel.duration / songModel.sampleRate / 60).toFixed(2)} minutes)`);
  console.log(`Tempo: ${songModel.tempo} BPM`);
  console.log(`Time Signature: ${songModel.timeSignature.join('/')}`);
  console.log(`Notes: ${songModel.notes.length}`);
  console.log(`Voice Assignments: ${songModel.voiceAssignments.length}`);
  console.log(`Performances: ${songModel.performances.length}`);
  console.log(`Timeline Sections: ${songModel.timeline.sections.length}`);

  if (songModel.notes.length > 0) {
    const firstNote = songModel.notes[0];
    const lastNote = songModel.notes[songModel.notes.length - 1];
    console.log(`First note: startTime=${firstNote.startTime}, pitch=${firstNote.pitch}`);
    console.log(`Last note: startTime=${lastNote.startTime}, pitch=${lastNote.pitch}`);
  }

  console.log('==================\n');
}

/**
 * Pretty print PerformanceState for debugging
 */
export function debugPrintPerformance(performance: PerformanceState, label = 'Performance'): void {
  console.log(`\n=== ${label} ===`);
  console.log(`ID: ${performance.id}`);
  console.log(`Name: ${performance.name}`);
  console.log(`Arrangement: ${performance.arrangementStyle}`);
  console.log(`Density: ${performance.density}`);
  console.log(`Instruments: ${Object.keys(performance.instrumentationMap).length}`);
  console.log(`Mix Targets: ${Object.keys(performance.mixTargets).length}`);
  console.log('==================\n');
}
