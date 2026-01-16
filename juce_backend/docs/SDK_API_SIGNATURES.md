# SDK API Signatures

This document provides the complete API signatures for the Schillinger SDK, covering all modules and their public interfaces.

## Core Adapter Interface

### Main Export

```typescript
// packages/core/src/index.ts
export class SchillingerSDK implements SchillingerAdapter {
  constructor(config?: Partial<SchillingerConfig>);

  // Configuration
  configure(config: Partial<SchillingerConfig>): Promise<void>;
  getConfig(): SchillingerConfig;

  // Health & Status
  healthCheck(): Promise<HealthStatus>;
  getCapabilities(): Promise<Capabilities>;

  // Core Operations
  generate(request: GenerationRequest): Promise<GenerationResponse>;
  analyze(request: AnalysisRequest): Promise<AnalysisResponse>;

  // Module access
  get patterns(): PatternSDK;
  get generation(): GenerationSDK;
  get analysis(): AnalysisSDK;
  get emotion(): EmotionSDK;
  get orchestration(): OrchestrationSDK;
  get mcp(): MCPSDK;
  get daid(): DAIDSDK;
}

// Factory function
export function createSDK(config?: Partial<SchillingerConfig>): SchillingerSDK;
```

## Pattern SDK

### Pattern Management

```typescript
// packages/core/src/services/patterns/pattern-sdk.ts
export class PatternSDK {
  // List patterns
  listPatterns(filter?: PatternFilter): Promise<PatternListResponse>;

  // Get specific pattern
  getPattern(id: string): Promise<Pattern>;
  getPatternByName(name: string): Promise<Pattern>;

  // Create patterns
  createPattern(request: PatternCreateRequest): Promise<Pattern>;
  generatePattern(request: PatternGenerationRequest): Promise<Pattern>;

  // Update patterns
  updatePattern(id: string, request: PatternUpdateRequest): Promise<Pattern>;

  // Delete patterns
  deletePattern(id: string): Promise<void>;

  // Validate patterns
  validatePattern(pattern: PatternData, options?: ValidationOptions): Promise<ValidationResult>;

  // Pattern operations
  duplicatePattern(id: string, newName?: string): Promise<Pattern>;
  exportPattern(id: string, format: 'json' | 'midi' | 'musicxml'): Promise<ExportResult>;
  importPattern(data: ImportData, format: 'json' | 'midi' | 'musicxml'): Promise<Pattern>;
}

// Types
export interface PatternFilter {
  type?: PatternType;
  tags?: string[];
  search?: string;
  createdBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'created' | 'modified' | 'type';
  sortOrder?: 'asc' | 'desc';
}

export interface PatternCreateRequest {
  name: string;
  type: PatternType;
  data: PatternData;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface PatternGenerationRequest {
  type: PatternType;
  parameters: GenerationParameters;
  constraints?: PatternConstraints;
  style?: StyleProfile;
  count?: number;
}

export enum PatternType {
  RHYTHM = 'rhythm',
  MELODY = 'melody',
  HARMONY = 'harmony',
  COMBINED = 'combined',
}

export interface PatternData {
  timeSignature: [number, number];
  tempo: number;
  notes: Note[];
  duration: number;
  key?: KeySignature;
}

export interface Note {
  pitch: number;           // MIDI note number
  startTime: number;       // Beats from start
  duration: number;        // Duration in beats
  velocity: number;        // 0-127
  isRest?: boolean;
  articulation?: Articulation;
}

export interface ValidationOptions {
  level: 'strict' | 'normal' | 'lenient';
  checkRules?: string[];
  context?: MusicalContext;
}

export interface ValidationResult {
  isValid: boolean;
  violations: ValidationViolation[];
  warnings: ValidationWarning[];
  score: number;            // 0-100 quality score
  suggestions: string[];
}
```

## Generation SDK

### Music Generation

