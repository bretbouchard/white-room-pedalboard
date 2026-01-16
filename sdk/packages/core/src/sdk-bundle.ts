/**
 * Schillinger SDK Bundle for JavaScriptCore
 *
 * This file is the entry point for the TypeScript SDK when loaded
 * into JavaScriptCore on iOS/tvOS/macOS.
 *
 * It exports global functions that Swift can call:
 * - createSchillingerSong(params): Convert UI params to SchillingerSong JSON
 * - realizeSong(songJson, seed): Generate notes from SchillingerSong
 * - getVersion(): Get SDK version string
 *
 * Created by Claude on 2026-01-11.
 */

import { ParameterMapper, UIParameterState } from "./mapping/ParameterMapper";
import { SchillingerSong } from "./theory/schillinger-song";
import { RealizationEngine } from "./realize/RealizationEngine";

/**
 * Schillinger SDK version
 */
const SDK_VERSION = "1.0.0";

/**
 * Create SchillingerSong from UI parameters
 *
 * @param params - UI parameter state object from iPhone app
 * @returns JSON string of SchillingerSong
 */
export function createSchillingerSong(params: any): string {
  try {
    // Convert to UIParameterState
    const uiParams: UIParameterState = {
      // Song Definition
      tempo: params.tempo || 120,
      timeSignatureNumerator: params.timeSignatureNumerator || 4,
      timeSignatureDenominator: params.timeSignatureDenominator || 4,
      scale: params.scale || "Major",
      rootNote: params.rootNote || 0,

      // Rhythm
      resultantType: params.resultantType || "resultant",
      periodicityA: params.periodicityA || 3,
      periodicityB: params.periodicityB || 4,
      periodicityC: params.periodicityC || 0,
      density: params.density !== undefined ? params.density : 0.5,
      complexity: params.complexity !== undefined ? params.complexity : 0.5,
      rhythmicDensity: params.rhythmicDensity !== undefined ? params.rhythmicDensity : 0.5,
      syncopation: params.syncopation !== undefined ? params.syncopation : 0,

      // Melody
      melodyContour: params.melodyContour !== undefined ? params.melodyContour : 0.5,
      intervalRange: params.intervalRange !== undefined ? params.intervalRange : 0.5,
      stepLeaping: params.stepLeaping !== undefined ? params.stepLeaping : 0.5,
      repetition: params.repetition !== undefined ? params.repetition : 0.5,
      sequenceLength: params.sequenceLength || 8,

      // Harmony
      harmonyType: params.harmonyType || "functional",
      harmonicRhythm: params.harmonicRhythm || 1.0,
      chordDensity: params.chordDensity !== undefined ? params.chordDensity : 0.5,
      voiceLeading: params.voiceLeading !== undefined ? params.voiceLeading : 0.5,
      tension: params.tension !== undefined ? params.tension : 0.5,

      // Structure
      sections: params.sections || 1,
      sectionLength: params.sectionLength || 8,
      transitionType: params.transitionType || "crossfade",
      development: params.development !== undefined ? params.development : 0.5,

      // Orchestration
      register: params.register !== undefined ? params.register : 0.5,
      texture: params.texture !== undefined ? params.texture : 0.5,
      articulation: params.articulation !== undefined ? params.articulation : 0.5,
      dynamics: params.dynamics !== undefined ? params.dynamics : 0.5,
      timbre: params.timbre !== undefined ? params.timbre : 0.5
    };

    // Map to SchillingerSong
    const song = ParameterMapper.toSchillingerSong(uiParams);

    // Return as JSON
    return JSON.stringify(song);
  } catch (error) {
    console.error("SDK: Error creating SchillingerSong", error);
    throw error;
  }
}

/**
 * Realize SchillingerSong into executable notes
 *
 * @param songJson - JSON string of SchillingerSong
 * @param seed - Random seed for reproducible generation
 * @returns JSON string of SongModel with notes
 */
export async function realizeSong(songJson: string, seed: number): Promise<string> {
  try {
    // Parse SchillingerSong from JSON
    const songData = JSON.parse(songJson);
    const song = SchillingerSong.create(songData);

    // Create realization engine
    const engine = new RealizationEngine({
      enableDerivationRecord: true,
      enableValidation: true,
      enableConstraints: true
    });

    // Realize song
    const result = await engine.realize(song, seed);

    // Return SongModel as JSON
    return JSON.stringify(result.songModel);
  } catch (error) {
    console.error("SDK: Error realizing song", error);
    throw error;
  }
}

/**
 * Get SDK version
 *
 * @returns Version string
 */
export function getVersion(): string {
  return SDK_VERSION;
}

/**
 * Export for JavaScriptCore
 *
 * These functions are attached to the global SchillingerSDK object
 * when loaded into JavaScriptCore.
 */
export const SchillingerSDK = {
  createSchillingerSong,
  realizeSong,
  getVersion
};

// For Node.js/CommonJS environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SchillingerSDK;
}

// For ES module environments
if (typeof window !== 'undefined') {
  (window as any).SchillingerSDK = SchillingerSDK;
}
