export enum MusicalKey {
  C_MAJOR = "C",
  C_SHARP_MAJOR = "C#",
  D_FLAT_MAJOR = "Db",
  D_MAJOR = "D",
  D_SHARP_MAJOR = "D#",
  E_FLAT_MAJOR = "Eb",
  E_MAJOR = "E",
  F_MAJOR = "F",
  F_SHARP_MAJOR = "F#",
  G_FLAT_MAJOR = "Gb",
  G_MAJOR = "G",
  G_SHARP_MAJOR = "G#",
  A_FLAT_MAJOR = "Ab",
  A_MAJOR = "A",
  A_SHARP_MAJOR = "A#",
  B_FLAT_MAJOR = "Bb",
  B_MAJOR = "B",
  C_MINOR = "Cm",
  C_SHARP_MINOR = "C#m",
  D_MINOR = "Dm",
  D_SHARP_MINOR = "D#m",
  E_FLAT_MINOR = "Ebm",
  E_MINOR = "Em",
  F_MINOR = "Fm",
  F_SHARP_MINOR = "F#m",
  G_MINOR = "Gm",
  G_SHARP_MINOR = "G#m",
  A_FLAT_MINOR = "Abm",
  A_MINOR = "Am",
  A_SHARP_MINOR = "A#m",
  B_FLAT_MINOR = "Bbm",
  B_MINOR = "Bm",
}

export interface TimeSignature {
  numerator: number;
  denominator: number;
}

export enum MusicalStyle {
  CLASSICAL = "classical",
  JAZZ = "jazz",
  BLUES = "blues",
  ROCK = "rock",
  POP = "pop",
  ELECTRONIC = "electronic",
  TECHNO = "techno",
  HOUSE = "house",
  TRANCE = "trance",
  DUBSTEP = "dubstep",
  AMBIENT = "ambient",
  FOLK = "folk",
  COUNTRY = "country",
  R_AND_B = "r_and_b",
  HIP_HOP = "hip_hop",
  REGGAE = "reggae",
  LATIN = "latin",
  WORLD = "world",
  EXPERIMENTAL = "experimental",
  FUNK = "funk",
}

export interface HarmonicProgression {
  chords: string[];
  progression_type: string;
  harmonic_rhythm: number;
  modulations?: string[];
}

export interface SchillingerContext {
  composition_id?: string;
  rhythmic_patterns?: string[];
  pitch_scales?: string[];
  interference_patterns?: Record<string, any>[];
  symmetrical_structures?: Record<string, any>[];
  correlation_techniques?: string[];
}

export interface CompositionStructure {
  sections: string[];
  section_lengths: Record<string, number>;
  form: string;
  total_measures: number;
}

export interface CompositionContext {
  clerk_user_id?: string;
  tempo: number;
  key_signature: MusicalKey;
  time_signature: TimeSignature;
  style: MusicalStyle;
  harmonic_progression?: HarmonicProgression;
  structure?: CompositionStructure;
  schillinger_context?: SchillingerContext;
  instrumentation?: string[];
  arrangement_density?: number;
  dynamic_markings?: string[];
  articulation_markings?: string[];
  composer?: string;
  title?: string;
  creation_date?: string;
}

export enum AudioFormat {
  WAV = "wav",
  MP3 = "mp3",
  FLAC = "flac",
  AIFF = "aiff",
  OGG = "ogg",
}

export interface SpectralFeatures {
  centroid: number;
  rolloff: number;
  flux: number;
  bandwidth: number;
  flatness: number;
  mfcc: number[];
}

export interface DynamicFeatures {
  rms_level: number;
  peak_level: number;
  dynamic_range: number;
  transient_density: number;
  zero_crossing_rate: number;
}

export interface HarmonicFeatures {
  fundamental_freq?: number;
  harmonic_content?: number[];
  inharmonicity: number;
  pitch_clarity: number;
}

export interface PerceptualFeatures {
  loudness_lufs: number;
  perceived_brightness: number;
  perceived_warmth: number;
  roughness: number;
  sharpness: number;
}

export interface SpatialFeatures {
  stereo_width: number;
  phase_correlation: number;
  balance: number;
}

export interface FrequencyBalance {
  bass: number;
  low_mid: number;
  mid: number;
  high_mid: number;
  treble: number;
}

export interface AudioFeatures {
  spectral: SpectralFeatures;
  dynamic: DynamicFeatures;
  harmonic: HarmonicFeatures;
  perceptual: PerceptualFeatures;
  spatial: SpatialFeatures;
  frequency_balance: FrequencyBalance;
}

export interface AudioAnalysis {
  clerk_user_id?: string;
  daid?: string;
  timestamp: number;
  sample_rate: number;
  duration: number;
  channels: number;
  format: AudioFormat;
  features: AudioFeatures;
  analysis_version?: string;
  confidence?: number;
  suggested_actions?: string[];
}

export enum ExperienceLevel {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
  PROFESSIONAL = "professional",
}

export enum PreferredWorkflow {
  AUTOMATIC = "automatic",
  GUIDED = "guided",
  COLLABORATIVE = "collaborative",
  MANUAL = "manual",
}

export enum AudioQualityPreference {
  BROADCAST = "broadcast",
  STREAMING = "streaming",
  MASTERING = "mastering",
  CUSTOM = "custom",
}

export interface PluginPreferences {
  preferred_brands?: string[];
  preferred_formats?: string[];
  preferred_categories?: string[];
  avoided_brands?: string[];
  cpu_efficiency_priority?: number;
  vintage_vs_modern?: number;
  complexity_preference?: number;
}

export interface MixingPreferences {
  target_loudness?: number;
  dynamic_range_preference?: number;
  stereo_width_preference?: number;
  frequency_balance_preference?: Record<string, number>;
  reverb_preference?: number;
}

export interface LearningPreferences {
  feedback_frequency?: number;
  explanation_detail?: number;
  learning_rate?: number;
  remember_corrections?: boolean;
  share_learning_data?: boolean;
}

export interface UserPreferences {
  clerk_user_id: string;
  plugin_preferences?: PluginPreferences;
  mixing_preferences?: MixingPreferences;
  learning_preferences?: LearningPreferences;
  audio_quality_preference?: AudioQualityPreference;
  auto_save_frequency?: number;
  undo_history_size?: number;
  enable_notifications?: boolean;
  notification_types?: string[];
  allow_telemetry?: boolean;
  allow_crash_reports?: boolean;
  last_updated?: string;
  version?: string;
}
