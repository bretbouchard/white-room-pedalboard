/** Canonical SongIR (versioned, serializable) */
export interface MusicalTime {
  bars?: number;
  beats?: number;
  seconds?: number;
}
export interface SongIR_v1 {
  version: "1.0";
  songId: string;
  tempoMap: { time: MusicalTime; bpm: number }[]; // description only
  timeSignatureMap: {
    time: MusicalTime;
    numerator: number;
    denominator: number;
  }[];
  sections: SectionIR[];
  metadata?: Record<string, unknown>;
}
export interface SectionIR {
  sectionId: string;
  lengthBars: number;
  loopPolicy?: { enabled: boolean; startBar?: number; endBar?: number };
  tracks: TrackIR[];
}
export interface TrackIR {
  trackId: string;
  role: string; // musical role id
  instrumentRef?: string; // reference only
  pattern: PatternIR_v1;
}
export interface PatternIR_v1 {
  version: "1.0";
  baseRule: string; // rule identifier
  variationRule?: string;
  seed: string; // explicit, reproducible
}
export function toJSON(model: SongIR_v1): string {
  return JSON.stringify(model);
}
export function fromJSON(json: string): SongIR_v1 {
  return JSON.parse(json) as SongIR_v1;
}