```typescript
// packages/core/src/services/generation/generation-sdk.ts
export class GenerationSDK {
  // Core generation
  generate(request: GenerationRequest): Promise<GenerationResponse>;
  generateUnification(request: UnifiedGenerationRequest): Promise<UnifiedResponse>;

  // Specific generation types
  generateSequence(request: SequenceGenerationRequest): Promise<SequenceResponse>;
  generateChordProgression(request: ChordGenerationRequest): Promise<ChordProgressionResponse>;
  generateMelody(request: MelodyGenerationRequest): Promise<MelodyResponse>;
  generateRhythm(request: RhythmGenerationRequest): Promise<RhythmResponse>;

  // Advanced generation
  generateFromPrompt(request: PromptGenerationRequest): Promise<GenerationResponse>;
  generateVariations(baseId: string, options: VariationOptions): Promise<GenerationResponse[]>;
  generateAccompaniment(melodyId: string, style: AccompanimentStyle): Promise<AccompanimentResponse>;

  // Batch generation
  generateBatch(requests: GenerationRequest[]): Promise<GenerationResponse[]>;

  // Generation templates
  listTemplates(): Promise<GenerationTemplate[]>;
  generateFromTemplate(templateId: string, parameters: Record<string, any>): Promise<GenerationResponse>;

  // Generation history
  getHistory(filter?: GenerationFilter): Promise<GenerationRecord[]>;
  getGeneration(id: string): Promise<GenerationRecord>;
}

// Types
export interface GenerationRequest {
  type: GenerationType;
  parameters: GenerationParameters;
  constraints?: GenerationConstraints;
  style?: StyleProfile;
  metadata?: Record<string, any>;
  options?: GenerationOptions;
}

export enum GenerationType {
  PATTERN = 'pattern',
  SEQUENCE = 'sequence',
  CHORD_PROGRESSION = 'chord_progression',
  MELODY = 'melody',
  RHYTHM = 'rhythm',
  ACCOMPANIMENT = 'accompaniment',
  COMPOSITION = 'composition',
}

export interface GenerationParameters {
  // Musical parameters
  key?: KeySignature;
  scale?: ScaleType;
  timeSignature?: [number, number];
  tempo?: number;
  length?: number;         // In bars
  complexity?: number;     // 1-10

  // Generative parameters
  seed?: number;
  temperature?: number;    // 0-1, randomness
  topP?: number;          // Nucleus sampling
  repetitionPenalty?: number;

  // Pattern-specific
  pattern?: {
    generators?: number[];
    rhythmPattern?: number[];
    intervals?: number[];
    contour?: ContourType;
  };

  // Harmony-specific
  harmony?: {
    chordTypes?: ChordType[];
    progressionType?: ProgressionType;
    voiceLeading?: VoiceLeadingOptions;
  };

  // Melody-specific
  melody?: {
    range?: [number, number];  // MIDI note range
    contour?: ContourType;
    ornamentation?: boolean;
    articulation?: Articulation[];
  };
}

export interface GenerationConstraints {
  harmonicRules?: HarmonicRule[];
  melodicRules?: MelodicRule[];
  rhythmicRules?: RhythmicRule[];
  stylisticRules?: StylisticRule[];
  customRules?: CustomRule[];
}

export interface StyleProfile {
  genre?: MusicGenre;
  era?: MusicEra;
  artist?: string;
  characteristics?: StyleCharacteristics;
  instruments?: Instrument[];
}

export interface GenerationResponse {
  id: string;
  daid: string;
  type: GenerationType;
  result: GeneratedContent;
  metadata: GenerationMetadata;
  quality: QualityMetrics;
  provenance: ProvenanceInfo;
  alternatives?: AlternativeResult[];
}

export interface GeneratedContent {
  notes?: Note[];
  chords?: Chord[];
  patterns?: Pattern[];
  analysis?: ContentAnalysis;
  notation?: NotationData;
}

export interface GenerationMetadata {
  parameters: GenerationParameters;
  processingTime: number;
  algorithm: string;
  version: string;
  confidence: number;
  iterations: number;
  cacheHit: boolean;
}

export interface QualityMetrics {
  overall: number;          // 0-100
  harmonic: number;        // 0-100
  melodic: number;         // 0-100
  rhythmic: number;        // 0-100
  stylistic: number;       // 0-100
  creativity: number;      // 0-100
  coherence: number;       // 0-100
}

export interface AlternativeResult {
  content: GeneratedContent;
  quality: QualityMetrics;
  difference: number;      // How different from main result
}
```

## Analysis SDK

### Music Analysis

