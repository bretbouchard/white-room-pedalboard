/**
 * Chord Knowledge Base
 * Provides chord quality database and lookup functionality
 */

export class ChordKnowledgeBase {
  private chords: Map<string, any> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Initialize common chord qualities
    const qualities = [
      "major",
      "minor",
      "diminished",
      "augmented",
      "7th",
      "maj7",
      "min7",
      "dim7",
    ];
    qualities.forEach((q) => this.chords.set(q, { quality: q, intervals: [] }));
  }

  getChord(quality: string): any {
    return this.chords.get(quality);
  }

  hasChord(quality: string): boolean {
    return this.chords.has(quality);
  }
}
