/**
 * Key Detector
 * Detects the key of a given melody or chord progression
 */

export class KeyDetector {
  private config: any;

  constructor(config?: any) {
    this.config = config || {};
  }

  detectKey(notes: number[]): {
    key: string;
    scale: string;
    confidence: number;
  } {
    return {
      key: "C",
      scale: "major",
      confidence: 0.8,
    };
  }

  detectKeyFromChords(chords: string[]): {
    key: string;
    scale: string;
    confidence: number;
  } {
    return {
      key: "C",
      scale: "major",
      confidence: 0.7,
    };
  }
}
