/**
 * Scale Knowledge Base - SDK Core Module
 * Comprehensive scale definitions optimized for multi-language compatibility
 */

import {
  Scale,
  Note,
  Mode,
  ScaleCharacteristics,
  MathematicalProperties,
  SymmetryProperties,
} from '../types';

/**
 * Scale definition optimized for SDK usage
 */
export interface SDKScaleDefinition {
  id: string;
  name: string;
  intervals: number[];
  modes: SDKModeDefinition[];
  characteristics: ScaleCharacteristics;
  mathematics: MathematicalProperties;
  metadata: {
    origin: string;
    period: string;
    theorists: string[];
    commonNames: string[];
  };
}

export interface SDKModeDefinition {
  id: string;
  name: string;
  degree: number;
  intervals: number[];
  characteristics: string[];
  contexts: string[];
  brightness: number;
  tension: number;
}

/**
 * Scale Knowledge Base class for SDK
 */
export class ScaleKnowledgeBase {
  private scales: Map<string, SDKScaleDefinition> = new Map();
  private modeIndex: Map<string, string> = new Map(); // mode name -> scale id
  private characteristicIndex: Map<string, string[]> = new Map(); // characteristic -> scale ids
  private initialized: boolean = false;

  constructor() {
    this.initializeScales();
  }

