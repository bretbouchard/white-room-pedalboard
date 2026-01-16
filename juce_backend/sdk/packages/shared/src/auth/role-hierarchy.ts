/**
 * Role hierarchy system with granular permission controls
 */

import { RoleDefinition, UserInfo } from './types';

export interface RoleHierarchyNode {
  role: RoleDefinition;
  parent?: RoleHierarchyNode;
  children: RoleHierarchyNode[];
  level: number;
}

export interface PermissionScope {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
  restrictions?: Record<string, any>;
}

export class RoleHierarchy {
  private roles = new Map<string, RoleDefinition>();
  private hierarchy = new Map<string, RoleHierarchyNode>();
  private permissionScopes = new Map<string, PermissionScope[]>();

  constructor() {
    this.initializeDefaultHierarchy();
  }

  /**
   * Initialize default role hierarchy
   */
  private initializeDefaultHierarchy(): void {
    // Define base roles
    const guestRole: RoleDefinition = {
      name: 'guest',
      permissions: [
        'rhythm:read',
        'harmony:read',
        'melody:read',
        'composition:read',
      ],
    };

    const userRole: RoleDefinition = {
      name: 'user',
      permissions: [
        'rhythm:read',
        'rhythm:generate',
        'harmony:read',
        'harmony:generate',
        'melody:read',
        'melody:generate',
        'composition:read',
        'composition:create',
        'composition:update:owner',
        'analysis:read',
        'analysis:analyze',
      ],
      inherits: ['guest'],
    };

    const premiumRole: RoleDefinition = {
      name: 'premium',
      permissions: [
        'rhythm:*',
        'harmony:*',
        'melody:*',
        'composition:*',
        'analysis:*',
        'audio:read',
        'audio:process',
        'realtime:connect',
        'collaboration:join',
        'export:advanced',
      ],
      inherits: ['user'],
    };

    const moderatorRole: RoleDefinition = {
      name: 'moderator',
      permissions: [
        'user:read',
        'user:moderate',
        'composition:moderate',
        'content:moderate',
        'reports:read',
        'reports:resolve',
      ],
      inherits: ['premium'],
    };

    const adminRole: RoleDefinition = {
      name: 'admin',
      permissions: [
        'user:*',
        'system:read',
        'system:configure',
        'analytics:read',
        'audit:read',
        'backup:create',
        'backup:restore',
      ],
      inherits: ['moderator'],
    };

    const superAdminRole: RoleDefinition = {
      name: 'super-admin',
      permissions: ['*'], // All permissions
      inherits: ['admin'],
    };

    // Developer roles
    const developerRole: RoleDefinition = {
      name: 'developer',
      permissions: [
        'api:read',
        'api:write',
        'sdk:access',
        'documentation:read',
        'debug:access',
      ],
      inherits: ['premium'],
    };

    const apiAdminRole: RoleDefinition = {
      name: 'api-admin',
      permissions: ['api:*', 'sdk:*', 'integration:*', 'webhook:*'],
      inherits: ['developer', 'admin'],
    };

    // Add all roles to the hierarchy
    [
      guestRole,
      userRole,
      premiumRole,
      moderatorRole,
      adminRole,
      superAdminRole,
      developerRole,
      apiAdminRole,
    ].forEach(role => this.addRole(role));

    // Define permission scopes
    this.definePermissionScopes();
  }

  /**
   * Add a role to the hierarchy
   */
  addRole(role: RoleDefinition): void {
    this.roles.set(role.name, role);
    this.buildHierarchyNode(role);
  }

  /**
   * Get role definition
   */
  getRole(roleName: string): RoleDefinition | undefined {
    return this.roles.get(roleName);
  }

  /**
   * Get all roles
   */
  getAllRoles(): RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get role hierarchy node
   */
  getRoleNode(roleName: string): RoleHierarchyNode | undefined {
    return this.hierarchy.get(roleName);
  }

  /**
   * Check if role exists
   */
  hasRole(roleName: string): boolean {
    return this.roles.has(roleName);
  }

  /**
   * Get role level in hierarchy (0 = root level)
   */
  getRoleLevel(roleName: string): number {
    const node = this.hierarchy.get(roleName);
    return node?.level ?? -1;
  }

  /**
   * Check if one role inherits from another
   */
  inheritsFrom(childRole: string, parentRole: string): boolean {
    const childNode = this.hierarchy.get(childRole);
    if (!childNode) return false;

    let current = childNode.parent;
    while (current) {
      if (current.role.name === parentRole) {
        return true;
      }
      current = current.parent;
    }

    return false;
  }

  /**
   * Get all inherited roles for a given role
   */
  getInheritedRoles(roleName: string): string[] {
    const role = this.roles.get(roleName);
    if (!role || !role.inherits) return [];

    const visited = new Set<string>();
    const collect = (roleNames: string[]) => {
      for (const parent of roleNames) {
        if (!visited.has(parent)) {
          visited.add(parent);
          const parentRole = this.roles.get(parent);
          if (parentRole && parentRole.inherits) {
            collect(parentRole.inherits);
          }
        }
      }
    };
    collect(role.inherits);
    return Array.from(visited);
  }