```typescript
// packages/core/src/services/analysis/analysis-sdk.ts
export class AnalysisSDK {
  // Core analysis
  analyze(request: AnalysisRequest): Promise<AnalysisResponse>;
  analyzeUnified(request: UnifiedAnalysisRequest): Promise<UnifiedAnalysisResponse>;

  // Specific analysis types
  analyzeHarmony(request: HarmonyAnalysisRequest): Promise<HarmonyAnalysis>;
  analyzeMelody(request: MelodyAnalysisRequest): Promise<MelodyAnalysis>;
  analyzeRhythm(request: RhythmAnalysisRequest): Promise<RhythmAnalysis>;
  analyzeStructure(request: StructureAnalysisRequest): Promise<StructureAnalysis>;

  // Pattern analysis
  analyzePattern(request: PatternAnalysisRequest): Promise<PatternAnalysis>;
  findPatterns(music: MusicalData, options: PatternFindingOptions): Promise<PatternMatch[]>;

  // Comparative analysis
  compare(request: ComparisonRequest): Promise<ComparisonResponse>;
  findSimilarity(target: string, candidates: string[]): Promise<SimilarityResult[]>;

  // Feature extraction
  extractFeatures(music: MusicalData, features: FeatureType[]): Promise<FeatureSet>;

  // Analysis history
  getAnalysisHistory(filter?: AnalysisFilter): Promise<AnalysisRecord[]>;
  getAnalysis(id: string): Promise<AnalysisRecord>;
}

// Types
export interface AnalysisRequest {
  type: AnalysisType;
  input: AnalysisInput;
  options?: AnalysisOptions;
  features?: FeatureType[];
  context?: AnalysisContext;
}

export enum AnalysisType {
  HARMONY = 'harmony',
  MELODY = 'melody',
  RHYTHM = 'rhythm',
  STRUCTURE = 'structure',
  PATTERN = 'pattern',
  STYLE = 'style',
  EMOTION = 'emotion',
  COMPREHENSIVE = 'comprehensive',
}

export interface AnalysisInput {
  content?: MusicalContent;
  reference?: string;      // Asset ID
  file?: FileData;
  url?: string;
}

export interface AnalysisOptions {
  depth: AnalysisDepth;
  granularity: AnalysisGranularity;
  include?: AnalysisInclude;
  exclude?: AnalysisExclude;
  customRules?: CustomAnalysisRule[];
}

export enum AnalysisDepth {
  SURFACE = 'surface',
  STRUCTURAL = 'structural',
  DEEP = 'deep',
  COMPREHENSIVE = 'comprehensive',
}

export enum AnalysisGranularity {
  NOTE = 'note',
  BEAT = 'beat',
  MEASURE = 'measure',
  PHRASE = 'phrase',
  SECTION = 'section',
  MOVEMENT = 'movement',
  PIECE = 'piece',
}

export interface HarmonyAnalysis {
  keySignature: KeySignature;
  tonalCenter: string;
  chordProgression: ChordProgressionAnalysis;
  harmonicFunctions: HarmonicFunction[];
  modulations: Modulation[];
  cadences: Cadence[];
  voiceLeading: VoiceLeadingAnalysis;
  harmonicComplexity: number;
}

export interface MelodyAnalysis {
  contour: ContourAnalysis;
  intervals: IntervalAnalysis;
  motifs: MelodicMotif[];
  ornamentation: OrnamentationAnalysis;
  range: MelodicRange;
  tessitura: TessituraAnalysis;
  phraseStructure: PhraseStructure;
  melodicComplexity: number;
}

export interface RhythmAnalysis {
  meter: MeterAnalysis;
  rhythmicPatterns: RhythmicPattern[];
  syncopation: SyncopationAnalysis;
  polyrhythms: Polyrhythm[];
  groove: GrooveAnalysis;
  microtiming: MicrotimingAnalysis;
  rhythmicComplexity: number;
}

export interface StructureAnalysis {
  form: MusicalForm;
  sections: Section[];
  transitions: Transition[];
  repetitions: Repetition[];
  hierarchicalStructure: HierarchicalStructure;
  structuralDepth: number;
}

export interface PatternAnalysis {
  patterns: IdentifiedPattern[];
  patternTypes: PatternType[];
  patternDensity: PatternDensity;
  patternRelationships: PatternRelationship[];
  patternEvolution: PatternEvolution;
}

export interface AnalysisResponse {
  id: string;
  daid: string;
  type: AnalysisType;
  input: AnalysisInput;
  results: AnalysisResults;
  metadata: AnalysisMetadata;
  confidence: number;
  processingTime: number;
}

export interface AnalysisResults {
  harmony?: HarmonyAnalysis;
  melody?: MelodyAnalysis;
  rhythm?: RhythmAnalysis;
  structure?: StructureAnalysis;
  pattern?: PatternAnalysis;
  style?: StyleAnalysis;
  emotion?: EmotionAnalysis;
  features?: FeatureSet;
  summary: AnalysisSummary;
}

export interface AnalysisSummary {
  overall: OverallAnalysis;
  keyFindings: KeyFinding[];
  recommendations: Recommendation[];
  qualityScore: number;
  complexityScore: number;
  stylisticClassification: StylisticClassification;
}
```

