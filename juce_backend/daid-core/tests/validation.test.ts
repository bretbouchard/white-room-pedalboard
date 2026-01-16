import { DAIDValidator, DAIDStandardizer } from '../src/validation';
import { DAIDGenerator } from '../src/generator';
import { describe, it, expect } from 'vitest';

describe('DAIDValidator', () => {
  describe('validateEnhanced', () => {
    it('should validate a correct DAID with enhanced checks', () => {
      const daid = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'composition',
        entityId: 'comp-123',
        operation: 'create'
      });

      const result = DAIDValidator.validateEnhanced(daid);
      
      expect(result.isValid).toBe(true);
      expect(result.hasValidFormat).toBe(true);
      expect(result.hasValidTimestamp).toBe(true);
      expect(result.hasValidHash).toBe(true);
      expect(result.hasValidComponents).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid DAID format', () => {
      const result = DAIDValidator.validateEnhanced('invalid-daid');
      
      expect(result.isValid).toBe(false);
      expect(result.hasValidFormat).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid timestamp', () => {
      const invalidDaid = 'daid:v1.0:invalid-timestamp:agent:type:id:1234567890123456';
      const result = DAIDValidator.validateEnhanced(invalidDaid);
      
      expect(result.isValid).toBe(false);
      expect(result.hasValidTimestamp).toBe(false);
    });

    it('should detect invalid hash length', () => {
      const invalidDaid = 'daid:v1.0:2023-12-07T10-30-00.000Z:agent:type:id:123';
      const result = DAIDValidator.validateEnhanced(invalidDaid);
      
      expect(result.isValid).toBe(false);
      expect(result.hasValidHash).toBe(false);
    });

    it('should detect invalid components', () => {
      const invalidDaid = 'daid:v1.0:2023-12-07T10-30-00.000Z::type:id:1234567890123456';
      const result = DAIDValidator.validateEnhanced(invalidDaid);
      
      expect(result.isValid).toBe(false);
      expect(result.hasValidComponents).toBe(false);
    });

    it('should provide warnings for non-standard entity types', () => {
      const daid = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'custom-type',
        entityId: 'custom-123',
        operation: 'create'
      });

      const result = DAIDValidator.validateEnhanced(daid);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('not in the standard set');
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple DAIDs', () => {
      const daid1 = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'composition',
        entityId: 'comp-1'
      });
      
      const daid2 = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'pattern',
        entityId: 'pattern-1'
      });

      const result = DAIDValidator.validateBatch([daid1, daid2, 'invalid-daid']);
      
      expect(result.totalChecked).toBe(3);
      expect(result.validCount).toBe(2);
      expect(result.invalidCount).toBe(1);
      expect(result.checks).toHaveLength(3);
    });

    it('should provide summary statistics', () => {
      const validDaid = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'composition',
        entityId: 'comp-1'
      });

      const result = DAIDValidator.validateBatch([validDaid, 'invalid-daid']);
      
      expect(result.summary.formatErrors).toBe(1);
      expect(result.summary.timestampErrors).toBe(1);
      expect(result.summary.hashErrors).toBe(1);
      expect(result.summary.componentErrors).toBe(1);
    });
  });

  describe('checkVersionCompatibility', () => {
    it('should check compatibility between same versions', () => {
      const daid1 = DAIDGenerator.generate({
        agentId: 'agent1',
        entityType: 'type1',
        entityId: 'id1'
      });
      
      const daid2 = DAIDGenerator.generate({
        agentId: 'agent2',
        entityType: 'type2',
        entityId: 'id2'
      });

      const result = DAIDValidator.checkVersionCompatibility(daid1, daid2);
      
      expect(result.compatible).toBe(true);
      expect(result.version1).toBe('v1.0');
      expect(result.version2).toBe('v1.0');
      expect(result.issues).toHaveLength(0);
    });

    it('should detect incompatible versions', () => {
      const daid1 = 'daid:v1.0:2023-12-07T10-30-00.000Z:agent1:type:id:1234567890123456';
      const daid2 = 'daid:v2.0:2023-12-07T10-30-00.000Z:agent2:type:id:1234567890123456';

      const result = DAIDValidator.checkVersionCompatibility(daid1, daid2);
      
      expect(result.compatible).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('suggestFixes', () => {
    it('should suggest fixes for invalid DAID', () => {
      const check = DAIDValidator.validateEnhanced('invalid-daid');
      const suggestions = DAIDValidator.suggestFixes(check);
      
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toContain('Regenerate DAID');
    });
  });
});

describe('DAIDStandardizer', () => {
  describe('standardizeFormat', () => {
    it('should standardize valid DAID format', () => {
      const daid = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'composition',
        entityId: 'comp-123'
      });

      const standardized = DAIDStandardizer.standardizeFormat(daid);
      
      expect(standardized).toBe(daid); // Should be the same for already valid DAID
      expect(DAIDGenerator.isValid(standardized)).toBe(true);
    });

    it('should throw error for invalid DAID', () => {
      expect(() => {
        DAIDStandardizer.standardizeFormat('invalid-daid');
      }).toThrow('Cannot standardize invalid DAID');
    });
  });

  describe('normalizeAgentId', () => {
    it('should normalize agent ID format', () => {
      expect(DAIDStandardizer.normalizeAgentId('Test Agent!')).toBe('test-agent');
      expect(DAIDStandardizer.normalizeAgentId('agent_123')).toBe('agent_123');
      expect(DAIDStandardizer.normalizeAgentId('AGENT-NAME')).toBe('agent-name');
    });

    it('should handle special characters', () => {
      expect(DAIDStandardizer.normalizeAgentId('agent@#$%name')).toBe('agent-name');
    });
  });

  describe('normalizeEntityType', () => {
    it('should normalize entity type format', () => {
      expect(DAIDStandardizer.normalizeEntityType('User Action')).toBe('user_action');
      expect(DAIDStandardizer.normalizeEntityType('API-Call')).toBe('api_call');
      expect(DAIDStandardizer.normalizeEntityType('composition')).toBe('composition');
    });

    it('should handle special characters', () => {
      expect(DAIDStandardizer.normalizeEntityType('type@#$%name')).toBe('type_name');
    });
  });

  describe('normalizeEntityId', () => {
    it('should normalize entity ID format', () => {
      expect(DAIDStandardizer.normalizeEntityId('entity:123')).toBe('entity_123');
      expect(DAIDStandardizer.normalizeEntityId('entity 456')).toBe('entity_456');
      expect(DAIDStandardizer.normalizeEntityId('entity-789')).toBe('entity-789');
    });

    it('should limit length', () => {
      const longId = 'a'.repeat(150);
      const normalized = DAIDStandardizer.normalizeEntityId(longId);
      expect(normalized.length).toBe(100);
    });

    it('should remove problematic characters', () => {
      expect(DAIDStandardizer.normalizeEntityId('entity@#$%id')).toBe('entityid');
    });
  });
});