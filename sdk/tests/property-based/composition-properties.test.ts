/**
 * Property-Based Tests for Schillinger SDK
 *
 * These tests verify critical invariants using property-based testing with fast-check
 * covering:
 * - Composition structure invariants
 * - Generator output constraints
 * - Analysis result consistency
 * - Encoding/decoding properties
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fc from 'fast-check'
import { CompositionAPI } from '../core/composition'
import { SchillingerSDK } from '../core/client'
import type { Composition, Section, CompositionParams } from '../core/ir'

// Mock SDK instance
const createMockSDK = () => {
  return new SchillingerSDK({
    apiUrl: 'http://localhost:3000/api/v1',
    debug: false
  }) as any
}

describe('Property-Based Tests - Composition Invariants', () => {
  let compositionAPI: CompositionAPI
  let sdk: SchillingerSDK

  beforeEach(async () => {
    sdk = createMockSDK()
    await sdk.authenticate({ apiKey: 'test-key' })
    compositionAPI = new CompositionAPI(sdk)
  })

  afterEach(async () => {
    if (sdk) {
      await sdk.dispose()
    }
  })

  describe('Composition Structure Invariants', () => {
    it('should preserve section count after variation', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          name: fc.string(),
          key: fc.constantFrom('C', 'D', 'E', 'F', 'G', 'A', 'B'),
          scale: fc.constantFrom('major', 'minor'),
          tempo: fc.integer({ min: 60, max: 180 }),
          timeSignature: fc.tuple(fc.integer({ min: 2, max: 8 }), fc.constant(4))
        }),
        fc.constantFrom('rhythmic', 'harmonic', 'melodic' as const),
        fc.constantFrom('subtle', 'moderate', 'dramatic' as const),
        async (params, variationType, intensity) => {
          const composition = await compositionAPI.create(params)
          const originalSectionCount = composition.sections.length

          const varied = await compositionAPI.applyVariation(
            composition,
            { type: variationType, intensity }
          )

          // Invariant: Section count should be preserved
          expect(varied.sections.length).toBe(originalSectionCount)
          return true
        }
      ))
    })

    it('should maintain non-negative section positions', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          name: fc.string(),
          key: fc.constantFrom('C', 'D', 'E'),
          scale: fc.constantFrom('major', 'minor'),
          tempo: fc.integer({ min: 60, max: 180 }),
          timeSignature: fc.tuple(fc.integer({ min: 2, max: 8 }), fc.constant(4))
        }),
        async (params) => {
          const composition = await compositionAPI.create(params)

          // Invariant: All section positions should be non-negative
          for (const section of composition.sections) {
            expect(section.position).toBeGreaterThanOrEqual(0)
          }

          return true
        }
      ))
    })

    it('should have monotonically increasing section positions', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          name: fc.string(),
          key: fc.constantFrom('C', 'D', 'E'),
          scale: fc.constantFrom('major', 'minor'),
          tempo: fc.integer({ min: 60, max: 180 }),
          timeSignature: fc.tuple(fc.integer({ min: 2, max: 8 }), fc.constant(4))
        }),
        async (params) => {
          const composition = await compositionAPI.create(params)

          // Invariant: Section positions should be monotonically increasing
          for (let i = 1; i < composition.sections.length; i++) {
            expect(composition.sections[i].position)
              .toBeGreaterThan(composition.sections[i - 1].position)
          }

          return true
        }
      ))
    })
  })

  describe('Generator Output Constraints', () => {
    it('should produce valid IR structure', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          name: fc.string(),
          key: fc.constantFrom('C', 'D', 'E', 'F', 'G', 'A', 'B'),
          scale: fc.constantFrom('major', 'minor'),
          tempo: fc.integer({ min: 60, max: 200 }),
          timeSignature: fc.tuple(fc.integer({ min: 2, max: 8 }), fc.constant(4)),
          style: fc.option(fc.string(), { nil: undefined }),
          complexity: fc.option(fc.constantFrom('simple', 'moderate', 'complex'), { nil: undefined })
        }),
        fc.string({ minLength: 1 }),
        async (params, seed) => {
          const ir = await compositionAPI.generateCompositionIR(params, seed)

          // Invariant: IR should have required fields
          expect(ir.version).toBe('1.0')
          expect(ir.seed).toBe(seed)
          expect(ir.baseRule).toBeDefined()
          expect(ir.baseRule.length).toBeGreaterThan(0)

          // Invariant: Base rule should contain key parameters
          expect(ir.baseRule).toContain(params.key)
          expect(ir.baseRule).toContain(params.scale)
          expect(ir.baseRule).toContain(params.tempo.toString())

          return true
        }
      ))
    })

    it('should produce consistent IR for same seed', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          name: fc.string(),
          key: fc.constantFrom('C', 'D', 'E'),
          scale: fc.constantFrom('major', 'minor'),
          tempo: fc.integer({ min: 60, max: 180 }),
          timeSignature: fc.tuple(fc.integer({ min: 2, max: 8 }), fc.constant(4))
        }),
        fc.string({ minLength: 1 }),
        async (params, seed) => {
          const ir1 = await compositionAPI.generateCompositionIR(params, seed)
          const ir2 = await compositionAPI.generateCompositionIR(params, seed)

          // Invariant: Same seed should produce identical IR
          expect(ir1).toEqual(ir2)

          return true
        }
      ))
    })

    it('should produce different IR for different seeds', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          name: fc.string(),
          key: fc.constantFrom('C', 'D', 'E'),
          scale: fc.constantFrom('major', 'minor'),
          tempo: fc.integer({ min: 60, max: 180 }),
          timeSignature: fc.tuple(fc.integer({ min: 2, max: 8 }), fc.constant(4))
        }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        async (params, seed1, seed2) => {
          // Only test if seeds are different
          fc.pre(seed1 !== seed2)

          const ir1 = await compositionAPI.generateCompositionIR(params, seed1)
          const ir2 = await compositionAPI.generateCompositionIR(params, seed2)

          // Invariant: Different seeds should produce different IR
          expect(ir1).not.toEqual(ir2)

          return true
        }
      ))
    })
  })

  describe('Analysis Result Consistency', () => {
    it('should produce confidence in valid range', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(fc.integer({ min: 48, max: 84 }), { minLength: 8, maxLength: 32 }),
        async (melody) => {
          const inference = await compositionAPI.inferStructure(melody)

          // Invariant: Confidence should be in [0, 1]
          expect(inference.confidence).toBeGreaterThanOrEqual(0)
          expect(inference.confidence).toBeLessThanOrEqual(1)

          return true
        }
      ))
    })

    it('should produce valid structure detection', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(fc.integer({ min: 48, max: 84 }), { minLength: 8, maxLength: 32 }),
        async (melody) => {
          const inference = await compositionAPI.inferStructure(melody)

          // Invariant: Detected structure should be non-empty array
          expect(Array.isArray(inference.detectedStructure)).toBe(true)
          expect(inference.detectedStructure.length).toBeGreaterThan(0)

          return true
        }
      ))
    })

    it('should maintain analysis consistency', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          name: fc.string(),
          key: fc.constantFrom('C', 'D', 'E'),
          scale: fc.constantFrom('major', 'minor'),
          tempo: fc.integer({ min: 60, max: 180 }),
          timeSignature: fc.tuple(fc.integer({ min: 2, max: 8 }), fc.constant(4))
        }),
        async (params) => {
          const composition = await compositionAPI.create(params)
          const analysis1 = await compositionAPI.analyzeComposition(composition)
          const analysis2 = await compositionAPI.analyzeComposition(composition)

          // Invariant: Analysis should be deterministic
          expect(analysis1.overall_complexity).toBe(analysis2.overall_complexity)
          expect(analysis1.structure.form).toBe(analysis2.structure.form)

          return true
        }
      ))
    })
  })

  describe('Encoding Properties', () => {
    it('should preserve input in encoding', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(fc.integer({ min: 48, max: 84 }), { minLength: 8, maxLength: 32 }),
        async (melody) => {
          const encoding = await compositionAPI.encodeUserInput({ melody })

          // Invariant: Original input should be preserved
          expect(encoding.originalInput.melody).toEqual(melody)

          return true
        }
      ))
    })

    it('should produce valid generators', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(fc.integer({ min: 48, max: 84 }), { minLength: 8, maxLength: 32 }),
        async (melody) => {
          const encoding = await compositionAPI.encodeUserInput({ melody })

          // Invariant: Generators should be positive integers
          if (encoding.schillingerParameters.rhythmGenerators) {
            const [a, b] = encoding.schillingerParameters.rhythmGenerators
            expect(a).toBeGreaterThan(0)
            expect(b).toBeGreaterThan(0)
          }

          if (encoding.schillingerParameters.melodyGenerators) {
            const [a, b] = encoding.schillingerParameters.melodyGenerators
            expect(a).toBeGreaterThan(0)
            expect(b).toBeGreaterThan(0)
          }

          return true
        }
      ))
    })

    it('should calculate confidence in valid range', async () => {
      await fc.assert(fc.asyncProperty(
        fc.array(fc.integer({ min: 48, max: 84 }), { minLength: 8, maxLength: 32 }),
        fc.option(fc.array(fc.integer({ min: 1, max: 4 }), { nil: undefined })),
        async (melody, rhythm) => {
          const encoding = await compositionAPI.encodeUserInput({ melody, rhythm })

          // Invariant: Confidence should be in [0, 1]
          expect(encoding.confidence).toBeGreaterThanOrEqual(0)
          expect(encoding.confidence).toBeLessThanOrEqual(1)

          return true
        }
      ))
    })
  })

  describe('Section Property Invariants', () => {
    it('should have positive section lengths', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('verse', 'chorus', 'bridge', 'intro', 'outro' as const),
          length: fc.integer({ min: 4, max: 32 }),
          position: fc.integer({ min: 0, max: 100 })
        }),
        fc.record({
          name: fc.string(),
          key: fc.constantFrom('C', 'D', 'E'),
          scale: fc.constantFrom('major', 'minor'),
          tempo: fc.integer({ min: 60, max: 180 }),
          timeSignature: fc.tuple(fc.integer({ min: 2, max: 8 }), fc.constant(4))
        }),
        async (sectionParams, compositionParams) => {
          const section = await compositionAPI.generateSection(
            sectionParams,
            compositionParams
          )

          // Invariant: Section should have positive length
          expect(section.length).toBeGreaterThan(0)

          return true
        }
      ))
    })

    it('should have valid rhythm patterns', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('verse', 'chorus' as const),
          length: fc.integer({ min: 8, max: 16 }),
          position: fc.integer({ min: 0, max: 50 })
        }),
        fc.record({
          name: fc.string(),
          key: fc.constantFrom('C', 'D', 'E'),
          scale: fc.constantFrom('major', 'minor'),
          tempo: fc.integer({ min: 60, max: 180 }),
          timeSignature: fc.tuple(fc.integer({ min: 2, max: 8 }), fc.constant(4))
        }),
        async (sectionParams, compositionParams) => {
          const section = await compositionAPI.generateSection(
            sectionParams,
            compositionParams
          )

          // Invariant: Rhythm should have valid durations
          expect(section.rhythm).toBeDefined()
          expect(section.rhythm.durations).toBeDefined()
          expect(section.rhythm.durations.length).toBeGreaterThan(0)

          // All durations should be positive
          for (const duration of section.rhythm.durations) {
            expect(duration).toBeGreaterThan(0)
          }

          return true
        }
      ))
    })

    it('should have valid chord progressions', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('verse', 'chorus' as const),
          length: fc.integer({ min: 8, max: 16 }),
          position: fc.integer({ min: 0, max: 50 })
        }),
        fc.record({
          name: fc.string(),
          key: fc.constantFrom('C', 'D', 'E'),
          scale: fc.constantFrom('major', 'minor'),
          tempo: fc.integer({ min: 60, max: 180 }),
          timeSignature: fc.tuple(fc.integer({ min: 2, max: 8 }), fc.constant(4))
        }),
        async (sectionParams, compositionParams) => {
          const section = await compositionAPI.generateSection(
            sectionParams,
            compositionParams
          )

          // Invariant: Harmony should have valid chords
          expect(section.harmony).toBeDefined()
          expect(section.harmony.chords).toBeDefined()
          expect(Array.isArray(section.harmony.chords)).toBe(true)

          // All chords should be non-empty strings
          for (const chord of section.harmony.chords) {
            expect(typeof chord).toBe('string')
            expect(chord.length).toBeGreaterThan(0)
          }

          return true
        }
      ))
    })
  })

  describe('Composition Metadata Invariants', () => {
    it('should have positive duration', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          name: fc.string(),
          key: fc.constantFrom('C', 'D', 'E', 'F', 'G', 'A', 'B'),
          scale: fc.constantFrom('major', 'minor'),
          tempo: fc.integer({ min: 60, max: 200 }),
          timeSignature: fc.tuple(fc.integer({ min: 2, max: 8 }), fc.constant(4)),
          length: fc.integer({ min: 16, max: 128 })
        }),
        async (params) => {
          const composition = await compositionAPI.create(params)

          // Invariant: Duration should be positive
          expect(composition.metadata.duration).toBeGreaterThan(0)

          // Invariant: Duration should be reasonable for tempo
          const expectedMinDuration = (params.length * 4 * 60) / params.tempo
          expect(composition.metadata.duration).toBeGreaterThan(expectedMinDuration * 0.8)

          return true
        }
      ))
    })

    it('should have complexity in valid range', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          name: fc.string(),
          key: fc.constantFrom('C', 'D', 'E'),
          scale: fc.constantFrom('major', 'minor'),
          tempo: fc.integer({ min: 60, max: 180 }),
          timeSignature: fc.tuple(fc.integer({ min: 2, max: 8 }), fc.constant(4))
        }),
        async (params) => {
          const composition = await compositionAPI.create(params)

          // Invariant: Complexity should be in [0, 1]
          expect(composition.metadata.complexity).toBeGreaterThanOrEqual(0)
          expect(composition.metadata.complexity).toBeLessThanOrEqual(1)

          return true
        }
      ))
    })

    it('should preserve tempo and time signature', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          name: fc.string(),
          key: fc.constantFrom('C', 'D', 'E'),
          scale: fc.constantFrom('major', 'minor'),
          tempo: fc.integer({ min: 60, max: 180 }),
          timeSignature: fc.tuple(fc.integer({ min: 2, max: 8 }), fc.constant(4))
        }),
        async (params) => {
          const composition = await compositionAPI.create(params)

          // Invariant: Tempo and time signature should be preserved
          expect(composition.tempo).toBe(params.tempo)
          expect(composition.timeSignature).toEqual(params.timeSignature)

          return true
        }
      ))
    })
  })

  describe('Arrangement Invariants', () => {
    it('should preserve template structure', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          name: fc.string(),
          structure: fc.array(
            fc.record({
              type: fc.constantFrom('verse', 'chorus', 'bridge', 'intro', 'outro' as const),
              length: fc.integer({ min: 4, max: 16 }),
              characteristics: fc.array(fc.string())
            }),
            { minLength: 2, maxLength: 8 }
          ),
          transitions: fc.array(fc.anything()),
          style: fc.string(),
          complexity: fc.constantFrom('simple', 'moderate', 'complex' as const)
        }),
        async (template) => {
          const arrangement = await compositionAPI.generateArrangement(template)

          // Invariant: Section count should match template
          expect(arrangement.sections.length).toBe(template.structure.length)

          // Invariant: Total length should be sum of section lengths
          const expectedTotalLength = template.structure.reduce(
            (sum, section) => sum + section.length,
            0
          )
          expect(arrangement.totalLength).toBe(expectedTotalLength)

          return true
        }
      ))
    })

    it('should have positive estimated duration', async () => {
      await fc.assert(fc.asyncProperty(
        fc.record({
          name: fc.string(),
          structure: fc.array(
            fc.record({
              type: fc.constantFrom('verse', 'chorus' as const),
              length: fc.integer({ min: 8, max: 16 }),
              characteristics: fc.array(fc.string())
            }),
            { minLength: 2, maxLength: 4 }
          ),
          transitions: fc.array(fc.anything()),
          style: fc.string(),
          complexity: fc.constantFrom('simple', 'moderate', 'complex' as const)
        }),
        async (template) => {
          const arrangement = await compositionAPI.generateArrangement(template)

          // Invariant: Estimated duration should be positive
          expect(arrangement.estimatedDuration).toBeGreaterThan(0)

          return true
        }
      ))
    })
  })
})
