export type MusicalKey = 'C_MAJOR' | 'G_MAJOR' | 'D_MAJOR' | 'A_MAJOR' | 'E_MAJOR' | 'B_MAJOR' | 'F_SHARP_MAJOR' | 'C_SHARP_MAJOR' | 'F_MAJOR' | 'B_FLAT_MAJOR' | 'E_FLAT_MAJOR' | 'A_FLAT_MAJOR' | 'D_FLAT_MAJOR' | 'G_FLAT_MAJOR' | 'C_FLAT_MAJOR' | 'A_MINOR' | 'E_MINOR' | 'B_MINOR' | 'F_SHARP_MINOR' | 'C_SHARP_MINOR' | 'G_SHARP_MINOR' | 'D_SHARP_MINOR' | 'A_SHARP_MINOR' | 'D_MINOR' | 'G_MINOR' | 'C_MINOR' | 'F_MINOR' | 'B_FLAT_MINOR' | 'E_FLAT_MINOR' | 'A_FLAT_MINOR';

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export type MusicalStyle = 'CLASSICAL' | 'JAZZ' | 'ROCK' | 'POP' | 'ELECTRONIC' | 'HIP_HOP' | 'BLUES' | 'COUNTRY' | 'REGGAE' | 'FUNK' | 'SOUL' | 'FOLK' | 'METAL' | 'PUNK' | 'AMBIENT' | 'OTHER';

export interface HarmonicProgression {
  chords: string[];
  progression_type?: string;
  harmonic_rhythm?: number;
  modulations?: string[];
}

export interface CompositionStructure {
  sections: string[];
  section_lengths?: Record<string, number>;
  form?: string;
  total_measures?: number;
}

export interface SchillingerContext {
  composition_id?: string;
  rhythmic_patterns?: string[];
  pitch_scales?: string[];
  interference_patterns?: any[];
  symmetrical_structures?: any[];
  correlation_techniques?: string[];
}

export interface CompositionContext {
  composition_id?: string;
  tempo: number;
  key_signature: MusicalKey;
  time_signature: TimeSignature;
  style: MusicalStyle;
  harmonic_progression?: HarmonicProgression;
  structure?: CompositionStructure;
  schillinger_context?: SchillingerContext;
  instrumentation?: string[];
  arrangement_density?: number;
  title?: string;
  composer?: string;
}
