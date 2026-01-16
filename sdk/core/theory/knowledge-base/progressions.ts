/**
 * Progression Knowledge Base
 * Provides common chord progressions and patterns
 */

export class ProgressionKnowledgeBase {
  private progressions: Map<string, any[]> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Initialize common progressions
    this.progressions.set("ii-V-I", [
      { chord: "ii", function: "subdominant" },
      { chord: "V", function: "dominant" },
      { chord: "I", function: "tonic" },
    ]);

    this.progressions.set("I-IV-V-I", [
      { chord: "I", function: "tonic" },
      { chord: "IV", function: "subdominant" },
      { chord: "V", function: "dominant" },
      { chord: "I", function: "tonic" },
    ]);
  }

  getProgression(name: string): any[] | undefined {
    return this.progressions.get(name);
  }

  hasProgression(name: string): boolean {
    return this.progressions.has(name);
  }

  listProgressions(): string[] {
    return Array.from(this.progressions.keys());
  }
}
