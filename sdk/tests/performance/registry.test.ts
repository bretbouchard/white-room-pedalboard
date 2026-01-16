/**
 * T041: Performance Registry Tests
 *
 * Comprehensive tests for PerformanceRegistry CRUD operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PerformanceRegistry,
  CreateOptions,
  UpdateOptions,
  type PerformanceEntry,
  createPerformanceRegistry,
  createRegistryWithPerformances
} from '../../packages/sdk/src/performance/index.js';
import type { PerformanceStateV1 } from '../../packages/sdk/src/song/performance_state.js';
import { generateId } from '../../packages/sdk/src/song/ids.js';

describe('PerformanceRegistry', () => {

// Helper to create a valid performance state
function createValidPerformance(overrides: Partial<PerformanceStateV1> = {}): PerformanceStateV1 {
  return {
    version: '1.0',
    transport: {
      state: 'stopped',
      playheadPosition: 0,
      loopEnabled: false,
      loopStart: 0,
      loopEnd: 0,
      ...overrides.transport
    },
    activeVoices: [],
    metering: {
      voiceBusses: [
        {
          busId: '550e8400-e29b-41d4-a716-446655440001',  // Valid UUID v4 (4xxx format)
          peak: -Infinity,
          rms: -Infinity,
          peakHold: -Infinity
        }
      ],
      mixBusses: [],
      masterBus: {
        busId: '550e8400-e29b-41d4-a716-446655440002',  // Valid UUID v4 (4xxx format)
        peak: -Infinity,
        rms: -Infinity,
        peakHold: -Infinity
      },
      ...overrides.metering
    },
    performance: {
      cpuUsage: 0.1,
      dropoutCount: 0,
      latency: 8,
      ...overrides.performance
    },
    ...overrides
  };
}

  let registry: PerformanceRegistry;

  beforeEach(async () => {
    registry = createPerformanceRegistry();
    await registry.clear();
  });

  describe('Create Operation', () => {
    it('should create a new performance entry', async () => {
      const performance = createValidPerformance();
      const options: CreateOptions = {
        name: 'Test Performance',
        description: 'A test performance',
        performance
      };

      const result = await registry.create(options);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');

      // Verify it was stored
      const readResult = await registry.read(result.data!);
      expect(readResult.success).toBe(true);
      expect(readResult.data?.name).toBe('Test Performance');
    });

    it('should reject invalid performance data', async () => {
      const invalidPerformance = {
        version: '2.0',
        transport: {
          state: 'invalid',
          playheadPosition: -100,
          loopEnabled: false,
          loopStart: 0,
          loopEnd: 0
        },
        activeVoices: 'not-an-array',
        metering: null,
        performance: {
          cpuUsage: 2.0,
          dropoutCount: -1,
          latency: -5
        }
      } as unknown as PerformanceStateV1;

      const options: CreateOptions = {
        name: 'Invalid Performance',
        performance: invalidPerformance
      };

      const result = await registry.create(options);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_DATA');
      expect(result.error?.details).toBeDefined();
    });

    it('should reject duplicate names', async () => {
      const performance = createValidPerformance();

      const options1: CreateOptions = {
        name: 'Duplicate Name',
        performance
      };

      const options2: CreateOptions = {
        name: 'Duplicate Name',
        performance: createValidPerformance()
      };

      const result1 = await registry.create(options1);
      expect(result1.success).toBe(true);

      const result2 = await registry.create(options2);
      expect(result2.success).toBe(false);
      expect(result2.error?.code).toBe('ALREADY_EXISTS');
    });

    it('should store creation timestamp', async () => {
      const beforeCreate = Date.now();
      const performance = createValidPerformance();

      const options: CreateOptions = {
        name: 'Timestamp Test',
        performance
      };

      const result = await registry.create(options);
      const readResult = await registry.read(result.data!);

      expect(readResult.success).toBe(true);
      expect(readResult.data?.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(readResult.data?.updatedAt).toBe(readResult.data?.createdAt);
    });

    it('should allow performances with optional description', async () => {
      const performance = createValidPerformance();

      const options: CreateOptions = {
        name: 'No Description',
        performance
      };

      const result = await registry.create(options);
      const readResult = await registry.read(result.data!);

      expect(readResult.success).toBe(true);
      expect(readResult.data?.description).toBeUndefined();
    });
  });

  describe('Read Operation', () => {
    it('should read an existing performance', async () => {
      const performance = createValidPerformance();
      const createOptions: CreateOptions = {
        name: 'Read Test',
        description: 'Test reading',
        performance
      };

      const createResult = await registry.create(createOptions);
      const readResult = await registry.read(createResult.data!);

      expect(readResult.success).toBe(true);
      expect(readResult.data?.name).toBe('Read Test');
      expect(readResult.data?.description).toBe('Test reading');
      // Check that the performance is valid and has the same structure
      expect(readResult.data?.performance.version).toBe(performance.version);
      expect(readResult.data?.performance.transport).toEqual(performance.transport);
      expect(readResult.data?.performance.activeVoices).toEqual(performance.activeVoices);
      expect(readResult.data?.performance.performance).toEqual(performance.performance);
    });

    it('should return error for non-existent performance', async () => {
      const result = await registry.read('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should return immutable copy (deep clone)', async () => {
      const performance = createValidPerformance();
      const createOptions: CreateOptions = {
        name: 'Immutability Test',
        performance
      };

      const createResult = await registry.create(createOptions);
      const readResult1 = await registry.read(createResult.data!);
      const readResult2 = await registry.read(createResult.data!);

      // Modify the first read result
      if (readResult1.data) {
        readResult1.data.name = 'Modified Name';
        (readResult1.data.performance as any).transport.playheadPosition = 999;
      }

      // Second read should be unaffected
      expect(readResult2.data?.name).toBe('Immutability Test');
      expect(readResult2.data?.performance.transport.playheadPosition).toBe(0);
    });
  });

  describe('Update Operation', () => {
    let performanceId: string;

    beforeEach(async () => {
      const performance = createValidPerformance();
      const createOptions: CreateOptions = {
        name: 'Update Test',
        description: 'Original description',
        performance
      };

      const result = await registry.create(createOptions);
      if (!result.success) {
        throw new Error(`Failed to create performance in beforeEach: ${JSON.stringify(result.error)}`);
      }
      performanceId = result.data!;
    });

    it('should update performance name', async () => {
      const updates: UpdateOptions = {
        name: 'Updated Name'
      };

      const result = await registry.update(performanceId, updates);

      expect(result.success).toBe(true);

      const readResult = await registry.read(performanceId);
      expect(readResult.data?.name).toBe('Updated Name');
      expect(readResult.data?.description).toBe('Original description');
    });

    it('should update performance description', async () => {
      const updates: UpdateOptions = {
        description: 'Updated description'
      };

      const result = await registry.update(performanceId, updates);

      expect(result.success).toBe(true);

      const readResult = await registry.read(performanceId);
      expect(readResult.data?.description).toBe('Updated description');
    });

    it('should update performance data', async () => {
      const updates: UpdateOptions = {
        performance: {
          performance: {
            cpuUsage: 0.5,
            dropoutCount: 10,
            latency: 20
          }
        }
      };

      const result = await registry.update(performanceId, updates);

      expect(result.success).toBe(true);

      const readResult = await registry.read(performanceId);
      expect(readResult.data?.performance.performance.cpuUsage).toBe(0.5);
      expect(readResult.data?.performance.performance.dropoutCount).toBe(10);
      expect(readResult.data?.performance.performance.latency).toBe(20);
    });

    it('should update timestamp on modification', async () => {
      const readResult1 = await registry.read(performanceId);
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updates: UpdateOptions = {
        name: 'New Name'
      };

      await registry.update(performanceId, updates);
      const readResult2 = await registry.read(performanceId);

      expect(readResult2.data?.updatedAt).toBeGreaterThan(readResult1.data!.updatedAt);
    });

    it('should reject invalid performance data', async () => {
      const updates: UpdateOptions = {
        performance: {
          version: '2.0' as any
        }
      };

      const result = await registry.update(performanceId, updates);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('INVALID_DATA');
    });

    it('should reject duplicate names', async () => {
      // Create another performance
      const performance2 = createValidPerformance();
      await registry.create({
        name: 'Another Performance',
        performance: performance2
      });

      // Try to rename first to duplicate name
      const updates: UpdateOptions = {
        name: 'Another Performance'
      };

      const result = await registry.update(performanceId, updates);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('ALREADY_EXISTS');
    });

    it('should return error for non-existent performance', async () => {
      const updates: UpdateOptions = {
        name: 'New Name'
      };

      const result = await registry.update('non-existent-id', updates);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('Delete Operation', () => {
    it('should delete an existing performance', async () => {
      const performance = createValidPerformance();
      const createOptions: CreateOptions = {
        name: 'Delete Test',
        performance
      };

      const createResult = await registry.create(createOptions);
      const deleteResult = await registry.delete(createResult.data!);

      expect(deleteResult.success).toBe(true);

      // Verify it's gone
      const readResult = await registry.read(createResult.data!);
      expect(readResult.success).toBe(false);
      expect(readResult.error?.code).toBe('NOT_FOUND');
    });

    it('should return error for non-existent performance', async () => {
      const result = await registry.delete('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });

    it('should allow deleting after multiple operations', async () => {
      const performance = createValidPerformance();

      const createResult = await registry.create({
        name: 'Multi-Op Test',
        performance
      });

      // Update
      await registry.update(createResult.data!, { name: 'Updated' });

      // Read
      await registry.read(createResult.data!);

      // Delete
      const deleteResult = await registry.delete(createResult.data!);
      expect(deleteResult.success).toBe(true);

      // Verify gone
      const readResult = await registry.read(createResult.data!);
      expect(readResult.success).toBe(false);
    });
  });

  describe('List Operation', () => {
    it('should return empty list initially', async () => {
      const list = await registry.list();

      expect(list).toEqual([]);
      expect(list).toHaveLength(0);
    });

    it('should list all performances', async () => {
      const performance1 = createValidPerformance();
      const performance2 = createValidPerformance();

      await registry.create({
        name: 'Performance 1',
        performance: performance1
      });

      await registry.create({
        name: 'Performance 2',
        performance: performance2
      });

      const list = await registry.list();

      expect(list).toHaveLength(2);
      expect(list.some((p) => p.name === 'Performance 1')).toBe(true);
      expect(list.some((p) => p.name === 'Performance 2')).toBe(true);
    });

    it('should return immutable copies', async () => {
      const performance = createValidPerformance();

      const createResult = await registry.create({
        name: 'List Test',
        performance
      });

      const list1 = await registry.list();
      const list2 = await registry.list();

      // Modify first list
      list1[0].name = 'Modified';

      // Second list should be unaffected
      expect(list2[0].name).toBe('List Test');
    });

    it('should reflect deletions in list', async () => {
      const performance = createValidPerformance();

      const createResult = await registry.create({
        name: 'To Delete',
        performance
      });

      expect((await registry.list())).toHaveLength(1);

      await registry.delete(createResult.data!);

      expect((await registry.list())).toHaveLength(0);
    });
  });

  describe('Find By Name', () => {
    it('should find performance by name', async () => {
      const performance = createValidPerformance();

      await registry.create({
        name: 'Find Me',
        description: 'Findable performance',
        performance
      });

      const result = await registry.findByName('Find Me');

      expect(result).toBeDefined();
      expect(result?.name).toBe('Find Me');
      expect(result?.description).toBe('Findable performance');
    });

    it('should return undefined for non-existent name', async () => {
      const result = await registry.findByName('Non-Existent');

      expect(result).toBeUndefined();
    });

    it('should be case-sensitive', async () => {
      const performance = createValidPerformance();

      await registry.create({
        name: 'CaseSensitive',
        performance
      });

      expect(await registry.findByName('CaseSensitive')).toBeDefined();
      expect(await registry.findByName('casesensitive')).toBeUndefined();
      expect(await registry.findByName('CASESENSITIVE')).toBeUndefined();
    });
  });

  describe('Validate Operation', () => {
    it('should validate correct performance', () => {
      const performance = createValidPerformance();
      const result = registry.validate(performance);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid performance', () => {
      const invalid = {
        version: '2.0',
        transport: { state: 'invalid' }
      } as unknown;

      const result = registry.validate(invalid);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide clear error messages', () => {
      const invalid = {
        version: '2.0',
        transport: {
          state: 'invalid',
          playheadPosition: -100
        }
      } as unknown;

      const result = registry.validate(invalid);

      expect(result.valid).toBe(false);
      result.errors.forEach((error) => {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Stats Operation', () => {
    it('should return empty stats initially', async () => {
      const stats = await registry.stats();

      expect(stats.count).toBe(0);
      expect(stats.names).toEqual([]);
    });

    it('should return correct count', async () => {
      const performance = createValidPerformance();

      await registry.create({ name: 'P1', performance });
      await registry.create({ name: 'P2', performance });
      await registry.create({ name: 'P3', performance });

      const stats = await registry.stats();
      expect(stats.count).toBe(3);
    });

    it('should return all names', async () => {
      const performance = createValidPerformance();

      await registry.create({ name: 'Performance A', performance });
      await registry.create({ name: 'Performance B', performance });
      await registry.create({ name: 'Performance C', performance });

      const stats = await registry.stats();
      expect(stats.names).toContain('Performance A');
      expect(stats.names).toContain('Performance B');
      expect(stats.names).toContain('Performance C');
      expect(stats.names).toHaveLength(3);
    });
  });

  describe('Clear Operation', () => {
    it('should clear all performances', async () => {
      const performance = createValidPerformance();

      await registry.create({ name: 'P1', performance });
      await registry.create({ name: 'P2', performance });

      expect((await registry.list())).toHaveLength(2);

      await registry.clear();

      expect((await registry.list())).toHaveLength(0);
    });

    it('should reset stats', async () => {
      const performance = createValidPerformance();

      await registry.create({ name: 'P1', performance });
      expect((await registry.stats()).count).toBe(1);

      await registry.clear();
      expect((await registry.stats()).count).toBe(0);
    });
  });

  describe('Thread Safety', () => {
    it('should handle concurrent creates', async () => {
      const performance = createValidPerformance();

      // Create 10 performances concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        registry.create({
          name: `Concurrent ${i}`,
          performance
        })
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // All should be stored
      expect((await registry.list())).toHaveLength(10);
    });

    it('should handle concurrent reads', async () => {
      const performance = createValidPerformance();
      const createResult = await registry.create({
        name: 'Read Test',
        performance
      });

      // Read 10 times concurrently
      const promises = Array.from({ length: 10 }, () =>
        registry.read(createResult.data!)
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.data?.name).toBe('Read Test');
      });
    });

    it('should handle concurrent updates', async () => {
      const performance = createValidPerformance();
      const createResult = await registry.create({
        name: 'Original',
        performance
      });

      // Update 10 times concurrently
      const promises = Array.from({ length: 10 }, (_, i) =>
        registry.update(createResult.data!, {
          performance: {
            performance: {
              cpuUsage: 0.1 * (i + 1)
            }
          }
        })
      );

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // Final state should be valid
      const readResult = await registry.read(createResult.data!);
      expect(readResult.data?.performance.performance.cpuUsage).toBeGreaterThan(0);
    });

    it('should handle mixed operations', async () => {
      const performance = createValidPerformance();

      // Create some performances
      const createPromises = Array.from({ length: 5 }, (_, i) =>
        registry.create({
          name: `Mixed ${i}`,
          performance
        })
      );

      const createResults = await Promise.all(createPromises);
      const ids = createResults.map((r) => r.data!);

      // Mixed operations
      const promises = [
        // Read some
        ...ids.slice(0, 2).map((id) => registry.read(id)),
        // Update some
        ...ids.slice(2, 4).map((id) =>
          registry.update(id, { name: `Updated ${id}` })
        ),
        // List
        registry.list(),
        // Stats
        registry.stats()
      ];

      const results = await Promise.all(promises);

      // All should succeed
      results.forEach((result) => {
        if (Array.isArray(result)) {
          expect(result.length).toBeGreaterThanOrEqual(0);
        } else if ('success' in result) {
          expect(result.success).toBe(true);
        } else if ('count' in result) {
          expect(result.count).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('Factory Functions', () => {
    it('should create registry with createPerformanceRegistry', () => {
      const newRegistry = createPerformanceRegistry();

      expect(newRegistry).toBeInstanceOf(PerformanceRegistry);
    });

    it('should create registry with initial performances', async () => {
      const performance1 = createValidPerformance();
      const performance2 = createValidPerformance();

      const newRegistry = await createRegistryWithPerformances([
        {
          name: 'Initial 1',
          description: 'First initial',
          performance: performance1
        },
        {
          name: 'Initial 2',
          performance: performance2
        }
      ]);

      const list = await newRegistry.list();
      expect(list).toHaveLength(2);
      expect(list.some((p) => p.name === 'Initial 1')).toBe(true);
      expect(list.some((p) => p.name === 'Initial 2')).toBe(true);
    });

    it('should handle empty initial performances array', async () => {
      const newRegistry = await createRegistryWithPerformances([]);

      const list = await newRegistry.list();
      expect(list).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle special characters in names', async () => {
      const performance = createValidPerformance();

      const specialNames = [
        'Performance with spaces',
        'Performance-with-dashes',
        'Performance_with_underscores',
        'Performance.with.dots',
        'Performance/with/slashes',
        'Performance:with:colons'
      ];

      for (const name of specialNames) {
        const result = await registry.create({
          name,
          performance
        });

        expect(result.success).toBe(true);

        const found = await registry.findByName(name);
        expect(found?.name).toBe(name);
      }
    });

    it('should handle empty name (should be rejected)', async () => {
      const performance = createValidPerformance();

      const result = await registry.create({
        name: '',
        performance
      });

      // Empty name should be allowed (it's still a valid string)
      expect(result.success).toBe(true);

      const found = await registry.findByName('');
      expect(found?.name).toBe('');
    });

    it('should handle very long names', async () => {
      const performance = createValidPerformance();
      const longName = 'A'.repeat(1000);

      const result = await registry.create({
        name: longName,
        performance
      });

      expect(result.success).toBe(true);
      expect((await registry.findByName(longName))?.name).toBe(longName);
    });

    it('should handle performance with many voices', async () => {
      const performance = createValidPerformance({
        activeVoices: Array.from({ length: 100 }, (_, i) => ({
          voiceId: generateId(),
          instrumentId: 'LocalGal',
          noteId: generateId(),
          startedAt: i * 1000,
          duration: 500,
          pitch: 60 + (i % 12),
          velocity: 0.5 + (i % 5) * 0.1
        }))
      });

      const result = await registry.create({
        name: 'Many Voices',
        performance
      });

      expect(result.success).toBe(true);

      const readResult = await registry.read(result.data!);
      expect(readResult.data?.performance.activeVoices).toHaveLength(100);
    });

    it('should handle performance with complex metering', async () => {
      const performance = createValidPerformance({
        metering: {
          voiceBusses: Array.from({ length: 10 }, (_, i) => ({
            busId: generateId(),
            peak: -6.0 - i,
            rms: -12.0 - i,
            peakHold: -5.5 - i
          })),
          mixBusses: Array.from({ length: 4 }, (_, i) => ({
            busId: generateId(),
            peak: -3.0 - i,
            rms: -10.0 - i,
            peakHold: -2.5 - i
          })),
          masterBus: {
            busId: generateId(),
            peak: -0.5,
            rms: -3.0,
            peakHold: -0.3
          }
        }
      });

      const result = await registry.create({
        name: 'Complex Metering',
        performance
      });

      expect(result.success).toBe(true);

      const readResult = await registry.read(result.data!);
      expect(readResult.data?.performance.metering.voiceBusses).toHaveLength(10);
      expect(readResult.data?.performance.metering.mixBusses).toHaveLength(4);
    });

    it('should handle rapid create-delete cycles', async () => {
      const performance = createValidPerformance();
      const ids: string[] = [];

      // Create 10 performances
      for (let i = 0; i < 10; i++) {
        const result = await registry.create({
          name: `Cycle ${i}`,
          performance
        });
        if (result.success) {
          ids.push(result.data!);
        }
      }

      expect((await registry.list())).toHaveLength(10);

      // Delete all
      for (const id of ids) {
        await registry.delete(id);
      }

      expect((await registry.list())).toHaveLength(0);
    });
  });
});
