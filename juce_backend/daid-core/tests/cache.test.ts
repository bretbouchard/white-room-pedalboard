import { CacheManager } from '../src/cache';
import { DAIDGenerator } from '../src/generator';
import { describe, it, expect, beforeEach } from 'vitest';

describe('CacheManager', () => {
  let cacheManager: CacheManager;
  let testDAID: string;

  beforeEach(() => {
    cacheManager = new CacheManager();
    testDAID = DAIDGenerator.generate({
      agentId: 'test-agent',
      entityType: 'user',
      entityId: '123',
      operation: 'create'
    });
  });

  describe('basic cache operations', () => {
    it('should store and retrieve data', () => {
      const testData = { name: 'John', age: 30 };
      
      cacheManager.set(testDAID, testData);
      const retrieved = cacheManager.get(testDAID);
      
      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent keys', () => {
      const result = cacheManager.get('non-existent-daid');
      expect(result).toBeNull();
    });

    it('should overwrite existing data', () => {
      const data1 = { version: 1 };
      const data2 = { version: 2 };
      
      cacheManager.set(testDAID, data1);
      cacheManager.set(testDAID, data2);
      
      const retrieved = cacheManager.get(testDAID);
      expect(retrieved).toEqual(data2);
    });
  });

  describe('cache invalidation rules', () => {
    it('should add and use invalidation rules', () => {
      const rule = {
        entityType: 'user',
        dependsOn: ['profile'],
        cascadeTo: ['session', 'preferences']
      };
      
      cacheManager.addRule(rule);
      
      // Create test DAIDs for different entity types
      const userDAID = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '123',
        operation: 'create'
      });
      
      const sessionDAID = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'session',
        entityId: 'session-123',
        operation: 'create'
      });
      
      const preferencesDAID = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'preferences',
        entityId: 'pref-123',
        operation: 'create'
      });
      
      // Cache some data
      cacheManager.set(userDAID, { user: 'data' });
      cacheManager.set(sessionDAID, { session: 'data' });
      cacheManager.set(preferencesDAID, { preferences: 'data' });
      
      // Invalidate user entity
      const invalidated = cacheManager.invalidateByEntity('user', '123');
      
      // Should invalidate user DAID and cascade to session and preferences
      expect(invalidated).toContain(userDAID);
      expect(cacheManager.get(userDAID)).toBeNull();
    });

    it('should handle cascade invalidation', () => {
      const rule = {
        entityType: 'document',
        dependsOn: [],
        cascadeTo: ['comment', 'like']
      };
      
      cacheManager.addRule(rule);
      
      const documentDAID = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'document',
        entityId: 'doc-123',
        operation: 'create'
      });
      
      const commentDAID = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'comment',
        entityId: 'comment-456',
        operation: 'create'
      });
      
      cacheManager.set(documentDAID, { document: 'data' });
      cacheManager.set(commentDAID, { comment: 'data' });
      
      const invalidated = cacheManager.invalidateByEntity('document', 'doc-123');
      
      expect(invalidated).toContain(documentDAID);
      expect(invalidated).toContain(commentDAID);
      expect(cacheManager.get(documentDAID)).toBeNull();
      expect(cacheManager.get(commentDAID)).toBeNull();
    });

    it('should return empty array for unknown entity types', () => {
      const invalidated = cacheManager.invalidateByEntity('unknown', 'id');
      expect(invalidated).toEqual([]);
    });
  });

  describe('direct DAID invalidation', () => {
    it('should invalidate specific DAIDs', () => {
      const daid1 = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '1',
        operation: 'create'
      });
      
      const daid2 = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '2',
        operation: 'create'
      });
      
      const daid3 = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '3',
        operation: 'create'
      });
      
      cacheManager.set(daid1, { id: 1 });
      cacheManager.set(daid2, { id: 2 });
      cacheManager.set(daid3, { id: 3 });
      
      cacheManager.invalidateDAIDs([daid1, daid2]);
      
      expect(cacheManager.get(daid1)).toBeNull();
      expect(cacheManager.get(daid2)).toBeNull();
      expect(cacheManager.get(daid3)).toEqual({ id: 3 });
    });

    it('should handle invalidation of non-existent DAIDs', () => {
      cacheManager.invalidateDAIDs(['non-existent-daid']);
      // Should not throw error
      expect(cacheManager.getStats().size).toBe(0);
    });
  });

  describe('cache management', () => {
    it('should clear all cache', () => {
      const daid1 = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '1',
        operation: 'create'
      });
      
      const daid2 = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '2',
        operation: 'create'
      });
      
      cacheManager.set(daid1, { id: 1 });
      cacheManager.set(daid2, { id: 2 });
      
      expect(cacheManager.getStats().size).toBe(2);
      
      cacheManager.clear();
      
      expect(cacheManager.getStats().size).toBe(0);
      expect(cacheManager.get(daid1)).toBeNull();
      expect(cacheManager.get(daid2)).toBeNull();
    });

    it('should provide cache statistics', () => {
      const rule1 = {
        entityType: 'user',
        dependsOn: [],
        cascadeTo: []
      };
      
      const rule2 = {
        entityType: 'document',
        dependsOn: [],
        cascadeTo: []
      };
      
      cacheManager.addRule(rule1);
      cacheManager.addRule(rule2);
      
      cacheManager.set(testDAID, { test: 'data' });
      
      const stats = cacheManager.getStats();
      
      expect(stats.size).toBe(1);
      expect(stats.rules).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should handle invalid DAID parsing gracefully', () => {
      const invalidDAID = 'invalid-daid-format';
      
      cacheManager.set(invalidDAID, { data: 'test' });
      
      // Should not throw when trying to invalidate by entity
      const invalidated = cacheManager.invalidateByEntity('user', '123');
      expect(invalidated).toEqual([]);
      
      // Data should still be retrievable by the invalid key
      expect(cacheManager.get(invalidDAID)).toEqual({ data: 'test' });
    });

    it('should handle null/undefined data', () => {
      cacheManager.set(testDAID, null);
      expect(cacheManager.get(testDAID)).toBeNull();
      
      cacheManager.set(testDAID, undefined);
      expect(cacheManager.get(testDAID)).toBeUndefined();
    });
  });

  describe('complex scenarios', () => {
    it('should handle multiple rules affecting same entity', () => {
      const rule1 = {
        entityType: 'user',
        dependsOn: [],
        cascadeTo: ['session']
      };
      
      const rule2 = {
        entityType: 'profile',
        dependsOn: [],
        cascadeTo: ['user']
      };
      
      cacheManager.addRule(rule1);
      cacheManager.addRule(rule2);
      
      const userDAID = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'user',
        entityId: '123',
        operation: 'create'
      });
      
      const sessionDAID = DAIDGenerator.generate({
        agentId: 'test-agent',
        entityType: 'session',
        entityId: 'session-123',
        operation: 'create'
      });
      
      cacheManager.set(userDAID, { user: 'data' });
      cacheManager.set(sessionDAID, { session: 'data' });
      
      // Invalidating profile should cascade to user, which should cascade to session
      const invalidated = cacheManager.invalidateByEntity('profile', 'profile-123');
      
      // Should invalidate user (cascade from profile rule)
      expect(invalidated).toContain(userDAID);
      expect(cacheManager.get(userDAID)).toBeNull();
    });

    it('should handle large cache operations efficiently', () => {
      const startTime = Date.now();
      
      // Add many items to cache
      const daids: string[] = [];
      for (let i = 0; i < 1000; i++) {
        const daid = DAIDGenerator.generate({
          agentId: 'test-agent',
          entityType: 'item',
          entityId: `item-${i}`,
          operation: 'create'
        });
        daids.push(daid);
        cacheManager.set(daid, { id: i, data: `data-${i}` });
      }
      
      const cacheTime = Date.now() - startTime;
      expect(cacheTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Invalidate half of them
      const toInvalidate = daids.slice(0, 500);
      cacheManager.invalidateDAIDs(toInvalidate);
      
      const stats = cacheManager.getStats();
      expect(stats.size).toBe(500);
      
      const endTime = Date.now() - startTime;
      expect(endTime).toBeLessThan(2000); // Should complete within 2 seconds total
    });
  });
});