## Emotion SDK

### Emotional Analysis & Transformation

```typescript
// packages/core/src/services/emotion/emotion-sdk.ts
export class EmotionSDK {
  // Emotion analysis
  analyzeEmotion(request: EmotionAnalysisRequest): Promise<EmotionAnalysis>;
  analyzeProgressionEmotion(progression: ChordProgression): Promise<EmotionVector>;
  analyzePatternEmotion(pattern: Pattern): Promise<EmotionVector>;

  // Emotion transformation
  transformEmotion(request: EmotionTransformRequest): Promise<EmotionTransformResult>;
  applyEmotionalProfile(request: EmotionalProfileRequest): Promise<TransformedContent>;

  // Advanced emotion generation
  generateEmotionalTrajectory(request: TrajectoryRequest): Promise<EmotionalTrajectory>;
  generateEmotionalPermutation(request: PermutationRequest): Promise<EmotionalPermutation>;
  generateEmotionalDistribution(request: DistributionRequest): Promise<EmotionalDistribution>;

  // Emotion-based generation
  generateWithEmotion(request: EmotionalGenerationRequest): Promise<GenerationResponse>;
  findEmotionallySimilar(content: string, targetEmotion: EmotionVector): Promise<string[]>;

  // Emotion profiles
  createEmotionProfile(request: EmotionProfileCreateRequest): Promise<EmotionProfile>;
  listEmotionProfiles(): Promise<EmotionProfile[]>;
  getEmotionProfile(id: string): Promise<EmotionProfile>;
}

// Types
export interface EmotionVector {
  valence: number;          // -1 to 1 (negative to positive)
  arousal: number;          // 0 to 1 (calm to excited)
  tension: number;          // 0 to 1 (relaxed to tense)
  energy: number;           // 0 to 1 (low to high energy)
  mode: number;            // -1 to 1 (minor to major)
}

export interface EmotionAnalysis {
  primary: EmotionVector;
  progression: EmotionVector[];     // Time-based emotion progression
  sections: SectionEmotion[];       // Emotion by section
  features: EmotionalFeatures;
  classification: EmotionClassification;
  intensity: EmotionIntensity;
}

export interface EmotionalFeatures {
  harmonic: HarmonicEmotionFeatures;
  melodic: MelodicEmotionFeatures;
  rhythmic: RhythmicEmotionFeatures;
  structural: StructuralEmotionFeatures;
  timbral: TimbralEmotionFeatures;
}

export interface EmotionTransformRequest {
  content: string;                    // Asset ID or direct content
  targetEmotion: EmotionVector;
  nuance: number;                     // 0-1, subtlety of transformation
  preserve: PreservationOptions;
  method: TransformMethod;
}

export enum TransformMethod {
  HARMONIC_REHARMONIZATION = 'harmonic_reharmonization',
  MELODIC_CONTOUR = 'melodic_contour',
  RHYTHMIC_MODIFICATION = 'rhythmic_modification',
  TEXTURAL_ENHANCEMENT = 'textural_enhancement',
  DYNAMICS_ADJUSTMENT = 'dynamics_adjustment',
  ORCHESTRATION = 'orchestration',
}

export interface TrajectoryRequest {
  length: number;
  emotionValues: EmotionVector;
  start?: number;
  end?: number;
  amplitude?: number;
  period?: number;
  smoothness?: number;
}

export interface EmotionalTrajectory {
  points: EmotionPoint[];
  interpolation: InterpolationMethod;
  totalDuration: number;
  keyPoints: EmotionPoint[];
}

export interface EmotionPoint {
  time: number;
  emotion: EmotionVector;
  intensity: number;
  confidence: number;
}

export interface PermutationRequest {
  pattern: number[];
  emotionValues: EmotionVector;
  algorithm: PermutationAlgorithm;
  preserveStructure: boolean;
}

export enum PermutationAlgorithm {
  ROTATION = 'rotation',
  RETROGRADE = 'retrograde',
  INVERSION = 'inversion',
  INTERPOLATION = 'interpolation',
  EMOTION_GUIDED = 'emotion_guided',
  PROBABILISTIC = 'probabilistic',
}

export interface EmotionalPermutation {
  originalPattern: number[];
  permutedPattern: number[];
  transformation: TransformationInfo;
  emotionalMapping: EmotionalMapping;
  similarity: number;
}

export interface EmotionProfile {
  id: string;
  name: string;
  description: string;
  emotionVector: EmotionVector;
  characteristics: EmotionalCharacteristics;
  examples: ProfileExample[];
  usage: ProfileUsage;
}

export interface EmotionalCharacteristics {
  typicalGenres: string[];
  commonKeys: string[];
  tempoRange: [number, number];
  instruments: string[];
  associatedEmotions: string[];
  culturalContext: string[];
}
```

