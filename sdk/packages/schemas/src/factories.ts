/**
 * Schillinger SDK 2.1 - Factory Functions
 *
 * Helper functions for creating SDK entities with sensible defaults.
 * Ensures data consistency and reduces boilerplate.
 */

import { v4 as uuidv4 } from "uuid";
import type { PerformanceState } from "./types";
import { ArrangementStyle } from "./types";

// =============================================================================
// PERFORMANCE STATE FACTORIES
// =============================================================================

/**
 * Create a PerformanceState with sensible defaults
 *
 * @param name - Human-readable name for this performance
 * @param arrangementStyle - Musical arrangement style
 * @returns A new PerformanceState instance
 */
export function createPerformanceState(
  name: string,
  arrangementStyle: ArrangementStyle,
): PerformanceState {
  const now = new Date().toISOString();

  return {
    version: "1",
    id: uuidv4(),
    name,
    arrangementStyle,
    density: 1.0,
    grooveProfileId: "default",
    instrumentationMap: {},
    consoleXProfileId: "default",
    mixTargets: {},
    createdAt: now,
    modifiedAt: now,
  };
}

/**
 * Create a Solo Piano performance
 */
export function createSoloPianoPerformance(): PerformanceState {
  const performance = createPerformanceState(
    "Solo Piano",
    ArrangementStyle.SOLO_PIANO,
  );

  performance.instrumentationMap = {
    primary: {
      instrumentId: "LocalGal",
      presetId: "grand_piano",
    },
  };

  performance.mixTargets = {
    primary: {
      gain: -3,
      pan: 0,
      stereo: true,
    },
  };

  return performance;
}

/**
 * Create an SATB (Soprano, Alto, Tenor, Bass) performance
 */
export function createSATBPerformance(): PerformanceState {
  const performance = createPerformanceState(
    "SATB Choir",
    ArrangementStyle.SATB,
  );

  performance.density = 0.8;
  performance.grooveProfileId = "straight";

  performance.instrumentationMap = {
    soprano: {
      instrumentId: "LocalGal",
      presetId: "choir_soprano",
    },
    alto: {
      instrumentId: "LocalGal",
      presetId: "choir_alto",
    },
    tenor: {
      instrumentId: "LocalGal",
      presetId: "choir_tenor",
    },
    bass: {
      instrumentId: "LocalGal",
      presetId: "choir_bass",
    },
  };

  performance.mixTargets = {
    soprano: {
      gain: -6,
      pan: -0.3,
      stereo: true,
    },
    alto: {
      gain: -6,
      pan: 0.3,
      stereo: true,
    },
    tenor: {
      gain: -6,
      pan: -0.2,
      stereo: true,
    },
    bass: {
      gain: -4,
      pan: 0.2,
      stereo: true,
    },
  };

  return performance;
}

/**
 * Create an Ambient Techno performance
 */
export function createAmbientTechnoPerformance(): PerformanceState {
  const performance = createPerformanceState(
    "Ambient Techno",
    ArrangementStyle.AMBIENT_TECHNO,
  );

  performance.density = 0.6;
  performance.grooveProfileId = "swing";

  performance.instrumentationMap = {
    primary: {
      instrumentId: "NexSynth",
      presetId: "ambient_pad",
      parameters: {
        attack: 0.8,
        release: 2.0,
        reverb: 0.7,
      },
    },
    secondary: {
      instrumentId: "SamSampler",
      presetId: "techno_drums",
    },
    tertiary: {
      instrumentId: "NexSynth",
      presetId: "bass_synth",
    },
  };

  performance.mixTargets = {
    primary: {
      gain: -9,
      pan: 0,
      stereo: true,
    },
    secondary: {
      gain: -6,
      pan: 0,
      stereo: true,
    },
    tertiary: {
      gain: -5,
      pan: 0,
      stereo: false,
    },
  };

  return performance;
}

/**
 * Create a Jazz Trio performance
 */
export function createJazzTrioPerformance(): PerformanceState {
  const performance = createPerformanceState(
    "Jazz Trio",
    ArrangementStyle.JAZZ_TRIO,
  );

  performance.density = 0.85;
  performance.grooveProfileId = "swing";

  performance.instrumentationMap = {
    piano: {
      instrumentId: "LocalGal",
      presetId: "jazz_piano",
    },
    bass: {
      instrumentId: "KaneMarco",
      presetId: "upright_bass",
    },
    drums: {
      instrumentId: "DrumMachine",
      presetId: "jazz_drums",
    },
  };

  performance.mixTargets = {
    piano: {
      gain: -6,
      pan: -0.2,
      stereo: true,
    },
    bass: {
      gain: -4,
      pan: 0,
      stereo: false,
    },
    drums: {
      gain: -5,
      pan: 0.2,
      stereo: true,
    },
  };

  return performance;
}

/**
 * Create a Full Orchestra performance
 */
export function createFullOrchestraPerformance(): PerformanceState {
  const performance = createPerformanceState(
    "Full Orchestra",
    ArrangementStyle.FULL_ORCHESTRA,
  );

  performance.density = 1.0;
  performance.grooveProfileId = "straight";

  performance.instrumentationMap = {
    strings: {
      instrumentId: "KaneMarcoAetherString",
      presetId: "string_section",
    },
    brass: {
      instrumentId: "KaneMarco",
      presetId: "brass_section",
    },
    woodwinds: {
      instrumentId: "KaneMarco",
      presetId: "woodwind_section",
    },
    percussion: {
      instrumentId: "DrumMachine",
      presetId: "orchestral_percussion",
    },
  };

  performance.mixTargets = {
    strings: {
      gain: -6,
      pan: 0,
      stereo: true,
    },
    brass: {
      gain: -8,
      pan: 0,
      stereo: true,
    },
    woodwinds: {
      gain: -7,
      pan: 0,
      stereo: true,
    },
    percussion: {
      gain: -5,
      pan: 0,
      stereo: true,
    },
  };

  return performance;
}

/**
 * Clone a PerformanceState with a new ID
 * Useful for creating variations of existing performances
 */
export function clonePerformanceState(
  source: PerformanceState,
  newName?: string,
): PerformanceState {
  const now = new Date().toISOString();

  return {
    ...source,
    id: uuidv4(),
    name: newName || `${source.name} (Copy)`,
    createdAt: now,
    modifiedAt: now,
  };
}

/**
 * Update a PerformanceState's modified timestamp
 * Call this after making any modifications to a performance
 */
export function touchPerformanceState(
  performance: PerformanceState,
): PerformanceState {
  return {
    ...performance,
    modifiedAt: new Date().toISOString(),
  };
}
