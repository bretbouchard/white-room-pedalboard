/**
 * Edit Classification System
 *
 * Classifies edits to realized SongModel into three categories:
 * - Decorative: Changes that don't affect theory (velocity, articulation, etc.)
 * - Structural: Changes that affect theory but can be reconciled (within tolerance)
 * - Destructive: Changes that break theory irreconcilably
 *
 * Classification is used to determine reconciliation strategy and
 * confidence scoring for round-trip editing.
 */

import type { SongModel_v1, Note } from "../types";
import type { DerivationRecord } from "./realization-engine";

/**
 * Edit classification types
 */
export enum EditType {
  /** Edit doesn't affect theory (e.g., velocity, articulation) */
  DECORATIVE = "decorative",

  /** Edit affects theory but can be reconciled (within tolerance) */
  STRUCTURAL = "structural",

  /** Edit breaks theory irreconcilably */
  DESTRUCTIVE = "destructive",
}

/**
 * Classified edit with metadata
 */
export interface ClassifiedEdit {
  /** Type of edit */
  type: EditType;

  /** Confidence score (0-1) */
  confidence: number;

  /** Ambiguity score (0-1) */
  ambiguity: number;

  /** Description of what changed */
  description: string;

  /** Note indices affected (if applicable) */
  noteIndices?: number[];

  /** System IDs affected (if applicable) */
  affectedSystems?: string[];
}

/**
 * Edit classification result
 */
export interface EditClassification {
  /** All classified edits */
  edits: ClassifiedEdit[];

  /** Overall confidence (0-1) */
  overallConfidence: number;

  /** Overall ambiguity (0-1) */
  overallAmbiguity: number;

  /** Whether reconciliation is possible */
  canReconcile: boolean;

  /** Estimated loss from reconciliation (0-1) */
  estimatedLoss: number;
}

/**
 * Classify edits between original and edited song model
 *
 * @param original - Original realized song model
 * @param edited - Edited song model
 * @param derivation - Derivation record from original realization
 * @returns Classification of all edits
 */
export function classifyEdits(
  original: SongModel_v1,
  edited: SongModel_v1,
  derivation: DerivationRecord
): EditClassification {
  const edits: ClassifiedEdit[] = [];

  // Check for decorative edits (properties that don't affect theory)
  checkDecorativeEdits(original, edited, derivation, edits);

  // Check for structural/destructive edits to notes
  checkNoteEdits(original, edited, derivation, edits);

  // Check for structural/destructive edits to structure
  checkStructureEdits(original, edited, derivation, edits);

  // Calculate overall scores
  const overallConfidence = calculateOverallConfidence(edits);
  const overallAmbiguity = calculateOverallAmbiguity(edits);
  const canReconcile = !edits.some((e) => e.type === EditType.DESTRUCTIVE);
  const estimatedLoss = calculateEstimatedLoss(edits);

  return {
    edits,
    overallConfidence,
    overallAmbiguity,
    canReconcile,
    estimatedLoss,
  };
}

/**
 * Check for decorative edits (properties that don't affect theory)
 */
function checkDecorativeEdits(
  original: SongModel_v1,
  edited: SongModel_v1,
  derivation: DerivationRecord,
  edits: ClassifiedEdit[]
): void {
  // Tempo changes are decorative (don't affect rhythm theory)
  if (original.tempo !== edited.tempo) {
    edits.push({
      type: EditType.DECORATIVE,
      confidence: 1.0,
      ambiguity: 0.0,
      description: `Tempo changed from ${original.tempo} to ${edited.tempo}`,
    });
  }

  // Time signature changes are structural (affect rhythm theory)
  if (
    original.timeSignature &&
    edited.timeSignature &&
    (original.timeSignature[0] !== edited.timeSignature[0] ||
      original.timeSignature[1] !== edited.timeSignature[1])
  ) {
    edits.push({
      type: EditType.STRUCTURAL,
      confidence: 0.5,
      ambiguity: 0.5,
      description: `Time signature changed from ${original.timeSignature.join("/")} to ${edited.timeSignature.join("/")}`,
      affectedSystems: derivation.executionPhases.flat().filter((id) => id.startsWith("rhythm:")),
    });
  }

  // Key changes are structural (affect melody/harmony theory)
  if (original.key !== undefined && edited.key !== undefined && original.key !== edited.key) {
    edits.push({
      type: EditType.STRUCTURAL,
      confidence: 0.7,
      ambiguity: 0.3,
      description: `Key changed from ${original.key} to ${edited.key}`,
      affectedSystems: derivation.executionPhases
        .flat()
        .filter((id) => id.startsWith("melody:") || id.startsWith("harmony:")),
    });
  }
}

/**
 * Check for edits to notes
 */