  /**
   * Initialize the scale database
   */
  private initializeScales(): void {
    const scaleDefinitions: SDKScaleDefinition[] = [
      {
        id: 'major',
        name: 'Major Scale',
        intervals: [0, 2, 4, 5, 7, 9, 11],
        modes: [
          {
            id: 'ionian',
            name: 'Ionian',
            degree: 1,
            intervals: [0, 2, 4, 5, 7, 9, 11],
            characteristics: ['bright', 'stable', 'consonant', 'tonal'],
            contexts: ['classical', 'pop', 'folk', 'country'],
            brightness: 8,
            tension: 2,
          },
          {
            id: 'dorian',
            name: 'Dorian',
            degree: 2,
            intervals: [0, 2, 3, 5, 7, 9, 10],
            characteristics: ['minor', 'jazzy', 'sophisticated', 'modal'],
            contexts: ['jazz', 'modal_jazz', 'rock', 'celtic'],
            brightness: 6,
            tension: 4,
          },
          {
            id: 'phrygian',
            name: 'Phrygian',
            degree: 3,
            intervals: [0, 1, 3, 5, 7, 8, 10],
            characteristics: ['dark', 'exotic', 'spanish', 'modal'],
            contexts: ['flamenco', 'metal', 'classical', 'middle_eastern'],
            brightness: 3,
            tension: 6,
          },
          {
            id: 'lydian',
            name: 'Lydian',
            degree: 4,
            intervals: [0, 2, 4, 6, 7, 9, 11],
            characteristics: ['bright', 'dreamy', 'floating', 'modal'],
            contexts: ['film_music', 'jazz', 'impressionist', 'ambient'],
            brightness: 9,
            tension: 5,
          },
          {
            id: 'mixolydian',
            name: 'Mixolydian',
            degree: 5,
            intervals: [0, 2, 4, 5, 7, 9, 10],
            characteristics: ['major', 'bluesy', 'dominant', 'modal'],
            contexts: ['blues', 'rock', 'folk', 'country'],
            brightness: 7,
            tension: 4,
          },
          {
            id: 'aeolian',
            name: 'Aeolian (Natural Minor)',
            degree: 6,
            intervals: [0, 2, 3, 5, 7, 8, 10],
            characteristics: ['minor', 'sad', 'natural', 'tonal'],
            contexts: ['pop', 'rock', 'classical', 'folk'],
            brightness: 4,
            tension: 3,
          },
          {
            id: 'locrian',
            name: 'Locrian',
            degree: 7,
            intervals: [0, 1, 3, 5, 6, 8, 10],
            characteristics: ['unstable', 'diminished', 'theoretical', 'modal'],
            contexts: ['jazz_theory', 'metal', 'experimental', 'academic'],
            brightness: 2,
            tension: 9,
          },
        ],
        characteristics: {
          quality: 'major',
          tension: 2,
          brightness: 8,
          symmetry: {
            isSymmetrical: false,
            type: 'translational',
            axis: 0,
            order: 1,
          },
          genres: ['classical', 'pop', 'folk', 'country', 'jazz'],
          cultures: ['western', 'european', 'american'],
        },
        mathematics: {
          symmetryGroups: [2, 2, 1, 2, 2, 2, 1],
          intervalRatios: [1, 9/8, 5/4, 4/3, 3/2, 5/3, 15/8, 2],
          pattern: 'Diatonic heptatonic scale',
          generative: {
            base: [2, 2, 1, 2, 2, 2, 1],
            transformations: ['transposition', 'modal_rotation', 'inversion'],
            period: 12,
            symmetryAxis: 0,
          },
          interference: [],
        },
        metadata: {
          origin: 'Ancient Greece',
          period: 'Classical Antiquity',
          theorists: ['Pythagoras', 'Aristoxenus', 'Boethius'],
          commonNames: ['Ionian', 'Major', 'Do-Re-Mi'],
        },
      },

      {
        id: 'harmonic_minor',
        name: 'Harmonic Minor Scale',
        intervals: [0, 2, 3, 5, 7, 8, 11],
        modes: [
          {
            id: 'harmonic_minor',
            name: 'Harmonic Minor',
            degree: 1,
            intervals: [0, 2, 3, 5, 7, 8, 11],
            characteristics: ['minor', 'exotic', 'classical', 'augmented_second'],
            contexts: ['classical', 'metal', 'middle_eastern', 'gypsy'],
            brightness: 4,
            tension: 7,
          },
          {
            id: 'locrian_natural6',
            name: 'Locrian ♮6',
            degree: 2,
            intervals: [0, 1, 3, 5, 6, 9, 10],
            characteristics: ['diminished', 'exotic', 'unstable'],
            contexts: ['jazz_theory', 'metal', 'experimental'],
            brightness: 3,
            tension: 8,
          },
          {
            id: 'ionian_sharp5',
            name: 'Ionian ♯5',
            degree: 3,
            intervals: [0, 2, 4, 5, 8, 9, 11],
            characteristics: ['augmented', 'exotic', 'major'],
            contexts: ['jazz', 'experimental', 'film_music'],
            brightness: 7,
            tension: 6,
          },
          {
            id: 'dorian_sharp4',
            name: 'Dorian ♯4',
            degree: 4,
            intervals: [0, 2, 3, 6, 7, 9, 10],
            characteristics: ['minor', 'augmented_fourth', 'exotic'],
            contexts: ['jazz', 'fusion', 'progressive'],
            brightness: 5,
            tension: 6,
          },
          {
            id: 'phrygian_dominant',
            name: 'Phrygian Dominant',
            degree: 5,
            intervals: [0, 1, 4, 5, 7, 8, 10],
            characteristics: ['exotic', 'spanish', 'dominant', 'middle_eastern'],
            contexts: ['flamenco', 'metal', 'middle_eastern', 'gypsy'],
            brightness: 5,
            tension: 7,
          },
          {
            id: 'lydian_sharp2',
            name: 'Lydian ♯2',
            degree: 6,
            intervals: [0, 3, 4, 6, 7, 9, 11],
            characteristics: ['augmented', 'exotic', 'bright'],
            contexts: ['jazz', 'experimental', 'avant_garde'],
            brightness: 8,
            tension: 7,
          },
          {
            id: 'altered_diminished',
            name: 'Altered Diminished',
            degree: 7,
            intervals: [0, 1, 3, 4, 6, 8, 9],
            characteristics: ['diminished', 'altered', 'chromatic'],
            contexts: ['jazz', 'bebop', 'experimental'],
            brightness: 2,
            tension: 9,
          },
        ],
        characteristics: {
          quality: 'minor',
          tension: 7,
          brightness: 4,
          symmetry: {
            isSymmetrical: false,
            type: undefined,
            axis: undefined,
            order: 1,
          },
          genres: ['classical', 'metal', 'middle_eastern', 'flamenco', 'gypsy'],
          cultures: ['european', 'middle_eastern', 'romani', 'spanish'],
        },
        mathematics: {
          symmetryGroups: [2, 1, 2, 2, 1, 3, 1],
          intervalRatios: [1, 9/8, 6/5, 4/3, 3/2, 8/5, 15/8, 2],
          pattern: 'Harmonic minor with augmented second',
          generative: {
            base: [2, 1, 2, 2, 1, 3, 1],
            transformations: ['transposition', 'modal_rotation'],
            period: 12,
          },
          interference: [],
        },
        metadata: {
          origin: 'Baroque Europe',
          period: 'Baroque',
          theorists: ['J.S. Bach', 'Rameau', 'Fux'],
          commonNames: ['Harmonic Minor', 'Classical Minor'],
        },
      },

      {
        id: 'pentatonic_major',
        name: 'Major Pentatonic Scale',
        intervals: [0, 2, 4, 7, 9],
        modes: [
          {
            id: 'major_pentatonic',
            name: 'Major Pentatonic',
            degree: 1,
            intervals: [0, 2, 4, 7, 9],
            characteristics: ['major', 'simple', 'folk', 'consonant'],
            contexts: ['folk', 'country', 'pop', 'world_music'],
            brightness: 8,
            tension: 1,
          },
          {
            id: 'suspended_pentatonic',
            name: 'Suspended Pentatonic',
            degree: 2,
            intervals: [0, 2, 5, 7, 10],
            characteristics: ['suspended', 'open', 'modal'],
            contexts: ['folk', 'world_music', 'ambient'],
            brightness: 6,
            tension: 3,
          },
          {
            id: 'man_gong',
            name: 'Man Gong',
            degree: 3,
            intervals: [0, 3, 5, 8, 10],
            characteristics: ['minor', 'pentatonic', 'asian'],
            contexts: ['asian_music', 'world_music', 'meditation'],
            brightness: 4,
            tension: 2,
          },
          {
            id: 'ritusen',
            name: 'Ritusen',
            degree: 4,
            intervals: [0, 2, 5, 7, 9],
            characteristics: ['japanese', 'pentatonic', 'modal'],
            contexts: ['japanese_music', 'world_music', 'film_music'],
            brightness: 7,
            tension: 2,
          },
          {
            id: 'minor_pentatonic',
            name: 'Minor Pentatonic',
            degree: 5,
            intervals: [0, 3, 5, 7, 10],
            characteristics: ['minor', 'blues', 'rock', 'simple'],
            contexts: ['blues', 'rock', 'folk', 'world_music'],
            brightness: 4,
            tension: 2,
          },
        ],
        characteristics: {
          quality: 'major',
          tension: 1,
          brightness: 7,
          symmetry: {
            isSymmetrical: false,
            type: undefined,
            axis: undefined,
            order: 1,
          },
          genres: ['folk', 'country', 'pop', 'world_music', 'blues'],
          cultures: ['global', 'asian', 'african', 'celtic'],
        },
        mathematics: {
          symmetryGroups: [2, 2, 3, 2, 3],
          intervalRatios: [1, 9/8, 5/4, 3/2, 5/3, 2],
          pattern: 'Anhemitonic pentatonic',
          generative: {
            base: [2, 2, 3, 2, 3],
            transformations: ['transposition', 'modal_rotation'],
            period: 12,
          },
          interference: [],
        },
        metadata: {
          origin: 'Ancient China',
          period: 'Ancient',
          theorists: ['Ancient Chinese', 'Folk traditions'],
          commonNames: ['Pentatonic', 'Five-tone scale', 'Gong scale'],
        },
      },

      {
        id: 'blues',
        name: 'Blues Scale',
        intervals: [0, 3, 5, 6, 7, 10],
        modes: [
          {
            id: 'blues',
            name: 'Blues Scale',
            degree: 1,
            intervals: [0, 3, 5, 6, 7, 10],
            characteristics: ['blues', 'minor', 'chromatic', 'expressive'],
            contexts: ['blues', 'jazz', 'rock', 'soul'],
            brightness: 3,
            tension: 5,
          },
        ],
        characteristics: {
          quality: 'minor',
          tension: 5,
          brightness: 3,
          symmetry: {
            isSymmetrical: false,
            type: undefined,
            axis: undefined,
            order: 1,
          },
          genres: ['blues', 'jazz', 'rock', 'soul', 'funk'],
          cultures: ['african_american', 'american', 'western'],
        },
        mathematics: {
          symmetryGroups: [3, 2, 1, 1, 3, 2],
          intervalRatios: [1, 6/5, 4/3, 7/5, 3/2, 9/5, 2],
          pattern: 'Hexatonic with blue notes',
          generative: {
            base: [3, 2, 1, 1, 3, 2],
            transformations: ['transposition', 'blue_note_variation'],
            period: 12,
          },
          interference: [],
        },
        metadata: {
          origin: 'African American communities',
          period: '19th century',
          theorists: ['W.C. Handy', 'Blues musicians'],
          commonNames: ['Blues Scale', 'Blue Notes Scale'],
        },
      },

      {
        id: 'whole_tone',
        name: 'Whole Tone Scale',
        intervals: [0, 2, 4, 6, 8, 10],
        modes: [
          {
            id: 'whole_tone',
            name: 'Whole Tone',
            degree: 1,
            intervals: [0, 2, 4, 6, 8, 10],
            characteristics: ['symmetrical', 'dreamy', 'impressionist', 'floating'],
            contexts: ['impressionist', 'jazz', 'film_music', 'ambient'],
            brightness: 6,
            tension: 8,
          },
        ],
        characteristics: {
          quality: 'synthetic',
          tension: 8,
          brightness: 6,
          symmetry: {
            isSymmetrical: true,
            type: 'rotational',
            axis: 6,
            order: 6,
          },
          genres: ['impressionist', 'jazz', 'film_music', 'contemporary'],
          cultures: ['western', 'european', 'modern'],
        },
        mathematics: {
          symmetryGroups: [2, 2, 2, 2, 2, 2],
          intervalRatios: [1, 9/8, 5/4, 45/32, 8/5, 9/5, 2],
          pattern: 'Perfect symmetry - whole tone',
          generative: {
            base: [2, 2, 2, 2, 2, 2],
            transformations: ['transposition', 'augmented_triad_cycles'],
            period: 2,
            symmetryAxis: 6,
          },
          interference: [],
        },
        metadata: {
          origin: 'Impressionist composers',
          period: 'Late 19th century',
          theorists: ['Claude Debussy', 'Maurice Ravel'],
          commonNames: ['Whole Tone', 'Hexatonic'],
        },
      },

      {
        id: 'diminished',
        name: 'Diminished Scale',
        intervals: [0, 1, 3, 4, 6, 7, 9, 10],
        modes: [
          {
            id: 'half_whole_diminished',
            name: 'Half-Whole Diminished',
            degree: 1,
            intervals: [0, 1, 3, 4, 6, 7, 9, 10],
            characteristics: ['symmetrical', 'diminished', 'jazz', 'chromatic'],
            contexts: ['jazz', 'bebop', 'classical', 'contemporary'],
            brightness: 5,
            tension: 9,
          },
          {
            id: 'whole_half_diminished',
            name: 'Whole-Half Diminished',
            degree: 2,
            intervals: [0, 2, 3, 5, 6, 8, 9, 11],
            characteristics: ['symmetrical', 'dominant', 'jazz', 'altered'],
            contexts: ['jazz', 'bebop', 'dominant_chords', 'fusion'],
            brightness: 6,
            tension: 8,
          },
        ],
        characteristics: {
          quality: 'synthetic',
          tension: 9,
          brightness: 5,
          symmetry: {
            isSymmetrical: true,
            type: 'rotational',
            axis: 3,
            order: 4,
          },
          genres: ['jazz', 'bebop', 'classical', 'contemporary'],
          cultures: ['western', 'jazz_tradition'],
        },
        mathematics: {
          symmetryGroups: [1, 2, 1, 2, 1, 2, 1, 2],
          intervalRatios: [1, 16/15, 6/5, 5/4, 7/5, 3/2, 8/5, 9/5, 2],
          pattern: 'Octatonic symmetry',
          generative: {
            base: [1, 2, 1, 2, 1, 2, 1, 2],
            transformations: ['transposition', 'diminished_chord_cycles'],
            period: 3,
            symmetryAxis: 3,
          },
          interference: [],
        },
        metadata: {
          origin: 'Classical and Jazz traditions',
          period: '19th-20th century',
          theorists: ['Rimsky-Korsakov', 'Messiaen', 'Jazz theorists'],
          commonNames: ['Diminished', 'Octatonic', 'Symmetric'],
        },
      },
    ];

    // Initialize scales and indices
    for (const scale of scaleDefinitions) {
      this.scales.set(scale.id, scale);
      
      // Index modes
      for (const mode of scale.modes) {
        this.modeIndex.set(mode.id, scale.id);
        this.modeIndex.set(mode.name.toLowerCase().replace(/\s+/g, '_'), scale.id);
      }
      
      // Index characteristics
      for (const genre of scale.characteristics.genres) {
        if (!this.characteristicIndex.has(genre)) {
          this.characteristicIndex.set(genre, []);
        }
        this.characteristicIndex.get(genre)!.push(scale.id);
      }
      
      for (const culture of scale.characteristics.cultures) {
        if (!this.characteristicIndex.has(culture)) {
          this.characteristicIndex.set(culture, []);
        }
        this.characteristicIndex.get(culture)!.push(scale.id);
      }
    }

    this.initialized = true;
  }

