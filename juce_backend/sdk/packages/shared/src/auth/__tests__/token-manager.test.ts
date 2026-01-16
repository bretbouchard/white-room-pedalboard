/**
 * Tests for the token management system
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TokenManager } from '../token-manager';
import { TokenInfo, AuthConfig } from '../types';
import { CredentialStorage } from '../credential-storage';

// Mock fetch for testing
global.fetch = vi.fn();

// Mock timers
vi.useFakeTimers();

describe('TokenManager', () => {
  let tokenManager: TokenManager; // Initialize TokenManager for testing
  let mockCredentialStorage: any;
  const mockConfig: AuthConfig = {
    apiUrl: 'https://api.test.com',
    timeout: 5000,
    retries: 1,
    autoRefresh: true,
    refreshThreshold: 5, // 5 minutes
  };

  beforeEach(() => {
    // Create mock credential storage
    mockCredentialStorage = {
      storeTokenInfo: vi.fn(),
      getTokenInfo: vi.fn(),
      clearAll: vi.fn(),
      storeCredentials: vi.fn(),
      getCredentials: vi.fn(),
      getStats: vi.fn(),
    } as any;

    tokenManager = new TokenManager(mockConfig, mockCredentialStorage);

    // Reset fetch mock
    vi.mocked(fetch).mockReset();
  });

  afterEach(() => {
    tokenManager.dispose();
    vi.clearAllTimers();
  });

  describe('token management', () => {
    it('should set and get token info', async () => {
      const tokenInfo: TokenInfo = {
        token: 'test-token',
        refreshToken: 'test-refresh-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        permissions: ['rhythm:read'],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(tokenInfo);

      const retrievedToken = tokenManager.getTokenInfo();
      expect(retrievedToken).toEqual(tokenInfo);
      expect(mockCredentialStorage.storeTokenInfo).toHaveBeenCalledWith(
        tokenInfo
      );
    });

    it('should validate token correctly', async () => {
      const validTokenInfo: TokenInfo = {
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        permissions: [],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(validTokenInfo);
      expect(tokenManager.isTokenValid()).toBe(true);
    });

    it('should detect expired tokens', async () => {
      const expiredTokenInfo: TokenInfo = {
        token: 'test-token',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        permissions: [],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(expiredTokenInfo);
      expect(tokenManager.isTokenValid()).toBe(false);
    });

    it('should detect tokens expiring soon', async () => {
      const soonToExpireToken: TokenInfo = {
        token: 'test-token',
        expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
        permissions: [],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(soonToExpireToken);
      expect(tokenManager.isTokenExpiringSoon()).toBe(true);
    });

    it('should generate correct authorization headers', async () => {
      const bearerToken: TokenInfo = {
        token: 'bearer-token',
        permissions: [],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(bearerToken);
      expect(tokenManager.getAuthorizationHeader()).toBe('Bearer bearer-token');

      const apiKeyToken: TokenInfo = {
        token: 'api-key-token',
        permissions: [],
        tokenType: 'api-key',
      };

      await tokenManager.setTokenInfo(apiKeyToken);
      expect(tokenManager.getAuthorizationHeader()).toBe(
        'ApiKey api-key-token'
      );

      const customToken: TokenInfo = {
        token: 'custom-token',
        permissions: [],
        tokenType: 'custom',
      };

      await tokenManager.setTokenInfo(customToken);
      expect(tokenManager.getAuthorizationHeader()).toBe('custom-token');
    });
  });

  describe('token refresh', () => {
    it('should refresh token using refresh token', async () => {
      const tokenInfo: TokenInfo = {
        token: 'old-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 1000), // Expires soon
        permissions: ['rhythm:read'],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(tokenInfo);

      const refreshResponse = {
        success: true,
        token: 'new-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        permissions: [{ resource: 'rhythm', actions: ['read'] }],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(refreshResponse),
      } as any);

      
      await tokenManager.refreshToken();

      const newTokenInfo = tokenManager.getTokenInfo();
      expect(newTokenInfo?.token).toBe('new-token');
      expect(newTokenInfo?.refreshToken).toBe('new-refresh-token');
    });

    it('should refresh token using stored credentials when no refresh token', async () => {
      const tokenInfo: TokenInfo = {
        token: 'old-token',
        expiresAt: new Date(Date.now() + 1000), // Expires soon
        permissions: ['rhythm:read'],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(tokenInfo);

      // Mock stored credentials
      mockCredentialStorage.getCredentials.mockResolvedValue({
        apiKey: 'stored-api-key',
      });

      const refreshResponse = {
        success: true,
        token: 'new-token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue(refreshResponse),
      } as any);

      
      await tokenManager.refreshToken();

      const newTokenInfo = tokenManager.getTokenInfo();
      expect(newTokenInfo?.token).toBe('new-token');
    });

    it('should handle refresh failure', async () => {
      const tokenInfo: TokenInfo = {
        token: 'old-token',
        refreshToken: 'invalid-refresh-token',
        permissions: [],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(tokenInfo);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid refresh token' }),
      } as any);

      await expect(tokenManager.refreshToken()).rejects.toThrow(
        'Authentication failed'
      );
      expect(tokenManager.getTokenInfo()).toBeUndefined();
    });

    it('should prevent multiple simultaneous refresh attempts', async () => {
      const tokenInfo: TokenInfo = {
        token: 'old-token',
        refreshToken: 'refresh-token',
        permissions: [],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(tokenInfo);

      vi.mocked(fetch).mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true, token: 'new-token' }),
                } as any),
              100
            )
          )
      );

      // Start multiple refresh attempts
      const refresh1 = tokenManager.refreshToken();
      const refresh2 = tokenManager.refreshToken();
      const refresh3 = tokenManager.refreshToken();

      // Advance timers to resolve the fetch
      vi.advanceTimersByTime(100);

      await Promise.all([refresh1, refresh2, refresh3]);

      // Should only make one fetch call
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('automatic refresh', () => {
    it('should schedule automatic refresh', async () => {
      const tokenInfo: TokenInfo = {
        token: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
        permissions: [],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(tokenInfo);

      // Mock successful refresh
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          token: 'refreshed-token',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        }),
      } as any);

      // Advance time to trigger refresh (5 minutes before expiry)
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

      // Flush microtasks (avoid setTimeout with fake timers)
      await Promise.resolve();

      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/auth/refresh',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });

    it('should refresh immediately if token is already expired', async () => {
      const expiredTokenInfo: TokenInfo = {
        token: 'expired-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() - 1000), // Already expired
        permissions: [],
        tokenType: 'bearer',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          token: 'new-token',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        }),
      } as any);

      await tokenManager.setTokenInfo(expiredTokenInfo);

      // Flush microtasks so any immediate refresh promise settles
      await Promise.resolve();

      expect(fetch).toHaveBeenCalled();
    });
  });

  describe('events', () => {
    it('should emit login event when token is set', async () => {
      const eventListener = vi.fn();
      tokenManager.addEventListener(eventListener);

      const tokenInfo: TokenInfo = {
        token: 'test-token',
        permissions: ['rhythm:read'],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(tokenInfo);

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'login',
          timestamp: expect.any(Date),
          data: expect.objectContaining({
            tokenType: 'bearer',
            permissions: ['rhythm:read'],
          }),
        })
      );
    });

    it('should emit refresh event on successful refresh', async () => {
      const eventListener = vi.fn();
      tokenManager.addEventListener(eventListener);

      const tokenInfo: TokenInfo = {
        token: 'old-token',
        refreshToken: 'refresh-token',
        permissions: [],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(tokenInfo);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          token: 'new-token',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
        }),
      } as any);

      await tokenManager.refreshToken();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'refresh',
          timestamp: expect.any(Date),
          data: expect.objectContaining({
            success: true,
          }),
        })
      );
    });

    it('should emit error event on refresh failure', async () => {
      const eventListener = vi.fn();
      tokenManager.addEventListener(eventListener);

      const tokenInfo: TokenInfo = {
        token: 'old-token',
        refreshToken: 'invalid-refresh-token',
        permissions: [],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(tokenInfo);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as any);

      await expect(tokenManager.refreshToken()).rejects.toThrow();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          timestamp: expect.any(Date),
          error: expect.any(Error),
        })
      );
    });
  });

  describe('statistics', () => {
    it('should provide token statistics', async () => {
      const tokenInfo: TokenInfo = {
        token: 'test-token',
        expiresAt: new Date(Date.now() + 3600000),
        permissions: ['rhythm:read', 'harmony:read'],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(tokenInfo);

      const stats = tokenManager.getStats();

      expect(stats).toEqual({
        hasToken: true,
        isValid: true,
        isExpiringSoon: false,
        expiresAt: tokenInfo.expiresAt,
        tokenType: 'bearer',
        permissionCount: 2,
        autoRefreshEnabled: true,
      });
    });
  });

  describe('cleanup', () => {
    it('should clear token and stop refresh timer', async () => {
      const tokenInfo: TokenInfo = {
        token: 'test-token',
        refreshToken: 'refresh-token',
        expiresAt: new Date(Date.now() + 3600000),
        permissions: [],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(tokenInfo);
      expect(tokenManager.isTokenValid()).toBe(true);

      await tokenManager.clearToken();

      expect(tokenManager.getTokenInfo()).toBeUndefined();
      expect(mockCredentialStorage.clearAll).toHaveBeenCalled();
    });

    it('should emit logout event when token is cleared', async () => {
      const eventListener = vi.fn();
      tokenManager.addEventListener(eventListener);

      const tokenInfo: TokenInfo = {
        token: 'test-token',
        permissions: [],
        tokenType: 'bearer',
      };

      await tokenManager.setTokenInfo(tokenInfo);
      await tokenManager.clearToken();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'logout',
          timestamp: expect.any(Date),
        })
      );
    });
  });
});
