# Transformation APIs Documentation

This document provides an overview and examples for the Audio Agent's transformation APIs.

## 1. Analyze Composition

### Description
Analyzes a musical composition to generate comprehensive insights into its harmonic, melodic, rhythmic, and structural elements, along with style analysis. It also provides mixing-relevant recommendations based on the analysis.

### Python API
`sdk.analyze_composition(composition_context: CompositionContext) -> dict[str, Any]`

**Parameters:**
- `composition_context` (`CompositionContext`): An object containing the musical context of the composition, including tempo, key, time signature, style, harmonic progression, and structure.

**Returns:**
- `dict[str, Any]`: A dictionary containing the `CompositionAnalysisResult`, which includes harmonic, melodic, rhythmic, structural, and style analysis, along with mixing recommendations.

**Example (Python):**
```python
from audio_agent.models.composition import CompositionContext, TimeSignature, MusicalKey, MusicalStyle
from audio_agent import sdk

composition_context = CompositionContext(
    tempo=120,
    key_signature=MusicalKey.C_MAJOR,
    time_signature=TimeSignature(numerator=4, denominator=4),
    style=MusicalStyle.POP,
)

analysis_result = sdk.analyze_composition(composition_context)
print(analysis_result)
```

### TypeScript API
`transform<T>(request: TransformationRequest): Promise<T>`

**Request Body (`TransformationRequest`):**
```typescript
interface TransformationRequest {
  transformation: "analyze_composition";
  composition_context: CompositionContext;
}

interface CompositionContext { /* ... (as defined in sdk/src/models.ts) ... */ }
```

**Response Body:**
```typescript
interface CompositionAnalysisResult { /* ... (as defined in Python's CompositionAnalysisResult) ... */ }
```

**Example (TypeScript):**
```typescript
import { transform } from '../sdk/src/api';
import { CompositionContext, MusicalKey, MusicalStyle, TimeSignature } from '../sdk/src/models';

const compositionContext: CompositionContext = {
  tempo: 120,
  key_signature: MusicalKey.C_MAJOR,
  time_signature: { numerator: 4, denominator: 4 },
  style: MusicalStyle.POP,
};

async function runAnalysis() {
  try {
    const result = await transform({
      transformation: "analyze_composition",
      composition_context: compositionContext,
    });
    console.log("Analysis Result:", result);
  } catch (error) {
    console.error("Error during analysis:", error);
  }
}

runAnalysis();
```

## 2. Create Mixing Plan

### Description
Generates a comprehensive mixing plan for a composition, taking into account its musical context and individual tracks. The plan includes a mixing strategy and a series of detailed mixing actions to apply.

### Python API
`sdk.create_mixing_plan(composition_context: CompositionContext, tracks: list[dict[str, Any]]) -> dict[str, Any]`

**Parameters:**
- `composition_context` (`CompositionContext`): An object containing the musical context of the composition.
- `tracks` (`list[dict[str, Any]]`): A list of dictionaries, where each dictionary represents a track with at least an `id` and `instrument` key (e.g., `{"id": "track_1", "instrument": "vocal"}`).

**Returns:**
- `dict[str, Any]`: A dictionary representing the `MixingPlan`, including the overall strategy and a list of `MixingAction` objects.

**Example (Python):**
```python
from audio_agent.models.composition import CompositionContext, TimeSignature, MusicalKey, MusicalStyle
from audio_agent import sdk

composition_context = CompositionContext(
    tempo=120,
    key_signature=MusicalKey.C_MAJOR,
    time_signature=TimeSignature(numerator=4, denominator=4),
    style=MusicalStyle.POP,
)

tracks = [
    {"id": "track_1", "instrument": "vocal"},
    {"id": "track_2", "instrument": "bass"},
]

mixing_plan = sdk.create_mixing_plan(composition_context, tracks)
print(mixing_plan)
```

### TypeScript API
`transform<T>(request: TransformationRequest): Promise<T>`

**Request Body (`TransformationRequest`):**
```typescript
interface TransformationRequest {
  transformation: "create_mixing_plan";
  composition_context: CompositionContext;
  tracks: Record<string, any>[];
}
```

**Response Body:**
```typescript
interface MixingPlan { /* ... (as defined in Python's MixingPlan) ... */ }
```