  /**
   * Get scale by ID or name
   */
  public async getScale(scaleId: string, tonic: string = 'C'): Promise<Scale> {
    if (!this.initialized) {
      throw new Error('Scale knowledge base not initialized');
    }

    const scaleDefinition = this.scales.get(scaleId.toLowerCase());
    if (!scaleDefinition) {
      throw new Error(`Scale not found: ${scaleId}`);
    }

    return this.createScaleInstance(scaleDefinition, tonic);
  }

  /**
   * Find scales by characteristics
   */
  public async findByCharacteristics(characteristics: string[]): Promise<Scale[]> {
    if (!this.initialized) {
      throw new Error('Scale knowledge base not initialized');
    }

    const scaleIds = new Set<string>();
    
    for (const characteristic of characteristics) {
      const matchingScales = this.characteristicIndex.get(characteristic.toLowerCase());
      if (matchingScales) {
        for (const scaleId of matchingScales) {
          scaleIds.add(scaleId);
        }
      }
    }

    const scales: Scale[] = [];
    for (const scaleId of scaleIds) {
      const scale = await this.getScale(scaleId);
      scales.push(scale);
    }

    return scales;
  }

  /**
   * Get all available scales
   */
  public async getAllScales(): Promise<Scale[]> {
    if (!this.initialized) {
      throw new Error('Scale knowledge base not initialized');
    }

    const scales: Scale[] = [];
    for (const [scaleId] of this.scales) {
      const scale = await this.getScale(scaleId);
      scales.push(scale);
    }

    return scales;
  }

