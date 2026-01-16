/**
 * Comprehensive system configuration management with validation and versioning
 */

// TODO: Implement SchillingerSDK class
// import { SchillingerSDK } from '@schillinger-sdk/core';
import {
  AuthenticationError,
  ValidationError as _ValidationError,
} from "@schillinger-sdk/shared";

export interface ConfigurationValue {
  key: string;
  value: any;
  type: "string" | "number" | "boolean" | "object" | "array";
  category: string;
  description?: string;
  validation?: ConfigurationValidation;
  sensitive: boolean;
  readOnly: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ConfigurationValidation {
  required: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: any[];
  custom?: string; // Custom validation function name
}

export interface ConfigurationUpdate {
  value: any;
  description?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ConfigurationSchema {
  key: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  category: string;
  description: string;
  defaultValue: any;
  validation: ConfigurationValidation;
  sensitive: boolean;
  readOnly: boolean;
  tags: string[];
}

export interface ConfigurationHistory {
  id: string;
  key: string;
  oldValue: any;
  newValue: any;
  changedBy: string;
  changeReason?: string;
  timestamp: Date;
  version: number;
}

export interface ConfigurationBackup {
  id: string;
  name: string;
  description?: string;
  configurations: ConfigurationValue[];
  createdAt: Date;
  createdBy: string;
  size: number;
}

export interface ConfigurationImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<{
    key: string;
    error: string;
  }>;
}

/**
 * Advanced configuration management system with validation, versioning, and backup
 */
export class ConfigurationManager {
  constructor(private sdk: any) {
    // TODO: SchillingerSDK type
    this.validateAdminPermissions();
  }

