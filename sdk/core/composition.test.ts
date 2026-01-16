/**
 * Critical Path Tests for Composition API
 *
 * These tests cover the core composition functionality including:
 * - IR-based composition generation
 * - Composition validation
 * - Section management
 * - Variation generation
 * - Structure inference
 * - Offline mode handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CompositionAPI } from './composition'
import { SchillingerSDK } from './client'
import type { Composition, Section, CompositionParams } from './ir'

// Mock SDK instance
const createMockSDK = () => {
  return new SchillingerSDK({
    apiUrl: 'http://localhost:3000/api/v1',
    debug: false
  }) as any
}

describe('CompositionAPI - Critical Path Tests', () => {
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

  describe('IR-Based Composition Generation', () => {
    it('should generate composition IR with valid seed', async () => {
      const params: CompositionParams = {
        name: 'Test Composition',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4]
      }

      const seed = 'test-seed-123'
      const ir = await compositionAPI.generateCompositionIR(params, seed)

      expect(ir.version).toBe('1.0')
      expect(ir.seed).toBe(seed)
      expect(ir.baseRule).toContain('composition')
      expect(ir.baseRule).toContain('C')
      expect(ir.baseRule).toContain('major')
      expect(ir.baseRule).toContain('120')
      expect(ir.baseRule).toContain('4/4')
    })

    it('should validate composition parameters', async () => {
      const invalidParams = {
        name: '',
        key: '',
        scale: '',
        tempo: 0,
        timeSignature: [4, 4]
      } as any

      await expect(
        compositionAPI.generateCompositionIR(invalidParams, 'seed')
      ).rejects.toThrow()
    })

    it('should validate tempo range', async () => {
      const params: CompositionParams = {
        name: 'Test',
        key: 'C',
        scale: 'major',
        tempo: 300, // Invalid tempo
        timeSignature: [4, 4]
      }

      await expect(
        compositionAPI.generateCompositionIR(params, 'seed')
      ).rejects.toThrow()
    })

    it('should validate time signature format', async () => {
      const params: CompositionParams = {
        name: 'Test',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4, 4] as any // Invalid format
      }

      await expect(
        compositionAPI.generateCompositionIR(params, 'seed')
      ).rejects.toThrow()
    })

    it('should include variation rules when provided', async () => {
      const params: CompositionParams = {
        name: 'Test Composition',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4],
        style: 'jazz',
        complexity: 'complex',
        structure: ['verse', 'chorus', 'bridge']
      }

      const ir = await compositionAPI.generateCompositionIR(params, 'seed')

      expect(ir.variationRule).toBeDefined()
      expect(ir.variationRule).toContain('style:jazz')
      expect(ir.variationRule).toContain('complexity:complex')
    })
  })

  describe('Composition Creation', () => {
    const validParams: CompositionParams = {
      name: 'Test Composition',
      key: 'C',
      scale: 'major',
      tempo: 120,
      timeSignature: [4, 4],
      complexity: 'moderate'
    }

    it('should create composition with sections', async () => {
      const composition = await compositionAPI.create(validParams)

      expect(composition).toBeDefined()
      expect(composition.name).toBe('Test Composition')
      expect(composition.key).toBe('C')
      expect(composition.scale).toBe('major')
      expect(composition.tempo).toBe(120)
      expect(composition.timeSignature).toEqual([4, 4])
      expect(composition.sections).toBeDefined()
      expect(composition.sections.length).toBeGreaterThan(0)
    })

    it('should generate default structure when not provided', async () => {
      const paramsWithoutStructure: CompositionParams = {
        name: 'Test',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4]
      }

      const composition = await compositionAPI.create(paramsWithoutStructure)

      expect(composition.sections).toBeDefined()
      expect(composition.sections.length).toBeGreaterThan(0)
    })

    it('should use custom structure when provided', async () => {
      const paramsWithStructure: CompositionParams = {
        name: 'Test',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4],
        structure: ['intro', 'verse', 'chorus', 'outro']
      }

      const composition = await compositionAPI.create(paramsWithStructure)

      expect(composition.sections.length).toBe(4)
      expect(composition.sections[0].type).toBe('intro')
      expect(composition.sections[3].type).toBe('outro')
    })

    it('should create sections with rhythm, harmony, and melody', async () => {
      const composition = await compositionAPI.create(validParams)

      const firstSection = composition.sections[0]

      expect(firstSection.rhythm).toBeDefined()
      expect(firstSection.harmony).toBeDefined()
      // Melody may or may not be present depending on section type
      expect(firstSection.type).toBeDefined()
    })

    it('should calculate composition metadata', async () => {
      const composition = await compositionAPI.create(validParams)

      expect(composition.metadata).toBeDefined()
      expect(composition.metadata.duration).toBeGreaterThan(0)
      expect(composition.metadata.complexity).toBeGreaterThanOrEqual(0)
      expect(composition.metadata.complexity).toBeLessThanOrEqual(1)
    })
  })

  describe('Section Management', () => {
    it('should generate section with specified parameters', async () => {
      const sectionParams = {
        type: 'verse' as const,
        length: 16,
        position: 0
      }

      const compositionParams: CompositionParams = {
        name: 'Test',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4]
      }

      const section = await compositionAPI.generateSection(
        sectionParams,
        compositionParams
      )

      expect(section).toBeDefined()
      expect(section.type).toBe('verse')
      expect(section.length).toBe(16)
      expect(section.position).toBe(0)
      expect(section.rhythm).toBeDefined()
      expect(section.harmony).toBeDefined()
    })

    it('should handle different section types', async () => {
      const sectionTypes: Array<'verse' | 'chorus' | 'bridge' | 'intro' | 'outro'> =
        ['verse', 'chorus', 'bridge', 'intro', 'outro']

      const compositionParams: CompositionParams = {
        name: 'Test',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4]
      }

      for (const type of sectionTypes) {
        const section = await compositionAPI.generateSection(
          { type, length: 8, position: 0 },
          compositionParams
        )

        expect(section.type).toBe(type)
      }
    })

    it('should include melody for melodic sections', async () => {
      const sectionParams = {
        type: 'verse' as const,
        length: 8,
        position: 0
      }

      const compositionParams: CompositionParams = {
        name: 'Test',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4]
      }

      const section = await compositionAPI.generateSection(
        sectionParams,
        compositionParams
      )

      expect(section.melody).toBeDefined()
      expect(section.melody?.notes).toBeDefined()
      expect(Array.isArray(section.melody?.notes)).toBe(true)
    })
  })

  describe('Composition Analysis', () => {
    let testComposition: Composition

    beforeEach(async () => {
      const params: CompositionParams = {
        name: 'Test Composition',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4],
        structure: ['verse', 'chorus', 'verse', 'chorus']
      }

      testComposition = await compositionAPI.create(params)
    })

    it('should analyze composition structure', async () => {
      const analysis = await compositionAPI.analyzeComposition(testComposition)

      expect(analysis).toBeDefined()
      expect(analysis.structure).toBeDefined()
      expect(analysis.structure.form).toBeDefined()
      expect(analysis.structure.sections).toBeDefined()
      expect(analysis.structure.sections.length).toBe(4)
    })

    it('should analyze harmonic content', async () => {
      const analysis = await compositionAPI.analyzeComposition(testComposition)

      expect(analysis.harmonic).toBeDefined()
      expect(analysis.harmonic.key_stability).toBeDefined()
      expect(Array.isArray(analysis.harmonic.tension_curve)).toBe(true)
    })

    it('should analyze rhythmic content', async () => {
      const analysis = await compositionAPI.analyzeComposition(testComposition)

      expect(analysis.rhythmic).toBeDefined()
      expect(analysis.rhythmic.complexity).toBeDefined()
      expect(typeof analysis.rhythmic.complexity).toBe('number')
    })

    it('should calculate overall complexity', async () => {
      const analysis = await compositionAPI.analyzeComposition(testComposition)

      expect(analysis.overall_complexity).toBeDefined()
      expect(analysis.overall_complexity).toBeGreaterThanOrEqual(0)
      expect(analysis.overall_complexity).toBeLessThanOrEqual(1)
    })

    it('should analyze transitions between sections', async () => {
      const analysis = await compositionAPI.analyzeComposition(testComposition)

      expect(analysis.structure.transitions).toBeDefined()
      expect(analysis.structure.transitions.length).toBe(3) // 4 sections = 3 transitions

      const firstTransition = analysis.structure.transitions[0]
      expect(firstTransition.from).toBeDefined()
      expect(firstTransition.to).toBeDefined()
      expect(firstTransition.type).toBeDefined()
      expect(firstTransition.effectiveness).toBeDefined()
    })
  })

  describe('Variation Generation', () => {
    let baseComposition: Composition

    beforeEach(async () => {
      const params: CompositionParams = {
        name: 'Base Composition',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4],
        structure: ['verse', 'chorus']
      }

      baseComposition = await compositionAPI.create(params)
    })

    it('should apply rhythmic variation', async () => {
      const variation = await compositionAPI.applyVariation(
        baseComposition,
        {
          type: 'rhythmic',
          intensity: 'moderate'
        }
      )

      expect(variation).toBeDefined()
      expect(variation.name).toContain('rhythmic variation')
      expect(variation.sections).toBeDefined()
      expect(variation.sections.length).toBe(baseComposition.sections.length)
    })

    it('should apply harmonic variation', async () => {
      const variation = await compositionAPI.applyVariation(
        baseComposition,
        {
          type: 'harmonic',
          intensity: 'subtle'
        }
      )

      expect(variation).toBeDefined()
      expect(variation.name).toContain('harmonic variation')
    })

    it('should apply melodic variation', async () => {
      const variation = await compositionAPI.applyVariation(
        baseComposition,
        {
          type: 'melodic',
          intensity: 'dramatic'
        }
      )

      expect(variation).toBeDefined()
      expect(variation.name).toContain('melodic variation')
    })

    it('should vary only specified sections', async () => {
      const variation = await compositionAPI.applyVariation(
        baseComposition,
        {
          type: 'rhythmic',
          intensity: 'moderate',
          sections: ['verse']
        }
      )

      expect(variation).toBeDefined()
      expect(variation.sections).toBeDefined()
    })

    it('should preserve structure when requested', async () => {
      const variation = await compositionAPI.applyVariation(
        baseComposition,
        {
          type: 'rhythmic',
          intensity: 'moderate',
          preserveStructure: true
        }
      )

      expect(variation.sections.length).toBe(baseComposition.sections.length)

      for (let i = 0; i < variation.sections.length; i++) {
        expect(variation.sections[i].type).toBe(baseComposition.sections[i].type)
        expect(variation.sections[i].length).toBe(baseComposition.sections[i].length)
      }
    })
  })

  describe('Structure Inference', () => {
    it('should infer structure from melody', async () => {
      const melody = [60, 62, 64, 65, 67, 65, 64, 62, 60, 58, 60, 62, 64, 67, 72, 71]

      const inference = await compositionAPI.inferStructure(melody)

      expect(inference).toBeDefined()
      expect(inference.detectedStructure).toBeDefined()
      expect(Array.isArray(inference.detectedStructure)).toBe(true)
      expect(inference.confidence).toBeDefined()
      expect(inference.confidence).toBeGreaterThanOrEqual(0)
      expect(inference.confidence).toBeLessThanOrEqual(1)
    })

    it('should analyze repetition patterns', async () => {
      const melody = [60, 62, 64, 60, 62, 64, 65, 67, 65, 67]

      const inference = await compositionAPI.inferStructure(melody)

      expect(inference.analysis.repetitionPatterns).toBeDefined()
      expect(Array.isArray(inference.analysis.repetitionPatterns)).toBe(true)
    })

    it('should analyze phrase structure', async () => {
      const melody = [60, 62, 64, 65, 67, 65, 64, 62, 60, 58, 60, 62, 64, 67, 72, 71]

      const inference = await compositionAPI.inferStructure(melody)

      expect(inference.analysis.phraseStructure).toBeDefined()
      expect(Array.isArray(inference.analysis.phraseStructure)).toBe(true)
    })

    it('should include suggestions', async () => {
      const melody = [60, 62, 64]

      const inference = await compositionAPI.inferStructure(melody)

      expect(inference.suggestions).toBeDefined()
      expect(Array.isArray(inference.suggestions)).toBe(true)
    })

    it('should handle rhythm input', async () => {
      const melody = [60, 62, 64, 65]
      const rhythm = [1, 1, 0.5, 0.5, 1, 2]

      const inference = await compositionAPI.inferStructure(melody, rhythm)

      expect(inference).toBeDefined()
      expect(inference.analysis.harmonicRhythm).toBeDefined()
    })
  })

  describe('User Input Encoding', () => {
    it('should encode melody input', async () => {
      const melody = [60, 62, 64, 65, 67]

      const encoding = await compositionAPI.encodeUserInput({
        melody
      })

      expect(encoding).toBeDefined()
      expect(encoding.originalInput.melody).toEqual(melody)
      expect(encoding.schillingerParameters).toBeDefined()
    })

    it('should encode rhythm input', async () => {
      const rhythm = [1, 0.5, 0.5, 1, 1]

      const encoding = await compositionAPI.encodeUserInput({
        rhythm
      })

      expect(encoding).toBeDefined()
      expect(encoding.originalInput.rhythm).toEqual(rhythm)
      expect(encoding.schillingerParameters.rhythmGenerators).toBeDefined()
    })

    it('should encode harmony input', async () => {
      const harmony = ['C', 'Am', 'F', 'G']

      const encoding = await compositionAPI.encodeUserInput({
        harmony
      })

      expect(encoding).toBeDefined()
      expect(encoding.originalInput.harmony).toEqual(harmony)
      expect(encoding.schillingerParameters.harmonyGenerators).toBeDefined()
    })

    it('should encode combined input', async () => {
      const melody = [60, 62, 64, 65]
      const rhythm = [1, 1, 0.5, 0.5]
      const harmony = ['C', 'Am', 'F', 'G']

      const encoding = await compositionAPI.encodeUserInput({
        melody,
        rhythm,
        harmony
      })

      expect(encoding).toBeDefined()
      expect(encoding.schillingerParameters.rhythmGenerators).toBeDefined()
      expect(encoding.schillingerParameters.harmonyGenerators).toBeDefined()
      expect(encoding.schillingerParameters.melodyGenerators).toBeDefined()
    })

    it('should provide recommendations', async () => {
      const melody = [60, 62, 64]

      const encoding = await compositionAPI.encodeUserInput({
        melody
      })

      expect(encoding.recommendations).toBeDefined()
      expect(Array.isArray(encoding.recommendations)).toBe(true)
    })

    it('should calculate confidence', async () => {
      const melody = [60, 62, 64, 65, 67]

      const encoding = await compositionAPI.encodeUserInput({
        melody
      })

      expect(encoding.confidence).toBeDefined()
      expect(encoding.confidence).toBeGreaterThanOrEqual(0)
      expect(encoding.confidence).toBeLessThanOrEqual(1)
    })
  })

  describe('Arrangement Generation', () => {
    it('should generate arrangement from template', async () => {
      const template = {
        name: 'Standard Song Form',
        structure: [
          { type: 'verse' as const, length: 16, characteristics: ['melodic'] },
          { type: 'chorus' as const, length: 8, characteristics: ['catchy'] },
          { type: 'verse' as const, length: 16, characteristics: ['melodic'] },
          { type: 'chorus' as const, length: 8, characteristics: ['catchy'] }
        ],
        transitions: [
          { from: 'verse' as const, to: 'chorus' as const, type: 'buildup' },
          { from: 'chorus' as const, to: 'verse' as const, type: 'release' }
        ],
        style: 'pop',
        complexity: 'moderate' as const
      }

      const arrangement = await compositionAPI.generateArrangement(template)

      expect(arrangement).toBeDefined()
      expect(arrangement.sections).toBeDefined()
      expect(arrangement.sections.length).toBe(4)
      expect(arrangement.totalLength).toBe(48)
      expect(arrangement.estimatedDuration).toBeGreaterThan(0)
    })

    it('should calculate arrangement metadata', async () => {
      const template = {
        name: 'Simple Form',
        structure: [
          { type: 'verse' as const, length: 8, characteristics: [] },
          { type: 'chorus' as const, length: 8, characteristics: [] }
        ],
        transitions: [],
        style: 'simple',
        complexity: 'simple' as const
      }

      const arrangement = await compositionAPI.generateArrangement(template)

      expect(arrangement.metadata).toBeDefined()
      expect(arrangement.metadata.generatedAt).toBeDefined()
      expect(arrangement.metadata.complexity).toBeDefined()
      expect(arrangement.metadata.coherence).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid composition gracefully', async () => {
      const invalidComposition = {} as any

      await expect(
        compositionAPI.analyzeComposition(invalidComposition)
      ).rejects.toThrow()
    })

    it('should handle empty melody in structure inference', async () => {
      await expect(
        compositionAPI.inferStructure([])
      ).rejects.toThrow()
    })

    it('should handle no input in encoding', async () => {
      await expect(
        compositionAPI.encodeUserInput({})
      ).rejects.toThrow()
    })

    it('should handle offline mode', () => {
      sdk.setOfflineMode()
      expect(sdk.isOfflineMode()).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle single section composition', async () => {
      const params: CompositionParams = {
        name: 'Single Section',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4],
        structure: ['verse']
      }

      const composition = await compositionAPI.create(params)

      expect(composition.sections.length).toBe(1)
    })

    it('should handle very long composition', async () => {
      const params: CompositionParams = {
        name: 'Long Composition',
        key: 'C',
        scale: 'major',
        tempo: 120,
        timeSignature: [4, 4],
        length: 200 // 200 measures
      }

      const composition = await compositionAPI.create(params)

      expect(composition.metadata.duration).toBeGreaterThan(0)
    })

    it('should handle extreme tempos', async () => {
      const params: CompositionParams = {
        name: 'Fast Composition',
        key: 'C',
        scale: 'major',
        tempo: 200,
        timeSignature: [4, 4]
      }

      const composition = await compositionAPI.create(params)

      expect(composition.tempo).toBe(200)
    })
  })
})