  /**
   * Export scale data for cross-language compatibility
   */
  public async exportData(): Promise<any> {
    return {
      scales: Array.from(this.scales.values()),
      modeIndex: Object.fromEntries(this.modeIndex),
      characteristicIndex: Object.fromEntries(this.characteristicIndex),
      version: '1.0.0',
      format: 'sdk_scale_data',
    };
  }

  /**
   * Create a scale instance with specific tonic
   */
  private createScaleInstance(definition: SDKScaleDefinition, tonic: string): Scale {
    const tonicNote = this.createNote(tonic, 4); // Default to 4th octave
    
    return {
      id: definition.id,
      name: definition.name,
      tonic: tonicNote,
      intervals: definition.intervals,
      degrees: this.createScaleDegrees(definition.intervals, tonicNote),
      modes: definition.modes.map(mode => this.createModeInstance(mode)),
      characteristics: definition.characteristics,
      mathematics: definition.mathematics,
    };
  }

  /**
   * Create scale degrees
   */
  private createScaleDegrees(intervals: number[], tonic: Note): any[] {
    const degreeNames = ['tonic', 'supertonic', 'mediant', 'subdominant', 'dominant', 'submediant', 'leading_tone'];
    const functions = ['tonic', 'supertonic', 'mediant', 'subdominant', 'dominant', 'submediant', 'leading_tone'];
    
    return intervals.map((interval, index) => ({
      degree: index + 1,
      note: this.transposeNote(tonic, interval),
      name: degreeNames[index] || `degree_${index + 1}`,
      function: functions[index] || 'tonic',
    }));
  }

