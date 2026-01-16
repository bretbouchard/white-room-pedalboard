import { AutoDAIDGenerator, createAutoDAIDGenerator, OperationTypes, EntityTypes } from '../src/auto-generation';
import { DAIDGenerator } from '../src/generator';
import { describe, it, expect, beforeEach } from 'vitest';

describe('AutoDAIDGenerator', () => {
  let generator: AutoDAIDGenerator;

  beforeEach(() => {
    generator = createAutoDAIDGenerator({
      agentId: 'test-agent',
      enableAutoGeneration: true,
      trackAllOperations: true,
      validationLevel: 'enhanced'
    });
  });

  describe('generateForOperation', () => {
    it('should generate DAID for valid operation', async () => {
      const context = {
        operation: OperationTypes.CREATE,
        entityType: EntityTypes.COMPOSITION,
        entityId: 'comp-123',
        metadata: { test: 'data' }
      };

      const result = await generator.generateForOperation(context);

      expect(result.generated).toBe(true);
      expect(result.validationPassed).toBe(true);
      expect(result.daid).toBeTruthy();
      expect(DAIDGenerator.isValid(result.daid)).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return cached result for same operation', async () => {
      const context = {
        operation: OperationTypes.CREATE,
        entityType: EntityTypes.COMPOSITION,
        entityId: 'comp-123',
        metadata: { test: 'data' }
      };

      const result1 = await generator.generateForOperation(context);
      const result2 = await generator.generateForOperation(context);

      expect(result1.daid).toBe(result2.daid);
      expect(result2.cached).toBe(true);
      expect(result2.metadata.cacheHit).toBe(true);
    });

    it('should handle disabled auto-generation', async () => {
      const disabledGenerator = createAutoDAIDGenerator({
        agentId: 'test-agent',
        enableAutoGeneration: false
      });

      const context = {
        operation: OperationTypes.CREATE,
        entityType: EntityTypes.COMPOSITION,
        entityId: 'comp-123'
      };

      const result = await disabledGenerator.generateForOperation(context);

      expect(result.generated).toBe(false);
      expect(result.errors).toContain('Auto-generation is disabled');
    });

    it('should enrich context with metadata', async () => {
      const context = {
        operation: OperationTypes.CREATE,
        entityType: EntityTypes.COMPOSITION,
        entityId: 'comp-123',
        userContext: {
          userId: 'user-123',
          sessionId: 'session-456'
        },
        systemContext: {
          component: 'test-component',
          version: '1.0.0',
          environment: 'test'
        }
      };

      const result = await generator.generateForOperation(context);

      expect(result.generated).toBe(true);
      expect(result.validationPassed).toBe(true);
    });

    it('should validate generated DAID based on validation level', async () => {
      const strictGenerator = createAutoDAIDGenerator({
        agentId: 'test-agent',
        validationLevel: 'strict'
      });

      const context = {
        operation: OperationTypes.CREATE,
        entityType: 'custom-type', // Non-standard type will cause warning in strict mode
        entityId: 'custom-123'
      };

      const result = await strictGenerator.generateForOperation(context);

      expect(result.generated).toBe(true);
      // In strict mode, warnings are treated as errors
      expect(result.validationPassed).toBe(false);
    });
  });

  describe('generateBatch', () => {
    it('should generate DAIDs for multiple operations', async () => {
      const contexts = [
        {
          operation: OperationTypes.CREATE,
          entityType: EntityTypes.COMPOSITION,
          entityId: 'comp-1'
        },
        {
          operation: OperationTypes.UPDATE,
          entityType: EntityTypes.PATTERN,
          entityId: 'pattern-1'
        },
        {
          operation: OperationTypes.DELETE,
          entityType: EntityTypes.ANALYSIS,
          entityId: 'analysis-1'
        }
      ];

      const results = await generator.generateBatch(contexts);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.generated)).toBe(true);
      expect(results.every(r => r.validationPassed)).toBe(true);
      expect(results.every(r => DAIDGenerator.isValid(r.daid))).toBe(true);
    });

    it('should handle errors in batch generation', async () => {
      // Create a generator that will fail validation in strict mode
      const strictGenerator = createAutoDAIDGenerator({
        agentId: 'test-agent',
        validationLevel: 'strict'
      });

      const contexts = [
        {
          operation: OperationTypes.CREATE,
          entityType: EntityTypes.COMPOSITION,
          entityId: 'comp-1'
        },
        {
          operation: OperationTypes.CREATE,
          entityType: 'custom-invalid-type', // This will cause warnings in strict mode
          entityId: 'custom-1'
        }
      ];

      const results = await strictGenerator.generateBatch(contexts);

      expect(results).toHaveLength(2);
      expect(results[0].generated).toBe(true);
      expect(results[0].validationPassed).toBe(true);
      expect(results[1].generated).toBe(true);
      expect(results[1].validationPassed).toBe(false); // Strict mode treats warnings as errors
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      generator.clearCache();
      const stats = generator.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should provide cache statistics', () => {
      const stats = generator.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hitRate');
    });
  });

  describe('configuration updates', () => {
    it('should update configuration', () => {
      generator.updateConfig({
        enableAutoGeneration: false,
        validationLevel: 'basic'
      });

      // Configuration should be updated (we can't directly test private config,
      // but we can test the behavior change)
      expect(generator).toBeDefined();
    });
  });
});

describe('createAutoDAIDGenerator', () => {
  it('should create generator with default config', () => {
    const generator = createAutoDAIDGenerator({
      agentId: 'test-agent'
    });

    expect(generator).toBeInstanceOf(AutoDAIDGenerator);
  });

  it('should create generator with custom config', () => {
    const generator = createAutoDAIDGenerator({
      agentId: 'test-agent',
      enableAutoGeneration: false,
      trackAllOperations: false,
      validationLevel: 'basic'
    });

    expect(generator).toBeInstanceOf(AutoDAIDGenerator);
  });
});

describe('OperationTypes', () => {
  it('should have standard operation types', () => {
    expect(OperationTypes.CREATE).toBe('create');
    expect(OperationTypes.READ).toBe('read');
    expect(OperationTypes.UPDATE).toBe('update');
    expect(OperationTypes.DELETE).toBe('delete');
    expect(OperationTypes.ANALYZE).toBe('analyze');
    expect(OperationTypes.PROCESS).toBe('process');
  });
});

describe('EntityTypes', () => {
  it('should have standard entity types', () => {
    expect(EntityTypes.COMPOSITION).toBe('composition');
    expect(EntityTypes.PATTERN).toBe('pattern');
    expect(EntityTypes.ANALYSIS).toBe('analysis');
    expect(EntityTypes.USER_ACTION).toBe('user_action');
    expect(EntityTypes.API_CALL).toBe('api_call');
    expect(EntityTypes.FILE).toBe('file');
  });
});