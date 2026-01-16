/**
 * Reconciliation Example
 *
 * This example demonstrates round-trip editing:
 * 1. Create theory
 * 2. Realize to notes
 * 3. Edit the notes
 * 4. Reconcile back to theory
 * 5. Handle confidence scores
 */

import {
  SchillingerSong_v1,
  realize,
  reconcile,
  validate,
  generateUUID,
} from "@schillinger-sdk/core-v1";

async function demonstrateReconciliation(): Promise<void> {
  console.log("=== Round-Trip Reconciliation Example ===\n");

  // ============================================================================
  // STEP 1: Create Original Theory
  // ============================================================================

  const originalSong: SchillingerSong_v1 = {
    schemaVersion: "1.0",
    songId: generateUUID(),

    metadata: {
      title: "Reconciliation Demo",
      composer: "SDK Example",
      tempo: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      durationBars: 8,
    },

    bookI_rhythmSystems: [
      {
        systemId: "rhythm-1",
        systemType: "generator",
        generators: [{ period: 4, phase: 0, weight: 1.0 }],
        resolutionBars: 8,
      },
    ],

    bookII_melodySystems: [
      {
        systemId: "melody-1",
        pitchCycle: {
          modulus: 12,
          roots: [0, 4, 7], // C major
        },
        intervalSeed: [2, 2, 1], // Major scale fragment
        contourConstraints: {
          maxAscend: 5,
          maxDescend: 5,
        },
        registerConstraints: {
          minPitch: 60,
          maxPitch: 72,
        },
      },
    ],

    bookIII_harmonySystems: [],

    bookIV_formSystem: {
      formType: "sectional",
      sections: [
        {
          sectionId: "A",
          lengthBars: 8,
          systemsBinding: ["rhythm-1", "melody-1"],
        },
      ],
    },

    bookV_orchestration: {
      ensembleId: "ensemble-1",
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

  console.log("Step 1: Original theory created");
  console.log(`  Song ID: ${originalSong.songId}\n`);

  // ============================================================================
  // STEP 2: Realize Original
  // ============================================================================

  console.log("Step 2: Realizing original song...");
  const seed = 12345;
  const { songModel: originalModel } = await realize(originalSong, seed);
  console.log(`✓ Generated ${originalModel.notes.length} notes\n`);

  // Show first few notes before editing
  console.log("Original notes (first 5):");
  originalModel.notes.slice(0, 5).forEach((note, i) => {
    console.log(
      `  ${i + 1}. Pitch: ${note.pitch}, Vel: ${note.velocity}, Start: ${note.startBeat.toFixed(2)}`
    );
  });
  console.log();

  // ============================================================================
  // STEP 3: Edit Realized Model
  // ============================================================================

  console.log("Step 3: Editing realized notes...");

  // Edit 1: Change velocity of first note
  originalModel.notes[0].velocity = 127;
  console.log("  ✓ Changed note 0 velocity to 127");

  // Edit 2: Transpose note 1 up 2 semitones
  originalModel.notes[1].pitch += 2;
  console.log("  ✓ Transposed note 1 up 2 semitones");

  // Edit 3: Change duration of note 2
  originalModel.notes[2].durationBeats = 2.0;
  console.log("  ✓ Changed note 2 duration to 2.0");

  // Edit 4: Delete note 3 (mark as zero duration)
  originalModel.notes[3].durationBeats = 0;
  console.log("  ✓ Deleted note 3");

  // Edit 5: Add velocity variation to notes 4-10
  for (let i = 4; i < Math.min(10, originalModel.notes.length); i++) {
    originalModel.notes[i].velocity = Math.floor(80 + Math.random() * 40);
  }
  console.log("  ✓ Added velocity variation to notes 4-9");

  console.log("\nEdited notes (first 5):");
  originalModel.notes.slice(0, 5).forEach((note, i) => {
    console.log(
      `  ${i + 1}. Pitch: ${note.pitch}, Vel: ${note.velocity}, Start: ${note.startBeat.toFixed(2)}, Dur: ${note.durationBeats}`
    );
  });
  console.log();

  // ============================================================================
  // STEP 4: Reconcile Back to Theory
  // ============================================================================

  console.log("Step 4: Reconciling edits back to theory...");
  const report = await reconcile(originalSong, originalModel);

  console.log(`✓ Reconciliation complete\n`);

  // ============================================================================
  // STEP 5: Analyze Results
  // ============================================================================

  console.log("=== Reconciliation Results ===\n");

  // Overall confidence
  console.log("Confidence Summary:");
  console.log(`  Overall: ${(report.confidenceSummary.overall * 100).toFixed(1)}%`);
  console.log(`  Rhythm: ${(report.confidenceSummary.byCategory.rhythm * 100).toFixed(1)}%`);
  console.log(`  Melody: ${(report.confidenceSummary.byCategory.melody * 100).toFixed(1)}%`);
  console.log(`  Harmony: ${(report.confidenceSummary.byCategory.harmony * 100).toFixed(1)}%`);
  console.log(`  Form: ${(report.confidenceSummary.byCategory.form * 100).toFixed(1)}%`);
  console.log(
    `  Orchestration: ${(report.confidenceSummary.byCategory.orchestration * 100).toFixed(1)}%`
  );
  console.log();

  // Derivation loss
  console.log("Derivation Loss:");
  console.log(`  Total notes: ${originalModel.notes.length}`);
  console.log(`  Preserved: ${report.derivationLoss.preservedNotes}`);
  console.log(`  Lost: ${report.derivationLoss.lostNotes}`);
  console.log(`  Modified: ${report.derivationLoss.modifiedNotes}`);
  console.log(
    `  Loss rate: ${((report.derivationLoss.lostNotes / originalModel.notes.length) * 100).toFixed(1)}%`
  );
  console.log();

  // Conflicts
  if (report.conflicts.length > 0) {
    console.log(`⚠ Conflicts detected: ${report.conflicts.length}`);
    report.conflicts.forEach((conflict) => {
      console.log(`  [${conflict.conflictType}] ${conflict.description}`);
      console.log(`    Affected notes: ${conflict.affectedNotes.length}`);
    });
    console.log();
  } else {
    console.log("✓ No conflicts detected\n");
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log("Recommendations:");
    report.recommendations.forEach((rec) => {
      console.log(`  - ${rec.message}`);
    });
    console.log();
  }

  // ============================================================================
  // STEP 6: Decision Based on Confidence
  // ============================================================================

  console.log("=== Decision ===\n");

  const confidenceThreshold = 0.8;

  if (report.confidenceSummary.overall >= confidenceThreshold) {
    console.log(
      `✓ High confidence (${(report.confidenceSummary.overall * 100).toFixed(1)}% >= ${confidenceThreshold * 100}%)`
    );
    console.log("  → ACCEPTING proposed update");
    console.log("  → Original theory would be updated");
    console.log("  → New theory: " + report.proposedUpdate.songId);
  } else if (report.confidenceSummary.overall >= 0.5) {
    console.log(`⚠ Medium confidence (${(report.confidenceSummary.overall * 100).toFixed(1)}%)`);
    console.log("  → MANUAL REVIEW recommended");
    console.log("  → Review conflicts and derivation loss");
    console.log("  → Consider editing in smaller batches");
  } else {
    console.log(
      `❌ Low confidence (${(report.confidenceSummary.overall * 100).toFixed(1)}% < ${confidenceThreshold * 100}%)`
    );
    console.log("  → REJECTING proposed update");
    console.log("  → Theory too different from edits");
    console.log("  → Consider:");
    console.log("    1. Reducing number of edits");
    console.log("    2. Making more conservative edits");
    console.log("    3. Creating new theory from scratch");
  }

  console.log("\n✓ Example complete!");
}

// Run the example
demonstrateReconciliation().catch(console.error);
