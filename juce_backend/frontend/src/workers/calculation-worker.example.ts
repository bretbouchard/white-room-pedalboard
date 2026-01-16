/**
 * Production-Grade Calculation Worker Examples and Demonstrations
 *
 * This file provides comprehensive examples of how to use the ProductionCalculationWorker
 * for complex musical computations including rhythm, harmony, melody, analysis,
 * and signal processing operations.
 */

import type { CalculationRequest, CalculationResponse } from './calculation-worker'
import { ProductionCalculationWorker } from './calculation-worker'

// ============================================================================
// BASIC WORKER SETUP AND CONFIGURATION EXAMPLES
// ============================================================================

/**
 * Example 1: Basic Worker Setup
 */
export function basicWorkerSetupExample() {
  console.log('=== Basic ProductionCalculationWorker Setup ===')

  // Create worker with default configuration
  const worker = new ProductionCalculationWorker()

  // Get current configuration
  const config = worker.getConfig()
  console.log('Default Configuration:', config)

  // Update configuration for specific needs
  worker.updateConfig({
    maxConcurrency: 8,
    timeoutMs: 60000,
    enableProfiling: true,
    memoryLimit: 1024 * 1024 * 1024 // 1GB
  })

  console.log('Updated Configuration:', worker.getConfig())

  return worker
}

/**
 * Example 2: High-Performance Configuration
 */
export function highPerformanceWorkerSetupExample() {
  console.log('=== High-Performance Worker Configuration ===')

  const highPerfConfig = {
    maxConcurrency: 16,
    memoryLimit: 2 * 1024 * 1024 * 1024, // 2GB
    timeoutMs: 120000, // 2 minutes
    enableProfiling: true
  }

  const worker = new ProductionCalculationWorker(highPerfConfig)

  console.log('High-Performance Configuration:')
  console.log('- Max Concurrency:', highPerfConfig.maxConcurrency)
  console.log('- Memory Limit:', highPerfConfig.memoryLimit / 1024 / 1024, 'MB')
  console.log('- Timeout:', highPerfConfig.timeoutMs / 1000, 'seconds')

  return worker
}

// ============================================================================
// RHYTHM COMPUTATION EXAMPLES
// ============================================================================

/**
 * Example 3: Rhythm Resultant Calculation
 */
export async function rhythmResultantExample(worker: ProductionCalculationWorker) {
  console.log('=== Rhythm Resultant Calculation Example ===')

  const request: CalculationRequest = {
    id: 'rhythm-resultant-1',
    type: 'rhythm',
    operation: 'calculate_resultant',
    data: {
      pattern1: [1, 0, 1, 0, 1, 0, 1, 0], // Basic pulse
      pattern2: [1, 1, 0, 0, 1, 1, 0, 0]  // Syncopated pattern
    },
    parameters: {},
    timestamp: Date.now()
  }

  const response = await worker.processRequest(request)

  if (response.success) {
    console.log('Resultant Pattern:', response.result)
    console.log('Processing Time:', response.processingTime.toFixed(2), 'ms')
  } else {
    console.error('Calculation failed:', response.error)
  }

  return response
}

/**
 * Example 4: Complex Rhythm Analysis
 */
export async function complexRhythmAnalysisExample(worker: ProductionCalculationWorker) {
  console.log('=== Complex Rhythm Analysis Example ===')

  const complexPattern = [1, 0.5, 0.25, 0.75, 0, 1, 0.3, 0.8, 0.1, 0.9]
  const timeSignature = [4, 4]

  const analysisRequest: CalculationRequest = {
    id: 'rhythm-analysis-1',
    type: 'rhythm',
    operation: 'calculate_complexity',
    data: {
      pattern: complexPattern,
      timeSignature: timeSignature
    },
    parameters: {},
    timestamp: Date.now()
  }

  const response = await worker.processRequest(analysisRequest)

  if (response.success) {
    const { complexity, syncopation, density } = response.result
    console.log('Rhythm Analysis Results:')
    console.log('- Complexity:', complexity.toFixed(3))
    console.log('- Syncopation:', syncopation.toFixed(3))
    console.log('- Density:', density.toFixed(3))
    console.log('- Overall Musical Interest:', ((complexity + syncopation + density) / 3).toFixed(3))
  } else {
    console.error('Analysis failed:', response.error)
  }

  return response
}

