/**
 * User management utilities for admin operations with role-based access control
 */

import { SchillingerSDK } from '@schillinger-sdk/core';
import {
  AuthenticationError,
  ValidationError as _ValidationError,
} from '@schillinger-sdk/shared';

export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  permissions: Permission[];
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastActive?: Date;
  loginCount: number;
  metadata?: Record<string, any>;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isSystem: boolean;
  priority: number;
}

export interface Permission {
  id: string;
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface UserCreateRequest {
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  roleId: string;
  additionalPermissions?: string[];
  sendWelcomeEmail?: boolean;
  metadata?: Record<string, any>;
}

export interface UserUpdateRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  roleId?: string;
  additionalPermissions?: string[];
  status?: UserStatus;
  metadata?: Record<string, any>;
}

export interface UserSearchOptions {
  query?: string;
  role?: string;
  status?: UserStatus;
  createdAfter?: Date;
  createdBefore?: Date;
  lastActiveAfter?: Date;
  sortBy?: 'email' | 'createdAt' | 'lastActive' | 'loginCount';
  sortOrder?: 'asc' | 'desc';
}

export interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resource?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface RoleCreateRequest {
  name: string;
  description: string;
  permissions: string[];
  priority?: number;
}

export interface RoleUpdateRequest {
  name?: string;
  description?: string;
  permissions?: string[];
  priority?: number;
}

/**
 * Comprehensive user management system with role-based access control
 */
export class UserManager {
  constructor(private sdk: SchillingerSDK) {
    this.validateAdminPermissions();
  }

  // User Management

  /**
   * List all users with filtering and pagination
   */
  async listUsers(
    page: number = 1,
    limit: number = 20,
    options: UserSearchOptions = {}
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    this.validateAdminPermissions();

    if (page < 1 || limit < 1 || limit > 100) {
      throw new _ValidationError(
        'pagination',
        { page, limit },
        'valid pagination parameters'
      );
    }

    const response = await this.sdk.makeRequest('/admin/users', {
      method: 'GET',
      body: JSON.stringify({
        page,
        limit,
        ...options,
      }),
    });

    const data = await response.json();
    return {
      ...data.data,
      hasNext: page * limit < data.data.total,
      hasPrev: page > 1,
    };
  }

