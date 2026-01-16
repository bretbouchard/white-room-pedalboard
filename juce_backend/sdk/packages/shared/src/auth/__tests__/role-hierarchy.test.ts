/**
 * Tests for the role hierarchy system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RoleHierarchy } from '../role-hierarchy';
import { RoleDefinition, UserInfo } from '../types';

describe('RoleHierarchy', () => {
  let roleHierarchy: RoleHierarchy;

  beforeEach(() => {
    roleHierarchy = new RoleHierarchy();
  });

  describe('role management', () => {
    it('should have default roles initialized', () => {
      const roles = roleHierarchy.getAllRoles();
      const roleNames = roles.map(r => r.name);

      expect(roleNames).toContain('guest');
      expect(roleNames).toContain('user');
      expect(roleNames).toContain('premium');
      expect(roleNames).toContain('admin');
      expect(roleNames).toContain('super-admin');
    });

    it('should get role definition', () => {
      const userRole = roleHierarchy.getRole('user');

      expect(userRole).toBeDefined();
      expect(userRole?.name).toBe('user');
      expect(userRole?.permissions).toContain('rhythm:read');
      expect(userRole?.inherits).toContain('guest');
    });

    it('should add custom roles', () => {
      const customRole: RoleDefinition = {
        name: 'custom-role',
        permissions: ['custom:permission'],
        inherits: ['user'],
      };

      roleHierarchy.addRole(customRole);
      const retrieved = roleHierarchy.getRole('custom-role');

      expect(retrieved).toEqual(customRole);
    });

    it('should check if role exists', () => {
      expect(roleHierarchy.hasRole('admin')).toBe(true);
      expect(roleHierarchy.hasRole('non-existent')).toBe(false);
    });
  });

  describe('role hierarchy', () => {
    it('should calculate role levels correctly', () => {
      expect(roleHierarchy.getRoleLevel('guest')).toBe(0);
      expect(roleHierarchy.getRoleLevel('user')).toBe(1);
      expect(roleHierarchy.getRoleLevel('premium')).toBe(2);
      expect(roleHierarchy.getRoleLevel('admin')).toBe(4);
      expect(roleHierarchy.getRoleLevel('super-admin')).toBe(5);
    });

    it('should check inheritance relationships', () => {
      expect(roleHierarchy.inheritsFrom('user', 'guest')).toBe(true);
      expect(roleHierarchy.inheritsFrom('premium', 'user')).toBe(true);
      expect(roleHierarchy.inheritsFrom('premium', 'guest')).toBe(true);
      expect(roleHierarchy.inheritsFrom('admin', 'premium')).toBe(true);
      expect(roleHierarchy.inheritsFrom('guest', 'user')).toBe(false);
    });

    it('should get inherited roles', () => {
      const premiumInherited = roleHierarchy.getInheritedRoles('premium');
      expect(premiumInherited).toContain('user');
      expect(premiumInherited).toContain('guest');

      const adminInherited = roleHierarchy.getInheritedRoles('admin');
      expect(adminInherited).toContain('moderator');
      expect(adminInherited).toContain('premium');
      expect(adminInherited).toContain('user');
      expect(adminInherited).toContain('guest');
    });

    it('should get child roles', () => {
      const userChildren = roleHierarchy.getChildRoles('user');
      expect(userChildren).toContain('premium');

      const guestChildren = roleHierarchy.getChildRoles('guest');
      expect(guestChildren).toContain('user');
      expect(guestChildren).toContain('premium');
    });
  });

  describe('effective permissions', () => {
    it('should calculate effective permissions for roles', () => {
      const userPermissions = roleHierarchy.getEffectivePermissions('user');

      // Should include own permissions
      expect(userPermissions).toContain('rhythm:generate');
      expect(userPermissions).toContain('composition:create');

      // Should include inherited permissions from guest
      expect(userPermissions).toContain('rhythm:read');
      expect(userPermissions).toContain('composition:read');
    });

    it('should calculate effective permissions for users', () => {
      const user: UserInfo = {
        id: 'user-123',
        roles: ['premium'],
        permissions: ['custom:permission'],
      };

      const effectivePermissions =
        roleHierarchy.getUserEffectivePermissions(user);

      // Should include direct permissions
      expect(effectivePermissions).toContain('custom:permission');

      // Should include role permissions
      expect(effectivePermissions).toContain('rhythm:*');
      expect(effectivePermissions).toContain('audio:read');

      // Should include inherited permissions
      expect(effectivePermissions).toContain('rhythm:read');
      expect(effectivePermissions).toContain('composition:read');
    });

    it('should check user permissions correctly', () => {
      const premiumUser: UserInfo = {
        id: 'user-123',
        roles: ['premium'],
        permissions: [],
      };

      expect(
        roleHierarchy.userHasPermission(premiumUser, 'rhythm:generate')
      ).toBe(true);
      expect(
        roleHierarchy.userHasPermission(premiumUser, 'rhythm:advanced')
      ).toBe(true); // wildcard
      expect(
        roleHierarchy.userHasPermission(premiumUser, 'system:configure')
      ).toBe(false);
    });

    it('should handle wildcard permissions', () => {
      const adminUser: UserInfo = {
        id: 'admin-123',
        roles: ['super-admin'],
        permissions: [],
      };

      // Super admin has '*' permission
      expect(roleHierarchy.userHasPermission(adminUser, 'any:permission')).toBe(
        true
      );
      expect(
        roleHierarchy.userHasPermission(adminUser, 'system:nuclear-launch')
      ).toBe(true);
    });
  });

  describe('role suggestions', () => {
    it('should find minimum role for permission', () => {
      const minRole = roleHierarchy.getMinimumRoleForPermission('audio:read');
      expect(minRole).toBe('premium');

      const adminMinRole =
        roleHierarchy.getMinimumRoleForPermission('system:configure');
      expect(adminMinRole).toBe('admin');
    });

    it('should suggest role upgrades', () => {
      const basicUser: UserInfo = {
        id: 'user-123',
        roles: ['user'],
        permissions: [],
      };

      const suggestion = roleHierarchy.suggestRoleUpgrade(basicUser, [
        'audio:read',
        'realtime:connect',
        'collaboration:join',
      ]);

      expect(suggestion.suggestedRole).toBe('premium');
      expect(suggestion.missingPermissions).toContain('audio:read');
      expect(suggestion.gainedPermissions).toContain('audio:read');
    });

    it('should return null when no upgrade needed', () => {
      const premiumUser: UserInfo = {
        id: 'user-123',
        roles: ['premium'],
        permissions: [],
      };

      const suggestion = roleHierarchy.suggestRoleUpgrade(premiumUser, [
        'rhythm:read',
        'harmony:generate',
      ]);

      expect(suggestion.suggestedRole).toBeNull();
      expect(suggestion.missingPermissions).toHaveLength(0);
    });
  });

  describe('permission scopes', () => {
    it('should get permission scopes for resources', () => {
      const rhythmScopes = roleHierarchy.getPermissionScopes('rhythm');
      expect(rhythmScopes.length).toBeGreaterThan(0);

      const basicScope = rhythmScopes.find(
        s => s.conditions?.complexity === 'basic'
      );
      expect(basicScope).toBeDefined();
      expect(basicScope?.actions).toContain('read');
    });

    it('should handle resources without scopes', () => {
      const unknownScopes =
        roleHierarchy.getPermissionScopes('unknown-resource');
      expect(unknownScopes).toHaveLength(0);
    });
  });

  describe('hierarchy export/import', () => {
    it('should export hierarchy data', () => {
      const exported = roleHierarchy.exportHierarchy();

      expect(exported).toHaveProperty('roles');
      expect(exported).toHaveProperty('scopes');
      expect(exported.roles.length).toBeGreaterThan(0);
      expect(Object.keys(exported.scopes).length).toBeGreaterThan(0);
    });

    it('should import hierarchy data', () => {
      const customRole: RoleDefinition = {
        name: 'imported-role',
        permissions: ['imported:permission'],
      };

      const importData = {
        roles: [customRole],
        scopes: {
          imported: [
            {
              resource: 'imported',
              actions: ['read'],
            },
          ],
        },
      };

      roleHierarchy.importHierarchy(importData);

      expect(roleHierarchy.hasRole('imported-role')).toBe(true);
      expect(roleHierarchy.getPermissionScopes('imported')).toHaveLength(1);
    });
  });

  describe('hierarchy statistics', () => {
    it('should provide hierarchy statistics', () => {
      const stats = roleHierarchy.getHierarchyStats();

      expect(stats).toHaveProperty('totalRoles');
      expect(stats).toHaveProperty('maxDepth');
      expect(stats).toHaveProperty('rolesPerLevel');
      expect(stats).toHaveProperty('totalPermissions');

      expect(stats.totalRoles).toBeGreaterThan(0);
      expect(stats.maxDepth).toBeGreaterThan(0);
      expect(stats.totalPermissions).toBeGreaterThan(0);
    });

    it('should count roles per level correctly', () => {
      const stats = roleHierarchy.getHierarchyStats();

      // Should have at least one role at level 0 (guest)
      expect(stats.rolesPerLevel[0]).toBeGreaterThan(0);
    });
  });

  describe('complex inheritance scenarios', () => {
    it('should handle multiple inheritance', () => {
      const multiInheritRole: RoleDefinition = {
        name: 'multi-inherit',
        permissions: ['multi:permission'],
        inherits: ['premium', 'developer'], // Multiple inheritance
      };

      roleHierarchy.addRole(multiInheritRole);

      const effectivePermissions =
        roleHierarchy.getEffectivePermissions('multi-inherit');

      // Should include permissions from both parent roles
      expect(effectivePermissions).toContain('audio:read'); // from premium
      expect(effectivePermissions).toContain('api:read'); // from developer
      expect(effectivePermissions).toContain('multi:permission'); // own permission
    });

    it('should handle deep inheritance chains', () => {
      // Create a deep chain: base -> level1 -> level2 -> level3
      const baseRole: RoleDefinition = {
        name: 'deep-base',
        permissions: ['base:permission'],
      };

      const level1Role: RoleDefinition = {
        name: 'deep-level1',
        permissions: ['level1:permission'],
        inherits: ['deep-base'],
      };

      const level2Role: RoleDefinition = {
        name: 'deep-level2',
        permissions: ['level2:permission'],
        inherits: ['deep-level1'],
      };

      const level3Role: RoleDefinition = {
        name: 'deep-level3',
        permissions: ['level3:permission'],
        inherits: ['deep-level2'],
      };

      [baseRole, level1Role, level2Role, level3Role].forEach(role => {
        roleHierarchy.addRole(role);
      });

      const effectivePermissions =
        roleHierarchy.getEffectivePermissions('deep-level3');

      expect(effectivePermissions).toContain('base:permission');
      expect(effectivePermissions).toContain('level1:permission');
      expect(effectivePermissions).toContain('level2:permission');
      expect(effectivePermissions).toContain('level3:permission');
    });
  });
});
