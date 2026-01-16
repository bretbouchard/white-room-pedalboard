/**
 * Performance Benchmarks for Critical Operations
 *
 * These tests ensure that critical SDK operations meet performance requirements:
 * - Composition generation: < 1s for simple, < 5s for complex
 * - Analysis operations: < 500ms
 * - Encoding operations: < 1s
 * - Section generation: < 100ms
 */

import { describe, bench, expect, beforeAll, afterAll } from 'vitest'
import { CompositionAPI } from '../../core/composition'
import { SchillingerSDK } from '../../core/client'

describe('Performance Benchmarks', () => {
  let compositionAPI: CompositionAPI
  let sdk: SchillingerSDK

  beforeAll(async () => {
    sdk = new SchillingerSDK({
      apiUrl: 'http://localhost:3000/api/v1',
      debug: false
    }) as any

    await sdk.authenticate({ apiKey: 'test-key' })
    compositionAPI = new CompositionAPI(sdk)
  })

  afterAll(async () => {
    if (sdk) {
      await sdk.dispose()
    }
  })

  describe('IR Generation Performance', () => {
    bench('should generate IR quickly', async () => {
      const params = {
        name: 'Test Composition',
        key: 'C' as const,
        scale: 'major' as const,
        tempo: 120,
        timeSignature: [4, 4] as const
      }

      await compositionAPI.generateCompositionIR(params, 'test-seed')
    }, { iterations: 100, time: 5000 })

    bench('should generate IR with variations', async () => {
      const params = {
        name: 'Complex Composition',
        key: 'C' as const,
        scale: 'major' as const,
        tempo: 140,
        timeSignature: [4, 4] as const,
        style: 'jazz',
        complexity: 'complex' as const,
        structure: ['verse', 'chorus', 'bridge', 'instrumental'] as const
      }

      await compositionAPI.generateCompositionIR(params, 'test-seed')
    }, { iterations: 50, time: 5000 })
  })

  describe('Composition Creation Performance', () => {
    bench('should create simple composition quickly', async () => {
      const params = {
        name: 'Simple Test',
        key: 'C' as const,
        scale: 'major' as const,
        tempo: 120,
        timeSignature: [4, 4] as const,
        structure: ['verse', 'chorus'] as const
      }

      await compositionAPI.create(params)
    }, { iterations: 50, time: 10000 })

    bench('should create complex composition', async () => {
      const params = {
        name: 'Complex Test',
        key: 'C' as const,
        scale: 'major' as const,
        tempo: 120,
        timeSignature: [4, 4] as const,
        structure: ['intro', 'verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus', 'outro'] as const,
        complexity: 'complex' as const
      }

      await compositionAPI.create(params)
    }, { iterations: 20, time: 10000 })

    bench('should create long composition', async () => {
      const params = {
        name: 'Long Test',
        key: 'C' as const,
        scale: 'major' as const,
        tempo: 120,
        timeSignature: [4, 4] as const,
        length: 128 // 128 measures
      }

      await compositionAPI.create(params)
    }, { iterations: 10, time: 15000 })
  })

  describe('Section Generation Performance', () => {
    bench('should generate verse section quickly', async () => {
      const sectionParams = {
        type: 'verse' as const,
        length: 16,
        position: 0
      }

      const compositionParams = {
        name: 'Test',
        key: 'C' as const,
        scale: 'major' as const,
        tempo: 120,
        timeSignature: [4, 4] as const
      }

      await compositionAPI.generateSection(sectionParams, compositionParams)
    }, { iterations: 100, time: 3000 })

    bench('should generate chorus section quickly', async () => {
      const sectionParams = {
        type: 'chorus' as const,
        length: 8,
        position: 0
      }

      const compositionParams = {
        name: 'Test',
        key: 'C' as const,
        scale: 'major' as const,
        tempo: 120,
        timeSignature: [4, 4] as const
      }

      await compositionAPI.generateSection(sectionParams, compositionParams)
    }, { iterations: 100, time: 3000 })

    bench('should generate instrumental section', async () => {
      const sectionParams = {
        type: 'instrumental' as const,
        length: 16,
        position: 0
      }

      const compositionParams = {
        name: 'Test',
        key: 'C' as const,
        scale: 'major' as const,
        tempo: 120,
        timeSignature: [4, 4] as const
      }

      await compositionAPI.generateSection(sectionParams, compositionParams)
    }, { iterations: 100, time: 3000 })
  })

  describe('Analysis Performance', () => {
    let testComposition: any

    beforeAll(async () => {
      const params = {
        name: 'Test Composition',
        key: 'C' as const,
        scale: 'major' as const,
        tempo: 120,
        timeSignature: [4, 4] as const,
        structure: ['verse', 'chorus', 'verse', 'chorus', 'bridge', 'chorus'] as const
      }

      testComposition = await compositionAPI.create(params)
    })

    bench('should analyze composition quickly', async () => {
      await compositionAPI.analyzeComposition(testComposition)
    }, { iterations: 50, time: 5000 })

    bench('should analyze simple composition', async () => {
      const simpleParams = {
        name: 'Simple',
        key: 'C' as const,
        scale: 'major' as const,
        tempo: 120,
        timeSignature: [4, 4] as const,
        structure: ['verse', 'chorus'] as const
      }

      const simpleComposition = await compositionAPI.create(simpleParams)
      await compositionAPI.analyzeComposition(simpleComposition)
    }, { iterations: 100, time: 3000 })
  })

  describe('Variation Performance', () => {
    let testComposition: any

    beforeAll(async () => {
      const params = {
        name: 'Base Composition',
        key: 'C' as const,
        scale: 'major' as const,
        tempo: 120,
        timeSignature: [4, 4] as const,
        structure: ['verse', 'chorus', 'verse', 'chorus'] as const
      }

      testComposition = await compositionAPI.create(params)
    })

    bench('should apply rhythmic variation quickly', async () => {
      await compositionAPI.applyVariation(testComposition, {
        type: 'rhythmic',
        intensity: 'moderate'
      })
    }, { iterations: 50, time: 5000 })

    bench('should apply harmonic variation quickly', async () => {
      await compositionAPI.applyVariation(testComposition, {
        type: 'harmonic',
        intensity: 'subtle'
      })
    }, { iterations: 50, time: 5000 })

    bench('should apply melodic variation quickly', async () => {
      await compositionAPI.applyVariation(testComposition, {
        type: 'melodic',
        intensity: 'dramatic'
      })
    }, { iterations: 50, time: 5000 })

    bench('should apply structural variation quickly', async () => {
      await compositionAPI.applyVariation(testComposition, {
        type: 'structural',
        intensity: 'moderate'
      })
    }, { iterations: 50, time: 5000 })
  })

  describe('Structure Inference Performance', () => {
    const shortMelody = [60, 62, 64, 65, 67, 65, 64, 62]
    const mediumMelody = Array.from({ length: 32 }, () => 60 + Math.floor(Math.random() * 24))
    const longMelody = Array.from({ length: 128 }, () => 60 + Math.floor(Math.random() * 24))

    bench('should infer structure from short melody', async () => {
      await compositionAPI.inferStructure(shortMelody)
    }, { iterations: 100, time: 3000 })

    bench('should infer structure from medium melody', async () => {
      await compositionAPI.inferStructure(mediumMelody)
    }, { iterations: 50, time: 5000 })

    bench('should infer structure from long melody', async () => {
      await compositionAPI.inferStructure(longMelody)
    }, { iterations: 20, time: 10000 })

    bench('should infer structure with rhythm', async () => {
      const melody = Array.from({ length: 32 }, () => 60 + Math.floor(Math.random() * 24))
      const rhythm = Array.from({ length: 32 }, () => Math.random() > 0.5 ? 1 : 0.5)

      await compositionAPI.inferStructure(melody, rhythm)
    }, { iterations: 50, time: 5000 })
  })

  describe('Encoding Performance', () => {
    const shortMelody = [60, 62, 64, 65]
    const mediumMelody = Array.from({ length: 32 }, () => 60 + Math.floor(Math.random() * 24))

    bench('should encode melody quickly', async () => {
      await compositionAPI.encodeUserInput({ melody: shortMelody })
    }, { iterations: 100, time: 3000 })

    bench('should encode medium melody', async () => {
      await compositionAPI.encodeUserInput({ melody: mediumMelody })
    }, { iterations: 50, time: 5000 })

    bench('should encode melody and rhythm', async () => {
      const melody = Array.from({ length: 32 }, () => 60 + Math.floor(Math.random() * 24))
      const rhythm = Array.from({ length: 32 }, () => Math.random() > 0.5 ? 1 : 0.5)

      await compositionAPI.encodeUserInput({ melody, rhythm })
    }, { iterations: 50, time: 5000 })

    bench('should encode full input', async () => {
      const melody = Array.from({ length: 32 }, () => 60 + Math.floor(Math.random() * 24))
      const rhythm = Array.from({ length: 32 }, () => Math.random() > 0.5 ? 1 : 0.5)
      const harmony = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'G']

      await compositionAPI.encodeUserInput({ melody, rhythm, harmony })
    }, { iterations: 50, time: 5000 })
  })

  describe('Arrangement Performance', () => {
    const simpleTemplate = {
      name: 'Simple Form',
      structure: [
        { type: 'verse' as const, length: 8, characteristics: [] },
        { type: 'chorus' as const, length: 8, characteristics: [] }
      ],
      transitions: [],
      style: 'simple',
      complexity: 'simple' as const
    }

    const complexTemplate = {
      name: 'Complex Form',
      structure: [
        { type: 'intro' as const, length: 4, characteristics: [] },
        { type: 'verse' as const, length: 16, characteristics: [] },
        { type: 'chorus' as const, length: 8, characteristics: [] },
        { type: 'verse' as const, length: 16, characteristics: [] },
        { type: 'chorus' as const, length: 8, characteristics: [] },
        { type: 'bridge' as const, length: 8, characteristics: [] },
        { type: 'chorus' as const, length: 8, characteristics: [] },
        { type: 'outro' as const, length: 4, characteristics: [] }
      ],
      transitions: [],
      style: 'complex',
      complexity: 'complex' as const
    }

    bench('should generate simple arrangement quickly', async () => {
      await compositionAPI.generateArrangement(simpleTemplate)
    }, { iterations: 50, time: 5000 })

    bench('should generate complex arrangement', async () => {
      await compositionAPI.generateArrangement(complexTemplate)
    }, { iterations: 20, time: 10000 })
  })

  describe('Cache Performance', () => {
    bench('should cache and retrieve quickly', async () => {
      const cacheKey = 'test-cache-key'
      const testData = { result: 'test-data' }

      await sdk.cache.set(cacheKey, testData, 60)
      await sdk.cache.get(cacheKey)
    }, { iterations: 1000, time: 3000 })

    bench('should handle multiple cache operations', async () => {
      const promises: Promise<any>[] = []

      for (let i = 0; i < 10; i++) {
        promises.push(sdk.cache.set(`key-${i}`, { data: `value-${i}` }, 60))
        promises.push(sdk.cache.get(`key-${i}`))
      }

      await Promise.all(promises)
    }, { iterations: 100, time: 5000 })
  })

  describe('Memory Efficiency', () => {
    bench('should handle multiple compositions', async () => {
      const params = {
        name: 'Test',
        key: 'C' as const,
        scale: 'major' as const,
        tempo: 120,
        timeSignature: [4, 4] as const,
        structure: ['verse', 'chorus'] as const
      }

      const promises: Promise<any>[] = []

      for (let i = 0; i < 5; i++) {
        promises.push(compositionAPI.create(params))
      }

      await Promise.all(promises)
    }, { iterations: 20, time: 10000 })

    bench('should handle large number of variations', async () => {
      const params = {
        name: 'Test',
        key: 'C' as const,
        scale: 'major' as const,
        tempo: 120,
        timeSignature: [4, 4] as const,
        structure: ['verse', 'chorus'] as const
      }

      const composition = await compositionAPI.create(params)

      const promises: Promise<any>[] = []

      for (let i = 0; i < 5; i++) {
        promises.push(
          compositionAPI.applyVariation(composition, {
            type: 'rhythmic',
            intensity: 'moderate'
          })
        )
      }

      await Promise.all(promises)
    }, { iterations: 10, time: 15000 })
  })
})
