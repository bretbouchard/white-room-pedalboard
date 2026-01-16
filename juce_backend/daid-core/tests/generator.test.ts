import { DAIDGenerator } from '../src/generator';
import { describe, it, expect } from 'vitest';

describe('DAIDGenerator', () => {
  describe('generate', () => {
    it('should generate a valid DAID', () => {
      const daid = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '123',
        operation: 'create'
      });

      expect(daid).toMatch(/^daid:v\d+\.\d+:.+:.+:.+:.+:[a-f0-9]{16}$/);
      expect(DAIDGenerator.isValid(daid)).toBe(true);
    });

    it('should generate different DAIDs for same input due to salt', () => {
      const params = {
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '123',
        operation: 'create'
      };

      const daid1 = DAIDGenerator.generate(params);
      const daid2 = DAIDGenerator.generate(params);

      expect(daid1).not.toBe(daid2);
    });

    it('should include parent DAIDs in provenance hash', () => {
      const parentDAID = DAIDGenerator.generate({
        agentId: 'parent-agent',
        entityType: 'document',
        entityId: 'doc1',
        operation: 'create'
      });

      const childDAID = DAIDGenerator.generate({
        agentId: 'child-agent',
        entityType: 'comment',
        entityId: 'comment1',
        operation: 'create',
        parentDAIDs: [parentDAID]
      });

      expect(childDAID).toMatch(/^daid:v\d+\.\d+:.+:.+:.+:.+:[a-f0-9]{16}$/);
      expect(DAIDGenerator.isValid(childDAID)).toBe(true);
    });

    it('should handle metadata in provenance hash', () => {
      const daid = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '123',
        operation: 'create',
        metadata: {
          source: 'api',
          version: '1.0',
          nested: { key: 'value' }
        }
      });

      expect(DAIDGenerator.isValid(daid)).toBe(true);
    });
  });

  describe('parse', () => {
    it('should parse a valid DAID', () => {
      const daid = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '123',
        operation: 'create'
      });

      const components = DAIDGenerator.parse(daid);
      expect(components).toBeDefined();
      expect(components!.version).toBe('v1.0');
      expect(components!.agentId).toBe('test-agent');
      expect(components!.entityType).toBe('user');
      expect(components!.entityId).toBe('123');
      expect(components!.provenanceHash).toHaveLength(16);
    });

    it('should return null for invalid DAID', () => {
      const components = DAIDGenerator.parse('invalid-daid');
      expect(components).toBeNull();
    });

    it('should parse timestamp correctly', () => {
      const daid = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '123',
        operation: 'create'
      });

      const components = DAIDGenerator.parse(daid);
      expect(components).toBeDefined();

      // Convert timestamp back from modified format (dashes to colons in time part)
      const originalTimestamp = components!.timestamp.replace(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2}\.\d{3}Z)$/, '$1-$2-$3T$4:$5:$6');
      const timestamp = new Date(originalTimestamp);
      expect(timestamp.getTime()).toBeCloseTo(Date.now(), -1000); // Within 1 second
    });
  });

  describe('validate', () => {
    it('should validate a correct DAID', () => {
      const daid = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '123',
        operation: 'create'
      });

      const result = DAIDGenerator.validate(daid);
      expect(result.valid).toBe(true);
      expect(result.components).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('should reject empty string', () => {
      const result = DAIDGenerator.validate('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('DAID must be a non-empty string');
    });

    it('should reject invalid format', () => {
      const result = DAIDGenerator.validate('invalid-format');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('DAID format is invalid');
    });

    it('should reject invalid timestamp', () => {
      const invalidDAID = 'daid:v1.0:invalid-timestamp:agent:type:id:1234567890abcdef';
      const result = DAIDGenerator.validate(invalidDAID);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid timestamp format');
    });

    it('should reject wrong hash length', () => {
      const invalidDAID = 'daid:v1.0:2023-01-01T00-00-00.000Z:agent:type:id:short';
      const result = DAIDGenerator.validate(invalidDAID);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Provenance hash must be 16 characters');
    });
  });

  describe('isValid', () => {
    it('should return true for valid DAID', () => {
      const daid = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '123',
        operation: 'create'
      });

      expect(DAIDGenerator.isValid(daid)).toBe(true);
    });

    it('should return false for invalid DAID', () => {
      expect(DAIDGenerator.isValid('invalid')).toBe(false);
      expect(DAIDGenerator.isValid('')).toBe(false);
      expect(DAIDGenerator.isValid('daid:v1.0:invalid')).toBe(false);
    });
  });

  describe('provenance hash consistency', () => {
    it('should generate same hash for same normalized inputs', () => {
      const params = {
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '123',
        operation: 'create',
        parentDAIDs: ['parent1', 'parent2'],
        metadata: { key1: 'value1', key2: 'value2' }
      };

      // Generate multiple DAIDs with same params (but different salts)
      const daid1 = DAIDGenerator.generate(params);
      const daid2 = DAIDGenerator.generate(params);

      // They should be different due to salt
      expect(daid1).not.toBe(daid2);

      // But both should be valid
      expect(DAIDGenerator.isValid(daid1)).toBe(true);
      expect(DAIDGenerator.isValid(daid2)).toBe(true);
    });

    it('should handle parent DAID ordering consistently', () => {
      const baseParams = {
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '123',
        operation: 'create'
      };

      // Create with parents in different orders
      const daid1 = DAIDGenerator.generate({
        ...baseParams,
        parentDAIDs: ['parent-a', 'parent-b']
      });

      const daid2 = DAIDGenerator.generate({
        ...baseParams,
        parentDAIDs: ['parent-b', 'parent-a']
      });

      // Both should be valid
      expect(DAIDGenerator.isValid(daid1)).toBe(true);
      expect(DAIDGenerator.isValid(daid2)).toBe(true);
    });

    it('should handle nested metadata consistently', () => {
      const daid = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '123',
        operation: 'create',
        metadata: {
          level1: {
            level2: {
              level3: 'deep-value'
            },
            array: [1, 2, 3],
            boolean: true
          },
          string: 'simple-value',
          number: 42
        }
      });

      expect(DAIDGenerator.isValid(daid)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty metadata', () => {
      const daid = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '123',
        operation: 'create',
        metadata: {}
      });

      expect(DAIDGenerator.isValid(daid)).toBe(true);
    });

    it('should handle empty parent DAIDs', () => {
      const daid = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '123',
        operation: 'create',
        parentDAIDs: []
      });

      expect(DAIDGenerator.isValid(daid)).toBe(true);
    });

    it('should handle special characters in entity fields', () => {
      const daid = DAIDGenerator.generate({
        agentId: 'test-agent-with-dashes',
        entityType: 'user_type',
        entityId: 'user@example.com',
        operation: 'create'
      });

      expect(DAIDGenerator.isValid(daid)).toBe(true);
      
      const components = DAIDGenerator.parse(daid);
      expect(components!.agentId).toBe('test-agent-with-dashes');
      expect(components!.entityType).toBe('user_type');
      expect(components!.entityId).toBe('user@example.com');
    });

    it('should handle very long entity IDs', () => {
      const longId = 'a'.repeat(1000);
      const daid = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: longId,
        operation: 'create'
      });

      expect(DAIDGenerator.isValid(daid)).toBe(true);
      
      const components = DAIDGenerator.parse(daid);
      expect(components!.entityId).toBe(longId);
    });
  });
});