## Orchestration SDK

### Advanced Composition Orchestration

```typescript
// packages/core/src/services/orchestration/orchestration-sdk.ts
export class OrchestrationSDK {
  // Core orchestration
  generateSection(request: SectionGenerationRequest): Promise<GenerationResponse>;
  generateFromChords(request: ChordProgressionRequest): Promise<GenerationResponse>;
  generateAdvanced(request: AdvancedGenerationRequest): Promise<GenerationResponse>;

  // Multi-section orchestration
  generateComposition(request: CompositionRequest): Promise<CompositionResponse>;
  arrangePiece(request: ArrangementRequest): Promise<ArrangementResponse>;

  // Workflow orchestration
  createWorkflow(request: WorkflowCreateRequest): Promise<Workflow>;
  executeWorkflow(workflowId: string, input: WorkflowInput): Promise<WorkflowResult>;

  // Style and adaptation
  adaptToStyle(content: string, targetStyle: StyleProfile): Promise<TransformedContent>;
  mergeStyles(styles: StyleProfile[]): Promise<StyleProfile>;

  // Orchestration history
  getOrchestrationHistory(filter?: OrchestrationFilter): Promise<OrchestrationRecord[]>;
  getOrchestration(id: string): Promise<OrchestrationRecord>;
}

// Types
export interface SectionGenerationRequest {
  prompt: string;
  key?: string;
  scaleType?: ScaleType;
  emotion?: string;
  length?: number;
  complexity?: number;
  style?: StyleProfile;
}

export interface ChordProgressionRequest {
  chords: string[];
  key?: string;
  scaleType?: ScaleType;
  style?: StyleProfile;
  arrangement?: ArrangementOptions;
}

export interface AdvancedGenerationRequest {
  prompt: string;
  key?: string;
  scaleType?: ScaleType;
  emotion?: string;
  emotionIntensity?: number;

  // Optional pre-computed content
  chordProgression?: string[];
  notePattern?: any[];
  rhythmPattern?: any[];

  // Generation options
  maxRetries?: number;
  useVectorSearch?: boolean;
  useLLMCreative?: boolean;
  applyEmotion?: boolean;
  applyTransformations?: boolean;
  transformationType?: string;

  // Quality control
  validationLevel?: ValidationLevel;
  qualityThreshold?: number;
}

export interface CompositionRequest {
  sections: SectionRequest[];
  overallStructure: CompositionStructure;
  transitions: TransitionOptions;
  development: DevelopmentOptions;
}

export interface SectionRequest {
  type: SectionType;
  length: number;
  character: SectionCharacter;
  relationship?: SectionRelationship;
}

export enum SectionType {
  INTRODUCTION = 'introduction',
  EXPOSITION = 'exposition',
  DEVELOPMENT = 'development',
  RECAPITULATION = 'recapitulation',
  CODA = 'coda',
  VERSE = 'verse',
  CHORUS = 'chorus',
  BRIDGE = 'bridge',
  PRE_CHORUS = 'pre_chorus',
  POST_CHORUS = 'post_chorus',
  SOLO = 'solo',
  OUTRO = 'outro',
}

export interface WorkflowCreateRequest {
  name: string;
  description: string;
  steps: WorkflowStep[];
  conditions: WorkflowCondition[];
  variables: WorkflowVariable[];
  outputs: WorkflowOutput[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  parameters: Record<string, any>;
  dependencies: string[];
  conditions: string[];
  retryPolicy: RetryPolicy;
  timeout: number;
}

export enum StepType {
  GENERATE = 'generate',
  ANALYZE = 'analyze',
  TRANSFORM = 'transform',
  VALIDATE = 'validate',
  COMBINE = 'combine',
  EXPORT = 'export',
  CUSTOM = 'custom',
}

export interface WorkflowInput {
  parameters: Record<string, any>;
  context: WorkflowContext;
  options: WorkflowOptions;
}

export interface WorkflowResult {
  outputs: Record<string, any>;
  executionLog: ExecutionLog;
  performance: PerformanceMetrics;
  artifacts: WorkflowArtifact[];
  status: WorkflowStatus;
}

export interface ArrangementRequest {
  content: string;
  instrumentation: Instrumentation;
  style: ArrangementStyle;
  constraints: ArrangementConstraints;
  targets: ArrangementTargets;
}

export interface Instrumentation {
  melody: Instrument[];
  harmony: Instrument[];
  bass: Instrument[];
  percussion: Instrument[];
  counterpoint: Instrument[];
  pads: Instrument[];
  effects: Instrument[];
}

export interface ArrangementStyle {
  density: ArrangementDensity;
  texture: TextureType;
  dynamics: DynamicProfile;
  articulation: ArticulationProfile;
  register: RegisterProfile;
}
```

