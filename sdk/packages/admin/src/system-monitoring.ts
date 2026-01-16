/**
 * Comprehensive system monitoring and health checks with performance metrics
 */

// TODO: Implement SchillingerSDK class
// import { SchillingerSDK } from '@schillinger-sdk/core';
import {
  AuthenticationError,
  ValidationError as _ValidationError,
} from "@schillinger-sdk/shared";

export interface SystemHealth {
  status: "healthy" | "degraded" | "unhealthy";
  services: Record<string, ServiceHealth>;
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  alerts: Alert[];
}

export interface ServiceHealth {
  status: "up" | "down" | "degraded";
  responseTime: number;
  lastCheck: Date;
  uptime: number;
  errors?: string[];
  metadata?: Record<string, any>;
  dependencies?: string[];
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    loadAverage: number[];
  };
  memory: {
    usage: number;
    total: number;
    free: number;
    cached: number;
  };
  disk: {
    usage: number;
    total: number;
    free: number;
    iops: number;
  };
  network: {
    inbound: number;
    outbound: number;
    connections: number;
    errors: number;
  };
  requests: {
    total: number;
    errors: number;
    averageResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
  };
  database: {
    connections: number;
    queries: number;
    slowQueries: number;
    averageQueryTime: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictions: number;
    memory: number;
  };
}

export interface Alert {
  id: string;
  type: "error" | "warning" | "info";
  service: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  severity: "low" | "medium" | "high" | "critical";
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface LogEntry {
  id: string;
  level: "debug" | "info" | "warn" | "error" | "fatal";
  message: string;
  service: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  stackTrace?: string;
}

export interface MonitoringConfig {
  healthCheckInterval: number;
  metricsInterval: number;
  alertThresholds: Record<string, number>;
  enabledServices: string[];
  logLevel: string;
}

/**
 * Comprehensive system monitoring with performance metrics and health checks
 */
export class SystemMonitor {
  private config: MonitoringConfig;
  // Removed unused alerts and metricsHistory properties

  constructor(
    private sdk: any, // TODO: SchillingerSDK type
    config?: Partial<MonitoringConfig>,
  ) {
    this.validateAdminPermissions();

    this.config = {
      healthCheckInterval: 30000, // 30 seconds
      metricsInterval: 60000, // 1 minute
      alertThresholds: {
        cpu: 80,
        memory: 85,
        disk: 90,
        errorRate: 5,
        responseTime: 2000,
      },
      enabledServices: ["api", "database", "cache", "queue", "storage"],
      logLevel: "info",
      ...config,
    };
  }