**Example (TypeScript):**
```typescript
import { transform } from '../sdk/src/api';
import { CompositionContext, MusicalKey, MusicalStyle, TimeSignature } from '../sdk/src/models';

const compositionContext: CompositionContext = {
  tempo: 120,
  key_signature: MusicalKey.C_MAJOR,
  time_signature: { numerator: 4, denominator: 4 },
  style: MusicalStyle.POP,
};

const tracks = [
  { id: "track_1", instrument: "vocal" },
  { id: "track_2", instrument: "bass" },
];

async function runMixingPlan() {
  try {
    const result = await transform({
      transformation: "create_mixing_plan",
      composition_context: compositionContext,
      tracks: tracks,
    });
    console.log("Mixing Plan:", result);
  } catch (error) {
    console.error("Error creating mixing plan:", error);
  }
}

runMixingPlan();
```

## 3. Recommend Dynamics

### Description
Provides recommendations for dynamics processing (e.g., compression, limiting) based on audio analysis and musical context. It suggests appropriate plugins and their optimal settings.

### Python API
`sdk.recommend_dynamics(audio_analysis: AudioAnalysis, composition_context: CompositionContext | None = None, user_preferences: UserPreferences | None = None) -> DynamicsRecommendation`

**Parameters:**
- `audio_analysis` (`AudioAnalysis`): An object containing the audio analysis data.
- `composition_context` (`CompositionContext`, optional): Musical context of the composition.
- `user_preferences` (`UserPreferences`, optional): User-specific preferences for plugin selection.

**Returns:**
- `DynamicsRecommendation`: An object containing the recommended dynamics plugin and its settings.

**Example (Python):**
```python
from audio_agent.models.audio import AudioAnalysis, AudioFeatures, SpectralFeatures, DynamicFeatures, HarmonicFeatures, PerceptualFeatures, SpatialFeatures, FrequencyBalance, AudioFormat
from audio_agent import sdk

audio_analysis = AudioAnalysis(
    timestamp=0,
    sample_rate=44100,
    duration=10,
    channels=2,
    format=AudioFormat.WAV,
    features=AudioFeatures(
        spectral=SpectralFeatures(centroid=2000, rolloff=4000, flux=0.5, bandwidth=1000, flatness=0.5, mfcc=[0]*13),
        dynamic=DynamicFeatures(rms_level=0.5, peak_level=0.9, dynamic_range=12, transient_density=2, zero_crossing_rate=0.1),
        harmonic=HarmonicFeatures(inharmonicity=0.5, pitch_clarity=0.5),
        perceptual=PerceptualFeatures(loudness_lufs=-14, perceived_brightness=0.5, perceived_warmth=0.5, roughness=0.5, sharpness=0.5),
        spatial=SpatialFeatures(stereo_width=0.8, phase_correlation=0.9, balance=0),
        frequency_balance=FrequencyBalance(bass=0.5, low_mid=0.5, mid=0.5, high_mid=0.5, treble=0.5),
    )
)

dynamics_recommendation = sdk.recommend_dynamics(audio_analysis)
print(dynamics_recommendation)
```

### TypeScript API
`transform<T>(request: TransformationRequest): Promise<T>`

**Request Body (`TransformationRequest`):**
```typescript
interface TransformationRequest {
  transformation: "recommend_dynamics";
  audio_analysis: AudioAnalysis;
  composition_context?: CompositionContext;
  user_preferences?: UserPreferences;
}
```

**Response Body:**
```typescript
interface DynamicsRecommendation { /* ... (as defined in Python's DynamicsRecommendation) ... */ }
```

**Example (TypeScript):**
```typescript
import { transform } from '../sdk/src/api';
import { AudioAnalysis, AudioFeatures, SpectralFeatures, DynamicFeatures, HarmonicFeatures, PerceptualFeatures, SpatialFeatures, FrequencyBalance, AudioFormat } from '../sdk/src/models';

const audioAnalysis: AudioAnalysis = {
  timestamp: 0,
  sample_rate: 44100,
  duration: 10,
  channels: 2,
  format: AudioFormat.WAV,
  features: {
    spectral: { centroid: 2000, rolloff: 4000, flux: 0.5, bandwidth: 1000, flatness: 0.5, mfcc: Array(13).fill(0) },
    dynamic: { rms_level: 0.5, peak_level: 0.9, dynamic_range: 12, transient_density: 2, zero_crossing_rate: 0.1 },
    harmonic: { inharmonicity: 0.5, pitch_clarity: 0.5 },
    perceptual: { loudness_lufs: -14, perceived_brightness: 0.5, perceived_warmth: 0.5, roughness: 0.5, sharpness: 0.5 },
    spatial: { stereo_width: 0.8, phase_correlation: 0.9, balance: 0 },
    frequency_balance: { bass: 0.5, low_mid: 0.5, mid: 0.5, high_mid: 0.5, treble: 0.5 },
  },
};

async function runDynamicsRecommendation() {
  try {
    const result = await transform({
      transformation: "recommend_dynamics",
      audio_analysis: audioAnalysis,
    });
    console.log("Dynamics Recommendation:", result);
  } catch (error) {
    console.error("Error getting dynamics recommendation:", error);
  }
}

runDynamicsRecommendation();
```