  /**
   * Get all child roles for a given role
   */
  getChildRoles(roleName: string): string[] {
    const node = this.hierarchy.get(roleName);
    if (!node) return [];

    const children: string[] = [];
    const collectChildren = (n: RoleHierarchyNode) => {
      n.children.forEach(child => {
        children.push(child.role.name);
        collectChildren(child);
      });
    };

    collectChildren(node);
    return children;
  }

  /**
   * Get effective permissions for a role (including inherited)
   */
  getEffectivePermissions(roleName: string): string[] {
    const role = this.roles.get(roleName);
    if (!role) return [];

    const permissions = new Set<string>(role.permissions);

    // Add inherited permissions (support multiple inheritance)
    const inheritedRoles = this.getInheritedRoles(roleName);
    inheritedRoles.forEach(inheritedRole => {
      const inheritedRoleData = this.roles.get(inheritedRole);
      if (inheritedRoleData) {
        inheritedRoleData.permissions.forEach(p => permissions.add(p));
      }
    });

    return Array.from(permissions);
  }

  /**
   * Get effective permissions for a user
   */
  getUserEffectivePermissions(user: UserInfo): string[] {
    const permissions = new Set<string>();

    // Add direct permissions
    user.permissions.forEach(p => permissions.add(p));

    // Add role-based permissions
    user.roles.forEach(roleName => {
      const rolePermissions = this.getEffectivePermissions(roleName);
      rolePermissions.forEach(p => permissions.add(p));
    });

    return Array.from(permissions);
  }

  /**
   * Check if user has permission considering role hierarchy
   */
  userHasPermission(user: UserInfo, permission: string): boolean {
    const userPermissions = this.getUserEffectivePermissions(user);

    // Check direct match
    if (userPermissions.includes(permission)) {
      return true;
    }

    // Check wildcard permissions
    const [resource] = permission.split(':');
    const resourceWildcard = `${resource}:*`;
    if (userPermissions.includes(resourceWildcard)) {
      return true;
    }

    // Check global wildcard
    if (userPermissions.includes('*')) {
      return true;
    }

    return false;
  }

  /**
   * Get minimum role required for a permission
   */
  getMinimumRoleForPermission(permission: string): string | null {
    const rolesWithPermission: Array<{ role: string; level: number }> = [];

    this.roles.forEach((_, roleName) => {
      const effectivePermissions = this.getEffectivePermissions(roleName);
      if (
        effectivePermissions.includes(permission) ||
        effectivePermissions.includes('*') ||
        effectivePermissions.includes(`${permission.split(':')[0]}:*`)
      ) {
        rolesWithPermission.push({
          role: roleName,
          level: this.getRoleLevel(roleName),
        });
      }
    });

    if (rolesWithPermission.length === 0) {
      return null;
    }

    // Return the role with the lowest level (closest to root)
    rolesWithPermission.sort((a, b) => a.level - b.level);
    return rolesWithPermission[0].role;
  }

  /**
   * Suggest role upgrade for user to gain specific permissions
   */
  suggestRoleUpgrade(
    user: UserInfo,
    desiredPermissions: string[]
  ): {
    currentHighestRole: string | null;
    suggestedRole: string | null;
    missingPermissions: string[];
    gainedPermissions: string[];
  } {
    const currentPermissions = this.getUserEffectivePermissions(user);
    const missingPermissions = desiredPermissions.filter(
      p => !currentPermissions.includes(p)
    );

    if (missingPermissions.length === 0) {
      return {
        currentHighestRole: this.getHighestUserRole(user),
        suggestedRole: null,
        missingPermissions: [],
        gainedPermissions: [],
      };
    }

    // Find the minimum role that would provide all missing permissions
    let suggestedRole: string | null = null;
    let minLevel = Infinity;

    this.roles.forEach((_, roleName) => {
      const rolePermissions = this.getEffectivePermissions(roleName);
      const wouldSatisfy = missingPermissions.every(
        p =>
          rolePermissions.includes(p) ||
          rolePermissions.includes('*') ||
          rolePermissions.includes(`${p.split(':')[0]}:*`)
      );

      if (wouldSatisfy) {
        const level = this.getRoleLevel(roleName);
        if (level < minLevel) {
          minLevel = level;
          suggestedRole = roleName;
        }
      }
    });

    const gainedPermissions = suggestedRole
      ? this.getEffectivePermissions(suggestedRole).filter(
          p => !currentPermissions.includes(p)
        )
      : [];

    return {
      currentHighestRole: this.getHighestUserRole(user),
      suggestedRole,
      missingPermissions,
      gainedPermissions,
    };
  }

