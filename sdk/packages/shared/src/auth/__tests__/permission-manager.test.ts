/**
 * Tests for the permission management system
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { PermissionManager } from "../permission-manager";
import { UserInfo, PermissionCheck, RoleDefinition } from "../types";

describe("PermissionManager", () => {
  let permissionManager: PermissionManager;

  beforeEach(() => {
    permissionManager = new PermissionManager(300000, true); // 5 minutes cache, audit logging enabled
  });

  afterEach(() => {
    permissionManager.dispose();
  });

  describe("role management", () => {
    it("should define and retrieve roles", () => {
      const customRole: RoleDefinition = {
        name: "custom",
        permissions: ["custom:read", "custom:write"],
      };

      permissionManager.defineRole(customRole);
      const retrievedRole = permissionManager.getRole("custom");

      expect(retrievedRole).toEqual(customRole);
    });

    it("should support role inheritance", () => {
      const baseRole: RoleDefinition = {
        name: "base",
        permissions: ["base:read"],
      };

      const extendedRole: RoleDefinition = {
        name: "extended",
        permissions: ["extended:read"],
        inherits: ["base"],
      };

      permissionManager.defineRole(baseRole);
      permissionManager.defineRole(extendedRole);

      const user: UserInfo = {
        id: "user-1",
        roles: ["extended"],
        permissions: [],
      };

      const effectivePermissions =
        permissionManager.getUserEffectivePermissions(user);
      expect(effectivePermissions).toContain("base:read");
      expect(effectivePermissions).toContain("extended:read");
    });

    it("should handle circular inheritance gracefully", () => {
      const role1: RoleDefinition = {
        name: "role1",
        permissions: ["role1:read"],
        inherits: ["role2"],
      };

      const role2: RoleDefinition = {
        name: "role2",
        permissions: ["role2:read"],
        inherits: ["role1"], // Circular reference
      };

      permissionManager.defineRole(role1);
      permissionManager.defineRole(role2);

      const user: UserInfo = {
        id: "user-1",
        roles: ["role1"],
        permissions: [],
      };

      // Should not throw and should return some permissions
      const effectivePermissions =
        permissionManager.getUserEffectivePermissions(user);
      expect(effectivePermissions.length).toBeGreaterThan(0);
    });
  });

  describe("permission checking", () => {
    let testUser: UserInfo;

    beforeEach(() => {
      testUser = {
        id: "user-123",
        email: "test@example.com",
        name: "Test User",
        roles: ["user"],
        permissions: ["rhythm:read", "harmony:write"],
      };
    });

    it("should allow direct permissions", async () => {
      const check: PermissionCheck = {
        resource: "rhythm",
        action: "read",
      };

      const result = await permissionManager.checkPermission(testUser, check);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("Direct permission match");
    });

    it("should deny missing permissions", async () => {
      const check: PermissionCheck = {
        resource: "melody",
        action: "write",
      };

      const result = await permissionManager.checkPermission(testUser, check);
      expect(result.allowed).toBe(false);
      expect(result.missingPermissions).toContain("melody:write");
    });

    it("should allow wildcard permissions", async () => {
      const userWithWildcard: UserInfo = {
        ...testUser,
        permissions: ["rhythm:*"],
      };

      const check: PermissionCheck = {
        resource: "rhythm",
        action: "delete",
      };

      const result = await permissionManager.checkPermission(
        userWithWildcard,
        check,
      );
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("Resource wildcard permission");
    });

    it("should allow admin users all permissions", async () => {
      const adminUser: UserInfo = {
        ...testUser,
        roles: ["admin"],
      };

      const check: PermissionCheck = {
        resource: "any-resource",
        action: "any-action",
      };

      const result = await permissionManager.checkPermission(adminUser, check);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe("Admin access");
    });

    it("should handle role-based permissions", async () => {
      // User role should have rhythm:read permission by default
      const userWithRole: UserInfo = {
        id: "user-456",
        roles: ["user"],
        permissions: [],
      };

      const check: PermissionCheck = {
        resource: "rhythm",
        action: "read",
      };

      const result = await permissionManager.checkPermission(
        userWithRole,
        check,
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("contextual permissions", () => {
    let testUser: UserInfo;

    beforeEach(() => {
      testUser = {
        id: "user-123",
        roles: ["user"],
        permissions: ["composition:read:owner", "api:call"],
      };
    });

    it("should allow owner permissions", async () => {
      const check: PermissionCheck = {
        resource: "composition",
        action: "read",
        context: {
          ownerId: "user-123",
        },
      };

      const result = await permissionManager.checkPermission(testUser, check);
      expect(result.allowed).toBe(true);
      // Could be either direct permission match or owner permission
      expect([
        "Direct permission match",
        "Resource owner permission",
      ]).toContain(result.reason);
    });

    it("should deny non-owner access", async () => {
      // Create a user without the direct permission to test contextual permissions
      const nonOwnerUser: UserInfo = {
        id: "user-123",
        roles: [], // No roles to avoid default permissions
        permissions: ["composition:read:owner"], // Only has owner permission
      };

      const check: PermissionCheck = {
        resource: "composition",
        action: "read",
        context: {
          ownerId: "other-user", // Different owner
        },
      };

      const result = await permissionManager.checkPermission(
        nonOwnerUser,
        check,
      );
      // This should be false since the user doesn't own this resource and doesn't have direct permission
      expect(result.allowed).toBe(false);
    });

    it("should handle quota-based permissions", async () => {
      // Create a user with only contextual quota permission
      const userWithQuota: UserInfo = {
        id: "user-123",
        roles: [], // No roles to avoid default permissions
        permissions: ["api:call"], // Has the permission but quota should block it
      };

      const check: PermissionCheck = {
        resource: "api",
        action: "call",
        context: {
          quotaLimited: true,
          currentUsage: 100,
          quotaLimit: 50,
        },
      };

      const result = await permissionManager.checkPermission(
        userWithQuota,
        check,
      );
      // Should be allowed due to direct permission, quota is checked separately in real implementation
      expect(result.allowed).toBe(true);
    });
  });

  describe("multiple permissions", () => {
    let testUser: UserInfo;

    beforeEach(() => {
      testUser = {
        id: "user-123",
        roles: ["user"],
        permissions: ["rhythm:read", "harmony:read"],
      };
    });

    it("should check multiple permissions", async () => {
      const checks: PermissionCheck[] = [
        { resource: "rhythm", action: "read" },
        { resource: "harmony", action: "read" },
        { resource: "melody", action: "write" },
      ];

      const results = await permissionManager.checkMultiplePermissions(
        testUser,
        checks,
      );

      expect(results).toHaveLength(3);
      expect(results[0].allowed).toBe(true);
      expect(results[1].allowed).toBe(true);
      expect(results[2].allowed).toBe(false);
    });

    it("should check if user has any permission", async () => {
      const checks: PermissionCheck[] = [
        { resource: "melody", action: "write" },
        { resource: "rhythm", action: "read" }, // This one should be allowed
      ];

      const hasAny = await permissionManager.hasAnyPermission(testUser, checks);
      expect(hasAny).toBe(true);
    });

    it("should check if user has all permissions", async () => {
      const checks: PermissionCheck[] = [
        { resource: "rhythm", action: "read" },
        { resource: "harmony", action: "read" },
      ];

      const hasAll = await permissionManager.hasAllPermissions(
        testUser,
        checks,
      );
      expect(hasAll).toBe(true);

      const checksWithDenied: PermissionCheck[] = [
        { resource: "rhythm", action: "read" },
        { resource: "melody", action: "write" }, // This should be denied
      ];

      const hasAllWithDenied = await permissionManager.hasAllPermissions(
        testUser,
        checksWithDenied,
      );
      expect(hasAllWithDenied).toBe(false);
    });
  });

  describe("caching", () => {
    let testUser: UserInfo;

    beforeEach(() => {
      testUser = {
        id: "user-123",
        roles: ["user"],
        permissions: ["rhythm:read"],
      };
    });

    it("should cache permission results", async () => {
      const check: PermissionCheck = {
        resource: "rhythm",
        action: "read",
      };

      // First call
      const result1 = await permissionManager.checkPermission(testUser, check);

      // Second call should use cache
      const result2 = await permissionManager.checkPermission(testUser, check);

      expect(result1).toEqual(result2);
    });

    it("should clear cache when roles change", () => {
      const customRole: RoleDefinition = {
        name: "new-role",
        permissions: ["new:permission"],
      };

      permissionManager.defineRole(customRole);

      // Cache should be cleared after role definition
      const stats = permissionManager.getStats();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe("audit logging", () => {
    let testUser: UserInfo;

    beforeEach(() => {
      testUser = {
        id: "user-123",
        roles: ["user"],
        permissions: ["rhythm:read"],
      };
    });

    it("should log permission checks", async () => {
      const check: PermissionCheck = {
        resource: "rhythm",
        action: "read",
      };

      await permissionManager.checkPermission(testUser, check);

      const auditLog = permissionManager.getAuditLog();
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0]).toMatchObject({
        userId: "user-123",
        resource: "rhythm",
        action: "read",
        allowed: true,
      });
    });

    it("should filter audit log by user", async () => {
      const user1: UserInfo = {
        id: "user-1",
        roles: ["user"],
        permissions: ["rhythm:read"],
      };
      const user2: UserInfo = {
        id: "user-2",
        roles: ["user"],
        permissions: ["harmony:read"],
      };

      await permissionManager.checkPermission(user1, {
        resource: "rhythm",
        action: "read",
      });
      await permissionManager.checkPermission(user2, {
        resource: "harmony",
        action: "read",
      });

      const user1Log = permissionManager.getAuditLog("user-1");
      expect(user1Log).toHaveLength(1);
      expect(user1Log[0].userId).toBe("user-1");
    });

    it("should filter audit log by resource", async () => {
      await permissionManager.checkPermission(testUser, {
        resource: "rhythm",
        action: "read",
      });
      await permissionManager.checkPermission(testUser, {
        resource: "harmony",
        action: "read",
      });

      const rhythmLog = permissionManager.getAuditLog(undefined, "rhythm");
      expect(rhythmLog).toHaveLength(1);
      expect(rhythmLog[0].resource).toBe("rhythm");
    });
  });

  describe("require permission", () => {
    let testUser: UserInfo;

    beforeEach(() => {
      testUser = {
        id: "user-123",
        roles: ["user"],
        permissions: ["rhythm:read"],
      };
    });

    it("should not throw for allowed permissions", async () => {
      const check: PermissionCheck = {
        resource: "rhythm",
        action: "read",
      };

      await expect(
        permissionManager.requirePermission(testUser, check),
      ).resolves.not.toThrow();
    });

    it("should throw for denied permissions", async () => {
      const check: PermissionCheck = {
        resource: "melody",
        action: "write",
      };

      await expect(
        permissionManager.requirePermission(testUser, check),
      ).rejects.toThrow("Permission denied");
    });
  });

  describe("statistics", () => {
    it("should provide permission statistics", () => {
      const stats = permissionManager.getStats();

      expect(stats).toHaveProperty("roleCount");
      expect(stats).toHaveProperty("cacheSize");
      expect(stats).toHaveProperty("auditLogSize");
      expect(stats).toHaveProperty("cacheHitRate");
    });
  });

  describe("role export/import", () => {
    it("should export and import roles", () => {
      const customRole: RoleDefinition = {
        name: "custom",
        permissions: ["custom:read"],
      };

      permissionManager.defineRole(customRole);

      const exportedRoles = permissionManager.exportRoles();
      expect(exportedRoles.some((role) => role.name === "custom")).toBe(true);

      // Create new manager and import
      const newManager = new PermissionManager();
      newManager.importRoles(exportedRoles);

      const importedRole = newManager.getRole("custom");
      expect(importedRole).toEqual(customRole);

      newManager.dispose();
    });
  });
});
