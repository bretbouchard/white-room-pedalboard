/**
 * Reconciliation Engine
 *
 * Applies classified edits from realized SongModels back to Schillinger theory.
 * Handles decorative, structural, and destructive edits differently.
 *
 * Process:
 * 1. Analyze classification to determine reconciliation strategy
 * 2. Apply decorative edits directly (don't affect theory)
 * 3. Apply structural edits to theory parameters (within tolerance)
 * 4. Flag destructive edits as unreconcilable with loss reports
 * 5. Generate updated Schillinger song and reconciliation report
 */

import type { SchillingerSong_v1, SongModel_v1 } from "../types";
import type { DerivationRecord } from "./realization-engine";
import type { EditClassification, ClassifiedEdit } from "./edit-classifier";

/**
 * Reconciliation result
 */
export interface ReconciliationResult {
  /** Updated Schillinger song (if reconciliation was possible) */
  updatedSong: SchillingerSong_v1 | null;

  /** Reconciliation report */
  report: ReconciliationReport;

  /** Whether reconciliation was fully successful */
  success: boolean;
}

/**
 * Reconciliation report
 */
export interface ReconciliationReport {
  /** Original classification */
  classification: EditClassification;

  /** Applied edits (decorative + structural) */
  appliedEdits: AppliedEdit[];

  /** Rejected edits (destructive) */
  rejectedEdits: RejectedEdit[];

  /** Theory parameter updates */
  parameterUpdates: ParameterUpdate[];

  /** Overall reconciliation success */
  success: boolean;

  /** Total information loss (0-1) */
  totalLoss: number;
}

/**
 * Applied edit (decorative or structural)
 */
export interface AppliedEdit {
  /** Edit that was applied */
  edit: ClassifiedEdit;

  /** What was updated */
  updateType: "songModel" | "theoryParameter";

  /** Specific parameter(s) updated */
  updatedParameters: string[];
}

/**
 * Rejected edit (destructive)
 */
export interface RejectedEdit {
  /** Edit that was rejected */
  edit: ClassifiedEdit;

  /** Reason for rejection */
  reason: string;

  /** Information lost (0-1) */
  lostInformation: number;
}

/**
 * Theory parameter update
 */
export interface ParameterUpdate {
  /** Parameter path (e.g., "globals.key", "bookI_rhythmSystems[0].period") */
  parameterPath: string;

  /** Old value */
  oldValue: any;

  /** New value */
  newValue: any;

  /** Confidence in this update (0-1) */
  confidence: number;
}

/**
 * Reconciliation options
 */
export interface ReconciliationOptions {
  /** Whether to apply decorative edits (default: true) */
  applyDecorativeEdits?: boolean;

  /** Whether to apply structural edits (default: true) */
  applyStructuralEdits?: boolean;

  /** Maximum tolerance for structural edits (default: 0.2) */
  maxTolerance?: number;

  /** Whether to throw on destructive edits (default: false) */
  throwOnDestructive?: boolean;
}

/**
 * Reconcile edited song model back to Schillinger theory
 *
 * @param originalSong - Original Schillinger song
 * @param originalModel - Original realized song model
 * @param editedModel - Edited song model
 * @param derivation - Derivation record from original realization
 * @param classification - Edit classification
 * @param options - Reconciliation options
 * @returns Reconciliation result
 */
export function reconcile(
  originalSong: SchillingerSong_v1,
  originalModel: SongModel_v1,
  editedModel: SongModel_v1,
  derivation: DerivationRecord,
  classification: EditClassification,
  options: ReconciliationOptions = {}
): ReconciliationResult {
  const opts = {
    applyDecorativeEdits: true,
    applyStructuralEdits: true,
    maxTolerance: 0.2,
    throwOnDestructive: false,
    ...options,
  };

  // Check if reconciliation is possible
  if (!classification.canReconcile) {
    // Check if we should throw on destructive edits
    if (opts.throwOnDestructive) {
      throw new Error("Destructive edits prevent reconciliation");
    }
    return createUnreconcilableResult(classification);
  }

  // Start with deep copy of original song
  const updatedSong: SchillingerSong_v1 = deepCopySong(originalSong);

  // Track applied edits and parameter updates
  const appliedEdits: AppliedEdit[] = [];
  const rejectedEdits: RejectedEdit[] = [];
  const parameterUpdates: ParameterUpdate[] = [];

  // Process each edit
  for (const edit of classification.edits) {
    try {
      switch (edit.type) {
        case "decorative": // lowercase to match enum value
          if (opts.applyDecorativeEdits) {
            applyDecorativeEdit(
              updatedSong,
              originalModel,
              editedModel,
              edit,
              appliedEdits,
              parameterUpdates
            );
          }
          break;

        case "structural": // lowercase to match enum value
          if (opts.applyStructuralEdits) {
            applyStructuralEdit(
              updatedSong,
              originalModel,
              editedModel,
              derivation,
              edit,
              appliedEdits,
              parameterUpdates,
              opts.maxTolerance
            );
          }
          break;

        case "destructive": // lowercase to match enum value
          rejectDestructiveEdit(edit, rejectedEdits);
          if (opts.throwOnDestructive) {
            throw new Error(`Destructive edit encountered: ${edit.description}`);
          }
          break;
      }
    } catch (error) {
      // If edit application fails, reject it
      rejectedEdits.push({
        edit,
        reason: error instanceof Error ? error.message : "Unknown error",
        lostInformation: edit.confidence > 0 ? 1 - edit.confidence : 1.0,
      });
    }
  }

  // Calculate total loss
  const totalLoss = calculateTotalLoss(classification, rejectedEdits);

  // Generate report
  const report: ReconciliationReport = {
    classification,
    appliedEdits,
    rejectedEdits,
    parameterUpdates,
    success: rejectedEdits.length === 0,
    totalLoss,
  };

  return {
    updatedSong: rejectedEdits.length === 0 ? updatedSong : null,
    report,
    success: rejectedEdits.length === 0,
  };
}