## MCP SDK

### Model Context Protocol Integration

```typescript
// packages/core/src/services/mcp/mcp-sdk.ts
export class MCPSDK {
  // Agent management
  getAgentCard(): Promise<AgentCard>;
  registerAgent(agent: AgentRegistration): Promise<RegistrationResult>;
  unregisterAgent(agentId: string): Promise<void>;

  // Agent discovery
  discoverAgents(query: DiscoveryQuery): Promise<DiscoveryResult>;
  findBestAgent(capability: string, options?: FindBestOptions): Promise<Agent>;
  listAgents(filter?: AgentFilter): Promise<Agent[]>;

  // Agent communication
  sendRequest(request: A2ARequest): Promise<A2AResponse>;
  sendNotification(notification: A2ANotification): Promise<void>;
  subscribeToEvents(filter: EventFilter): Promise<EventSubscription>;

  // Registry management
  getRegistryStats(): Promise<RegistryStats>;
  getAgentCapabilities(agentId: string): Promise<AgentCapabilities>;
  updateAgentCapabilities(agentId: string, capabilities: AgentCapabilities): Promise<void>;

  // DAID integration
  getAgentDAID(agentId: string): Promise<string>;
  getDAIDAgent(daid: string): Promise<Agent>;

  // Federation
  joinFederation(federation: FederationConfig): Promise<FederationMembership>;
  leaveFederation(federationId: string): Promise<void>;
  discoverFederatedAgents(query: FederationQuery): Promise<FederatedAgent[]>;
}

// Types
export interface AgentCard {
  id: string;
  name: string;
  description: string;
  version: string;
  type: AgentType;
  capabilities: AgentCapability[];
  endpoints: AgentEndpoint[];
  metadata: AgentMetadata;
  daid?: string;
}

export enum AgentType {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
  FEDERATED = 'federated',
  HYBRID = 'hybrid',
}

export interface AgentCapability {
  name: string;
  description: string;
  inputSchema: any;
  outputSchema: any;
  parameters: CapabilityParameter[];
  examples: CapabilityExample[];
  performance: PerformanceProfile;
}

export interface DiscoveryQuery {
  capability?: string;
  protocol?: string;
  agentType?: AgentType;
  versionConstraint?: string;
  daid?: string;
  maxResults?: number;
  filters?: DiscoveryFilter[];
  sortBy?: DiscoverySortBy;
  sortOrder?: 'asc' | 'desc';
}

export interface DiscoveryResult {
  agents: Agent[];
  totalFound: number;
  queryTime: number;
  cached: boolean;
  federatedResults?: FederatedAgent[];
}

export interface A2ARequest {
  id: string;
  capability: string;
  parameters: Record<string, any>;
  metadata?: RequestMetadata;
  timeout?: number;
  priority?: RequestPriority;
  context?: RequestContext;
}

export interface A2AResponse {
  requestId: string;
  agentId: string;
  status: ResponseStatus;
  result?: any;
  error?: ResponseError;
  metadata?: ResponseMetadata;
  performance?: ResponsePerformance;
  daid?: string;
}

export enum ResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  TIMEOUT = 'timeout',
  CANCELLED = 'cancelled',
  PARTIAL = 'partial',
}

export interface RegistryStats {
  totalAgents: number;
  internalAgents: number;
  externalAgents: number;
  federatedAgents: number;
  capabilities: CapabilityStats;
  performance: RegistryPerformance;
  uptime: number;
  lastUpdated: Date;
}

export interface Agent {
  card: AgentCard;
  status: AgentStatus;
  health: HealthStatus;
  performance: AgentPerformance;
  lastSeen: Date;
  endpoint: AgentEndpoint;
}

export enum AgentStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  BUSY = 'busy',
  MAINTENANCE = 'maintenance',
  ERROR = 'error',
}

export interface FederationConfig {
  federationId: string;
  endpoint: string;
  authentication: FederationAuth;
  capabilities: FederationCapability[];
  policies: FederationPolicy[];
  syncInterval?: number;
}

export interface FederationMembership {
  federationId: string;
  memberId: string;
  role: FederationRole;
  capabilities: string[];
  joinedAt: Date;
  status: MembershipStatus;
}

export enum FederationRole {
  MEMBER = 'member',
  ADMIN = 'admin',
  OBSERVER = 'observer',
}
```