/**
 * Example 5: Polyrhythm Generation
 */
export async function polyrhythmGenerationExample(worker: ProductionCalculationWorker) {
  console.log('=== Polyrhythm Generation Example ===')

  const polyrhythms = [
    { rhythm1: 3, rhythm2: 4, name: '3:4 Polyrhythm' },
    { rhythm1: 5, rhythm2: 4, name: '5:4 Polyrhythm' },
    { rhythm1: 7, rhythm2: 8, name: '7:8 Polyrhythm' }
  ]

  const results = []

  for (const polyrhythm of polyrhythms) {
    const request: CalculationRequest = {
      id: `polyrhythm-${polyrhythm.rhythm1}-${polyrhythm.rhythm2}`,
      type: 'rhythm',
      operation: 'generate_polyrhythm',
      data: {
        rhythm1: polyrhythm.rhythm1,
        rhythm2: polyrhythm.rhythm2
      },
      parameters: {},
      timestamp: Date.now()
    }

    const response = await worker.processRequest(request)

    if (response.success) {
      console.log(`${polyrhythm.name}:`, response.result)
      results.push({ name: polyrhythm.name, pattern: response.result })
    }
  }

  return results
}

/**
 * Example 6: Rhythm Transformations
 */
export async function rhythmTransformationExample(worker: ProductionCalculationWorker) {
  console.log('=== Rhythm Transformation Example ===')

  const originalPattern = [1, 0.5, 0.25, 0.75, 0.5, 1, 0, 0.5]
  const transformations = [
    { operation: 'retrograde', name: 'Retrograde' },
    { operation: 'augmentation', name: 'Augmentation', parameters: { factor: 2 } },
    { operation: 'diminution', name: 'Diminution', parameters: { factor: 0.5 } },
    { operation: 'displacement', name: 'Displacement', parameters: { displacement: 2 } }
  ]

  const results = []

  for (const transformation of transformations) {
    const request: CalculationRequest = {
      id: `transform-${transformation.name}`,
      type: 'rhythm',
      operation: 'transform_rhythm',
      data: { pattern: originalPattern },
      parameters: transformation.parameters || { transformation: transformation.operation },
      timestamp: Date.now()
    }

    const response = await worker.processRequest(request)

    if (response.success) {
      console.log(`${transformation.name}:`, response.result)
      results.push({ name: transformation.name, pattern: response.result })
    }
  }

  return results
}

// ============================================================================
// HARMONY COMPUTATION EXAMPLES
// ============================================================================

/**
 * Example 7: Chord Progression Generation
 */
export async function chordProgressionExample(worker: ProductionCalculationWorker) {
  console.log('=== Chord Progression Generation Example ===')

  const progressionTypes = ['basic', 'jazz', 'blues']
  const keys = ['C', 'G', 'D', 'A', 'F']
  const results = []

  for (const type of progressionTypes) {
    for (const key of keys) {
      const request: CalculationRequest = {
        id: `progression-${key}-${type}`,
        type: 'harmony',
        operation: 'generate_progression',
        data: {
          key: key,
          type: type,
          length: 4
        },
        parameters: {},
        timestamp: Date.now()
      }

      const response = await worker.processRequest(request)

      if (response.success) {
        console.log(`${key} ${type} progression:`, response.result.map((chord: any) => chord.name))
        results.push({ key, type, progression: response.result })
      }
    }
  }

  return results
}

/**
 * Example 8: Harmonic Function Analysis
 */