  /**
   * Get user by ID with detailed information
   */
  async getUser(id: string): Promise<User | null> {
    this.validateAdminPermissions();

    if (!id || typeof id !== 'string') {
      throw new _ValidationError('id', id, 'non-empty string');
    }

    try {
      const response = await this.sdk.makeRequest(`/admin/users/${id}`, {
        method: 'GET',
      });

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Search users by various criteria
   */
  async searchUsers(options: UserSearchOptions): Promise<User[]> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest('/admin/users/search', {
      method: 'POST',
      body: JSON.stringify(options),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Create new user with role assignment
   */
  async createUser(request: UserCreateRequest): Promise<User> {
    this.validateAdminPermissions();

    // Validate request
    // if (!ValidationUtils.isValidEmail(request.email)) {
    //   throw new _ValidationError('email', request.email, 'valid email address');
    // }

    if (!request.roleId) {
      throw new _ValidationError('roleId', request.roleId, 'valid role ID');
    }

    const response = await this.sdk.makeRequest('/admin/users', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Update existing user
   */
  async updateUser(id: string, request: UserUpdateRequest): Promise<User> {
    this.validateAdminPermissions();

    if (!id || typeof id !== 'string') {
      throw new _ValidationError('id', id, 'non-empty string');
    }

    const response = await this.sdk.makeRequest(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Delete user (soft delete)
   */
  async deleteUser(id: string, permanent: boolean = false): Promise<void> {
    this.validateAdminPermissions();

    if (!id || typeof id !== 'string') {
      throw new _ValidationError('id', id, 'non-empty string');
    }

    await this.sdk.makeRequest(`/admin/users/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ permanent }),
    });
  }

  /**
   * Suspend user account
   */
  async suspendUser(
    id: string,
    reason?: string,
    duration?: number
  ): Promise<void> {
    this.validateAdminPermissions();

    await this.sdk.makeRequest(`/admin/users/${id}/suspend`, {
      method: 'POST',
      body: JSON.stringify({ reason, duration }),
    });
  }

  /**
   * Reactivate suspended user
   */
  async reactivateUser(id: string): Promise<void> {
    this.validateAdminPermissions();

    await this.sdk.makeRequest(`/admin/users/${id}/reactivate`, {
      method: 'POST',
    });
  }

  /**
   * Reset user password
   */
  async resetUserPassword(
    id: string,
    sendEmail: boolean = true
  ): Promise<{ temporaryPassword?: string }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(
      `/admin/users/${id}/reset-password`,
      {
        method: 'POST',
        body: JSON.stringify({ sendEmail }),
      }
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Get user activity log
   */
  async getUserActivity(
    id: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    activities: UserActivity[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(`/admin/users/${id}/activity`, {
      method: 'GET',
      body: JSON.stringify({ page, limit }),
    });

    const data = await response.json();
    return data.data;
  }

  // Role Management

  /**
   * List all roles
   */
  async listRoles(): Promise<UserRole[]> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest('/admin/roles', {
      method: 'GET',
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Get role by ID
   */
  async getRole(id: string): Promise<UserRole | null> {
    this.validateAdminPermissions();

    try {
      const response = await this.sdk.makeRequest(`/admin/roles/${id}`, {
        method: 'GET',
      });

      const data = await response.json();
      return data.data;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Create new role
   */
  async createRole(request: RoleCreateRequest): Promise<UserRole> {
    this.validateAdminPermissions();

    if (!request.name || typeof request.name !== 'string') {
      throw new _ValidationError('name', request.name, 'non-empty string');
    }

    const response = await this.sdk.makeRequest('/admin/roles', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Update existing role
   */
  async updateRole(id: string, request: RoleUpdateRequest): Promise<UserRole> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(`/admin/roles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Delete role
   */
  async deleteRole(id: string): Promise<void> {
    this.validateAdminPermissions();

    await this.sdk.makeRequest(`/admin/roles/${id}`, {
      method: 'DELETE',
    });
  }

  // Permission Management

  /**
   * List all available permissions
   */
  async listPermissions(): Promise<Permission[]> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest('/admin/permissions', {
      method: 'GET',
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Grant permission to user
   */
  async grantPermission(userId: string, permissionId: string): Promise<void> {
    this.validateAdminPermissions();

    await this.sdk.makeRequest(`/admin/users/${userId}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ permissionId }),
    });
  }

  /**
   * Revoke permission from user
   */
  async revokePermission(userId: string, permissionId: string): Promise<void> {
    this.validateAdminPermissions();

    await this.sdk.makeRequest(
      `/admin/users/${userId}/permissions/${permissionId}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Check if user has specific permission
   */
  async checkUserPermission(
    userId: string,
    resource: string,
    action: string
  ): Promise<boolean> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(
      `/admin/users/${userId}/permissions/check`,
      {
        method: 'POST',
        body: JSON.stringify({ resource, action }),
      }
    );

    const data = await response.json();
    return data.data.hasPermission;
  }

  // Bulk Operations

  /**
   * Bulk update users
   */
  async bulkUpdateUsers(
    userIds: string[],
    updates: Partial<UserUpdateRequest>
  ): Promise<{
    success: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    this.validateAdminPermissions();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new _ValidationError(
        'userIds',
        userIds,
        'non-empty array of user IDs'
      );
    }

    const response = await this.sdk.makeRequest('/admin/users/bulk-update', {
      method: 'POST',
      body: JSON.stringify({ userIds, updates }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Bulk delete users
   */
  async bulkDeleteUsers(
    userIds: string[],
    permanent: boolean = false
  ): Promise<{
    success: string[];
    failed: Array<{ id: string; error: string }>;
  }> {
    this.validateAdminPermissions();

    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new _ValidationError(
        'userIds',
        userIds,
        'non-empty array of user IDs'
      );
    }

    const response = await this.sdk.makeRequest('/admin/users/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ userIds, permanent }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Export users data
   */
  async exportUsers(
    format: 'csv' | 'json' | 'xlsx' = 'csv',
    options: UserSearchOptions = {}
  ): Promise<Blob> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest('/admin/users/export', {
      method: 'POST',
      body: JSON.stringify({ format, options }),
    });

    return response.blob();
  }

  // Statistics and Analytics

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    pending: number;
    byRole: Record<string, number>;
    recentSignups: number;
    recentLogins: number;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest('/admin/users/stats', {
      method: 'GET',
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Get user growth analytics
   */
  async getUserGrowthAnalytics(
    period: 'day' | 'week' | 'month' | 'year' = 'month',
    count: number = 12
  ): Promise<
    Array<{
      period: string;
      newUsers: number;
      activeUsers: number;
      totalUsers: number;
    }>
  > {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(
      '/admin/users/analytics/growth',
      {
        method: 'GET',
        body: JSON.stringify({ period, count }),
      }
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Get user activity analytics
   */
  async getUserActivityAnalytics(
    period: 'day' | 'week' | 'month' = 'day',
    count: number = 30
  ): Promise<
    Array<{
      period: string;
      logins: number;
      uniqueUsers: number;
      averageSessionDuration: number;
    }>
  > {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(
      '/admin/users/analytics/activity',
      {
        method: 'GET',
        body: JSON.stringify({ period, count }),
      }
    );

    const data = await response.json();
    return data.data;
  }

  // Audit and Compliance

  /**
   * Get audit log for user management actions
   */
  async getAuditLog(
    page: number = 1,
    limit: number = 50,
    filters: {
      action?: string;
      userId?: string;
      adminId?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    entries: Array<{
      id: string;
      action: string;
      userId?: string;
      adminId: string;
      details: Record<string, any>;
      timestamp: Date;
      ipAddress?: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest('/admin/audit-log', {
      method: 'GET',
      body: JSON.stringify({ page, limit, filters }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    type: 'gdpr' | 'ccpa' | 'hipaa' | 'custom',
    options: {
      startDate?: Date;
      endDate?: Date;
      includePersonalData?: boolean;
      format?: 'pdf' | 'csv' | 'json';
    } = {}
  ): Promise<Blob> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest('/admin/compliance/report', {
      method: 'POST',
      body: JSON.stringify({ type, options }),
    });

    return response.blob();
  }

  // Private helper methods

  private validateAdminPermissions(): void {
    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError(
        'Authentication required for admin operations'
      );
    }

    if (
      !this.sdk.hasPermission('admin') &&
      !this.sdk.hasPermission('user_management')
    ) {
      throw new AuthenticationError(
        'Admin permissions required for user management operations'
      );
    }
  }

  // private isValidEmail(email: string): boolean {
  //   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  //   return emailRegex.test(email);
  // }
}
