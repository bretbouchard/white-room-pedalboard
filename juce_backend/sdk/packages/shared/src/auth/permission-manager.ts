import {
  PermissionCheck,
  PermissionResult,
  RoleDefinition,
  UserInfo,
  AuthEvent,
  AuthEventListener,
  AuditLogEntry,
} from './types';
import { PermissionDeniedError } from '../errors';

export interface PermissionCacheEntry {
  result: PermissionResult;
  timestamp: number;
  ttl: number;
}

export class PermissionManager {
  private roleDefinitions = new Map<string, RoleDefinition>();
  private permissionCache = new Map<string, PermissionCacheEntry>();
  private auditLog: AuditLogEntry[] = [];
  private eventListeners: AuthEventListener[] = [];
  private cacheTtl: number;
  private auditLogging: boolean;
  private maxAuditEntries: number = 1000;

  constructor(cacheTtl: number = 300000, auditLogging: boolean = false) {
    this.cacheTtl = cacheTtl;
    this.auditLogging = auditLogging;
    this.initializeDefaultRoles();
    setInterval(() => this.cleanupCache(), 60000);
  }

  private initializeDefaultRoles(): void {
    this.defineRole({ name: 'admin', permissions: ['*'] });
    this.defineRole({
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
        'composition:update',
        'analysis:read',
        'analysis:analyze',
      ],
    });
    this.defineRole({
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
      ],
      inherits: ['user'],
    });
    this.defineRole({
      name: 'readonly',
      permissions: [
        'rhythm:read',
        'harmony:read',
        'melody:read',
        'composition:read',
        'analysis:read',
      ],
    });
  }

  defineRole(role: RoleDefinition): void {
    this.roleDefinitions.set(role.name, role);
    this.clearPermissionCache();
  }

  getRole(roleName: string): RoleDefinition | undefined {
    return this.roleDefinitions.get(roleName);
  }

  getAllRoles(): RoleDefinition[] {
    return Array.from(this.roleDefinitions.values());
  }

  async checkPermission(
    user: UserInfo,
    check: PermissionCheck
  ): Promise<PermissionResult> {
    const cacheKey = this.generateCacheKey(user.id, check);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      this.logAudit(user, check, cached.allowed, cached.reason);
      return cached;
    }
    const result = await this.performPermissionCheck(user, check);
    this.setCache(cacheKey, result);
    this.logAudit(user, check, result.allowed, result.reason);
    if (!result.allowed) {
      this.emitEvent({
        type: 'permission-denied',
        timestamp: new Date(),
        data: {
          userId: user.id,
          resource: check.resource,
          action: check.action,
        },
      });
    }
    return result;
  }

  private async performPermissionCheck(
    user: UserInfo,
    check: PermissionCheck
  ): Promise<PermissionResult> {
    // Admin users or global wildcard always allowed
    if (user.roles.includes('admin') || user.permissions.includes('*')) {
      return { allowed: true, reason: 'Admin access' };
    }

    const allPermissions = this.collectUserPermissions(user);
    const required = `${check.resource}:${check.action}`;

    // Direct permission match
    if (allPermissions.includes(required)) {
      return { allowed: true, reason: 'Direct permission match' };
    }

    // Resource-level wildcard (e.g. rhythm:*)
    if (allPermissions.includes(`${check.resource}:*`)) {
      return { allowed: true, reason: 'Resource wildcard permission' };
    }

    // Owner-based permission (e.g. composition:read:owner) when context.ownerId matches user.id
    if (
      check.context &&
      typeof check.context.ownerId === 'string' &&
      check.context.ownerId === user.id
    ) {
      const ownerPermission = `${required}:owner`;
      if (allPermissions.includes(ownerPermission)) {
        return { allowed: true, reason: 'Resource owner permission' };
      }
    }

    // Default deny
    return {
      allowed: false,
      reason: 'Permission denied',
      missingPermissions: [required],
      requiredPermissions: [required],
    };
  }

  private collectUserPermissions(user: UserInfo): string[] {
    const permissions = new Set<string>(user.permissions);
    user.roles.forEach(roleName => {
      const role = this.getRole(roleName);
      if (role) {
        role.permissions.forEach(p => permissions.add(p));
        if (role.inherits) {
          role.inherits.forEach(inherited => {
            const inheritedRole = this.getRole(inherited);
            if (inheritedRole)
              inheritedRole.permissions.forEach(p => permissions.add(p));
          });
        }
      }
    });
    return Array.from(permissions);
  }

  private generateCacheKey(userId: string, check: PermissionCheck): string {
    return `${userId}:${check.resource}:${check.action}`;
  }

  private getFromCache(_key: string): PermissionResult | null {
    const entry = this.permissionCache.get(_key);
    if (entry && Date.now() < entry.timestamp + entry.ttl) {
      return entry.result;
    }
    return null;
  }

  private setCache(_key: string, result: PermissionResult): void {
    this.permissionCache.set(_key, {
      result,
      timestamp: Date.now(),
      ttl: this.cacheTtl,
    });
  }

  clearPermissionCache(): void {
    this.permissionCache.clear();
  }

  private cleanupCache(): void {
    for (const [key, entry] of this.permissionCache.entries()) {
      const _now = Date.now();

      if (_now > entry.timestamp + entry.ttl) {
        this.permissionCache.delete(key);
      }
    }
  }

  private logAudit(
    user: UserInfo,
    check: PermissionCheck,
    allowed: boolean,
    reason?: string
  ): void {
    if (!this.auditLogging) return;
    const entry: AuditLogEntry = {
      timestamp: new Date(),
      userId: user.id,
      resource: check.resource,
      operation: check.action,
      action: check.action,
      allowed,
      reason,
      context: check.context,
    };
    this.auditLog.push(entry);
    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog = this.auditLog.slice(-this.maxAuditEntries);
    }
  }

  getAuditLog(
    userId?: string,
    resource?: string,
    limit: number = 100
  ): AuditLogEntry[] {
    let entries = [...this.auditLog];
    if (userId) entries = entries.filter(e => e.userId === userId);
    if (resource) entries = entries.filter(e => e.resource === resource);
    return entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  clearAuditLog(): void {
    this.auditLog = [];
  }

  addEventListener(listener: AuthEventListener): void {
    this.eventListeners.push(listener);
  }

  removeEventListener(listener: AuthEventListener): void {
    this.eventListeners = this.eventListeners.filter(l => l !== listener);
  }

  private emitEvent(event: AuthEvent): void {
    this.eventListeners.forEach(listener => listener(event));
  }

  getStats() {
    const successful = this.auditLog.filter(e => e.allowed).length;
    const _total = 0;

    const failed = _total - successful;
    const uniqueUsers = new Set(this.auditLog.map(e => e.userId)).size;
    const cacheSize = this.permissionCache.size;
    const roleCount = this.roleDefinitions.size;
    const auditLogSize = this.auditLog.length;

    const cacheHitRate = _total === 0 ? 0 : successful / 0;
    return {
      total: 0,
      successful,
      failed,
      uniqueUsers,
      cacheSize,
      roleCount,
      auditLogSize,
      cacheHitRate,
    };
  }

  exportRoles(): RoleDefinition[] {
    return Array.from(this.roleDefinitions.values());
  }

  importRoles(roles: RoleDefinition[]): void {
    roles.forEach(role => this.defineRole(role));
  }

  dispose(): void {
    this.clearPermissionCache();
    this.clearAuditLog();
    this.eventListeners = [];
  }
  /**
   * Require permission and throw error if not allowed
   */
  async requirePermission(
    user: UserInfo,
    check: PermissionCheck
  ): Promise<void> {
    const result = await this.checkPermission(user, check);
    if (!result.allowed) {
      throw new PermissionDeniedError(
        `Permission denied for ${check.action} on ${check.resource}`,
        check.action
      );
    }
  }

  /**
   * Check multiple permissions at once
   */
  async checkMultiplePermissions(
    user: UserInfo,
    checks: PermissionCheck[]
  ): Promise<PermissionResult[]> {
    return Promise.all(checks.map(check => this.checkPermission(user, check)));
  }

  /**
   * Return true if any of the provided permission checks are allowed
   */
  async hasAnyPermission(
    user: UserInfo,
    checks: PermissionCheck[]
  ): Promise<boolean> {
    const results = await this.checkMultiplePermissions(user, checks);
    return results.some(r => r.allowed);
  }

  /**
   * Return true if all of the provided permission checks are allowed
   */
  async hasAllPermissions(
    user: UserInfo,
    checks: PermissionCheck[]
  ): Promise<boolean> {
    const results = await this.checkMultiplePermissions(user, checks);
    return results.every(r => r.allowed);
  }

  /**
   * Get user's effective permissions (resolved from roles)
   */
  getUserEffectivePermissions(user: UserInfo): string[] {
    return this.collectUserPermissions(user);
  }
}
