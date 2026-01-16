/**
 * Simple Getting Started Example
 *
 * This is the simplest possible example of using the Schillinger SDK.
 * It demonstrates the basic workflow: create theory → realize → use result.
 */

import { SchillingerSong_v1, realize, validate, generateUUID } from "@schillinger-sdk/core-v1";

async function simpleExample(): Promise<void> {
  console.log("Simple Schillinger SDK Example\n");

  // Step 1: Create a minimal theory
  const song: SchillingerSong_v1 = {
    schemaVersion: "1.0",
    songId: generateUUID(),

    metadata: {
      title: "My First Schillinger Song",
      tempo: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      durationBars: 8,
    },

    // Book I: Rhythm - When notes occur
    bookI_rhythmSystems: [
      {
        systemId: "simple-rhythm",
        systemType: "generator",
        generators: [
          { period: 4, phase: 0, weight: 1.0 }, // Quarter notes
        ],
        resolutionBars: 8,
      },
    ],

    // Book II: Melody - What pitches occur
    bookII_melodySystems: [
      {
        systemId: "simple-melody",
        pitchCycle: {
          modulus: 12,
          roots: [0, 4, 7], // C major chord tones
        },
        intervalSeed: [2, 2, 1], // Steps of major scale
        contourConstraints: {
          maxAscend: 5,
          maxDescend: 5,
        },
        registerConstraints: {
          minPitch: 60, // Middle C
          maxPitch: 72, // High C
        },
      },
    ],

    // Book III: Harmony - Chords (empty for now)
    bookIII_harmonySystems: [],

    // Book IV: Form - Song structure
    bookIV_formSystem: {
      formType: "sectional",
      sections: [
        {
          sectionId: "A",
          lengthBars: 8,
          systemsBinding: ["simple-rhythm", "simple-melody"],
        },
      ],
    },

    // Book V: Orchestration - Instruments
    bookV_orchestration: {
      ensembleId: "simple-ensemble",
      voices: [
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
        },
      ],
      groups: [],
    },
  };

  console.log("Created theory for song: " + song.songId);

  // Step 2: Validate theory
  console.log("\nValidating theory...");
  const validation = await validate(song);

  if (!validation.valid) {
    console.error("Validation failed:");
    validation.errors.forEach((error) => {
      console.error(`  - ${error.message}`);
    });
    return;
  }

  console.log("✓ Theory is valid");

  // Step 3: Realize the song
  console.log("\nRealizing song...");
  const seed = 12345;
  const { songModel } = await realize(song, seed);

  console.log(`✓ Generated ${songModel.notes.length} notes`);
  console.log(`  Duration: ${songModel.durationBars} bars`);
  console.log(`  Tempo: ${songModel.tempo} BPM`);

  // Step 4: Display some notes
  console.log("\nFirst 10 notes:");
  songModel.notes.slice(0, 10).forEach((note, index) => {
    const pitchName = midiToPitchName(note.pitch);
    const startTime = note.startBeat * (60 / songModel.tempo);
    console.log(`  ${index + 1}. ${pitchName} at ${startTime.toFixed(2)}s (vel: ${note.velocity})`);
  });

  console.log("\n✓ Example complete!");
}

// Helper: Convert MIDI pitch to note name
function midiToPitchName(midi: number): string {
  const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const octave = Math.floor(midi / 12) - 1;
  const note = notes[midi % 12];
  return `${note}${octave}`;
}

// Run
simpleExample().catch(console.error);