  /**
   * Get comprehensive system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/system/health", {
      method: "GET",
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Get detailed system performance metrics
   */
  async getSystemMetrics(
    timeRange: "1h" | "6h" | "24h" | "7d" | "30d" = "1h",
  ): Promise<SystemMetrics> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/system/metrics", {
      method: "GET",
      body: JSON.stringify({ timeRange }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Get historical metrics for a specific metric
   */
  async getMetricHistory(
    metricName: string,
    timeRange: "1h" | "6h" | "24h" | "7d" | "30d" = "24h",
    granularity: "1m" | "5m" | "15m" | "1h" | "1d" = "5m",
  ): Promise<PerformanceMetric[]> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(
      "/admin/system/metrics/history",
      {
        method: "GET",
        body: JSON.stringify({ metricName, timeRange, granularity }),
      },
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Check health of specific service
   */
  async checkServiceHealth(serviceName: string): Promise<ServiceHealth> {
    this.validateAdminPermissions();

    if (!serviceName || typeof serviceName !== "string") {
      throw new _ValidationError(
        "serviceName",
        serviceName,
        "non-empty string",
      );
    }

    const response = await this.sdk.makeRequest(
      `/admin/system/services/${serviceName}/health`,
      {
        method: "GET",
      },
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Get all active alerts
   */
  async getAlerts(
    severity?: "low" | "medium" | "high" | "critical",
    resolved?: boolean,
  ): Promise<Alert[]> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/system/alerts", {
      method: "GET",
      body: JSON.stringify({ severity, resolved }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Create custom alert
   */
  async createAlert(
    type: "error" | "warning" | "info",
    service: string,
    message: string,
    severity: "low" | "medium" | "high" | "critical" = "medium",
  ): Promise<Alert> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/system/alerts", {
      method: "POST",
      body: JSON.stringify({ type, service, message, severity }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Resolve alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    this.validateAdminPermissions();

    await this.sdk.makeRequest(`/admin/system/alerts/${alertId}/resolve`, {
      method: "POST",
    });
  }

  /**
   * Get system logs with filtering
   */
  async getLogs(
    page: number = 1,
    limit: number = 100,
    filters: {
      level?: "debug" | "info" | "warn" | "error" | "fatal";
      service?: string;
      startTime?: Date;
      endTime?: Date;
      search?: string;
    } = {},
  ): Promise<{
    logs: LogEntry[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/system/logs", {
      method: "GET",
      body: JSON.stringify({ page, limit, filters }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Export logs to file
   */
  async exportLogs(
    format: "json" | "csv" | "txt" = "json",
    filters: {
      level?: string;
      service?: string;
      startTime?: Date;
      endTime?: Date;
    } = {},
  ): Promise<Blob> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/system/logs/export", {
      method: "POST",
      body: JSON.stringify({ format, filters }),
    });

    return response.blob();
  }

  /**
   * Get system configuration
   */
  async getSystemConfig(): Promise<{
    environment: string;
    version: string;
    buildDate: string;
    features: string[];
    limits: Record<string, number>;
    settings: Record<string, any>;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/system/config", {
      method: "GET",
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Update system configuration
   */
  async updateSystemConfig(updates: Record<string, any>): Promise<void> {
    this.validateAdminPermissions();

    await this.sdk.makeRequest("/admin/system/config", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  /**
   * Restart system service
   */
  async restartService(serviceName: string): Promise<void> {
    this.validateAdminPermissions();

    if (!serviceName || typeof serviceName !== "string") {
      throw new _ValidationError(
        "serviceName",
        serviceName,
        "non-empty string",
      );
    }

    await this.sdk.makeRequest(
      `/admin/system/services/${serviceName}/restart`,
      {
        method: "POST",
      },
    );
  }

  /**
   * Scale service instances
   */
  async scaleService(serviceName: string, instances: number): Promise<void> {
    this.validateAdminPermissions();

    if (!serviceName || typeof serviceName !== "string") {
      throw new _ValidationError(
        "serviceName",
        serviceName,
        "non-empty string",
      );
    }

    if (!Number.isInteger(instances) || instances < 0) {
      throw new _ValidationError(
        "instances",
        instances,
        "non-negative integer",
      );
    }

    await this.sdk.makeRequest(`/admin/system/services/${serviceName}/scale`, {
      method: "POST",
      body: JSON.stringify({ instances }),
    });
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    connections: {
      active: number;
      idle: number;
      total: number;
      max: number;
    };
    queries: {
      total: number;
      slow: number;
      failed: number;
      averageTime: number;
    };
    storage: {
      size: number;
      tables: number;
      indexes: number;
    };
    performance: {
      cacheHitRatio: number;
      lockWaits: number;
      deadlocks: number;
    };
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(
      "/admin/system/database/stats",
      {
        method: "GET",
      },
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    memory: {
      used: number;
      total: number;
      fragmentation: number;
    };
    operations: {
      hits: number;
      misses: number;
      sets: number;
      deletes: number;
    };
    performance: {
      hitRate: number;
      averageResponseTime: number;
      evictions: number;
    };
    keys: {
      total: number;
      expired: number;
      expiring: number;
    };
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/system/cache/stats", {
      method: "GET",
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Clear cache
   */
  async clearCache(pattern?: string): Promise<{
    cleared: number;
    remaining: number;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/system/cache/clear", {
      method: "POST",
      body: JSON.stringify({ pattern }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Run system maintenance tasks
   */
  async runMaintenance(
    tasks: Array<"cleanup" | "optimize" | "backup" | "index" | "vacuum">,
  ): Promise<{
    results: Array<{
      task: string;
      success: boolean;
      duration: number;
      message?: string;
    }>;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/system/maintenance", {
      method: "POST",
      body: JSON.stringify({ tasks }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Get system backup status
   */
  async getBackupStatus(): Promise<{
    lastBackup: Date;
    nextBackup: Date;
    backupSize: number;
    status: "idle" | "running" | "failed";
    retention: number;
    location: string;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest("/admin/system/backup/status", {
      method: "GET",
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Trigger system backup
   */
  async triggerBackup(type: "full" | "incremental" = "incremental"): Promise<{
    backupId: string;
    estimatedDuration: number;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(
      "/admin/system/backup/trigger",
      {
        method: "POST",
        body: JSON.stringify({ type }),
      },
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Get monitoring configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(updates: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring(callback: (metrics: SystemMetrics) => void): () => void {
    this.validateAdminPermissions();

    const interval = setInterval(async () => {
      try {
        const metrics = await this.getSystemMetrics();
        callback(metrics);

        // Check for alert conditions
        this.checkAlertConditions(metrics);
      } catch (error) {
        console.error("Monitoring error:", error);
      }
    }, this.config.metricsInterval);

    return () => clearInterval(interval);
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
      !this.sdk.hasPermission("system_monitoring")
    ) {
      throw new AuthenticationError(
        "Admin permissions required for system monitoring operations",
      );
    }
  }

  private checkAlertConditions(metrics: SystemMetrics): void {
    const { alertThresholds } = this.config;

    // CPU usage alert
    if (alertThresholds.cpu && metrics.cpu.usage > alertThresholds.cpu) {
      this.createAlert(
        "warning",
        "system",
        `High CPU usage: ${metrics.cpu.usage}%`,
        "high",
      );
    }

    // Memory usage alert
    if (
      alertThresholds.memory &&
      metrics.memory.usage > alertThresholds.memory
    ) {
      this.createAlert(
        "warning",
        "system",
        `High memory usage: ${metrics.memory.usage}%`,
        "high",
      );
    }

    // Disk usage alert
    if (alertThresholds.disk && metrics.disk.usage > alertThresholds.disk) {
      this.createAlert(
        "error",
        "system",
        `High disk usage: ${metrics.disk.usage}%`,
        "critical",
      );
    }

    // Error rate alert
    if (
      alertThresholds.errorRate &&
      metrics.requests.errorRate > alertThresholds.errorRate
    ) {
      this.createAlert(
        "error",
        "api",
        `High error rate: ${metrics.requests.errorRate}%`,
        "high",
      );
    }

    // Response time alert
    if (
      alertThresholds.responseTime &&
      metrics.requests.averageResponseTime > alertThresholds.responseTime
    ) {
      this.createAlert(
        "warning",
        "api",
        `Slow response time: ${metrics.requests.averageResponseTime}ms`,
        "medium",
      );
    }
  }
}