/**
 * Apply decorative edit (doesn't affect theory)
 */
function applyDecorativeEdit(
  song: SchillingerSong_v1,
  _originalModel: SongModel_v1,
  editedModel: SongModel_v1,
  edit: ClassifiedEdit,
  appliedEdits: AppliedEdit[],
  parameterUpdates: ParameterUpdate[]
): void {
  const description = edit.description.toLowerCase();
  const updatedParameters: string[] = [];

  // Tempo changes are decorative but we update the theory to match
  if (description.includes("tempo")) {
    const oldValue = song.globals.tempo;
    const newValue = editedModel.tempo ?? song.globals.tempo;

    song.globals.tempo = newValue;
    updatedParameters.push("globals.tempo");

    parameterUpdates.push({
      parameterPath: "globals.tempo",
      oldValue,
      newValue,
      confidence: edit.confidence,
    });

    appliedEdits.push({
      edit,
      updateType: "theoryParameter",
      updatedParameters,
    });
    return;
  }

  // Velocity and duration changes don't affect theory
  appliedEdits.push({
    edit,
    updateType: "songModel",
    updatedParameters: [],
  });
}

/**
 * Apply structural edit (updates theory parameters)
 */
function applyStructuralEdit(
  song: SchillingerSong_v1,
  _originalModel: SongModel_v1,
  editedModel: SongModel_v1,
  _derivation: DerivationRecord,
  edit: ClassifiedEdit,
  appliedEdits: AppliedEdit[],
  parameterUpdates: ParameterUpdate[],
  _maxTolerance: number
): void {
  const description = edit.description.toLowerCase();
  const updatedParameters: string[] = [];

  // Time signature changes
  if (description.includes("time signature")) {
    const oldValue = song.globals.timeSignature;
    const newValue = editedModel.timeSignature ?? song.globals.timeSignature;

    song.globals.timeSignature = newValue;
    updatedParameters.push("globals.timeSignature");

    parameterUpdates.push({
      parameterPath: "globals.timeSignature",
      oldValue,
      newValue,
      confidence: edit.confidence,
    });
  }

  // Key changes
  if (description.includes("key")) {
    const oldValue = song.globals.key;
    const newValue = editedModel.key ?? song.globals.key;

    song.globals.key = newValue;
    updatedParameters.push("globals.key");

    parameterUpdates.push({
      parameterPath: "globals.key",
      oldValue,
      newValue,
      confidence: edit.confidence,
    });
  }

  // Note pitch/time changes require more complex handling
  // For now, we acknowledge them but don't update specific theory parameters
  // TODO: Implement proper reverse-derivation for note-level changes
  if (description.includes("pitch") || description.includes("time shifted")) {
    appliedEdits.push({
      edit,
      updateType: "songModel",
      updatedParameters: [],
    });
    return;
  }

  // Note additions/deletions
  if (description.includes("added") || description.includes("deleted")) {
    // Note additions/deletions are structural but don't directly map to theory parameters
    // They affect the realized output but not the generating systems
    appliedEdits.push({
      edit,
      updateType: "songModel",
      updatedParameters: [],
    });
    return;
  }

  // Duration changes
  if (description.includes("duration changed")) {
    // Duration doesn't have a direct theory parameter (it's derived)
    // We acknowledge the change but don't update theory
    appliedEdits.push({
      edit,
      updateType: "songModel",
      updatedParameters: [],
    });
    return;
  }

  // For time signature and key changes, push the applied edit
  if (updatedParameters.length > 0) {
    appliedEdits.push({
      edit,
      updateType: "theoryParameter",
      updatedParameters,
    });
  }
}

/**
 * Reject destructive edit
 */
