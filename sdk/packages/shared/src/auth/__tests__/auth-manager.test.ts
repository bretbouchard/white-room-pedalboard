/**
 * Tests for the unified authentication manager
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AuthManager } from "../auth-manager";
import { AuthCredentials, AuthResult, UserInfo } from "../types";

// Mock fetch for testing
global.fetch = vi.fn();

describe("AuthManager", () => {
  let authManager: AuthManager;
  const mockApiUrl = "https://api.test.com";

  beforeEach(() => {
    authManager = new AuthManager({
      apiUrl: mockApiUrl,
      timeout: 5000,
      retries: 1,
      autoRefresh: false,
      debug: false,
    });

    // Reset fetch mock
    vi.mocked(fetch).mockReset();
  });

  afterEach(() => {
    authManager.dispose();
  });

  describe("authenticate", () => {
    it("should authenticate successfully with API key", async () => {
      const credentials: AuthCredentials = {
        apiKey: "test-api-key-12345",
      };

      const mockAuthResult: AuthResult = {
        success: true,
        token: "test-token",
        refreshToken: "test-refresh-token",
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        user: {
          id: "user-123",
          email: "test@example.com",
          name: "Test User",
          roles: ["user"],
          permissions: ["rhythm:read", "harmony:read"],
        },
        permissions: [
          { resource: "rhythm", actions: ["read"] },
          { resource: "harmony", actions: ["read"] },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAuthResult,
      } as any);

      const result = await authManager.authenticate(credentials);

      expect(result).toEqual(mockAuthResult);
      expect(authManager.isAuthenticated()).toBe(true);
      expect(authManager.getUserPermissions()).toEqual(["rhythm", "harmony"]);
    });

    it("should authenticate successfully with Clerk token", async () => {
      const credentials: AuthCredentials = {
        clerkToken: "sess_test_clerk_token",
      };

      const mockAuthResult: AuthResult = {
        success: true,
        token: "test-token",
        user: {
          id: "user-456",
          email: "clerk@example.com",
          name: "Clerk User",
          roles: ["premium"],
          permissions: ["rhythm:*", "harmony:*"],
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAuthResult,
      } as any);

      const result = await authManager.authenticate(credentials);

      expect(result.success).toBe(true);
      expect(authManager.isAuthenticated()).toBe(true);
    });

    it("should handle authentication failure", async () => {
      const credentials: AuthCredentials = {
        apiKey: "invalid-key",
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Invalid credentials" }),
      } as any);

      await expect(authManager.authenticate(credentials)).rejects.toThrow(
        "Invalid credentials",
      );
      expect(authManager.isAuthenticated()).toBe(false);
    });

    it("should validate credentials format", async () => {
      const invalidCredentials = {} as AuthCredentials;

      await expect(
        authManager.authenticate(invalidCredentials),
      ).rejects.toThrow("Must provide apiKey, clerkToken, or customAuth");
    });

    it("should validate API key length", async () => {
      const credentials: AuthCredentials = {
        apiKey: "short",
      };

      await expect(authManager.authenticate(credentials)).rejects.toThrow(
        "API key appears to be invalid",
      );
    });

    it("should validate Clerk token format", async () => {
      const credentials: AuthCredentials = {
        clerkToken: "invalidformat",
      };

      await expect(authManager.authenticate(credentials)).rejects.toThrow(
        "Clerk token appears to be invalid",
      );
    });
  });

  describe("permissions", () => {
    let mockUser: UserInfo;

    beforeEach(async () => {
      mockUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        roles: ["user"],
        permissions: ["rhythm:read", "harmony:read"],
      };

      const credentials: AuthCredentials = {
        apiKey: "test-api-key-12345",
      };

      const mockAuthResult: AuthResult = {
        success: true,
        token: "test-token",
        user: mockUser,
        permissions: [
          { resource: "rhythm", actions: ["read"] },
          { resource: "harmony", actions: ["read"] },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAuthResult,
      } as any);

      await authManager.authenticate(credentials);
    });

    it("should check permissions correctly", async () => {
      const hasRhythmRead = await authManager.hasPermission("rhythm", "read");
      const hasRhythmWrite = await authManager.hasPermission("rhythm", "write");

      expect(hasRhythmRead).toBe(true);
      expect(hasRhythmWrite).toBe(false);
    });

    it("should check detailed permission result", async () => {
      const result = await authManager.checkPermission("rhythm", "read");

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeDefined();
    });

    it("should require permission and throw if not allowed", async () => {
      await expect(
        authManager.requirePermission("rhythm", "write"),
      ).rejects.toThrow();
    });

    it("should allow permission for admin users", async () => {
      // Update user to admin
      const adminUser: UserInfo = {
        ...mockUser,
        roles: ["admin"],
        permissions: ["*"],
      };

      // Mock the internal state update (in real usage this would come from auth)
      (authManager as any).authState.user = adminUser;
      (authManager as any).authState.permissions = ["*"];

      const hasAnyPermission = await authManager.hasPermission(
        "any-resource",
        "any-action",
      );
      expect(hasAnyPermission).toBe(true);
    });
  });

  describe("token management", () => {
    it("should provide authorization header", async () => {
      const credentials: AuthCredentials = {
        apiKey: "test-api-key-12345",
      };

      const mockAuthResult: AuthResult = {
        success: true,
        token: "test-token",
        user: {
          id: "user-123",
          roles: ["user"],
          permissions: [],
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAuthResult,
      } as any);

      await authManager.authenticate(credentials);

      const authHeader = authManager.getAuthorizationHeader();
      expect(authHeader).toBe("ApiKey test-token");
    });

    it("should return null authorization header when not authenticated", () => {
      const authHeader = authManager.getAuthorizationHeader();
      expect(authHeader).toBeNull();
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      // First authenticate
      const credentials: AuthCredentials = {
        apiKey: "test-api-key-12345",
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          token: "test-token",
          user: { id: "user-123", roles: ["user"], permissions: [] },
        }),
      } as any);

      await authManager.authenticate(credentials);
      expect(authManager.isAuthenticated()).toBe(true);

      // Then logout
      await authManager.logout();
      expect(authManager.isAuthenticated()).toBe(false);
      expect(authManager.getUserPermissions()).toEqual([]);
    });
  });

  describe("events", () => {
    it("should emit authentication events", async () => {
      const eventListener = vi.fn();
      authManager.addEventListener(eventListener);

      const credentials: AuthCredentials = {
        apiKey: "test-api-key-12345",
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          token: "test-token",
          user: { id: "user-123", roles: ["user"], permissions: [] },
        }),
      } as any);

      await authManager.authenticate(credentials);

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "login",
          timestamp: expect.any(Date),
        }),
      );
    });

    it("should emit error events on authentication failure", async () => {
      const eventListener = vi.fn();
      authManager.addEventListener(eventListener);

      const credentials: AuthCredentials = {
        apiKey: "invalid-key",
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: "Invalid credentials" }),
      } as any);

      await expect(authManager.authenticate(credentials)).rejects.toThrow();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          timestamp: expect.any(Date),
          error: expect.any(Error),
        }),
      );
    });
  });

  describe("statistics", () => {
    it("should provide authentication statistics", () => {
      const stats = authManager.getStats();

      expect(stats).toHaveProperty("isAuthenticated");
      expect(stats).toHaveProperty("tokenStats");
      expect(stats).toHaveProperty("permissionStats");
      expect(stats).toHaveProperty("storageStats");
    });
  });
});