export async function harmonicFunctionAnalysisExample(worker: ProductionCalculationWorker) {
  console.log('=== Harmonic Function Analysis Example ===')

  // Create mock chords (in real implementation, these would be actual Chord objects)
  const chords = [
    { root: { midi: 60 }, type: 'major', notes: [{ midi: 60 }, { midi: 64 }, { midi: 67 }] },
    { root: { midi: 65 }, type: 'major', notes: [{ midi: 65 }, { midi: 69 }, { midi: 72 }] },
    { root: { midi: 69 }, type: 'major', notes: [{ midi: 69 }, { midi: 73 }, { midi: 76 }] },
    { root: { midi: 64 }, type: 'major', notes: [{ midi: 64 }, { midi: 68 }, { midi: 71 }] }
  ]

  const key = {
    root: { midi: 60 },
    type: 'major',
    notes: [
      { midi: 60 }, { midi: 62 }, { midi: 64 }, { midi: 65 },
      { midi: 67 }, { midi: 69 }, { midi: 71 }
    ]
  }

  const results = []

  for (let i = 0; i < chords.length; i++) {
    const request: CalculationRequest = {
      id: `harmonic-analysis-${i}`,
      type: 'harmony',
      operation: 'analyze_harmonic_function',
      data: {
        chord: chords[i],
        key: key
      },
      parameters: {},
      timestamp: Date.now()
    }

    const response = await worker.processRequest(request)

    if (response.success) {
      const { function: harmonicFunction, tension, tendency } = response.result
      console.log(`Chord ${i + 1}: ${harmonicFunction} (tension: ${tension.toFixed(2)}, tendency: ${tendency})`)
      results.push({ chordIndex: i, ...response.result })
    }
  }

  return results
}

/**
 * Example 9: Voice Leading Analysis
 */
export async function voiceLeadingAnalysisExample(worker: ProductionCalculationWorker) {
  console.log('=== Voice Leading Analysis Example ===')

  const chordPairs = [
    {
      from: { root: { midi: 60 }, type: 'major', notes: [{ midi: 60 }, { midi: 64 }, { midi: 67 }] },
      to: { root: { midi: 65 }, type: 'major', notes: [{ midi: 65 }, { midi: 69 }, { midi: 72 }] }
    },
    {
      from: { root: { midi: 65 }, type: 'major', notes: [{ midi: 65 }, { midi: 69 }, { midi: 72 }] },
      to: { root: { midi: 69 }, type: 'major', notes: [{ midi: 69 }, { midi: 73 }, { midi: 76 }] }
    }
  ]

  const results = []

  for (let i = 0; i < chordPairs.length; i++) {
    const request: CalculationRequest = {
      id: `voice-leading-${i}`,
      type: 'harmony',
      operation: 'calculate_voice_leading',
      data: chordPairs[i],
      parameters: {},
      timestamp: Date.now()
    }

    const response = await worker.processRequest(request)

    if (response.success) {
      const { voiceMovement, totalMovement, smoothness } = response.result
      console.log(`Voice Leading ${i + 1}:`)
      console.log('- Voice Movement:', voiceMovement)
      console.log('- Total Movement:', totalMovement, 'semitones')
      console.log('- Smoothness:', smoothness.toFixed(3))
      results.push({ pairIndex: i, ...response.result })
    }
  }

  return results
}

// ============================================================================
// MELODY COMPUTATION EXAMPLES
// ============================================================================

/**
 * Example 10: Melodic Contour Generation
 */
export async function melodicContourExample(worker: ProductionCalculationWorker) {
  console.log('=== Melodic Contour Generation Example ===')

  const contourTypes = ['ascending', 'descending', 'arch', 'wave', 'random'] as const
  const length = 16
  const results = []

  for (const type of contourTypes) {
    const request: CalculationRequest = {
      id: `contour-${type}`,
      type: 'melody',
      operation: 'generate_contour',
      data: {
        length: length,
        type: type
      },
      parameters: {},
      timestamp: Date.now()
    }

    const response = await worker.processRequest(request)

    if (response.success) {
      console.log(`${type} contour:`, response.result)
      results.push({ type, contour: response.result })
    }
  }

  return results
}

/**
 * Example 11: Melody Generation from Contour
 */
export async function melodyGenerationExample(worker: ProductionCalculationWorker) {
  console.log('=== Melody Generation from Contour Example ===')

  const contour = [0, 0.2, 0.5, 0.8, 1, 0.7, 0.4, 0.1, 0.3, 0.6, 0.9, 1]
  const rhythm = [1, 0.5, 0.5, 1, 0.5, 0.5, 1, 1, 0.5, 0.5, 1, 1]

  const mockScale = {
    root: { midi: 60 },
    type: 'major',
    notes: [
      { midi: 60 }, { midi: 62 }, { midi: 64 }, { midi: 65 },
      { midi: 67 }, { midi: 69 }, { midi: 71 }
    ]
  }

  const request: CalculationRequest = {
    id: 'melody-generation-1',
    type: 'melody',
    operation: 'generate_melody_from_contour',
    data: {
      contour: contour,
      scale: mockScale
    },
    parameters: {
      rhythm: rhythm,
      noteRange: [60, 84],
      smoothness: 0.7
    },
    timestamp: Date.now()
  }

  const response = await worker.processRequest(request)

  if (response.success) {
    const melody = response.result
    console.log('Generated Melody:')
    console.log('- Notes:', melody.notes.map((note: any) => `${note.name} (${note.midi})`))
    console.log('- Intervals:', melody.intervals)
    console.log('- Rhythm:', melody.rhythm.pattern)
  } else {
    console.error('Melody generation failed:', response.error)
  }

  return response
}