function rejectDestructiveEdit(edit: ClassifiedEdit, rejectedEdits: RejectedEdit[]): void {
  rejectedEdits.push({
    edit,
    reason: "Destructive edit cannot be reconciled with theory",
    lostInformation: edit.confidence > 0 ? 1 - edit.confidence : 1.0,
  });
}

/**
 * Calculate total information loss from rejected edits
 */
function calculateTotalLoss(
  classification: EditClassification,
  rejectedEdits: RejectedEdit[]
): number {
  if (rejectedEdits.length === 0) {
    return 0.0;
  }

  // Sum lost information from all rejected edits
  const totalLost = rejectedEdits.reduce((sum, r) => sum + r.lostInformation, 0);

  // Normalize by number of edits
  return totalLost / classification.edits.length;
}

/**
 * Create unreconcilable result
 */
function createUnreconcilableResult(classification: EditClassification): ReconciliationResult {
  const rejectedEdits: RejectedEdit[] = classification.edits
    .filter((e) => e.type === "destructive") // lowercase to match enum value
    .map((edit) => ({
      edit,
      reason: "Destructive edit prevents reconciliation",
      lostInformation: 1 - edit.confidence,
    }));

  const totalLoss =
    rejectedEdits.reduce((sum, r) => sum + r.lostInformation, 0) /
    (classification.edits.length || 1);

  const report: ReconciliationReport = {
    classification,
    appliedEdits: [],
    rejectedEdits,
    parameterUpdates: [],
    success: false,
    totalLoss,
  };

  return {
    updatedSong: null,
    report,
    success: false,
  };
}

/**
 * Get reconciliation summary
 */
export function getReconciliationSummary(result: ReconciliationResult): string {
  const lines: string[] = [];

  lines.push(`Reconciliation: ${result.success ? "SUCCESS" : "FAILED"}`);
  lines.push(`Total Loss: ${(result.report.totalLoss * 100).toFixed(1)}%`);
  lines.push("");

  lines.push(`Applied Edits: ${result.report.appliedEdits.length}`);
  const decorativeApplied = result.report.appliedEdits.filter(
    (e) => e.edit.type === "decorative"
  ).length; // lowercase
  const structuralApplied = result.report.appliedEdits.filter(
    (e) => e.edit.type === "structural"
  ).length; // lowercase
  lines.push(`  - Decorative: ${decorativeApplied}`);
  lines.push(`  - Structural: ${structuralApplied}`);
  lines.push("");

  lines.push(`Rejected Edits: ${result.report.rejectedEdits.length}`);
  if (result.report.rejectedEdits.length > 0) {
    for (const rejected of result.report.rejectedEdits) {
      lines.push(`  - ${rejected.edit.description}`);
      lines.push(`    Reason: ${rejected.reason}`);
      lines.push(`    Loss: ${(rejected.lostInformation * 100).toFixed(1)}%`);
    }
  }

  if (result.report.parameterUpdates.length > 0) {
    lines.push("");
    lines.push(`Theory Parameter Updates: ${result.report.parameterUpdates.length}`);
    for (const update of result.report.parameterUpdates) {
      lines.push(`  - ${update.parameterPath}`);
      lines.push(`    ${JSON.stringify(update.oldValue)} → ${JSON.stringify(update.newValue)}`);
      lines.push(`    Confidence: ${(update.confidence * 100).toFixed(0)}%`);
    }
  }

  return lines.join("\n");
}

/**
 * Deep copy Schillinger song
 */
function deepCopySong(song: SchillingerSong_v1): SchillingerSong_v1 {
  return {
    ...song,
    songId: `reconciled-${song.songId}-${Date.now()}`, // Generate new ID for reconciled song
    globals: { ...song.globals },
    bindings: {
      ...song.bindings,
      roleRhythmBindings: [...song.bindings.roleRhythmBindings],
      roleMelodyBindings: [...song.bindings.roleMelodyBindings],
      roleHarmonyBindings: [...song.bindings.roleHarmonyBindings],
      roleEnsembleBindings: [...song.bindings.roleEnsembleBindings],
    },
    bookI_rhythmSystems: song.bookI_rhythmSystems.map((rs) => ({ ...rs })),
    bookII_melodySystems: song.bookII_melodySystems.map((ms) => ({ ...ms })),
    bookIII_harmonySystems: song.bookIII_harmonySystems.map((hs) => ({ ...hs })),
    bookIV_formSystem: song.bookIV_formSystem ? { ...song.bookIV_formSystem } : null,
    bookV_orchestration: { ...song.bookV_orchestration }, // This is required, not optional
    ensembleModel: { ...song.ensembleModel },
    constraints: [...song.constraints],
    provenance: {
      ...song.provenance,
      modifiedAt: new Date().toISOString(), // Track when reconciliation happened
      derivationChain: [...song.provenance.derivationChain, song.songId], // Track derivation chain
    },
  };
}