function checkNoteEdits(
  original: SongModel_v1,
  edited: SongModel_v1,
  derivation: DerivationRecord,
  edits: ClassifiedEdit[]
): void {
  const originalNotes = original.notes;
  const editedNotes = edited.notes;

  // Note additions
  if (editedNotes.length > originalNotes.length) {
    const additionCount = editedNotes.length - originalNotes.length;

    // Check if additions fit within rhythmic tolerance
    const additionsFit = checkAdditionsFit(originalNotes, editedNotes);

    edits.push({
      type: additionsFit ? EditType.STRUCTURAL : EditType.DESTRUCTIVE,
      confidence: additionsFit ? 0.6 : 0.2,
      ambiguity: additionsFit ? 0.4 : 0.0,
      description: `${additionCount} notes added`,
      noteIndices: Array.from({ length: additionCount }, (_, i) => originalNotes.length + i),
    });
  }

  // Note deletions
  if (editedNotes.length < originalNotes.length) {
    const deletionCount = originalNotes.length - editedNotes.length;

    // Check if deletions maintain rhythmic integrity
    const deletionsMaintain = checkDeletionsMaintain(originalNotes, editedNotes);

    edits.push({
      type: deletionsMaintain ? EditType.STRUCTURAL : EditType.DESTRUCTIVE,
      confidence: deletionsMaintain ? 0.6 : 0.2,
      ambiguity: deletionsMaintain ? 0.4 : 0.0,
      description: `${deletionCount} notes deleted`,
      noteIndices: Array.from({ length: deletionCount }, (_, i) => editedNotes.length + i),
    });
  }

  // Note modifications (pitch, time, velocity, duration)
  const modificationCount = Math.min(originalNotes.length, editedNotes.length);
  const modifiedIndices: number[] = [];

  for (let i = 0; i < modificationCount; i++) {
    const origNote = originalNotes[i];
    const editNote = editedNotes[i];

    // Pitch changes (structural)
    if (origNote.pitch !== editNote.pitch) {
      const intervalChange = Math.abs(editNote.pitch - origNote.pitch);

      // Small interval changes (< octave) are structural, large are destructive
      if (intervalChange < 12) {
        edits.push({
          type: EditType.STRUCTURAL,
          confidence: 0.7,
          ambiguity: 0.3,
          description: `Note ${i}: pitch changed by ${intervalChange} semitones`,
          noteIndices: [i],
        });
      } else {
        edits.push({
          type: EditType.DESTRUCTIVE,
          confidence: 0.3,
          ambiguity: 0.0,
          description: `Note ${i}: pitch changed by ${intervalChange} semitones (large interval)`,
          noteIndices: [i],
        });
      }
      modifiedIndices.push(i);
    }

    // Time changes (structural - affects rhythm)
    if (
      origNote.time !== undefined &&
      editNote.time !== undefined &&
      origNote.time !== editNote.time
    ) {
      const timeDelta = Math.abs(editNote.time - origNote.time);

      // Small timing changes (< 1 beat) are structural, large are destructive
      if (timeDelta < 1.0) {
        edits.push({
          type: EditType.STRUCTURAL,
          confidence: 0.6,
          ambiguity: 0.4,
          description: `Note ${i}: time shifted by ${timeDelta.toFixed(2)}`,
          noteIndices: [i],
          affectedSystems: derivation.executionPhases
            .flat()
            .filter((id) => id.startsWith("rhythm:")),
        });
      } else {
        edits.push({
          type: EditType.DESTRUCTIVE,
          confidence: 0.2,
          ambiguity: 0.0,
          description: `Note ${i}: time shifted by ${timeDelta.toFixed(2)} (large shift)`,
          noteIndices: [i],
          affectedSystems: derivation.executionPhases
            .flat()
            .filter((id) => id.startsWith("rhythm:")),
        });
      }
      modifiedIndices.push(i);
    }

    // Duration changes (decorative)
    if (origNote.duration !== editNote.duration) {
      edits.push({
        type: EditType.DECORATIVE,
        confidence: 1.0,
        ambiguity: 0.0,
        description: `Note ${i}: duration changed`,
        noteIndices: [i],
      });
      modifiedIndices.push(i);
    }

    // Velocity changes (decorative)
    if (origNote.velocity !== editNote.velocity) {
      edits.push({
        type: EditType.DECORATIVE,
        confidence: 1.0,
        ambiguity: 0.0,
        description: `Note ${i}: velocity changed`,
        noteIndices: [i],
      });
      modifiedIndices.push(i);
    }
  }
}

/**
 * Check for edits to song structure
 */
