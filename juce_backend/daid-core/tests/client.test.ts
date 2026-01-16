import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { DAIDClient } from '../src/client';
import { DAIDGenerator } from '../src/generator';

// Mock fetch for testing
// @ts-expect-error define fetch in test env
global.fetch = vi.fn();

describe('DAIDClient', () => {
  let client: DAIDClient;

  beforeEach(() => {
    client = new DAIDClient({
      agentId: 'test-agent',
      baseUrl: 'http://test-server:8080',
      apiKey: 'test-key',
    });
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      const defaultClient = new DAIDClient({ agentId: 'test-agent' });
      expect(defaultClient).toBeDefined();
    });

    it('should create client with custom config', () => {
      const customClient = new DAIDClient({
        agentId: 'custom-agent',
        baseUrl: 'https://custom-server.com',
        apiKey: 'custom-key',
        timeout: 10000,
      });
      expect(customClient).toBeDefined();
    });
  });

  describe('createProvenanceRecord', () => {
    it('should create provenance record and return DAID', async () => {
      const mockResponse = { ok: true, json: () => Promise.resolve({ success: true }) };
      (fetch as Mock).mockResolvedValue(mockResponse);

      const record = {
        entityType: 'user',
        entityId: '123',
        operation: 'create',
        metadata: { source: 'test' },
      };

      const daid = await client.createProvenanceRecord(record);

      expect(daid).toMatch(/^daid:v\d+\.\d+:.+:.+:.+:.+:[a-f0-9]{16}$/);
      expect(DAIDGenerator.isValid(daid)).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'http://test-server:8080/api/v1/provenance/records',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"agentId":"test-agent"'),
        })
      );
    });

    it('should work without backend URL', async () => {
      const localClient = new DAIDClient({ agentId: 'local-agent' });

      const record = {
        entityType: 'user',
        entityId: '123',
        operation: 'create',
      };

      const daid = await localClient.createProvenanceRecord(record);

      expect(daid).toMatch(/^daid:v\d+\.\d+:.+:.+:.+:.+:[a-f0-9]{16}$/);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should continue if backend storage fails', async () => {
      const mockResponse = { ok: false, statusText: 'Server Error' };
      (fetch as Mock).mockResolvedValue(mockResponse);

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const record = {
        entityType: 'user',
        entityId: '123',
        operation: 'create',
      };

      const daid = await client.createProvenanceRecord(record);

      expect(daid).toMatch(/^daid:v\d+\.\d+:.+:.+:.+:.+:[a-f0-9]{16}$/);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to store DAID record:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('getProvenanceChain', () => {
    it('should fetch provenance chain', async () => {
      const mockChain = ['daid1', 'daid2', 'daid3'];
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ chain: mockChain }),
      };
      (fetch as Mock).mockResolvedValue(mockResponse);

      const chain = await client.getProvenanceChain('user', '123');

      expect(chain).toEqual(mockChain);
      expect(fetch).toHaveBeenCalledWith(
        'http://test-server:8080/api/v1/provenance/chain/user/123',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-key',
          }),
        })
      );
    });

    it('should throw error if no base URL', async () => {
      const localClient = new DAIDClient({ agentId: 'local-agent', baseUrl: '' });

      await expect(localClient.getProvenanceChain('user', '123')).rejects.toThrow(
        'Base URL required for provenance chain retrieval'
      );
    });

    it('should throw error on failed request', async () => {
      const mockResponse = { ok: false, statusText: 'Not Found' };
      (fetch as Mock).mockResolvedValue(mockResponse);

      await expect(client.getProvenanceChain('user', '123')).rejects.toThrow(
        'Failed to get provenance chain: Not Found'
      );
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache', async () => {
      const mockResponse = { ok: true };
      (fetch as Mock).mockResolvedValue(mockResponse);

      const daids = ['daid1', 'daid2'];
      await client.invalidateCache(daids);

      expect(fetch).toHaveBeenCalledWith(
        'http://test-server:8080/api/v1/cache/invalidate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ daids }),
        })
      );
    });

    it('should handle cache invalidation failure gracefully', async () => {
      (fetch as Mock).mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const daids = ['daid1', 'daid2'];
      await client.invalidateCache(daids);

      expect(consoleSpy).toHaveBeenCalledWith('Failed to invalidate cache:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should be no-op without base URL', async () => {
      const localClient = new DAIDClient({ agentId: 'local-agent', baseUrl: '' });

      await localClient.invalidateCache(['daid1']);

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('discoverSystemPatterns', () => {
    it('should discover system patterns', async () => {
      const mockPatterns = {
        system1: {
          entityTypes: ['user', 'document'],
          operations: ['create', 'read', 'update'],
          agentIds: ['agent1'],
        },
      };
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve(mockPatterns),
      };
      (fetch as Mock).mockResolvedValue(mockResponse);

      const patterns = await client.discoverSystemPatterns();

      expect(patterns).toEqual(mockPatterns);
      expect(fetch).toHaveBeenCalledWith(
        'http://test-server:8080/api/v1/systems/patterns',
        expect.any(Object)
      );
    });

    it('should return empty object on failure', async () => {
      (fetch as Mock).mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const patterns = await client.discoverSystemPatterns();

      expect(patterns).toEqual({});
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to discover system patterns:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it('should return empty object without base URL', async () => {
      const localClient = new DAIDClient({ agentId: 'local-agent', baseUrl: '' });

      const patterns = await localClient.discoverSystemPatterns();

      expect(patterns).toEqual({});
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('generateDAID', () => {
    it('should generate DAID locally', () => {
      const daid = client.generateDAID({
        entityType: 'user',
        entityId: '123',
        operation: 'create',
        metadata: { source: 'test' },
      });

      expect(daid).toMatch(/^daid:v\d+\.\d+:.+:.+:.+:.+:[a-f0-9]{16}$/);
      expect(DAIDGenerator.isValid(daid)).toBe(true);

      const components = DAIDGenerator.parse(daid);
      expect(components!.agentId).toBe('test-agent');
      expect(components!.entityType).toBe('user');
      expect(components!.entityId).toBe('123');
    });
  });

  describe('timeout handling', () => {
    it('should timeout requests', async () => {
      const timeoutClient = new DAIDClient({
        agentId: 'test-agent',
        baseUrl: 'http://slow-server.com',
        timeout: 100,
      });

      // Mock a slow response
      (fetch as Mock).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));

      const record = {
        entityType: 'user',
        entityId: '123',
        operation: 'create',
      };

      // Should still return DAID even if storage fails
      const daid = await timeoutClient.createProvenanceRecord(record);
      expect(DAIDGenerator.isValid(daid)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      (fetch as Mock).mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const record = {
        entityType: 'user',
        entityId: '123',
        operation: 'create',
      };

      const daid = await client.createProvenanceRecord(record);

      expect(DAIDGenerator.isValid(daid)).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle malformed responses', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      };
      (fetch as Mock).mockResolvedValue(mockResponse);

      await expect(client.getProvenanceChain('user', '123')).rejects.toThrow('Invalid JSON');
    });
  });
});