## DAID SDK

### Digital Asset ID Management

```typescript
// packages/core/src/services/daid/daid-sdk.ts
export class DAIDSDK {
  // DAID generation and management
  generateDAID(type: AssetType, metadata: AssetMetadata): Promise<DAID>;
  getDAID(id: string): Promise<DAID | null>;
  updateDAID(id: string, updates: DAIDUpdates): Promise<DAID>;
  deleteDAID(id: string): Promise<void>;

  // Provenance tracking
  getProvenance(daid: string): Promise<ProvenanceRecord[]>;
  getProvenanceChain(daid: string): Promise<DAID[]>;
  addProvenance(daid: string, provenance: ProvenanceInfo): Promise<void>;

  // Provenance queries
  queryProvenance(query: ProvenanceQuery): Promise<ProvenanceResult[]>;
  findRelatives(daid: string, relationship: RelationshipType): Promise<DAID[]>;
  getAncestors(daid: string, maxDepth?: number): Promise<DAID[]>;
  getDescendants(daid: string, maxDepth?: number): Promise<DAID[]>;

  // Asset relationships
  createRelationship(from: string, to: string, type: RelationshipType): Promise<void>;
  removeRelationship(from: string, to: string): Promise<void>;
  getRelationships(daid: string): Promise<Relationship[]>;

  // Asset metadata
  updateMetadata(daid: string, metadata: Partial<AssetMetadata>): Promise<void>;
  addTag(daid: string, tag: string): Promise<void>;
  removeTag(daid: string, tag: string): Promise<void>;

  // Asset search
  searchAssets(query: AssetSearchQuery): Promise<AssetSearchResult>;
  findByMetadata(criteria: MetadataCriteria): Promise<DAID[]>;
  findByTag(tag: string): Promise<DAID[]>;

  // Asset analytics
  getAssetStats(daid: string): Promise<AssetStats>;
  getUsageAnalytics(daid: string, timeRange?: TimeRange): Promise<UsageAnalytics>;
  getPopularityRanking(timeRange?: TimeRange): Promise<PopularityRanking[]>;
}

// Types
export interface DAID {
  id: string;
  type: AssetType;
  version: number;
  created: Date;
  modified: Date;
  metadata: AssetMetadata;
  provenance: ProvenanceInfo;
  relationships: Relationship[];
  analytics: AssetAnalytics;
}

export interface ProvenanceRecord {
  daid: string;
  timestamp: Date;
  operation: ProvenanceOperation;
  actor: string;
  context: Record<string, any>;
  sourceDAIDs?: string[];
  targetDAIDs?: string[];
  transformation?: TransformInfo;
}

export enum ProvenanceOperation {
  CREATE = 'create',
  MODIFY = 'modify',
  TRANSFORM = 'transform',
  COPY = 'copy',
  MERGE = 'merge',
  SPLIT = 'split',
  DELETE = 'delete',
  RESTORE = 'restore',
}

export interface ProvenanceQuery {
  daid?: string;
  operation?: ProvenanceOperation;
  actor?: string;
  timeRange?: TimeRange;
  transformationType?: TransformationType;
  depth?: number;
  includeBranches?: boolean;
}

export interface Relationship {
  from: string;
  to: string;
  type: RelationshipType;
  strength?: number;
  metadata?: Record<string, any>;
  created: Date;
}

export enum RelationshipType {
  DERIVED_FROM = 'derived_from',
  TRANSFORMED_FROM = 'transformed_from',
  COMBINED_FROM = 'combined_from',
  SPLIT_FROM = 'split_from',
  VERSION_OF = 'version_of',
  VARIANT_OF = 'variant_of',
  REFERENCES = 'references',
  DEPENDS_ON = 'depends_on',
  PART_OF = 'part_of',
  RELATED_TO = 'related_to',
}

export interface AssetSearchQuery {
  text?: string;
  type?: AssetType;
  tags?: string[];
  dateRange?: TimeRange;
  creator?: string;
  metadata?: MetadataCriteria;
  relationships?: RelationshipQuery[];
  sortBy?: AssetSortBy;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface AssetSearchResult {
  assets: DAID[];
  totalFound: number;
  facets: SearchFacets;
  suggestions: SearchSuggestion[];
  queryTime: number;
}

export interface AssetStats {
  views: number;
  downloads: number;
  shares: number;
  citations: number;
  transformations: number;
  ratings: AssetRatings;
  engagement: EngagementMetrics;
  trends: TrendMetrics;
}

export interface UsageAnalytics {
  timeRange: TimeRange;
  usage: UsageMetrics;
  users: UserMetrics;
  contexts: ContextMetrics[];
  popularFeatures: PopularFeature[];
}
```

