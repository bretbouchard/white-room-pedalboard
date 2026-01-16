/**
 * Admin-specific authentication and authorization middleware
 */

import { PermissionResult, AuditLogEntry } from "./types";
import { AuthenticationError, PermissionDeniedError } from "../errors";
import { AuthManager } from "./auth-manager";

export interface AdminOperationContext {
  operation: string;
  resource: string;
  userId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface AdminMiddlewareOptions {
  auditLogging: boolean;
  requireMFA?: boolean;
  allowedRoles?: string[];
  requiredPermissions?: string[];
  rateLimiting?: {
    maxRequests: number;
    windowMs: number;
  };
}

export class AdminMiddleware {
  private authManager: AuthManager;
  private auditLog: AuditLogEntry[] = [];
  private rateLimitMap = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private options: AdminMiddlewareOptions;

  constructor(
    authManager: AuthManager,
    options: AdminMiddlewareOptions = { auditLogging: true },
  ) {
    this.authManager = authManager;
    this.options = {
      allowedRoles: ["admin", "super-admin"],
      requiredPermissions: ["admin:*"],
      ...options,
    };
  }

  /**
   * Validate admin operation permissions
   */
  async validateAdminOperation(
    operation: string,
    resource: string,
    context?: Record<string, any>,
  ): Promise<PermissionResult> {
    const user = this.authManager.getCurrentUser();

    if (!user) {
      throw new AuthenticationError(
        "Authentication required for admin operations",
      );
    }

    // Check if user is authenticated
    if (!this.authManager.isAuthenticated()) {
      throw new AuthenticationError(
        "Valid authentication required for admin operations",
      );
    }

    // Check rate limiting
    if (this.options.rateLimiting) {
      this.checkRateLimit(user.id);
    }

    // Check if user has admin role
    const hasAdminRole = this.options.allowedRoles?.some((role) =>
      user.roles.includes(role),
    );
    if (!hasAdminRole) {
      const error = new PermissionDeniedError(
        `Permission denied for ${operation} on ${resource}`,
        operation,
      );

      await this.logAdminOperation(
        {
          operation,
          resource,
          userId: user.id,
          metadata: { ...context, error: error.message },
          timestamp: new Date(),
        },
        false,
      );

      throw error;
    }

    // Check specific admin permissions
    const permissionResult = await this.authManager.checkPermission(
      resource,
      operation,
      context,
    );

    if (!permissionResult.allowed) {
      const error = new PermissionDeniedError(
        `Permission denied for ${operation} on ${resource}`,
        operation,
      );

      await this.logAdminOperation(
        {
          operation,
          resource,
          userId: user.id,
          metadata: { ...context, error: error.message },
          timestamp: new Date(),
        },
        false,
      );

      throw error;
    }

    // Log successful admin operation
    await this.logAdminOperation(
      {
        operation,
        resource,
        userId: user.id,
        metadata: context,
        timestamp: new Date(),
      },
      true,
    );

    return permissionResult;
  }

  /**
   * Require admin permission and throw if not allowed
   */
  async requireAdminPermission(
    operation: string,
    resource: string,
    context?: Record<string, any>,
  ): Promise<void> {
    await this.validateAdminOperation(operation, resource, context);
  }

  /**
   * Check if current user has admin permissions
   */
  async hasAdminPermission(
    operation: string,
    resource: string,
    context?: Record<string, any>,
  ): Promise<boolean> {
    try {
      const result = await this.validateAdminOperation(
        operation,
        resource,
        context,
      );
      return result.allowed;
    } catch {
      return false;
    }
  }