## 4. Recommend EQ

### Description
Provides recommendations for equalization (EQ) settings based on audio analysis and musical context. It suggests appropriate EQ plugins and their optimal band settings.

### Python API
`sdk.recommend_eq(audio_analysis: AudioAnalysis, composition_context: CompositionContext | None = None, user_preferences: UserPreferences | None = None) -> EQRecommendation`

**Parameters:**
- `audio_analysis` (`AudioAnalysis`): An object containing the audio analysis data.
- `composition_context` (`CompositionContext`, optional): Musical context of the composition.
- `user_preferences` (`UserPreferences`, optional): User-specific preferences for plugin selection.

**Returns:**
- `EQRecommendation`: An object containing the recommended EQ plugin and its band settings.

**Example (Python):**
```python
from audio_agent.models.audio import AudioAnalysis, AudioFeatures, SpectralFeatures, DynamicFeatures, HarmonicFeatures, PerceptualFeatures, SpatialFeatures, FrequencyBalance, AudioFormat
from audio_agent import sdk

audio_analysis = AudioAnalysis(
    timestamp=0,
    sample_rate=44100,
    duration=10,
    channels=2,
    format=AudioFormat.WAV,
    features=AudioFeatures(
        spectral=SpectralFeatures(centroid=2000, rolloff=4000, flux=0.5, bandwidth=1000, flatness=0.5, mfcc=[0]*13),
        dynamic=DynamicFeatures(rms_level=0.5, peak_level=0.9, dynamic_range=12, transient_density=2, zero_crossing_rate=0.1),
        harmonic=HarmonicFeatures(inharmonicity=0.5, pitch_clarity=0.5),
        perceptual=PerceptualFeatures(loudness_lufs=-14, perceived_brightness=0.5, perceived_warmth=0.5, roughness=0.5, sharpness=0.5),
        spatial=SpatialFeatures(stereo_width=0.8, phase_correlation=0.9, balance=0),
        frequency_balance=FrequencyBalance(bass=0.5, low_mid=0.5, mid=0.5, high_mid=0.5, treble=0.5),
    )
)

eq_recommendation = sdk.recommend_eq(audio_analysis)
print(eq_recommendation)
```

### TypeScript API
`transform<T>(request: TransformationRequest): Promise<T>`

**Request Body (`TransformationRequest`):**
```typescript
interface TransformationRequest {
  transformation: "recommend_eq";
  audio_analysis: AudioAnalysis;
  composition_context?: CompositionContext;
  user_preferences?: UserPreferences;
}
```

**Response Body:**
```typescript
interface EQRecommendation { /* ... (as defined in Python's EQRecommendation) ... */ }
```

**Example (TypeScript):**
```typescript
import { transform } from '../sdk/src/api';
import { AudioAnalysis, AudioFeatures, SpectralFeatures, DynamicFeatures, HarmonicFeatures, PerceptualFeatures, SpatialFeatures, FrequencyBalance, AudioFormat } from '../sdk/src/models';

const audioAnalysis: AudioAnalysis = {
  timestamp: 0,
  sample_rate: 44100,
  duration: 10,
  channels: 2,
  format: AudioFormat.WAV,
  features: {
    spectral: { centroid: 2000, rolloff: 4000, flux: 0.5, bandwidth: 1000, flatness: 0.5, mfcc: Array(13).fill(0) },
    dynamic: { rms_level: 0.5, peak_level: 0.9, dynamic_range: 12, transient_density: 2, zero_crossing_rate: 0.1 },
    harmonic: { inharmonicity: 0.5, pitch_clarity: 0.5 },
    perceptual: { loudness_lufs: -14, perceived_brightness: 0.5, perceived_warmth: 0.5, roughness: 0.5, sharpness: 0.5 },
    spatial: { stereo_width: 0.8, phase_correlation: 0.9, balance: 0 },
    frequency_balance: { bass: 0.5, low_mid: 0.5, mid: 0.5, high_mid: 0.5, treble: 0.5 },
  },
};

async function runEQRecommendation() {
  try {
    const result = await transform({
      transformation: "recommend_eq",
      audio_analysis: audioAnalysis,
    });
    console.log("EQ Recommendation:", result);
  } catch (error) {
    console.error("Error getting EQ recommendation:", error);
  }
}

runEQRecommendation();
```

## 5. Recommend Spatial

