/**
 * Test Suite for Production-Grade Calculation Worker
 *
 * Tests the production-grade calculation worker that performs complex musical
 * computations including rhythm, harmony, melody, analysis, and optimization.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Worker } from 'worker_threads'
import path from 'path'

// Import the calculation worker classes directly for testing
import {
  ProductionCalculationWorker,
  RhythmCalculator,
  HarmonyCalculator,
  MelodyCalculator,
  SignalProcessor,
  MathematicalUtils,
  type CalculationRequest,
  type CalculationResponse
} from '../calculation-worker'

// Mock Web Audio API and other browser dependencies
const mockAudioContext = {
  sampleRate: 44100,
  createBuffer: vi.fn(),
  decodeAudioData: vi.fn()
}

global.AudioContext = vi.fn(() => mockAudioContext) as any
global.WorkerGlobalScope = global as any

describe('MathematicalUtils', () => {
  describe('FFT', () => {
    it('should compute FFT correctly', () => {
      const signal = new Float32Array([1, 0, -1, 0, 1, 0, -1, 0])
      const result = MathematicalUtils.fft(signal)

      expect(result.magnitudes).toBeDefined()
      expect(result.phases).toBeDefined()
      expect(result.magnitudes.length).toBe(signal.length / 2)
      expect(result.phases.length).toBe(signal.length / 2)
    })

    it('should handle zero signal', () => {
      const signal = new Float32Array(8).fill(0)
      const result = MathematicalUtils.fft(signal)

      expect(result.magnitudes.every(mag => mag === 0)).toBe(true)
    })

    it('should handle single frequency signal', () => {
      const signal = new Float32Array(16)
      for (let i = 0; i < 16; i++) {
        signal[i] = Math.sin(2 * Math.PI * 2 * i / 16) // 2 Hz signal
      }

      const result = MathematicalUtils.fft(signal)
      expect(result.magnitudes[2]).toBeGreaterThan(result.magnitudes[1])
    })
  })

  describe('Autocorrelation', () => {
    it('should compute autocorrelation correctly', () => {
      const signal = new Float32Array([1, 2, 3, 4, 3, 2, 1])
      const result = MathematicalUtils.autocorrelation(signal)

      expect(result.length).toBe(signal.length)
      expect(result[0]).toBeCloseTo(1, 1) // Autocorrelation at lag 0
      expect(result[result.length - 1]).toBeLessThan(result[0]) // Lower correlation at max lag
    })

    it('should handle periodic signal', () => {
      const signal = new Float32Array([1, 0, 1, 0, 1, 0, 1, 0])
      const result = MathematicalUtils.autocorrelation(signal)

      // Periodic signal should show peaks at periodic intervals
      expect(result[2]).toBeGreaterThan(result[1])
      expect(result[4]).toBeGreaterThan(result[3])
    })
  })

  describe('Interpolation', () => {
    it('should perform linear interpolation correctly', () => {
      expect(MathematicalUtils.lerp(0, 10, 0.5)).toBe(5)
      expect(MathematicalUtils.lerp(0, 10, 0)).toBe(0)
      expect(MathematicalUtils.lerp(0, 10, 1)).toBe(10)
      expect(MathematicalUtils.lerp(5, 15, 0.25)).toBe(7.5)
    })
  })

  describe('Statistical Functions', () => {
    it('should calculate standard deviation correctly', () => {
      const values = [1, 2, 3, 4, 5]
      const stdDev = MathematicalUtils.standardDeviation(values)
      expect(stdDev).toBeCloseTo(Math.sqrt(2), 1)
    })

    it('should calculate correlation coefficient correctly', () => {
      const x = [1, 2, 3, 4, 5]
      const y = [2, 4, 6, 8, 10] // Perfect correlation
      const correlation = MathematicalUtils.correlation(x, y)
      expect(correlation).toBeCloseTo(1, 1)

      const y2 = [5, 4, 3, 2, 1] // Perfect negative correlation
      const correlation2 = MathematicalUtils.correlation(x, y2)
      expect(correlation2).toBeCloseTo(-1, 1)
    })

    it('should calculate Euclidean distance correctly', () => {
      const a = [1, 2, 3]
      const b = [4, 6, 8]
      const distance = MathematicalUtils.euclideanDistance(a, b)
      expect(distance).toBeCloseTo(Math.sqrt(35), 1)
    })
  })

  describe('Number Theory', () => {
    it('should identify prime numbers correctly', () => {
      expect(MathematicalUtils.isPrime(2)).toBe(true)
      expect(MathematicalUtils.isPrime(3)).toBe(true)
      expect(MathematicalUtils.isPrime(5)).toBe(true)
      expect(MathematicalUtils.isPrime(7)).toBe(true)
      expect(MathematicalUtils.isPrime(11)).toBe(true)
      expect(MathematicalUtils.isPrime(4)).toBe(false)
      expect(MathematicalUtils.isPrime(6)).toBe(false)
      expect(MathematicalUtils.isPrime(9)).toBe(false)
    })

    it('should calculate GCD correctly', () => {
      expect(MathematicalUtils.gcd(48, 18)).toBe(6)
      expect(MathematicalUtils.gcd(17, 13)).toBe(1)
      expect(MathematicalUtils.gcd(100, 25)).toBe(25)
    })

    it('should calculate LCM correctly', () => {
      expect(MathematicalUtils.lcm(12, 18)).toBe(36)
      expect(MathematicalUtils.lcm(4, 6)).toBe(12)
      expect(MathematicalUtils.lcm(7, 5)).toBe(35)
    })
  })

  describe('Data Smoothing', () => {
    it('should smooth data correctly', () => {
      const data = [1, 5, 1, 5, 1, 5, 1]
      const smoothed = MathematicalUtils.smooth(data, 3)

      expect(smoothed.length).toBe(data.length)
      expect(smoothed[1]).toBeLessThan(data[1]) // Should be smoothed down
      expect(smoothed[2]).toBeGreaterThan(data[2]) // Should be smoothed up
    })

    it('should handle edge cases in smoothing', () => {
      const data = [1, 2]
      const smoothed = MathematicalUtils.smooth(data, 3)

      expect(smoothed.length).toBe(data.length)
      expect(smoothed).toEqual(data) // Should handle small arrays gracefully
    })
  })
})

describe('RhythmCalculator', () => {
  describe('Resultant Rhythms', () => {
    it('should calculate resultant rhythm correctly', () => {
      const pattern1 = [1, 0, 1, 0]
      const pattern2 = [1, 1, 0, 0]
      const resultant = RhythmCalculator.calculateResultant(pattern1, pattern2)

      expect(resultant.length).toBe(4) // LCM of 4 and 4
      expect(resultant[0]).toBe(1) // 1 + 1 = 2 -> capped at 1
      expect(resultant[1]).toBe(1) // 0 + 1 = 1
      expect(resultant[2]).toBe(1) // 1 + 0 = 1
      expect(resultant[3]).toBe(0) // 0 + 0 = 0
    })

    it('should handle patterns of different lengths', () => {
      const pattern1 = [1, 0, 1] // Length 3
      const pattern2 = [1, 1, 0, 0] // Length 4
      const resultant = RhythmCalculator.calculateResultant(pattern1, pattern2)

      expect(resultant.length).toBe(12) // LCM of 3 and 4
    })
  })

  describe('Interference Patterns', () => {
    it('should generate interference patterns correctly', () => {
      const pattern1 = [1, 0, 1, 0]
      const pattern2 = [1, 1, 0, 0]
      const interference = RhythmCalculator.generateInterference(pattern1, pattern2)

      expect(interference.length).toBe(4)
      expect(interference[0]).toBe(1) // 1 * 1 = 1
      expect(interference[1]).toBe(0) // 0 * 1 = 0
      expect(interference[2]).toBe(0) // 1 * 0 = 0
      expect(interference[3]).toBe(0) // 0 * 0 = 0
    })

    it('should handle phase shift correctly', () => {
      const pattern1 = [1, 0, 1, 0]
      const pattern2 = [1, 1, 0, 0]
      const interference1 = RhythmCalculator.generateInterference(pattern1, pattern2, 0)
      const interference2 = RhythmCalculator.generateInterference(pattern1, pattern2, 0.5)

      expect(interference1[0]).not.toEqual(interference2[0]) // Phase shift should affect result
    })
  })

  describe('Complexity Analysis', () => {
    it('should calculate rhythm complexity correctly', () => {
      const simplePattern = [1, 0, 1, 0] // Low complexity
      const complexPattern = [1, 0.5, 0.25, 0.75, 0.1, 0.9, 0.3, 0.8] // High complexity

      const simpleComplexity = RhythmCalculator.calculateComplexity(simplePattern)
      const complexComplexity = RhythmCalculator.calculateComplexity(complexPattern)

      expect(complexComplexity).toBeGreaterThan(simpleComplexity)
      expect(simpleComplexity).toBeGreaterThanOrEqual(0)
      expect(complexComplexity).toBeLessThanOrEqual(1)
    })

    it('should calculate syncopation correctly', () => {
      const unsyncopated = [1, 0, 1, 0, 1, 0, 1, 0] // Strong beats emphasized
      const syncopated = [0.1, 1, 0.1, 1, 0.1, 1, 0.1, 1] // Off-beats emphasized

      const unsyncopatedScore = RhythmCalculator.calculateSyncopation(unsyncopated)
      const syncopatedScore = RhythmCalculator.calculateSyncopation(syncopated)

      expect(syncopatedScore).toBeGreaterThan(unsyncopatedScore)
    })

    it('should calculate density correctly', () => {
      const sparse = [1, 0, 0, 0, 1, 0, 0, 0] // Low density
      const dense = [1, 1, 1, 1, 1, 1, 1, 1] // High density

      const sparseDensity = RhythmCalculator.calculateDensity(sparse)
      const denseDensity = RhythmCalculator.calculateDensity(dense)

      expect(denseDensity).toBe(1)
      expect(sparseDensity).toBe(0.25)
    })
  })

  describe('Polyrhythms', () => {
    it('should generate polyrhythms correctly', () => {
      const polyrhythm = RhythmCalculator.generatePolyrhythm(3, 4)

      expect(polyrhythm.length).toBe(12) // LCM of 3 and 4
      expect(polyrhythm.filter(v => v > 0).length).toBeGreaterThan(0)
    })

    it('should handle prime polyrhythms', () => {
      const polyrhythm = RhythmCalculator.generatePolyrhythm(5, 7)

      expect(polyrhythm.length).toBe(35) // LCM of 5 and 7
    })
  })

  describe('Rhythm Transformations', () => {
    it('should apply retrograde transformation correctly', () => {
      const pattern = [1, 0.5, 0.25, 0.75]
      const retrograde = RhythmCalculator.transformRhythm(pattern, 'retrograde')

      expect(retrograde).toEqual([0.75, 0.25, 0.5, 1])
    })

    it('should apply augmentation correctly', () => {
      const pattern = [1, 0, 1, 0]
      const augmented = RhythmCalculator.transformRhythm(pattern, 'augmentation', { factor: 2 })

      expect(augmented.length).toBe(8)
      expect(augmented[0]).toBe(1)
      expect(augmented[2]).toBe(1)
    })

    it('should apply diminution correctly', () => {
      const pattern = [1, 0, 1, 0, 1, 0, 1, 0]
      const diminished = RhythmCalculator.transformRhythm(pattern, 'diminution', { factor: 0.5 })

      expect(diminished.length).toBe(4)
    })

    it('should apply displacement correctly', () => {
      const pattern = [1, 0.5, 0.25, 0.75]
      const displaced = RhythmCalculator.transformRhythm(pattern, 'displacement', { displacement: 1 })

      expect(displaced).toEqual([0.75, 1, 0.5, 0.25])
    })
  })
})

describe('MelodyCalculator', () => {
  const mockScale = {
    root: { midi: 60, name: 'C4' },
    type: 'major',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    notes: [
      { midi: 60, name: 'C4' },
      { midi: 62, name: 'D4' },
      { midi: 64, name: 'E4' },
      { midi: 65, name: 'F4' },
      { midi: 67, name: 'G4' },
      { midi: 69, name: 'A4' },
      { midi: 71, name: 'B4' }
    ]
  }

  describe('Contour Generation', () => {
    it('should generate ascending contour correctly', () => {
      const contour = MelodyCalculator.generateContour(8, 'ascending')

      expect(contour.length).toBe(8)
      expect(contour[0]).toBe(0)
      expect(contour[7]).toBe(1)
      for (let i = 1; i < contour.length; i++) {
        expect(contour[i]).toBeGreaterThanOrEqual(contour[i - 1])
      }
    })

    it('should generate descending contour correctly', () => {
      const contour = MelodyCalculator.generateContour(8, 'descending')

      expect(contour.length).toBe(8)
      expect(contour[0]).toBe(1)
      expect(contour[7]).toBe(0)
      for (let i = 1; i < contour.length; i++) {
        expect(contour[i]).toBeLessThanOrEqual(contour[i - 1])
      }
    })

    it('should generate arch contour correctly', () => {
      const contour = MelodyCalculator.generateContour(9, 'arch')

      expect(contour.length).toBe(9)
      expect(contour[0]).toBeCloseTo(0, 1)
      expect(contour[4]).toBe(1) // Peak at center
      expect(contour[8]).toBeCloseTo(0, 1)
    })

    it('should generate wave contour correctly', () => {
      const contour = MelodyCalculator.generateContour(16, 'wave')

      expect(contour.length).toBe(16)
      // Should have both peaks and troughs
      expect(Math.max(...contour)).toBe(1)
      expect(Math.min(...contour)).toBe(0)
    })

    it('should generate random contour correctly', () => {
      const contour = MelodyCalculator.generateContour(10, 'random')

      expect(contour.length).toBe(10)
      expect(contour.every(value => value >= 0 && value <= 1)).toBe(true)
    })
  })

  describe('Interval Analysis', () => {
    const mockMelody = {
      notes: [
        { midi: 60 }, { midi: 62 }, { midi: 64 }, { midi: 65 },
        { midi: 67 }, { midi: 65 }, { midi: 64 }, { midi: 62 }
      ],
      intervals: [2, 2, 1, 2, -2, -1, -2],
      contour: [0, 0.3, 0.6, 0.8, 1, 0.6, 0.3, 0],
      scale: mockScale
    }

    it('should analyze intervals correctly', () => {
      const analysis = MelodyCalculator.analyzeIntervals(mockMelody)

      expect(analysis.intervals).toEqual([2, 2, 1, 2, -2, -1, -2])
      expect(analysis.intervalTypes).toBeDefined()
      expect(analysis.averageInterval).toBeGreaterThan(0)
      expect(analysis.direction).toBeDefined()
      expect(analysis.range).toBe(7) // From 60 to 67
    })

    it('should calculate average interval correctly', () => {
      const analysis = MelodyCalculator.analyzeIntervals(mockMelody)
      const expectedAverage = [2, 2, 1, 2, -2, -1, -2].reduce((sum, val) => sum + Math.abs(val), 0) / 7
      expect(analysis.averageInterval).toBeCloseTo(expectedAverage, 1)
    })

    it('should determine melodic direction correctly', () => {
      const ascendingMelody = {
        ...mockMelody,
        intervals: [1, 1, 1, 1, 1, 1, 1]
      }
      const ascendingAnalysis = MelodyCalculator.analyzeIntervals(ascendingMelody)
      expect(ascendingAnalysis.direction).toBe('ascending')

      const descendingMelody = {
        ...mockMelody,
        intervals: [-1, -1, -1, -1, -1, -1, -1]
      }
      const descendingAnalysis = MelodyCalculator.analyzeIntervals(descendingMelody)
      expect(descendingAnalysis.direction).toBe('descending')
    })
  })

  describe('Melody Generation', () => {
    it('should generate melody from contour correctly', () => {
      const contour = [0, 0.5, 1, 0.75, 0.25, 0, 0.5, 1]
      const rhythm = [1, 0.5, 0.5, 1, 0.5, 0.5, 1, 1]

      const melody = MelodyCalculator.generateMelodyFromContour(contour, mockScale, {
        rhythm,
        smoothness: 0.8
      })

      expect(melody.notes).toHaveLength(8)
      expect(melody.intervals).toHaveLength(7)
      expect(melody.scale).toBe(mockScale)
      expect(melody.rhythm).toBeDefined()
      expect(melody.contour).toEqual(contour)
    })

    it('should quantize notes to scale correctly', () => {
      const contour = [0, 1, 0, 1, 0, 1, 0, 1]
      const melody = MelodyCalculator.generateMelodyFromContour(contour, mockScale, {
        noteRange: [60, 72]
      })

      melody.notes.forEach(note => {
        const isInScale = mockScale.notes.some(scaleNote => scaleNote.midi === note.midi)
        expect(isInScale).toBe(true)
      })
    })

    it('should apply smoothing correctly', () => {
      const contour = [0, 1, 0, 1, 0, 1, 0, 1]
      const smoothedMelody = MelodyCalculator.generateMelodyFromContour(contour, mockScale, {
        smoothness: 1.0
      })

      const unsmoothedMelody = MelodyCalculator.generateMelodyFromContour(contour, mockScale, {
        smoothness: 0.0
      })

      // Smoothed melody should have smaller intervals
      const smoothedIntervals = smoothedMelody.intervals.map(Math.abs)
      const unsmoothedIntervals = unsmoothedMelody.intervals.map(Math.abs)
      const smoothedAvg = smoothedIntervals.reduce((a, b) => a + b, 0) / smoothedIntervals.length
      const unsmoothedAvg = unsmoothedIntervals.reduce((a, b) => a + b, 0) / unsmoothedIntervals.length

      expect(smoothedAvg).toBeLessThanOrEqual(unsmoothedAvg)
    })
  })

  describe('Melodic Similarity', () => {
    const melody1 = {
      notes: [{ midi: 60 }, { midi: 62 }, { midi: 64 }, { midi: 65 }],
      intervals: [2, 2, 1],
      contour: [0, 0.3, 0.7, 1],
      scale: mockScale,
      rhythm: { pattern: [1, 1, 1, 1] }
    }

    const melody2 = {
      notes: [{ midi: 64 }, { midi: 65 }, { midi: 67 }, { midi: 69 }],
      intervals: [1, 2, 2],
      contour: [0, 0.2, 0.6, 1],
      scale: mockScale,
      rhythm: { pattern: [1, 1, 1, 1] }
    }

    it('should calculate melodic similarity correctly', () => {
      const similarity = MelodyCalculator.calculateMelodicSimilarity(melody1, melody2)

      expect(similarity.contourSimilarity).toBeGreaterThanOrEqual(0)
      expect(similarity.contourSimilarity).toBeLessThanOrEqual(1)
      expect(similarity.rhythmSimilarity).toBeGreaterThanOrEqual(0)
      expect(similarity.rhythmSimilarity).toBeLessThanOrEqual(1)
      expect(similarity.intervalSimilarity).toBeGreaterThanOrEqual(0)
      expect(similarity.intervalSimilarity).toBeLessThanOrEqual(1)
      expect(similarity.overallSimilarity).toBeGreaterThanOrEqual(0)
      expect(similarity.overallSimilarity).toBeLessThanOrEqual(1)
    })

    it('should give high similarity for identical melodies', () => {
      const similarity = MelodyCalculator.calculateMelodicSimilarity(melody1, melody1)

      expect(similarity.overallSimilarity).toBeCloseTo(1, 1)
    })
  })
})

describe('SignalProcessor', () => {
  describe('Pitch Detection', () => {
    it('should detect pitch correctly', () => {
      const sampleRate = 44100
      const frequency = 440 // A4
      const duration = 1 // 1 second
      const samples = sampleRate * duration

      const signal = new Float32Array(samples)
      for (let i = 0; i < samples; i++) {
        signal[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate)
      }

      const detectedPitch = SignalProcessor.detectPitch(signal, sampleRate)

      expect(detectedPitch).toBeCloseTo(frequency, 1)
    })

    it('should handle low frequency signals', () => {
      const sampleRate = 44100
      const frequency = 100 // Low frequency
      const duration = 1
      const samples = sampleRate * duration

      const signal = new Float32Array(samples)
      for (let i = 0; i < samples; i++) {
        signal[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate)
      }

      const detectedPitch = SignalProcessor.detectPitch(signal, sampleRate)

      expect(detectedPitch).toBeCloseTo(frequency, 1)
    })

    it('should return 0 for silence', () => {
      const signal = new Float32Array(1024).fill(0)
      const pitch = SignalProcessor.detectPitch(signal, 44100)

      expect(pitch).toBe(0)
    })
  })

  describe('Onset Detection', () => {
    it('should detect onsets correctly', () => {
      const sampleRate = 44100
      const signal = new Float32Array(sampleRate) // 1 second

      // Add some onsets
      for (let i = 0; i < 1000; i++) {
        signal[i] = 0
      }
      for (let i = 1000; i < 1500; i++) {
        signal[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5
      }
      for (let i = 1500; i < 2000; i++) {
        signal[i] = 0
      }
      for (let i = 2000; i < 2500; i++) {
        signal[i] = Math.sin(2 * Math.PI * 880 * i / sampleRate) * 0.3
      }
      for (let i = 2500; i < sampleRate; i++) {
        signal[i] = 0
      }

      const onsets = SignalProcessor.detectOnsets(signal, sampleRate)

      expect(onsets.length).toBeGreaterThan(0)
      expect(onsets[0]).toBeCloseTo(1000 / sampleRate, 2)
    })

    it('should handle continuous signal', () => {
      const sampleRate = 44100
      const signal = new Float32Array(sampleRate)

      for (let i = 0; i < sampleRate; i++) {
        signal[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5
      }

      const onsets = SignalProcessor.detectOnsets(signal, sampleRate)

      expect(onsets.length).toBe(0) // No onsets in continuous signal
    })
  })

  describe('Tempo Estimation', () => {
    it('should estimate tempo correctly', () => {
      // Create onsets at 120 BPM (0.5 second intervals)
      const onsets = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5]
      const tempo = SignalProcessor.estimateTempo(onsets)

      expect(tempo).toBeCloseTo(120, 0)
    })

    it('should estimate different tempos correctly', () => {
      const onsets = [0, 0.333, 0.666, 1.0, 1.333, 1.666] // ~180 BPM
      const tempo = SignalProcessor.estimateTempo(onsets)

      expect(tempo).toBeCloseTo(180, 0)
    })

    it('should return default tempo for insufficient data', () => {
      const onsets = [0, 0.5] // Only one interval
      const tempo = SignalProcessor.estimateTempo(onsets)

      expect(tempo).toBe(120) // Default tempo
    })
  })

  describe('Spectral Analysis', () => {
    it('should analyze spectrum correctly', () => {
      const sampleRate = 44100
      const signal = new Float32Array(1024)

      // Create a signal with two frequency components
      for (let i = 0; i < 1024; i++) {
        signal[i] = (
          Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.7 +
          Math.sin(2 * Math.PI * 880 * i / sampleRate) * 0.3
        )
      }

      const spectrum = SignalProcessor.analyzeSpectrum(signal, sampleRate)

      expect(spectrum.frequencies).toBeDefined()
      expect(spectrum.magnitudes).toBeDefined()
      expect(spectrum.frequencies.length).toBe(512)
      expect(spectrum.magnitudes.length).toBe(512)
      expect(spectrum.spectralCentroid).toBeGreaterThan(0)
      expect(spectrum.spectralRolloff).toBeGreaterThan(0)
    })

    it('should handle silence correctly', () => {
      const signal = new Float32Array(1024).fill(0)
      const spectrum = SignalProcessor.analyzeSpectrum(signal, 44100)

      expect(spectrum.spectralCentroid).toBe(0)
      expect(spectrum.spectralRolloff).toBe(0)
    })
  })

  describe('Feature Extraction', () => {
    it('should extract all features correctly', () => {
      const sampleRate = 44100
      const signal = new Float32Array(sampleRate)

      // Create a musical signal
      for (let i = 0; i < sampleRate; i++) {
        signal[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.5
      }

      const features = SignalProcessor.extractFeatures(signal, sampleRate)

      expect(features.pitch).toBeGreaterThan(0)
      expect(features.tempo).toBeGreaterThanOrEqual(60)
      expect(features.tempo).toBeLessThanOrEqual(200)
      expect(features.onsets).toBeInstanceOf(Array)
      expect(features.spectralFeatures).toBeDefined()
      expect(features.rms).toBeGreaterThanOrEqual(0)
      expect(features.zcr).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('ProductionCalculationWorker', () => {
  let worker: ProductionCalculationWorker

  beforeEach(() => {
    worker = new ProductionCalculationWorker({
      maxConcurrency: 2,
      enableProfiling: true
    })
  })

  afterEach(() => {
    // Clean up any active jobs
    const activeJobs = worker.getActiveJobs()
    activeJobs.forEach(jobId => {
      worker.cancelJob(jobId)
    })
  })

  describe('Request Processing', () => {
    it('should process rhythm requests correctly', async () => {
      const request: CalculationRequest = {
        id: 'test-1',
        type: 'rhythm',
        operation: 'calculate_resultant',
        data: {
          pattern1: [1, 0, 1, 0],
          pattern2: [1, 1, 0, 0]
        },
        parameters: {},
        timestamp: Date.now()
      }

      const response = await worker.processRequest(request)

      expect(response.success).toBe(true)
      expect(response.id).toBe('test-1')
      expect(response.result).toEqual([1, 1, 1, 0])
      expect(response.processingTime).toBeGreaterThan(0)
    })

    it('should handle invalid operations gracefully', async () => {
      const request: CalculationRequest = {
        id: 'test-2',
        type: 'rhythm',
        operation: 'invalid_operation',
        data: {},
        parameters: {},
        timestamp: Date.now()
      }

      const response = await worker.processRequest(request)

      expect(response.success).toBe(false)
      expect(response.error).toContain('Unknown rhythm operation')
    })

    it('should handle concurrency limits', async () => {
      const requests: CalculationRequest[] = []
      for (let i = 0; i < 5; i++) {
        requests.push({
          id: `test-${i}`,
          type: 'rhythm',
          operation: 'calculate_resultant',
          data: { pattern1: [1, 0], pattern2: [0, 1] },
          parameters: {},
          timestamp: Date.now()
        })
      }

      // Process first 2 requests (within limit)
      const promises = requests.slice(0, 2).map(req => worker.processRequest(req))
      const responses = await Promise.all(promises)

      responses.forEach(response => {
        expect(response.success).toBe(true)
      })

      // 3rd request should fail due to concurrency limit
      const response3 = await worker.processRequest(requests[2])
      expect(response3.success).toBe(false)
      expect(response3.error).toContain('Concurrency limit exceeded')
    })
  })

  describe('Job Management', () => {
    it('should track active jobs correctly', async () => {
      const request: CalculationRequest = {
        id: 'test-job-1',
        type: 'rhythm',
        operation: 'calculate_complexity',
        data: { pattern: [1, 0, 1, 0] },
        parameters: {},
        timestamp: Date.now()
      }

      const promise = worker.processRequest(request)

      // Job should be active
      expect(worker.getActiveJobs()).toContain('test-job-1')

      const status = worker.getJobStatus('test-job-1')
      expect(status).toBeDefined()
      expect(status!.active).toBe(true)
      expect(status!.duration).toBeGreaterThan(0)

      await promise

      // Job should be completed
      expect(worker.getActiveJobs()).not.toContain('test-job-1')
      expect(worker.getJobStatus('test-job-1')).toBeNull()
    })

    it('should cancel jobs correctly', async () => {
      const request: CalculationRequest = {
        id: 'test-cancel-1',
        type: 'rhythm',
        operation: 'calculate_complexity',
        data: { pattern: [1, 0, 1, 0] },
        parameters: {},
        timestamp: Date.now()
      }

      const promise = worker.processRequest(request)

      // Cancel the job
      const cancelled = worker.cancelJob('test-cancel-1')
      expect(cancelled).toBe(true)

      // Job should no longer be active
      expect(worker.getActiveJobs()).not.toContain('test-cancel-1')

      // Attempting to cancel again should return false
      const cancelledAgain = worker.cancelJob('test-cancel-1')
      expect(cancelledAgain).toBe(false)
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        maxConcurrency: 8,
        timeoutMs: 60000,
        enableProfiling: false
      }

      worker.updateConfig(newConfig)

      const config = worker.getConfig()
      expect(config.maxConcurrency).toBe(8)
      expect(config.timeoutMs).toBe(60000)
      expect(config.enableProfiling).toBe(false)
    })

    it('should preserve unspecified configuration values', () => {
      const originalConfig = worker.getConfig()
      const originalMemoryLimit = originalConfig.memoryLimit

      worker.updateConfig({ maxConcurrency: 5 })

      const newConfig = worker.getConfig()
      expect(newConfig.maxConcurrency).toBe(5)
      expect(newConfig.memoryLimit).toBe(originalMemoryLimit)
    })
  })

  describe('Request Types', () => {
    it('should process harmony requests correctly', async () => {
      const request: CalculationRequest = {
        id: 'harmony-1',
        type: 'harmony',
        operation: 'generate_progression',
        data: { key: 'C', type: 'basic', length: 4 },
        parameters: {},
        timestamp: Date.now()
      }

      const response = await worker.processRequest(request)

      expect(response.success).toBe(true)
      expect(response.result).toBeDefined()
      expect(Array.isArray(response.result)).toBe(true)
    })

    it('should process melody requests correctly', async () => {
      const request: CalculationRequest = {
        id: 'melody-1',
        type: 'melody',
        operation: 'generate_contour',
        data: { length: 8, type: 'ascending' },
        parameters: {},
        timestamp: Date.now()
      }

      const response = await worker.processRequest(request)

      expect(response.success).toBe(true)
      expect(response.result).toBeDefined()
      expect(Array.isArray(response.result)).toBe(true)
      expect(response.result.length).toBe(8)
    })

    it('should process signal processing requests correctly', async () => {
      const signal = new Float32Array(1024)
      for (let i = 0; i < 1024; i++) {
        signal[i] = Math.sin(2 * Math.PI * 440 * i / 44100)
      }

      const request: CalculationRequest = {
        id: 'signal-1',
        type: 'signal_processing',
        operation: 'detect_pitch',
        data: { signal: Array.from(signal), sampleRate: 44100 },
        parameters: {},
        timestamp: Date.now()
      }

      const response = await worker.processRequest(request)

      expect(response.success).toBe(true)
      expect(response.result.pitch).toBeCloseTo(440, 1)
    })
  })
})