  /**
   * Validate bulk admin operations
   */
  async validateBulkAdminOperations(
    operations: Array<{
      operation: string;
      resource: string;
      context?: Record<string, any>;
    }>,
  ): Promise<PermissionResult[]> {
    const results: PermissionResult[] = [];

    for (const op of operations) {
      try {
        const result = await this.validateAdminOperation(
          op.operation,
          op.resource,
          op.context,
        );
        results.push(result);
      } catch (error) {
        results.push({
          allowed: false,
          reason: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }

  /**
   * Create admin session with elevated permissions
   */
  async createAdminSession(
    sessionDuration: number = 3600000, // 1 hour default
  ): Promise<{
    sessionId: string;
    expiresAt: Date;
    permissions: string[];
  }> {
    const user = this.authManager.getCurrentUser();

    if (!user) {
      throw new AuthenticationError(
        "Authentication required to create admin session",
      );
    }

    // Validate admin permissions
    await this.requireAdminPermission("create", "admin-session");

    const expiresAt = new Date(Date.now() + sessionDuration);
    const sessionId = `admin_${user.id}_${Date.now()}`;

    // Log admin session creation
    await this.logAdminOperation(
      {
        operation: "create-admin-session",
        resource: "admin-session",
        userId: user.id,
        metadata: { sessionId, expiresAt },
        timestamp: new Date(),
      },
      true,
    );

    return {
      sessionId,
      expiresAt,
      permissions: this.authManager.getEffectivePermissions(),
    };
  }

  /**
   * Validate admin session
   */
  async validateAdminSession(_sessionId: string): Promise<boolean> {
    // TODO: Use sessionId for session validation
    // In a real implementation, this would check against a session store
    // For now, we'll just validate that the user has admin permissions
    const user = this.authManager.getCurrentUser();

    if (!user) {
      return false;
    }

    return (
      this.options.allowedRoles?.some((role) => user.roles.includes(role)) ||
      false
    );
  }

  /**
   * Revoke admin session
   */
  async revokeAdminSession(sessionId: string): Promise<void> {
    const user = this.authManager.getCurrentUser();

    if (!user) {
      throw new AuthenticationError(
        "Authentication required to revoke admin session",
      );
    }

    await this.requireAdminPermission("revoke", "admin-session");

    // Log admin session revocation
    await this.logAdminOperation(
      {
        operation: "revoke-admin-session",
        resource: "admin-session",
        userId: user.id,
        metadata: { sessionId },
        timestamp: new Date(),
      },
      true,
    );
  }

  /**
   * Get admin audit log
   */
  getAdminAuditLog(
    userId?: string,
    operation?: string,
    resource?: string,
    limit: number = 100,
  ): AuditLogEntry[] {
    let entries = [...this.auditLog];

    if (userId) {
      entries = entries.filter((entry) => entry.userId === userId);
    }

    if (operation) {
      entries = entries.filter((entry) => entry.action === operation);
    }

    if (resource) {
      entries = entries.filter((entry) => entry.resource === resource);
    }

    return entries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Clear admin audit log
   */
  async clearAdminAuditLog(): Promise<void> {
    await this.requireAdminPermission("clear", "audit-log");

    const user = this.authManager.getCurrentUser();

    // Log the clearing action before clearing
    await this.logAdminOperation(
      {
        operation: "clear-audit-log",
        resource: "audit-log",
        userId: user?.id,
        metadata: { entriesCleared: this.auditLog.length },
        timestamp: new Date(),
      },
      true,
    );

    // Keep only the clear-audit-log entry that was just added so
    // there's a record that the log was cleared. This preserves the
    // audit trail for administrative actions while removing prior
    // entries.
    const lastEntry = this.auditLog[this.auditLog.length - 1];
    this.auditLog = lastEntry ? [lastEntry] : [];
  }

  /**
   * Get admin statistics
   */
  async getAdminStats(): Promise<{
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    uniqueUsers: number;
    recentOperations: AuditLogEntry[];
  }> {
    await this.requireAdminPermission("read", "admin-stats");

    const totalOperations = this.auditLog.length;
    const successfulOperations = this.auditLog.filter(
      (entry) => entry.allowed,
    ).length;
    const failedOperations = totalOperations - successfulOperations;
    const uniqueUsers = new Set(this.auditLog.map((entry) => entry.userId))
      .size;
    const recentOperations = this.auditLog
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalOperations,
      successfulOperations,
      failedOperations,
      uniqueUsers,
      recentOperations,
    };
  }

  /**
   * Check rate limiting for admin operations
   */
  private checkRateLimit(userId: string): void {
    if (!this.options.rateLimiting) {
      return;
    }

    const key = `admin_${userId}`;
    const limit = this.rateLimitMap.get(key);

    const _now = Date.now();

    if (!limit || _now > limit.resetTime) {
      // Reset or create new limit
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: _now + this.options.rateLimiting.windowMs,
      });
      return;
    }

    if (limit.count >= this.options.rateLimiting.maxRequests) {
      throw new Error(
        `Rate limit exceeded for admin operations. Try again in ${Math.ceil(
          (limit.resetTime - Date.now()) / 1000,
        )} seconds.`,
      );
    }

    limit.count++;
  }

  /**
   * Log admin operation
   */
  private async logAdminOperation(
    context: AdminOperationContext,
    success: boolean,
  ): Promise<void> {
    if (!this.options.auditLogging) {
      return;
    }

    const auditEntry: AuditLogEntry = {
      timestamp: context.timestamp,
      userId: context.userId,
      resource: context.resource,
      operation: context.operation,
      action: context.operation,
      allowed: success,
      reason: success ? "Admin operation successful" : "Admin operation failed",
      context: context.metadata,
    };

    this.auditLog.push(auditEntry);

    // Keep audit log size manageable (last 10000 entries)
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-10000);
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `admin_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.auditLog = [];
    this.rateLimitMap.clear();
  }
}
