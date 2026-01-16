export * from './types/index';
export * from './errors/index';
export * from './utils/index';
export * from './math/index';
export * from './cache/index';
export * from './auth/index';
export * from './fields/index';
export * from './realization/index';

// Explicitly export key types to ensure they're available
export {
  RhythmPattern,
  ChordProgression,
  MelodyLine,
  Composition,
  Section,
  SectionType,
  // Configuration types
  SDKOptions,
  // Analysis types
  RhythmAnalysis,
  HarmonicAnalysis,
  MelodicAnalysis,
  CompositionAnalysis,
  StructuralAnalysis,
  SectionAnalysis,
  TransitionAnalysis,
  PhraseAnalysis,
  SchillingerEncoding,
  // Re-export auth types to resolve conflicts
  AuthCredentials,
  AuthResult,
  AuthState,
  Permission,
  TokenInfo,
  UserInfo,
} from './types/index';

export {
  AuthenticationError,
  ValidationError,
  RateLimitError,
  SchillingerError,
  QuotaExceededError,
  ProcessingError,
  NetworkError,
  ConfigurationError,
  ErrorHandler,
} from './errors/index';

export {
  ValidationUtils,
  CacheUtils,
  MathUtils,
  HttpUtils,
  RetryManager,
  TypeConverter,
  StringUtils,
} from './utils/index';

export {
  AuthManager,
  AuthManagerOptions,
  PermissionResult,
} from './auth/index';