  /**
   * Get all configuration values with filtering and pagination
   */
  async getAllConfig(
    page: number = 1,
    limit: number = 50,
    filters: {
      category?: string;
      type?: string;
      sensitive?: boolean;
      tags?: string[];
      search?: string;
    } = {},
  ): Promise<{
    configurations: ConfigurationValue[];
    total: number;
    page: number;
    limit: number;
    categories: string[];
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/config", {
      method: "GET",
      body: JSON.stringify({ page, limit, filters }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Get configuration value by key
   */
  async getConfig(
    key: string,
    includeHistory: boolean = false,
  ): Promise<ConfigurationValue | null> {
    this.validateAdminPermissions();

    if (!key || typeof key !== "string") {
      throw new _ValidationError("key", key, "non-empty string");
    }

    try {
      const response = await this.sdk.makeRequest(
        `/admin/config/${encodeURIComponent(key)}`,
        {
          method: "GET",
          body: JSON.stringify({ includeHistory }),
        },
      );

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
   * Get multiple configuration values by keys
   */
  async getMultipleConfig(
    keys: string[],
  ): Promise<Record<string, ConfigurationValue | null>> {
    this.validateAdminPermissions();

    if (!Array.isArray(keys) || keys.length === 0) {
      throw new _ValidationError("keys", keys, "non-empty array of strings");
    }

    const response = await this.sdk.makeRequest("/admin/config/batch", {
      method: "POST",
      body: JSON.stringify({ keys }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Create new configuration value
   */
  async createConfig(
    key: string,
    value: any,
    options: {
      type?: "string" | "number" | "boolean" | "object" | "array";
      category?: string;
      description?: string;
      sensitive?: boolean;
      readOnly?: boolean;
      validation?: ConfigurationValidation;
      tags?: string[];
      metadata?: Record<string, any>;
    } = {},
  ): Promise<ConfigurationValue> {
    this.validateAdminPermissions();

    if (!key || typeof key !== "string") {
      throw new _ValidationError("key", key, "non-empty string");
    }

    // Validate the value
    const validationResult = this.validateConfigValue(
      value,
      options.validation,
    );
    if (!validationResult.valid) {
      throw new _ValidationError(
        "value",
        value,
        `valid value: ${validationResult.errors.join(", ")}`,
      );
    }

    const response = await this.sdk.makeRequest("/admin/config", {
      method: "POST",
      body: JSON.stringify({
        key,
        value,
        ...options,
      }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Update configuration value
   */
  async updateConfig(
    key: string,
    update: ConfigurationUpdate,
    changeReason?: string,
  ): Promise<ConfigurationValue> {
    this.validateAdminPermissions();

    if (!key || typeof key !== "string") {
      throw new _ValidationError("key", key, "non-empty string");
    }

    // Get current config to validate against its schema
    const currentConfig = await this.getConfig(key);
    if (!currentConfig) {
      throw new _ValidationError("key", key, "existing configuration key");
    }

    if (currentConfig.readOnly) {
      throw new _ValidationError(
        "key",
        key,
        "writable configuration key (this key is read-only)",
      );
    }

    // Validate the new value
    const validationResult = this.validateConfigValue(
      update.value,
      currentConfig.validation,
    );
    if (!validationResult.valid) {
      throw new _ValidationError(
        "value",
        update.value,
        `valid value: ${validationResult.errors.join(", ")}`,
      );
    }

    const response = await this.sdk.makeRequest(
      `/admin/config/${encodeURIComponent(key)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          ...update,
          changeReason,
        }),
      },
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Delete configuration value
   */
  async deleteConfig(key: string, reason?: string): Promise<void> {
    this.validateAdminPermissions();

    if (!key || typeof key !== "string") {
      throw new _ValidationError("key", key, "non-empty string");
    }

    await this.sdk.makeRequest(`/admin/config/${encodeURIComponent(key)}`, {
      method: "DELETE",
      body: JSON.stringify({ reason }),
    });
  }

  /**
   * Bulk update multiple configuration values
   */
  async bulkUpdateConfig(
    updates: Array<{
      key: string;
      value: any;
      description?: string;
    }>,
    changeReason?: string,
  ): Promise<{
    updated: string[];
    failed: Array<{
      key: string;
      error: string;
    }>;
  }> {
    this.validateAdminPermissions();

    if (!Array.isArray(updates) || updates.length === 0) {
      throw new _ValidationError(
        "updates",
        updates,
        "non-empty array of updates",
      );
    }

    const response = await this.sdk.makeRequest("/admin/config/bulk-update", {
      method: "POST",
      body: JSON.stringify({
        updates,
        changeReason,
      }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Get configuration history for a key
   */
  async getConfigHistory(
    key: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    history: ConfigurationHistory[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(
      `/admin/config/${encodeURIComponent(key)}/history`,
      {
        method: "GET",
        body: JSON.stringify({ page, limit }),
      },
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Revert configuration to previous version
   */
  async revertConfig(
    key: string,
    version: number,
    reason?: string,
  ): Promise<ConfigurationValue> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(
      `/admin/config/${encodeURIComponent(key)}/revert`,
      {
        method: "POST",
        body: JSON.stringify({ version, reason }),
      },
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Get configuration schema
   */
  async getConfigSchema(): Promise<ConfigurationSchema[]> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/config/schema", {
      method: "GET",
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Update configuration schema
   */
  async updateConfigSchema(schemas: ConfigurationSchema[]): Promise<void> {
    this.validateAdminPermissions();

    await this.sdk.makeRequest("/admin/config/schema", {
      method: "PUT",
      body: JSON.stringify({ schemas }),
    });
  }

  /**
   * Validate configuration value against schema
   */
  validateConfigValue(
    // key: string, // removed unused parameter
    value: any,
    validation?: ConfigurationValidation,
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!validation) {
      return { valid: true, errors: [] };
    }

    // Required validation
    if (
      validation.required &&
      (value === null || value === undefined || value === "")
    ) {
      errors.push("Value is required");
    }

    // Type-specific validations
    if (value !== null && value !== undefined) {
      // String validations
      if (typeof value === "string") {
        if (validation.min && value.length < validation.min) {
          errors.push(
            `String must be at least ${validation.min} characters long`,
          );
        }
        if (validation.max && value.length > validation.max) {
          errors.push(
            `String must be at most ${validation.max} characters long`,
          );
        }
        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          errors.push(`String must match pattern: ${validation.pattern}`);
        }
      }

      // Number validations
      if (typeof value === "number") {
        if (validation.min && value < validation.min) {
          errors.push(`Number must be at least ${validation.min}`);
        }
        if (validation.max && value > validation.max) {
          errors.push(`Number must be at most ${validation.max}`);
        }
      }

      // Enum validation
      if (validation.enum && !validation.enum.includes(value)) {
        errors.push(`Value must be one of: ${validation.enum.join(", ")}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create configuration backup
   */
  async createBackup(
    name: string,
    description?: string,
    categories?: string[],
  ): Promise<ConfigurationBackup> {
    this.validateAdminPermissions();

    if (!name || typeof name !== "string") {
      throw new _ValidationError("name", name, "non-empty string");
    }

    const response = await this.sdk.makeRequest("/admin/config/backup", {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        categories,
      }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * List configuration backups
   */
  async listBackups(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    backups: ConfigurationBackup[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/config/backups", {
      method: "GET",
      body: JSON.stringify({ page, limit }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Restore configuration from backup
   */
  async restoreBackup(
    backupId: string,
    options: {
      overwrite?: boolean;
      categories?: string[];
      dryRun?: boolean;
    } = {},
  ): Promise<ConfigurationImportResult> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(
      `/admin/config/backups/${backupId}/restore`,
      {
        method: "POST",
        body: JSON.stringify(options),
      },
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Delete configuration backup
   */
  async deleteBackup(backupId: string): Promise<void> {
    this.validateAdminPermissions();

    await this.sdk.makeRequest(`/admin/config/backups/${backupId}`, {
      method: "DELETE",
    });
  }

  /**
   * Export configuration to file
   */
  async exportConfig(
    format: "json" | "yaml" | "env" = "json",
    options: {
      categories?: string[];
      includeSensitive?: boolean;
      includeMetadata?: boolean;
    } = {},
  ): Promise<Blob> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/config/export", {
      method: "POST",
      body: JSON.stringify({
        format,
        ...options,
      }),
    });

    return response.blob();
  }

  /**
   * Import configuration from file
   */
  async importConfig(
    file: File,
    options: {
      overwrite?: boolean;
      validate?: boolean;
      dryRun?: boolean;
    } = {},
  ): Promise<ConfigurationImportResult> {
    this.validateAdminPermissions();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("options", JSON.stringify(options));

    const response = await this.sdk.makeRequest("/admin/config/import", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Get configuration statistics
   */
  async getConfigStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
    sensitive: number;
    readOnly: number;
    recentChanges: number;
    totalBackups: number;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/config/stats", {
      method: "GET",
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Search configurations
   */
  async searchConfig(
    query: string,
    options: {
      categories?: string[];
      types?: string[];
      includeValues?: boolean;
      caseSensitive?: boolean;
    } = {},
  ): Promise<ConfigurationValue[]> {
    this.validateAdminPermissions();

    if (!query || typeof query !== "string") {
      throw new _ValidationError("query", query, "non-empty string");
    }

    const response = await this.sdk.makeRequest("/admin/config/search", {
      method: "POST",
      body: JSON.stringify({
        query,
        ...options,
      }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Validate all configurations against schema
   */
  async validateAllConfig(): Promise<{
    valid: number;
    invalid: Array<{
      key: string;
      errors: string[];
    }>;
    total: number;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/config/validate", {
      method: "POST",
    });

    const data = await response.json();
    return data.data;
  }

  // Private helper methods

  private validateAdminPermissions(): void {
    if (!this.sdk.isAuthenticated()) {
      throw new AuthenticationError(
        "Authentication required for admin operations",
      );
    }

    if (
      !this.sdk.hasPermission("admin") &&
      !this.sdk.hasPermission("config_management")
    ) {
      throw new AuthenticationError(
        "Admin permissions required for configuration management operations",
      );
    }
  }
}