/**
 * Example 12: Melodic Similarity Analysis
 */
export async function melodicSimilarityExample(worker: ProductionCalculationWorker) {
  console.log('=== Melodic Similarity Analysis Example ===')

  const mockScale = {
    root: { midi: 60 },
    type: 'major',
    notes: [
      { midi: 60 }, { midi: 62 }, { midi: 64 }, { midi: 65 },
      { midi: 67 }, { midi: 69 }, { midi: 71 }
    ]
  }

  const melody1 = {
    notes: [
      { midi: 60 }, { midi: 62 }, { midi: 64 }, { midi: 65 },
      { midi: 67 }, { midi: 65 }, { midi: 64 }, { midi: 62 }
    ],
    intervals: [2, 2, 1, 2, -2, -1, -2],
    contour: [0, 0.3, 0.6, 0.8, 1, 0.6, 0.3, 0],
    scale: mockScale,
    rhythm: { pattern: [1, 1, 1, 1, 1, 1, 1, 1] }
  }

  const melody2 = {
    notes: [
      { midi: 62 }, { midi: 64 }, { midi: 65 }, { midi: 67 },
      { midi: 69 }, { midi: 67 }, { midi: 65 }, { midi: 64 }
    ],
    intervals: [2, 1, 2, 2, -2, -1, -1],
    contour: [0, 0.2, 0.5, 0.7, 1, 0.6, 0.4, 0.1],
    scale: mockScale,
    rhythm: { pattern: [1, 1, 1, 1, 1, 1, 1, 1] }
  }

  const request: CalculationRequest = {
    id: 'melodic-similarity-1',
    type: 'melody',
    operation: 'calculate_melodic_similarity',
    data: {
      melody1: melody1,
      melody2: melody2
    },
    parameters: {},
    timestamp: Date.now()
  }

  const response = await worker.processRequest(request)

  if (response.success) {
    const similarity = response.result
    console.log('Melodic Similarity Analysis:')
    console.log('- Contour Similarity:', similarity.contourSimilarity.toFixed(3))
    console.log('- Rhythm Similarity:', similarity.rhythmSimilarity.toFixed(3))
    console.log('- Interval Similarity:', similarity.intervalSimilarity.toFixed(3))
    console.log('- Overall Similarity:', similarity.overallSimilarity.toFixed(3))
  } else {
    console.error('Similarity analysis failed:', response.error)
  }

  return response
}

// ============================================================================
// SIGNAL PROCESSING EXAMPLES
// ============================================================================

/**
 * Example 13: Audio Feature Extraction
 */