  /**
   * Get the highest role a user has
   */
  private getHighestUserRole(user: UserInfo): string | null {
    if (user.roles.length === 0) {
      return null;
    }

    let highestRole: string | null = null;
    let maxLevel = -1;

    user.roles.forEach(roleName => {
      const level = this.getRoleLevel(roleName);
      if (level > maxLevel) {
        maxLevel = level;
        highestRole = roleName;
      }
    });

    return highestRole;
  }

  /**
   * Build hierarchy node for a role
   */
  private buildHierarchyNode(role: RoleDefinition): void {
    if (this.hierarchy.has(role.name)) {
      return; // Already built
    }

    const node: RoleHierarchyNode = {
      role,
      children: [],
      level: 0,
    };

    // Handle inheritance
    if (role.inherits && role.inherits.length > 0) {
      // For simplicity, use the first inherited role as parent
      const parentRoleName = role.inherits[0];
      const parentRole = this.roles.get(parentRoleName);

      if (parentRole) {
        // Ensure parent node exists
        if (!this.hierarchy.has(parentRoleName)) {
          this.buildHierarchyNode(parentRole);
        }

        const parentNode = this.hierarchy.get(parentRoleName)!;
        node.parent = parentNode;
        node.level = parentNode.level + 1;
        parentNode.children.push(node);
      }
    }

    this.hierarchy.set(role.name, node);
  }

  /**
   * Define permission scopes for different resources
   */
  private definePermissionScopes(): void {
    const scopes: Record<string, PermissionScope[]> = {
      rhythm: [
        {
          resource: 'rhythm',
          actions: ['read', 'generate', 'analyze', 'export'],
          conditions: { complexity: 'basic' },
        },
        {
          resource: 'rhythm',
          actions: ['generate', 'analyze'],
          conditions: { complexity: 'advanced' },
          restrictions: { requiresRole: 'premium' },
        },
      ],
      harmony: [
        {
          resource: 'harmony',
          actions: ['read', 'generate', 'analyze'],
          conditions: { voiceCount: { max: 4 } },
        },
        {
          resource: 'harmony',
          actions: ['generate', 'analyze'],
          conditions: { voiceCount: { max: 8 } },
          restrictions: { requiresRole: 'premium' },
        },
      ],
      user: [
        {
          resource: 'user',
          actions: ['read'],
          conditions: { scope: 'public' },
        },
        {
          resource: 'user',
          actions: ['read', 'update'],
          conditions: { scope: 'own' },
        },
        {
          resource: 'user',
          actions: ['read', 'update', 'delete'],
          conditions: { scope: 'all' },
          restrictions: { requiresRole: 'admin' },
        },
      ],
      system: [
        {
          resource: 'system',
          actions: ['read'],
          restrictions: { requiresRole: 'admin' },
        },
        {
          resource: 'system',
          actions: ['configure', 'restart', 'backup'],
          restrictions: { requiresRole: 'super-admin' },
        },
      ],
    };

    Object.entries(scopes).forEach(([resource, resourceScopes]) => {
      this.permissionScopes.set(resource, resourceScopes);
    });
  }

  /**
   * Get permission scopes for a resource
   */
  getPermissionScopes(resource: string): PermissionScope[] {
    return this.permissionScopes.get(resource) || [];
  }

  /**
   * Export role hierarchy for backup/migration
   */
  exportHierarchy(): {
    roles: RoleDefinition[];
    scopes: Record<string, PermissionScope[]>;
  } {
    return {
      roles: Array.from(this.roles.values()),
      scopes: Object.fromEntries(this.permissionScopes.entries()),
    };
  }

  /**
   * Import role hierarchy from backup/migration
   */
  importHierarchy(data: {
    roles: RoleDefinition[];
    scopes: Record<string, PermissionScope[]>;
  }): void {
    // Clear existing data
    this.roles.clear();
    this.hierarchy.clear();
    this.permissionScopes.clear();

    // Import roles
    data.roles.forEach(role => this.addRole(role));

    // Import scopes
    Object.entries(data.scopes).forEach(([resource, scopes]) => {
      this.permissionScopes.set(resource, scopes);
    });
  }

  /**
   * Get hierarchy statistics
   */
  getHierarchyStats(): {
    totalRoles: number;
    maxDepth: number;
    rolesPerLevel: Record<number, number>;
    totalPermissions: number;
  } {
    const rolesPerLevel: Record<number, number> = {};
    let maxDepth = 0;
    let totalPermissions = 0;

    this.hierarchy.forEach(node => {
      const level = node.level;
      rolesPerLevel[level] = (rolesPerLevel[level] || 0) + 1;
      maxDepth = Math.max(maxDepth, level);
      totalPermissions += node.role.permissions.length;
    });

    return {
      totalRoles: this.roles.size,
      maxDepth,
      rolesPerLevel,
      totalPermissions,
    };
  }
}