function checkStructureEdits(
  original: SongModel_v1,
  edited: SongModel_v1,
  _derivation: DerivationRecord,
  edits: ClassifiedEdit[]
): void {
  // Section additions
  if (edited.sections.length > original.sections.length) {
    edits.push({
      type: EditType.STRUCTURAL,
      confidence: 0.5,
      ambiguity: 0.5,
      description: `${edited.sections.length - original.sections.length} sections added`,
    });
  }

  // Section deletions
  if (edited.sections.length < original.sections.length) {
    edits.push({
      type: EditType.DESTRUCTIVE,
      confidence: 0.3,
      ambiguity: 0.0,
      description: `${original.sections.length - edited.sections.length} sections deleted`,
    });
  }

  // Duration changes
  if (Math.abs(original.duration - edited.duration) > 0.01) {
    edits.push({
      type: EditType.STRUCTURAL,
      confidence: 0.6,
      ambiguity: 0.4,
      description: `Duration changed from ${original.duration} to ${edited.duration}`,
    });
  }
}

/**
 * Check if note additions fit within rhythmic tolerance
 */
function checkAdditionsFit(original: Note[], edited: Note[]): boolean {
  // TODO: Implement proper tolerance checking
  // For now, assume additions fit if <= 20% of original
  const additionRatio = (edited.length - original.length) / original.length;
  return additionRatio <= 0.2;
}

/**
 * Check if note deletions maintain rhythmic integrity
 */
function checkDeletionsMaintain(original: Note[], edited: Note[]): boolean {
  // TODO: Implement proper integrity checking
  // For now, assume deletions maintain if <= 20% of original
  const deletionRatio = (original.length - edited.length) / original.length;
  return deletionRatio <= 0.2;
}

/**
 * Calculate overall confidence from classified edits
 */
function calculateOverallConfidence(edits: ClassifiedEdit[]): number {
  if (edits.length === 0) return 1.0;

  // Weighted average confidence by edit type
  const decorativeEdits = edits.filter((e) => e.type === EditType.DECORATIVE);
  const structuralEdits = edits.filter((e) => e.type === EditType.STRUCTURAL);
  const destructiveEdits = edits.filter((e) => e.type === EditType.DESTRUCTIVE);

  // Decorative: full confidence, Structural: reduced, Destructive: minimal
  const avgConfidence =
    (decorativeEdits.reduce((sum, e) => sum + e.confidence, 0) * 1.0 +
      structuralEdits.reduce((sum, e) => sum + e.confidence, 0) * 0.8 +
      destructiveEdits.reduce((sum, e) => sum + e.confidence, 0) * 0.1) /
    edits.length;

  return avgConfidence;
}

/**
 * Calculate overall ambiguity from classified edits
 */
function calculateOverallAmbiguity(edits: ClassifiedEdit[]): number {
  if (edits.length === 0) return 0.0;

  // Average ambiguity across all edits
  const avgAmbiguity = edits.reduce((sum, e) => sum + e.ambiguity, 0) / edits.length;

  return avgAmbiguity;
}

/**
 * Calculate estimated loss from reconciliation
 */
function calculateEstimatedLoss(edits: ClassifiedEdit[]): number {
  if (edits.length === 0) return 0.0;

  // Loss is sum of (1 - confidence) for structural/destructive edits
  const loss = edits
    .filter((e) => e.type !== EditType.DECORATIVE)
    .reduce((sum, e) => sum + (1 - e.confidence), 0);

  // Normalize by number of non-decorative edits
  const nonDecorativeCount = edits.filter((e) => e.type !== EditType.DECORATIVE).length;
  return nonDecorativeCount > 0 ? loss / nonDecorativeCount : 0.0;
}

/**
 * Get edit classification summary
 */
export function getClassificationSummary(classification: EditClassification): string {
  const lines: string[] = [];

  lines.push(`Overall Confidence: ${(classification.overallConfidence * 100).toFixed(0)}%`);
  lines.push(`Overall Ambiguity: ${(classification.overallAmbiguity * 100).toFixed(0)}%`);
  lines.push(`Can Reconcile: ${classification.canReconcile ? "Yes" : "No"}`);
  lines.push(`Estimated Loss: ${(classification.estimatedLoss * 100).toFixed(0)}%`);
  lines.push("");

  const decorativeCount = classification.edits.filter((e) => e.type === EditType.DECORATIVE).length;
  const structuralCount = classification.edits.filter((e) => e.type === EditType.STRUCTURAL).length;
  const destructiveCount = classification.edits.filter(
    (e) => e.type === EditType.DESTRUCTIVE
  ).length;

  lines.push(`Edits: ${classification.edits.length} total`);
  lines.push(`  - Decorative: ${decorativeCount}`);
  lines.push(`  - Structural: ${structuralCount}`);
  lines.push(`  - Destructive: ${destructiveCount}`);

  return lines.join("\n");
}