### Description
Provides recommendations for spatial processing (e.g., reverb, delay, stereo widening) based on audio analysis and musical context. It suggests appropriate plugins and their optimal settings.

### Python API
`sdk.recommend_spatial(audio_analysis: AudioAnalysis, composition_context: CompositionContext | None = None, user_preferences: UserPreferences | None = None, processor_type: str = "reverb") -> SpatialRecommendation`

**Parameters:**
- `audio_analysis` (`AudioAnalysis`): An object containing the audio analysis data.
- `composition_context` (`CompositionContext`, optional): Musical context of the composition.
- `user_preferences` (`UserPreferences`, optional): User-specific preferences for plugin selection.
- `processor_type` (`str`, optional): The type of spatial processor to recommend (e.g., "reverb", "delay", "stereo_enhancer"). Defaults to "reverb".

**Returns:**
- `SpatialRecommendation`: An object containing the recommended spatial plugin and its settings.

**Example (Python):**
```python
from audio_agent.models.audio import AudioAnalysis, AudioFeatures, SpectralFeatures, DynamicFeatures, HarmonicFeatures, PerceptualFeatures, SpatialFeatures, FrequencyBalance, AudioFormat
from audio_agent import sdk

audio_analysis = AudioAnalysis(
    timestamp=0,
    sample_rate=44100,
    duration=10,
    channels=2,
    format=AudioFormat.WAV,
    features=AudioFeatures(
        spectral=SpectralFeatures(centroid=2000, rolloff=4000, flux=0.5, bandwidth=1000, flatness=0.5, mfcc=[0]*13),
        dynamic=DynamicFeatures(rms_level=0.5, peak_level=0.9, dynamic_range=12, transient_density=2, zero_crossing_rate=0.1),
        harmonic=HarmonicFeatures(inharmonicity=0.5, pitch_clarity=0.5),
        perceptual=PerceptualFeatures(loudness_lufs=-14, perceived_brightness=0.5, perceived_warmth=0.5, roughness=0.5, sharpness=0.5),
        spatial=SpatialFeatures(stereo_width=0.8, phase_correlation=0.9, balance=0),
        frequency_balance=FrequencyBalance(bass=0.5, low_mid=0.5, mid=0.5, high_mid=0.5, treble=0.5),
    )
)

spatial_recommendation = sdk.recommend_spatial(audio_analysis, processor_type="reverb")
print(spatial_recommendation)
```

### TypeScript API
`transform<T>(request: TransformationRequest): Promise<T>`

**Request Body (`TransformationRequest`):**
```typescript
interface TransformationRequest {
  transformation: "recommend_spatial";
  audio_analysis: AudioAnalysis;
  composition_context?: CompositionContext;
  user_preferences?: UserPreferences;
  processor_type?: string;
}
```

**Response Body:**
```typescript
interface SpatialRecommendation { /* ... (as defined in Python's SpatialRecommendation) ... */ }
```

**Example (TypeScript):**
```typescript
import { transform } from '../sdk/src/api';
import { AudioAnalysis, AudioFeatures, SpectralFeatures, DynamicFeatures, HarmonicFeatures, PerceptualFeatures, SpatialFeatures, FrequencyBalance, AudioFormat } from '../sdk/src/models';

const audioAnalysis: AudioAnalysis = {
  timestamp: 0,
  sample_rate: 44100,
  duration: 10,
  channels: 2,
  format: AudioFormat.WAV,
  features: {
    spectral: { centroid: 2000, rolloff: 4000, flux: 0.5, bandwidth: 1000, flatness: 0.5, mfcc: Array(13).fill(0) },
    dynamic: { rms_level: 0.5, peak_level: 0.9, dynamic_range: 12, transient_density: 2, zero_crossing_rate: 0.1 },
    harmonic: { inharmonicity: 0.5, pitch_clarity: 0.5 },
    perceptual: { loudness_lufs: -14, perceived_brightness: 0.5, perceived_warmth: 0.5, roughness: 0.5, sharpness: 0.5 },
    spatial: { stereo_width: 0.8, phase_correlation: 0.9, balance: 0 },
    frequency_balance: { bass: 0.5, low_mid: 0.5, mid: 0.5, high_mid: 0.5, treble: 0.5 },
  },
};

async function runSpatialRecommendation() {
  try {
    const result = await transform({
      transformation: "recommend_spatial",
      audio_analysis: audioAnalysis,
      processor_type: "reverb",
    });
    console.log("Spatial Recommendation:", result);
  } catch (error) {
    console.error("Error getting spatial recommendation:", error);
  }
}

runSpatialRecommendation();
```