  /**
   * Create mode instance
   */
  private createModeInstance(modeDefinition: SDKModeDefinition): Mode {
    return {
      name: modeDefinition.name,
      degree: modeDefinition.degree,
      intervals: modeDefinition.intervals,
      characteristics: modeDefinition.characteristics,
      contexts: modeDefinition.contexts,
    };
  }

  /**
   * Create note instance
   */
  private createNote(noteName: string, octave: number = 4): Note {
    const noteMap: Record<string, number> = {
      'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
      'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
      'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
    };

    const pitchClass = noteMap[noteName] ?? 0;
    const midi = (octave + 1) * 12 + pitchClass;

    return {
      midi,
      name: `${noteName}${octave}`,
      octave,
      pitchClass,
      frequency: 440 * Math.pow(2, (midi - 69) / 12),
      accidental: noteName.includes('#') ? 'sharp' : noteName.includes('b') ? 'flat' : 'natural',
    };
  }

  /**
   * Transpose note by semitones
   */
  private transposeNote(note: Note, semitones: number): Note {
    const newMidi = note.midi + semitones;
    const newOctave = Math.floor(newMidi / 12) - 1;
    const newPitchClass = newMidi % 12;
    
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const newNoteName = noteNames[newPitchClass];

    return this.createNote(newNoteName, newOctave);
  }
}

export default ScaleKnowledgeBase;
