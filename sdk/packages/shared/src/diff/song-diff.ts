/** SongDiff: atomic, deterministic, serializable mutations for SongIR_v1 */
import type { SongIR_v1, SectionIR, PatternIR_v1 } from "../ir/song-ir";

export type SongDiff =
  | { type: "addSection"; section: SectionIR }
  | { type: "removeSection"; sectionId: string }
  | { type: "replacePattern"; trackId: string; pattern: PatternIR_v1 }
  | { type: "updateParameterRule"; trackId: string; rule: string }
  | { type: "changeSeed"; trackId: string; seed: string }
  | { type: "reorderTracks"; sectionId: string; order: string[] };

export interface DiffValidation {
  valid: boolean;
  error?: string;
}

export function validateSongDiff(
  model: SongIR_v1,
  diff: SongDiff,
): DiffValidation {
  switch (diff.type) {
    case "addSection":
      if (!diff.section?.sectionId)
        return { valid: false, error: "sectionId required" };
      return { valid: true };
    case "removeSection":
      if (!model.sections.find((s) => s.sectionId === diff.sectionId))
        return { valid: false, error: "section not found" };
      return { valid: true };
    case "replacePattern":
      if (!diff.trackId || !diff.pattern?.seed)
        return { valid: false, error: "trackId and pattern.seed required" };
      return { valid: true };
    case "updateParameterRule":
      if (!diff.trackId || !diff.rule)
        return { valid: false, error: "trackId and rule required" };
      return { valid: true };
    case "changeSeed":
      if (!diff.trackId || !diff.seed)
        return { valid: false, error: "trackId and seed required" };
      return { valid: true };
    case "reorderTracks":
      if (!diff.sectionId || !Array.isArray(diff.order))
        return { valid: false, error: "sectionId and order required" };
      return { valid: true };
  }
}

export function applySongDiff(model: SongIR_v1, diff: SongDiff): SongIR_v1 {
  // pure, return new object
  const clone: SongIR_v1 = JSON.parse(JSON.stringify(model));
  switch (diff.type) {
    case "addSection":
      clone.sections = [...clone.sections, diff.section];
      return clone;
    case "removeSection":
      clone.sections = clone.sections.filter(
        (s) => s.sectionId !== diff.sectionId,
      );
      return clone;
    case "replacePattern":
      clone.sections = clone.sections.map((sec) => ({
        ...sec,
        tracks: sec.tracks.map((t) =>
          t.trackId === diff.trackId ? { ...t, pattern: diff.pattern } : t,
        ),
      }));
      return clone;
    case "updateParameterRule":
      clone.sections = clone.sections.map((sec) => ({
        ...sec,
        tracks: sec.tracks.map((t) =>
          t.trackId === diff.trackId
            ? { ...t, pattern: { ...t.pattern, baseRule: diff.rule } }
            : t,
        ),
      }));
      return clone;
    case "changeSeed":
      clone.sections = clone.sections.map((sec) => ({
        ...sec,
        tracks: sec.tracks.map((t) =>
          t.trackId === diff.trackId
            ? { ...t, pattern: { ...t.pattern, seed: diff.seed } }
            : t,
        ),
      }));
      return clone;
    case "reorderTracks":
      clone.sections = clone.sections.map((sec) =>
        sec.sectionId === diff.sectionId
          ? {
              ...sec,
              tracks: diff.order
                .map((id) => sec.tracks.find((t) => t.trackId === id)!)
                .filter(Boolean),
            }
          : sec,
      );
      return clone;
  }
}
