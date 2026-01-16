/**
 * Complete Song Example
 *
 * This example demonstrates creating a complete Schillinger song
 * with all 5 books and realizing it into an executable model.
 */

import {
  SchillingerSong_v1,
  SongModel_v1,
  realize,
  validate,
  generateUUID,
  ErrorSeverity,
} from "@schillinger-sdk/core-v1";

async function createCompleteSong(): Promise<void> {
  console.log("=== Complete Schillinger Song Example ===\n");

  // ============================================================================
  // STEP 1: Define Theory (All 5 Books)
  // ============================================================================

  const song: SchillingerSong_v1 = {
    schemaVersion: "1.0",
    songId: generateUUID(),

    // Metadata
    metadata: {
      title: "Complete Schillinger Song",
      composer: "SDK Example",
      tempo: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      durationBars: 32,
    },

    // BOOK I: RHYTHM - Attack patterns and timing
    bookI_rhythmSystems: [
      {
        systemId: "rhythm-bass",
        systemType: "generator",
        generators: [
          { period: 4, phase: 0, weight: 1.0 }, // Quarter notes
        ],
        resolutionBars: 8,
      },
      {
        systemId: "rhythm-drums",
        systemType: "generator",
        generators: [
          { period: 2, phase: 0, weight: 1.0 }, // Eighth notes
          { period: 3, phase: 0, weight: 0.5 }, // Triplets
        ],
        resolutionBars: 8,
      },
      {
        systemId: "rhythm-lead",
        systemType: "generator",
        generators: [
          { period: 8, phase: 2, weight: 1.0 }, // Half notes with offset
        ],
        resolutionBars: 8,
      },
    ],

    // BOOK II: MELODY - Pitch patterns
    bookII_melodySystems: [
      {
        systemId: "melody-bass",
        pitchCycle: {
          modulus: 12,
          roots: [0, 7], // Perfect fifths
        },
        intervalSeed: [7, 5, 7, 5], // Descending fifths and fourths
        contourConstraints: {
          maxAscend: 12,
          maxDescend: 24,
        },
        registerConstraints: {
          minPitch: 36, // C2
          maxPitch: 60, // C4
        },
      },
      {
        systemId: "melody-lead",
        pitchCycle: {
          modulus: 12,
          roots: [0, 4, 7], // C major triad
        },
        intervalSeed: [2, 2, 1, 2, 2, 2, 1], // Major scale
        contourConstraints: {
          maxAscend: 12,
          maxDescend: 12,
        },
        registerConstraints: {
          minPitch: 60, // C4
          maxPitch: 84, // C6
        },
      },
    ],

    // BOOK III: HARMY - Chords and progressions
    bookIII_harmonySystems: [
      {
        systemId: "harmony-1",
        intervalDistribution: {
          intervals: [7, 5, 4, 3], // P5, M3, m3, m2
          weights: [0.4, 0.3, 0.2, 0.1],
        },
        chordClasses: [
          {
            chordClassId: "major",
            intervals: [4, 7], // Major third, perfect fifth
            description: "Major triad",
          },
          {
            chordClassId: "minor",
            intervals: [3, 7], // Minor third, perfect fifth
            description: "Minor triad",
          },
        ],
        harmonicRhythmBinding: ["rhythm-bass"],
        voiceLeadingRules: {
          maxParallelFifths: 2,
          maxParallelOctaves: 1,
        },
      },
    ],

    // BOOK IV: FORM - Song structure
    bookIV_formSystem: {
      formType: "sectional",
      sections: [
        {
          sectionId: "A",
          lengthBars: 8,
          systemsBinding: ["rhythm-bass", "melody-bass", "harmony-1"],
        },
        {
          sectionId: "A2",
          lengthBars: 8,
          systemsBinding: ["rhythm-bass", "melody-bass", "harmony-1"],
        },
        {
          sectionId: "B",
          lengthBars: 8,
          systemsBinding: ["rhythm-drums", "melody-lead", "harmony-1"],
        },
        {
          sectionId: "A3",
          lengthBars: 8,
          systemsBinding: ["rhythm-bass", "melody-bass", "harmony-1"],
        },
      ],
    },

    // BOOK V: ORCHESTRATION - Instruments and ensembles
    bookV_orchestration: {
      ensembleId: "rock-band",
      voices: [
        {
          id: "bass",
          name: "Bass Guitar",
          rolePools: [
            {
              role: "secondary",
              functionalClass: "foundation",
              enabled: true,
            },
          ],
          groupIds: [],
        },
        {
          id: "drums",
          name: "Drum Kit",
          rolePools: [
            {
              role: "primary",
              functionalClass: "foundation",
              enabled: true,
            },
          ],
          groupIds: [],
        },
        {
          id: "guitar",
          name: "Electric Guitar",
          rolePools: [
            {
              role: "primary",
              functionalClass: "motion",
              enabled: true,
            },
          ],
          groupIds: [],
        },
        {
          id: "piano",
          name: "Piano",
          rolePools: [
            {
              role: "primary",
              functionalClass: "motion",
              enabled: true,
            },
          ],
          groupIds: [],
        },
      ],
      groups: [],
      balanceRules: {
        primaryGain: 0.7,
        secondaryGain: 0.5,
        tertiaryGain: 0.3,
      },
    },
  };

  // ============================================================================
  // STEP 2: Validate Theory
  // ============================================================================

  console.log("Validating theory...");
  const validation = await validate(song);

  if (!validation.valid) {
    console.error("❌ Validation failed:");
    validation.errors.forEach((error) => {
      console.error(`  [${error.severity}] ${error.code}: ${error.message}`);
    });
    throw new Error("Theory validation failed");
  }

  console.log("✓ Theory is valid\n");

  if (validation.warnings.length > 0) {
    console.log("Warnings:");
    validation.warnings.forEach((warning) => {
      console.log(`  ⚠ ${warning.message}`);
      if (warning.suggestion) {
        console.log(`    Suggestion: ${warning.suggestion}`);
      }
    });
    console.log();
  }

  // ============================================================================
  // STEP 3: Realize Song
  // ============================================================================

  console.log("Realizing song...");
  const seed = 12345;

  const startTime = performance.now();
  const { songModel, derivationRecord, performanceMetrics } = await realize(song, seed, {
    enableDerivationRecord: true,
    enableValidation: true,
  });
  const endTime = performance.now();

  console.log(`✓ Realization complete in ${(endTime - startTime).toFixed(2)}ms\n`);

  // ============================================================================
  // STEP 4: Display Results
  // ============================================================================

  console.log("=== Realization Results ===");
  console.log(`Song ID: ${songModel.songId}`);
  console.log(`Duration: ${songModel.durationBars} bars`);
  console.log(`Tempo: ${songModel.tempo} BPM`);
  console.log(
    `Time Signature: ${songModel.timeSignature.numerator}/${songModel.timeSignature.denominator}`
  );
  console.log(`Total Notes: ${songModel.notes.length}`);
  console.log(`Voices: ${songModel.voices.length}`);
  console.log();

  // Show first 10 notes
  console.log("First 10 notes:");
  songModel.notes.slice(0, 10).forEach((note, index) => {
    const pitchName = midiToPitchName(note.pitch);
    const startTime = note.startBeat * (60 / songModel.tempo);
    const duration = note.durationBeats * (60 / songModel.tempo);
    console.log(
      `  ${index + 1}. ${pitchName} (${note.pitch}) | ${startTime.toFixed(2)}s - ${(startTime + duration).toFixed(2)}s | vel: ${note.velocity} | voice: ${note.voiceId}`
    );
  });
  console.log("...");

  // Show voice assignments
  console.log("\nVoice Assignments:");
  songModel.voices.forEach((voice) => {
    const noteCount = songModel.notes.filter((n) => n.voiceId === voice.voiceId).length;
    console.log(`  ${voice.voiceId}: ${noteCount} notes`);
  });

  // Show derivation info
  console.log("\nDerivation Record:");
  console.log(`  System derivations: ${derivationRecord.systemDerivations.length}`);
  console.log(`  Note derivations: ${derivationRecord.noteDerivations.size}`);

  // Show performance metrics
  console.log("\nPerformance Metrics:");
  console.log(`  Total time: ${performanceMetrics.durationMs.toFixed(2)}ms`);
  console.log(`  Validation time: ${performanceMetrics.validationTimeMs?.toFixed(2)}ms`);
  console.log(`  Realization time: ${performanceMetrics.realizationTimeMs?.toFixed(2)}ms`);

  // ============================================================================
  // STEP 5: Export
  // ============================================================================

  console.log("\n=== Export ===");
  console.log("Theory JSON size:", JSON.stringify(song).length, "bytes");
  console.log("SongModel JSON size:", JSON.stringify(songModel).length, "bytes");

  // You would export to MIDI or other formats here
  // const midiBuffer = exportToMidi(songModel);
  // fs.writeFileSync('song.mid', midiBuffer);

  console.log("\n✓ Example complete!");
}

// Helper function to convert MIDI pitch to pitch name
function midiToPitchName(midi: number): string {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  const note = notes[midi % 12];
  return `${note}${octave}`;
}

// Run the example
createCompleteSong().catch(console.error);