## Usage Examples

### Basic Usage

```typescript
import { createSDK, GenerationType, PatternType } from '@schillinger-sdk/core';

// Initialize SDK
const sdk = createSDK({
  mode: 'offline',
  storage: { type: 'sqlite', path: './schillinger.db' },
  logging: { level: 'info' }
});

// Generate a rhythm pattern
const rhythmPattern = await sdk.generation.generate({
  type: GenerationType.PATTERN,
  parameters: {
    pattern: {
      generators: [3, 5],
      timeSignature: [4, 4],
      tempo: 120,
    },
    complexity: 5,
    seed: 12345,
  },
});

// Analyze the pattern
const analysis = await sdk.analysis.analyze({
  type: 'rhythm',
  input: { content: rhythmPattern.result },
  features: ['rhythm', 'structure'],
});

// Apply emotional transformation
const emotionalPattern = await sdk.emotion.transformEmotion({
  content: rhythmPattern.daid,
  targetEmotion: { valence: 0.8, arousal: 0.6, tension: 0.3, energy: 0.7, mode: 0.5 },
  nuance: 0.7,
  method: 'rhythmic_modification',
});

// Get provenance
const provenance = await sdk.daid.getProvenanceChain(emotionalPattern.daid);
```

### Advanced Workflow

```typescript
// Create a composition workflow
const workflow = await sdk.orchestration.createWorkflow({
  name: 'Jazz Standard Generator',
  description: 'Generate a jazz standard with bridge and solo section',
  steps: [
    {
      id: 'generate-chords',
      type: 'generate',
      parameters: { type: 'chord_progression', style: { genre: 'jazz' } },
    },
    {
      id: 'analyze-harmony',
      type: 'analyze',
      parameters: { features: ['harmony', 'structure'] },
      dependencies: ['generate-chords'],
    },
    {
      id: 'generate-melody',
      type: 'generate',
      parameters: { type: 'melody', constraints: { harmonicRules: [] } },
      dependencies: ['generate-chords'],
    },
    {
      id: 'apply-emotion',
      type: 'transform',
      parameters: { targetEmotion: { valence: 0.6, arousal: 0.5 } },
      dependencies: ['generate-melody'],
    },
  ],
});

// Execute the workflow
const result = await sdk.orchestration.executeWorkflow(workflow.id, {
  parameters: { key: 'F', scaleType: 'MAJOR', length: 32 },
  context: { genre: 'jazz', era: '1950s' },
});
```

This comprehensive API signature specification provides the foundation for implementing the full SDK with complete backend compatibility and advanced offline capabilities.