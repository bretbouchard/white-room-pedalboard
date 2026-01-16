/**
 * Tests for the admin middleware system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AdminMiddleware } from "../admin-middleware";
import { AuthManager } from "../auth-manager";
import { UserInfo, AuthManagerOptions } from "../types";

// Mock AuthManager
const mockAuthManager = {
  getCurrentUser: vi.fn(),
  isAuthenticated: vi.fn(),
  checkPermission: vi.fn(),
  getUserPermissions: vi.fn(),
  getEffectivePermissions: vi.fn(),
} as any;

describe("AdminMiddleware", () => {
  let adminMiddleware: AdminMiddleware;
  let mockAdminUser: UserInfo;
  let mockRegularUser: UserInfo;

  beforeEach(() => {
    adminMiddleware = new AdminMiddleware(mockAuthManager, {
      auditLogging: true,
      allowedRoles: ["admin", "super-admin"],
      requiredPermissions: ["admin:*"],
    });

    mockAdminUser = {
      id: "admin-123",
      email: "admin@example.com",
      name: "Admin User",
      roles: ["admin"],
      permissions: ["admin:*", "user:*", "system:read"],
    };

    mockRegularUser = {
      id: "user-123",
      email: "user@example.com",
      name: "Regular User",
      roles: ["user"],
      permissions: ["rhythm:read", "harmony:read"],
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    adminMiddleware.dispose();
  });

  describe("validateAdminOperation", () => {
    it("should allow admin operations for admin users", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockAdminUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.checkPermission.mockResolvedValue({
        allowed: true,
        reason: "Admin permission granted",
      });

      const result = await adminMiddleware.validateAdminOperation(
        "delete",
        "user",
        { userId: "target-user-123" },
      );

      expect(result.allowed).toBe(true);
      expect(mockAuthManager.checkPermission).toHaveBeenCalledWith(
        "user",
        "delete",
        { userId: "target-user-123" },
      );
    });

    it("should deny admin operations for non-admin users", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockRegularUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);

      await expect(
        adminMiddleware.validateAdminOperation("delete", "user"),
      ).rejects.toThrow("Permission denied for delete on user");
    });

    it("should deny operations for unauthenticated users", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(null);
      mockAuthManager.isAuthenticated.mockReturnValue(false);

      await expect(
        adminMiddleware.validateAdminOperation("read", "system"),
      ).rejects.toThrow("Authentication required for admin operations");
    });

    it("should deny operations when authentication is invalid", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockAdminUser);
      mockAuthManager.isAuthenticated.mockReturnValue(false);

      await expect(
        adminMiddleware.validateAdminOperation("read", "system"),
      ).rejects.toThrow("Valid authentication required for admin operations");
    });

    it("should deny operations when permission check fails", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockAdminUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.checkPermission.mockResolvedValue({
        allowed: false,
        reason: "Insufficient permissions",
        requiredPermissions: ["system:delete"],
      });
      mockAuthManager.getUserPermissions.mockReturnValue(["admin:*"]);

      await expect(
        adminMiddleware.validateAdminOperation("delete", "system"),
      ).rejects.toThrow("Permission denied for delete on system");
    });
  });

  describe("requireAdminPermission", () => {
    it("should not throw for allowed operations", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockAdminUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.checkPermission.mockResolvedValue({
        allowed: true,
        reason: "Admin permission granted",
      });

      await expect(
        adminMiddleware.requireAdminPermission("read", "system"),
      ).resolves.not.toThrow();
    });

    it("should throw for denied operations", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockRegularUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);

      await expect(
        adminMiddleware.requireAdminPermission("delete", "user"),
      ).rejects.toThrow("Permission denied");
    });
  });

  describe("hasAdminPermission", () => {
    it("should return true for allowed operations", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockAdminUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.checkPermission.mockResolvedValue({
        allowed: true,
        reason: "Admin permission granted",
      });

      const hasPermission = await adminMiddleware.hasAdminPermission(
        "read",
        "system",
      );
      expect(hasPermission).toBe(true);
    });

    it("should return false for denied operations", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockRegularUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);

      const hasPermission = await adminMiddleware.hasAdminPermission(
        "delete",
        "user",
      );
      expect(hasPermission).toBe(false);
    });
  });

  describe("validateBulkAdminOperations", () => {
    it("should validate multiple operations", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockAdminUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.checkPermission
        .mockResolvedValueOnce({ allowed: true, reason: "Allowed" })
        .mockResolvedValueOnce({ allowed: false, reason: "Denied" });

      const operations = [
        { operation: "read", resource: "user" },
        { operation: "delete", resource: "system" },
      ];

      const results =
        await adminMiddleware.validateBulkAdminOperations(operations);

      expect(results).toHaveLength(2);
      expect(results[0].allowed).toBe(true);
      expect(results[1].allowed).toBe(false);
    });
  });

  describe("admin sessions", () => {
    it("should create admin session for admin users", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockAdminUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.checkPermission.mockResolvedValue({
        allowed: true,
        reason: "Admin permission granted",
      });
      mockAuthManager.getEffectivePermissions.mockReturnValue(["admin:*"]);

      const session = await adminMiddleware.createAdminSession(3600000);

      expect(session).toHaveProperty("sessionId");
      expect(session).toHaveProperty("expiresAt");
      expect(session).toHaveProperty("permissions");
      expect(session.permissions).toEqual(["admin:*"]);
    });

    it("should deny admin session creation for non-admin users", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockRegularUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);

      await expect(adminMiddleware.createAdminSession()).rejects.toThrow(
        "Permission denied",
      );
    });

    it("should validate admin sessions", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockAdminUser);

      const isValid =
        await adminMiddleware.validateAdminSession("test-session-id");
      expect(isValid).toBe(true);
    });

    it("should revoke admin sessions", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockAdminUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.checkPermission.mockResolvedValue({
        allowed: true,
        reason: "Admin permission granted",
      });

      await expect(
        adminMiddleware.revokeAdminSession("test-session-id"),
      ).resolves.not.toThrow();
    });
  });

  describe("audit logging", () => {
    it("should log successful admin operations", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockAdminUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.checkPermission.mockResolvedValue({
        allowed: true,
        reason: "Admin permission granted",
      });

      await adminMiddleware.validateAdminOperation("read", "system");

      const auditLog = adminMiddleware.getAdminAuditLog();
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0]).toMatchObject({
        userId: "admin-123",
        resource: "system",
        action: "read",
        allowed: true,
      });
    });

    it("should log failed admin operations", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockRegularUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);

      try {
        await adminMiddleware.validateAdminOperation("delete", "user");
      } catch {
        // Expected to throw
      }

      const auditLog = adminMiddleware.getAdminAuditLog();
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0]).toMatchObject({
        userId: "user-123",
        resource: "user",
        action: "delete",
        allowed: false,
      });
    });

    it("should filter audit log by user", async () => {
      // Create some audit entries
      mockAuthManager.getCurrentUser.mockReturnValue(mockAdminUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.checkPermission.mockResolvedValue({
        allowed: true,
        reason: "Admin permission granted",
      });

      await adminMiddleware.validateAdminOperation("read", "system");

      const userLog = adminMiddleware.getAdminAuditLog("admin-123");
      expect(userLog).toHaveLength(1);
      expect(userLog[0].userId).toBe("admin-123");

      const otherUserLog = adminMiddleware.getAdminAuditLog("other-user");
      expect(otherUserLog).toHaveLength(0);
    });

    it("should clear audit log for admin users", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockAdminUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.checkPermission.mockResolvedValue({
        allowed: true,
        reason: "Admin permission granted",
      });

      // Create an audit entry
      await adminMiddleware.validateAdminOperation("read", "system");
      expect(adminMiddleware.getAdminAuditLog()).toHaveLength(1);

      // Clear the log
      await adminMiddleware.clearAdminAuditLog();

      // Should have one entry for the clear operation itself
      const auditLog = adminMiddleware.getAdminAuditLog();
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].action).toBe("clear-audit-log");
    });
  });

  describe("admin statistics", () => {
    it("should provide admin statistics", async () => {
      mockAuthManager.getCurrentUser.mockReturnValue(mockAdminUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.checkPermission.mockResolvedValue({
        allowed: true,
        reason: "Admin permission granted",
      });

      // Create some operations
      await adminMiddleware.validateAdminOperation("read", "system");
      await adminMiddleware.validateAdminOperation("read", "user");

      const stats = await adminMiddleware.getAdminStats();

      expect(stats).toHaveProperty("totalOperations");
      expect(stats).toHaveProperty("successfulOperations");
      expect(stats).toHaveProperty("failedOperations");
      expect(stats).toHaveProperty("uniqueUsers");
      expect(stats).toHaveProperty("recentOperations");
      expect(stats.totalOperations).toBeGreaterThan(0);
    });
  });

  describe("rate limiting", () => {
    it("should enforce rate limits when configured", async () => {
      const rateLimitedMiddleware = new AdminMiddleware(mockAuthManager, {
        auditLogging: true,
        allowedRoles: ["admin"],
        rateLimiting: {
          maxRequests: 2,
          windowMs: 60000, // 1 minute
        },
      });

      mockAuthManager.getCurrentUser.mockReturnValue(mockAdminUser);
      mockAuthManager.isAuthenticated.mockReturnValue(true);
      mockAuthManager.checkPermission.mockResolvedValue({
        allowed: true,
        reason: "Admin permission granted",
      });

      // First two requests should succeed
      await rateLimitedMiddleware.validateAdminOperation("read", "system");
      await rateLimitedMiddleware.validateAdminOperation("read", "user");

      // Third request should fail due to rate limit
      await expect(
        rateLimitedMiddleware.validateAdminOperation("read", "audit"),
      ).rejects.toThrow("Rate limit exceeded");

      rateLimitedMiddleware.dispose();
    });
  });
});