export async function audioFeatureExtractionExample(worker: ProductionCalculationWorker) {
  console.log('=== Audio Feature Extraction Example ===')

  // Generate a test audio signal (440 Hz sine wave)
  const sampleRate = 44100
  const duration = 1.0 // 1 second
  const frequency = 440 // A4
  const samples = Math.floor(sampleRate * duration)

  const signal = new Float32Array(samples)
  for (let i = 0; i < samples; i++) {
    signal[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.8
  }

  const request: CalculationRequest = {
    id: 'audio-features-1',
    type: 'signal_processing',
    operation: 'extract_features',
    data: {
      signal: Array.from(signal),
      sampleRate: sampleRate
    },
    parameters: {},
    timestamp: Date.now()
  }

  const response = await worker.processRequest(request)

  if (response.success) {
    const features = response.result
    console.log('Extracted Audio Features:')
    console.log('- Pitch:', features.pitch.toFixed(2), 'Hz')
    console.log('- Tempo:', features.tempo, 'BPM')
    console.log('- Onsets Detected:', features.onsets.length)
    console.log('- RMS Energy:', features.rms.toFixed(4))
    console.log('- Zero Crossing Rate:', features.zcr.toFixed(4))
    console.log('- Spectral Centroid:', features.spectralFeatures.spectralCentroid.toFixed(2), 'Hz')
    console.log('- Spectral Rolloff:', features.spectralFeatures.spectralRolloff.toFixed(2), 'Hz')
  } else {
    console.error('Feature extraction failed:', response.error)
  }

  return response
}

/**
 * Example 14: Pitch Detection
 */
export async function pitchDetectionExample(worker: ProductionCalculationWorker) {
  console.log('=== Pitch Detection Example ===')

  const testFrequencies = [110, 220, 440, 880, 1760] // A notes across octaves
  const sampleRate = 44100
  const duration = 0.5 // 500ms

  const results = []

  for (const frequency of testFrequencies) {
    const samples = Math.floor(sampleRate * duration)
    const signal = new Float32Array(samples)

    for (let i = 0; i < samples; i++) {
      signal[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.7
    }

    const request: CalculationRequest = {
      id: `pitch-detection-${frequency}`,
      type: 'signal_processing',
      operation: 'detect_pitch',
      data: {
        signal: Array.from(signal),
        sampleRate: sampleRate
      },
      parameters: {},
      timestamp: Date.now()
    }

    const response = await worker.processRequest(request)

    if (response.success) {
      const detectedPitch = response.result.pitch
      const error = Math.abs(detectedPitch - frequency)
      console.log(`Input: ${frequency} Hz, Detected: ${detectedPitch.toFixed(2)} Hz, Error: ${error.toFixed(2)} Hz`)
      results.push({ inputFrequency: frequency, detectedPitch, error })
    }
  }

  return results
}

/**
 * Example 15: Tempo and Rhythm Analysis
 */
export async function tempoAnalysisExample(worker: ProductionCalculationWorker) {
  console.log('=== Tempo and Rhythm Analysis Example ===')

  // Create a signal with rhythmic onsets at different tempos
  const tempos = [60, 90, 120, 150] // BPM
  const sampleRate = 44100
  const duration = 4 // 4 seconds

  const results = []

  for (const tempo of tempos) {
    const beatInterval = 60 / tempo // seconds per beat
    const samples = Math.floor(sampleRate * duration)
    const signal = new Float32Array(samples).fill(0)

    // Add drum-like onsets
    for (let beat = 0; beat < duration / beatInterval; beat++) {
      const onsetSample = Math.floor(beat * beatInterval * sampleRate)
      const attackLength = Math.floor(0.01 * sampleRate) // 10ms attack

      for (let i = 0; i < attackLength && onsetSample + i < samples; i++) {
        signal[onsetSample + i] = Math.sin(2 * Math.PI * 200 * i / sampleRate) *
                                   Math.exp(-i / (attackLength * 0.3))
      }
    }

    const request: CalculationRequest = {
      id: `tempo-analysis-${tempo}`,
      type: 'signal_processing',
      operation: 'estimate_tempo',
      data: {
        signal: Array.from(signal),
        sampleRate: sampleRate
      },
      parameters: {},
      timestamp: Date.now()
    }

    const response = await worker.processRequest(request)

    if (response.success) {
      const estimatedTempo = response.result.tempo
      const error = Math.abs(estimatedTempo - tempo)
      console.log(`Input: ${tempo} BPM, Estimated: ${estimatedTempo} BPM, Error: ${error} BPM`)
      results.push({ inputTempo: tempo, estimatedTempo, error })
    }
  }

  return results
}

// ============================================================================
// ADVANCED ANALYSIS AND OPTIMIZATION EXAMPLES
// ============================================================================

/**
 * Example 16: Comprehensive Musical Structure Analysis
 */
export async function musicalStructureAnalysisExample(worker: ProductionCalculationWorker) {
  console.log('=== Comprehensive Musical Structure Analysis Example ===')

  const musicalData = {
    rhythm: {
      pattern: [1, 0.5, 0.25, 0.75, 0, 1, 0.3, 0.8],
      timeSignature: [4, 4]
    },
    chords: [
      { root: { midi: 60 }, type: 'major' },
      { root: { midi: 65 }, type: 'major' },
      { root: { midi: 69 }, type: 'major' },
      { root: { midi: 64 }, type: 'major' }
    ],
    melody: {
      notes: [
        { midi: 60 }, { midi: 62 }, { midi: 64 }, { midi: 65 },
        { midi: 67 }, { midi: 65 }, { midi: 64 }, { midi: 62 }
      ],
      contour: [0, 0.3, 0.6, 0.8, 1, 0.6, 0.3, 0],
      intervals: [2, 2, 1, 2, -2, -1, -2]
    }
  }

  const request: CalculationRequest = {
    id: 'musical-structure-analysis-1',
    type: 'analysis',
    operation: 'analyze_musical_structure',
    data: musicalData,
    parameters: {},
    timestamp: Date.now()
  }

  const response = await worker.processRequest(request)

  if (response.success) {
    const analysis = response.result
    console.log('Musical Structure Analysis:')
    console.log('Rhythm Analysis:', analysis.rhythm)
    console.log('Harmony Analysis:', analysis.harmony)
    console.log('Melody Analysis:', analysis.melody)
    console.log('Form Analysis:', analysis.form)
  } else {
    console.error('Structure analysis failed:', response.error)
  }

  return response
}

/**
 * Example 17: Performance Optimization Recommendations
 */
export async function performanceOptimizationExample(worker: ProductionCalculationWorker) {
  console.log('=== Performance Optimization Example ===')

  const complexMusicalData = {
    rhythm: {
      pattern: [1, 0.8, 0.6, 0.4, 0.2, 0.9, 0.7, 0.5, 0.3, 0.1, 0.8, 0.6],
      timeSignature: [7, 8]
    },
    chords: [
      { root: { midi: 60 }, type: 'major7#11' },
      { root: { midi: 63 }, type: 'minor9' },
      { root: { midi: 65 }, type: 'dominant13' },
      { root: { midi: 68 }, type: 'major7' }
    ],
    melody: {
      notes: Array.from({ length: 16 }, (_, i) => ({
        midi: 60 + Math.floor(Math.sin(i * 0.5) * 10 + 65),
        duration: 0.25 + Math.random() * 0.5
      })),
      intervals: Array.from({ length: 15 }, () => Math.floor(Math.random() * 12) - 6),
      contour: Array.from({ length: 16 }, (_, i) => Math.abs(Math.sin(i * 0.3)))
    }
  }

  const request: CalculationRequest = {
    id: 'performance-optimization-1',
    type: 'optimization',
    operation: 'optimize_performance',
    data: complexMusicalData,
    parameters: {
      targetDifficulty: 'intermediate',
      preserveCharacter: true
    },
    timestamp: Date.now()
  }

  const response = await worker.processRequest(request)

  if (response.success) {
    const optimization = response.result
    console.log('Performance Optimization Recommendations:')
    console.log('- Simplifications:', optimization.simplifications)
    console.log('- Enhancements:', optimization.enhancements)
    console.log('- Practice Suggestions:', optimization.practiceSuggestions)
  } else {
    console.error('Optimization failed:', response.error)
  }

  return response
}

// ============================================================================
// CONCURRENT PROCESSING AND JOB MANAGEMENT EXAMPLES
// ============================================================================

/**
 * Example 18: Concurrent Job Processing
 */
export async function concurrentProcessingExample(worker: ProductionCalculationWorker) {
  console.log('=== Concurrent Processing Example ===')

  const requests: CalculationRequest[] = []
  const jobTypes = ['rhythm', 'harmony', 'melody', 'signal_processing']

  // Create multiple requests of different types
  for (let i = 0; i < 8; i++) {
    const type = jobTypes[i % jobTypes.length] as any
    let operation: string, data: any

    switch (type) {
      case 'rhythm':
        operation = 'calculate_complexity'
        data = { pattern: [1, 0, 1, 0, 1, 0, 1, 0] }
        break
      case 'harmony':
        operation = 'generate_progression'
        data = { key: 'C', type: 'basic', length: 4 }
        break
      case 'melody':
        operation = 'generate_contour'
        data = { length: 8, type: 'wave' }
        break
      case 'signal_processing':
        operation = 'detect_pitch'
        const signal = new Float32Array(1024)
        for (let j = 0; j < 1024; j++) {
          signal[j] = Math.sin(2 * Math.PI * 440 * j / 44100)
        }
        data = { signal: Array.from(signal), sampleRate: 44100 }
        break
    }

    requests.push({
      id: `concurrent-job-${i}`,
      type,
      operation,
      data,
      parameters: {},
      timestamp: Date.now()
    })
  }

  console.log(`Processing ${requests.length} jobs concurrently...`)

  // Process all jobs concurrently
  const startTime = Date.now()
  const promises = requests.map(request => worker.processRequest(request))
  const responses = await Promise.all(promises)
  const endTime = Date.now()

  const successful = responses.filter(r => r.success).length
  const failed = responses.filter(r => !r.success).length

  console.log(`Concurrent Processing Results:`)
  console.log(`- Total Jobs: ${requests.length}`)
  console.log(`- Successful: ${successful}`)
  console.log(`- Failed: ${failed}`)
  console.log(`- Total Time: ${endTime - startTime}ms`)
  console.log(`- Average Time per Job: ${((endTime - startTime) / requests.length).toFixed(2)}ms`)

  return { responses, successful, failed, totalTime: endTime - startTime }
}

/**
 * Example 19: Job Cancellation and Management
 */
export async function jobManagementExample(worker: ProductionCalculationWorker) {
  console.log('=== Job Management Example ===')

  // Start a long-running job
  const longRunningRequest: CalculationRequest = {
    id: 'long-running-job',
    type: 'analysis',
    operation: 'analyze_musical_structure',
    data: { /* complex data that takes time to process */ },
    parameters: {},
    timestamp: Date.now()
  }

  const jobPromise = worker.processRequest(longRunningRequest)

  // Check job status
  setTimeout(() => {
    const status = worker.getJobStatus('long-running-job')
    console.log('Job Status:', status)

    const activeJobs = worker.getActiveJobs()
    console.log('Active Jobs:', activeJobs)
  }, 100)

  // Cancel the job after 200ms
  setTimeout(() => {
    const cancelled = worker.cancelJob('long-running-job')
    console.log('Job Cancelled:', cancelled)
  }, 200)

  // Wait for the result (should be cancelled)
  try {
    const response = await jobPromise
    console.log('Job Result:', response)
  } catch (error) {
    console.log('Job Error (expected):', error)
  }

  return { cancelled: true }
}

// ============================================================================
// UTILITY AND DEMONSTRATION FUNCTIONS
// ============================================================================

/**
 * Example 20: Performance Benchmarking
 */
export async function performanceBenchmarkExample(worker: ProductionCalculationWorker) {
  console.log('=== Performance Benchmark Example ===')

  const benchmarks = [
    {
      name: 'Rhythm Resultant Calculation',
      type: 'rhythm',
      operation: 'calculate_resultant',
      data: { pattern1: [1, 0, 1, 0], pattern2: [1, 1, 0, 0] },
      iterations: 100
    },
    {
      name: 'Melodic Contour Generation',
      type: 'melody',
      operation: 'generate_contour',
      data: { length: 16, type: 'wave' },
      iterations: 50
    },
    {
      name: 'Pitch Detection',
      type: 'signal_processing',
      operation: 'detect_pitch',
      data: {
        signal: Array.from({ length: 2048 }, (_, i) =>
          Math.sin(2 * Math.PI * 440 * i / 44100)
        ),
        sampleRate: 44100
      },
      iterations: 25
    }
  ]

  const results = []

  for (const benchmark of benchmarks) {
    console.log(`\nBenchmarking: ${benchmark.name}`)
    console.log(`Iterations: ${benchmark.iterations}`)

    const times: number[] = []

    for (let i = 0; i < benchmark.iterations; i++) {
      const request: CalculationRequest = {
        id: `benchmark-${benchmark.name}-${i}`,
        type: benchmark.type as any,
        operation: benchmark.operation,
        data: benchmark.data,
        parameters: {},
        timestamp: Date.now()
      }

      const startTime = performance.now()
      const response = await worker.processRequest(request)
      const endTime = performance.now()

      times.push(endTime - startTime)
    }

    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    const stdDev = Math.sqrt(
      times.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / times.length
    )

    console.log(`Results:`)
    console.log(`- Average Time: ${avgTime.toFixed(2)}ms`)
    console.log(`- Min Time: ${minTime.toFixed(2)}ms`)
    console.log(`- Max Time: ${maxTime.toFixed(2)}ms`)
    console.log(`- Standard Deviation: ${stdDev.toFixed(2)}ms`)

    results.push({
      name: benchmark.name,
      iterations: benchmark.iterations,
      avgTime,
      minTime,
      maxTime,
      stdDev
    })
  }

  return results
}

/**
 * Example 21: Error Handling and Recovery
 */
export async function errorHandlingExample(worker: ProductionCalculationWorker) {
  console.log('=== Error Handling Example ===')

  const invalidRequests = [
    {
      name: 'Invalid Operation',
      request: {
        id: 'error-1',
        type: 'rhythm',
        operation: 'invalid_operation',
        data: {},
        parameters: {},
        timestamp: Date.now()
      }
    },
    {
      name: 'Invalid Data',
      request: {
        id: 'error-2',
        type: 'harmony',
        operation: 'generate_progression',
        data: { key: null, type: 'invalid' },
        parameters: {},
        timestamp: Date.now()
      }
    },
    {
      name: 'Missing Required Fields',
      request: {
        id: 'error-3',
        type: 'melody',
        operation: 'generate_contour',
        data: {},
        parameters: {},
        timestamp: Date.now()
      }
    }
  ]

  const results = []

  for (const { name, request } of invalidRequests) {
    console.log(`\nTesting: ${name}`)

    try {
      const response = await worker.processRequest(request)

      if (response.success) {
        console.log(`Unexpected success: ${response.result}`)
      } else {
        console.log(`Expected error: ${response.error}`)
        results.push({ name, error: response.error, handled: true })
      }
    } catch (error) {
      console.log(`Caught exception: ${error}`)
      results.push({ name, error: String(error), handled: false })
    }
  }

  return results
}

// ============================================================================
// MAIN DEMONSTRATION FUNCTION
// ============================================================================

/**
 * Run All Examples
 * Executes all calculation worker examples in sequence
 */
export async function runAllCalculationWorkerExamples() {
  console.log('🚀 Starting ProductionCalculationWorker Examples...\n')

  try {
    // Basic setup
    const worker = basicWorkerSetupExample()

    // Rhythm examples
    await rhythmResultantExample(worker)
    await complexRhythmAnalysisExample(worker)
    await polyrhythmGenerationExample(worker)
    await rhythmTransformationExample(worker)

    // Harmony examples
    await chordProgressionExample(worker)
    await harmonicFunctionAnalysisExample(worker)
    await voiceLeadingAnalysisExample(worker)

    // Melody examples
    await melodicContourExample(worker)
    await melodyGenerationExample(worker)
    await melodicSimilarityExample(worker)

    // Signal processing examples
    await audioFeatureExtractionExample(worker)
    await pitchDetectionExample(worker)
    await tempoAnalysisExample(worker)

    // Advanced analysis examples
    await musicalStructureAnalysisExample(worker)
    await performanceOptimizationExample(worker)

    // Concurrent processing
    await concurrentProcessingExample(worker)
    await jobManagementExample(worker)

    // Performance and error handling
    await performanceBenchmarkExample(worker)
    await errorHandlingExample(worker)

    console.log('\n✅ All calculation worker examples completed successfully!')

  } catch (error) {
    console.error('❌ Example failed:', error)
    throw error
  }
}

// Export all examples for easy access
export default {
  // Setup examples
  basicWorkerSetupExample,
  highPerformanceWorkerSetupExample,

  // Rhythm examples
  rhythmResultantExample,
  complexRhythmAnalysisExample,
  polyrhythmGenerationExample,
  rhythmTransformationExample,

  // Harmony examples
  chordProgressionExample,
  harmonicFunctionAnalysisExample,
  voiceLeadingAnalysisExample,

  // Melody examples
  melodicContourExample,
  melodyGenerationExample,
  melodicSimilarityExample,

  // Signal processing examples
  audioFeatureExtractionExample,
  pitchDetectionExample,
  tempoAnalysisExample,

  // Advanced examples
  musicalStructureAnalysisExample,
  performanceOptimizationExample,
  concurrentProcessingExample,
  jobManagementExample,
  performanceBenchmarkExample,
  errorHandlingExample,

  // Main function
  runAllCalculationWorkerExamples
}