/**
 * Comprehensive analytics and reporting capabilities with data visualization
 */

import { SchillingerSDK } from '@schillinger-sdk/core';
import {
  AuthenticationError,
  ValidationError as _ValidationError,
} from '@schillinger-sdk/shared';

export interface UsageMetrics {
  totalRequests: number;
  uniqueUsers: number;
  activeUsers: number;
  newUsers: number;
  popularEndpoints: Array<{
    endpoint: string;
    requests: number;
    uniqueUsers: number;
    averageResponseTime: number;
    errorRate: number;
  }>;
  errorRate: number;
  averageResponseTime: number;
  peakConcurrentUsers: number;
  totalDataProcessed: number;
  cacheHitRate: number;
}

export interface UserActivity {
  userId: string;
  totalActions: number;
  uniqueDays: number;
  averageSessionDuration: number;
  lastActive: Date;
  actions: Array<{
    action: string;
    timestamp: Date;
    duration?: number;
    success: boolean;
    metadata?: Record<string, any>;
  }>;
  patterns: {
    mostActiveHour: number;
    mostActiveDay: string;
    preferredFeatures: string[];
    sessionFrequency: number;
  };
}

export interface AnalyticsQuery {
  startDate: Date;
  endDate: Date;
  filters?: {
    userId?: string;
    endpoint?: string;
    userAgent?: string;
    country?: string;
    feature?: string;
    status?: 'success' | 'error';
  };
  groupBy?: 'hour' | 'day' | 'week' | 'month' | 'user' | 'endpoint' | 'country';
  metrics?: string[];
  limit?: number;
}

export interface FeatureUsage {
  feature: string;
  category: string;
  totalUsage: number;
  uniqueUsers: number;
  averageUsagePerUser: number;
  successRate: number;
  popularParameters: Array<{
    parameter: string;
    value: any;
    count: number;
  }>;
  trends: Array<{
    period: string;
    usage: number;
    users: number;
  }>;
}

export interface RevenueMetrics {
  totalRevenue: number;
  recurringRevenue: number;
  newRevenue: number;
  churnRate: number;
  averageRevenuePerUser: number;
  lifetimeValue: number;
  conversionRate: number;
  subscriptionTiers: Array<{
    tier: string;
    subscribers: number;
    revenue: number;
    churnRate: number;
  }>;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
  uptime: number;
  slowestEndpoints: Array<{
    endpoint: string;
    averageTime: number;
    p95Time: number;
    requests: number;
  }>;
  errorBreakdown: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

export interface GeographicData {
  country: string;
  countryCode: string;
  users: number;
  requests: number;
  revenue?: number;
  averageResponseTime: number;
  popularFeatures: string[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap';
  title: string;
  data: Array<{
    x: any;
    y: any;
    label?: string;
    color?: string;
    metadata?: Record<string, any>;
  }>;
  xAxis: {
    label: string;
    type: 'category' | 'time' | 'numeric';
  };
  yAxis: {
    label: string;
    type: 'numeric' | 'percentage';
    format?: string;
  };
  options?: Record<string, any>;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  description?: string;
  query: AnalyticsQuery;
  summary: {
    totalUsers: number;
    totalRequests: number;
    totalRevenue?: number;
    keyInsights: string[];
    recommendations: string[];
  };
  sections: Array<{
    title: string;
    type: 'metrics' | 'chart' | 'table' | 'text';
    data: any;
    insights?: string[];
  }>;
  charts: ChartData[];
  generatedAt: Date;
  generatedBy: string;
  format: 'json' | 'pdf' | 'csv' | 'xlsx';
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'alert';
  title: string;
  query: AnalyticsQuery;
  refreshInterval: number;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  layout: 'grid' | 'flex';
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Comprehensive analytics and reporting system with advanced data visualization
 */
export class AnalyticsManager {
  constructor(private sdk: SchillingerSDK) {
    this.validateAdminPermissions();
  }

  // Usage Analytics

  /**
   * Get comprehensive usage metrics for a time period
   */
  async getUsageMetrics(query: AnalyticsQuery): Promise<UsageMetrics> {
    this.validateAdminPermissions();
    this.validateQuery(query);

    const response = await this.sdk.makeRequest('/admin/analytics/usage', {
      method: 'POST',
      body: JSON.stringify(query),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Get detailed user activity data
   */
  async getUserActivity(
    userId: string,
    query: AnalyticsQuery
  ): Promise<UserActivity> {
    this.validateAdminPermissions();

    if (!userId || typeof userId !== 'string') {
      throw new _ValidationError('userId', userId, 'non-empty string');
    }

    this.validateQuery(query);

    const response = await this.sdk.makeRequest(
      `/admin/analytics/users/${userId}/activity`,
      {
        method: 'POST',
        body: JSON.stringify(query),
      }
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Get feature usage analytics
   */
  async getFeatureUsage(
    feature?: string,
    query: AnalyticsQuery = {
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    }
  ): Promise<FeatureUsage[]> {
    this.validateAdminPermissions();
    this.validateQuery(query);

    const response = await this.sdk.makeRequest('/admin/analytics/features', {
      method: 'POST',
      body: JSON.stringify({ feature, ...query }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Get revenue metrics and financial analytics
   */
  async getRevenueMetrics(query: AnalyticsQuery): Promise<RevenueMetrics> {
    this.validateAdminPermissions();
    this.validateQuery(query);

    const response = await this.sdk.makeRequest('/admin/analytics/revenue', {
      method: 'POST',
      body: JSON.stringify(query),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(
    query: AnalyticsQuery
  ): Promise<PerformanceMetrics> {
    this.validateAdminPermissions();
    this.validateQuery(query);

    const response = await this.sdk.makeRequest(
      '/admin/analytics/performance',
      {
        method: 'POST',
        body: JSON.stringify(query),
      }
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Get geographic usage data
   */
  async getGeographicData(query: AnalyticsQuery): Promise<GeographicData[]> {
    this.validateAdminPermissions();
    this.validateQuery(query);

    const response = await this.sdk.makeRequest('/admin/analytics/geographic', {
      method: 'POST',
      body: JSON.stringify(query),
    });

    const data = await response.json();
    return data.data;
  }

  // Custom Analytics

  /**
   * Execute custom analytics query
   */
  async executeCustomQuery(
    queryName: string,
    parameters: Record<string, any> = {}
  ): Promise<any> {
    this.validateAdminPermissions();

    if (!queryName || typeof queryName !== 'string') {
      throw new _ValidationError('queryName', queryName, 'non-empty string');
    }

    const response = await this.sdk.makeRequest('/admin/analytics/custom', {
      method: 'POST',
      body: JSON.stringify({ queryName, parameters }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Get available custom queries
   */
  async getCustomQueries(): Promise<
    Array<{
      name: string;
      description: string;
      parameters: Array<{
        name: string;
        type: string;
        required: boolean;
        default?: any;
      }>;
      category: string;
    }>
  > {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(
      '/admin/analytics/custom/queries',
      {
        method: 'GET',
      }
    );

    const data = await response.json();
    return data.data;
  }

  // Reporting

  /**
   * Generate comprehensive analytics report
   */
  async generateReport(
    name: string,
    query: AnalyticsQuery,
    options: {
      format?: 'json' | 'pdf' | 'csv' | 'xlsx';
      includeCharts?: boolean;
      includeRawData?: boolean;
      template?: string;
      recipients?: string[];
    } = {}
  ): Promise<AnalyticsReport> {
    this.validateAdminPermissions();
    this.validateQuery(query);

    if (!name || typeof name !== 'string') {
      throw new _ValidationError('name', name, 'non-empty string');
    }

    const response = await this.sdk.makeRequest('/admin/analytics/reports', {
      method: 'POST',
      body: JSON.stringify({
        name,
        query,
        ...options,
      }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * List generated reports
   */
  async listReports(
    page: number = 1,
    limit: number = 20,
    filters: {
      createdBy?: string;
      format?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    reports: Array<Omit<AnalyticsReport, 'sections' | 'charts'>>;
    total: number;
    page: number;
    limit: number;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest('/admin/analytics/reports', {
      method: 'GET',
      body: JSON.stringify({ page, limit, filters }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Get specific report
   */
  async getReport(reportId: string): Promise<AnalyticsReport> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(
      `/admin/analytics/reports/${reportId}`,
      {
        method: 'GET',
      }
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Delete report
   */
  async deleteReport(reportId: string): Promise<void> {
    this.validateAdminPermissions();

    await this.sdk.makeRequest(`/admin/analytics/reports/${reportId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Schedule recurring report
   */
  async scheduleReport(
    name: string,
    query: AnalyticsQuery,
    schedule: {
      frequency: 'daily' | 'weekly' | 'monthly';
      time: string; // HH:MM format
      timezone: string;
      recipients: string[];
      format: 'pdf' | 'csv' | 'xlsx';
    }
  ): Promise<{
    scheduleId: string;
    nextRun: Date;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(
      '/admin/analytics/reports/schedule',
      {
        method: 'POST',
        body: JSON.stringify({
          name,
          query,
          schedule,
        }),
      }
    );

    const data = await response.json();
    return data.data;
  }

  // Dashboards

  /**
   * Create analytics dashboard
   */
  async createDashboard(
    name: string,
    description: string,
    widgets: Omit<DashboardWidget, 'id'>[],
    options: {
      layout?: 'grid' | 'flex';
      isPublic?: boolean;
    } = {}
  ): Promise<Dashboard> {
    this.validateAdminPermissions();

    if (!name || typeof name !== 'string') {
      throw new _ValidationError('name', name, 'non-empty string');
    }

    const response = await this.sdk.makeRequest('/admin/analytics/dashboards', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        widgets,
        ...options,
      }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * List dashboards
   */
  async listDashboards(
    page: number = 1,
    limit: number = 20
  ): Promise<{
    dashboards: Dashboard[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest('/admin/analytics/dashboards', {
      method: 'GET',
      body: JSON.stringify({ page, limit }),
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Get dashboard data
   */
  async getDashboard(dashboardId: string): Promise<Dashboard> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(
      `/admin/analytics/dashboards/${dashboardId}`,
      {
        method: 'GET',
      }
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    dashboardId: string,
    updates: Partial<Omit<Dashboard, 'id' | 'createdBy' | 'createdAt'>>
  ): Promise<Dashboard> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest(
      `/admin/analytics/dashboards/${dashboardId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );

    const data = await response.json();
    return data.data;
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(dashboardId: string): Promise<void> {
    this.validateAdminPermissions();

    await this.sdk.makeRequest(`/admin/analytics/dashboards/${dashboardId}`, {
      method: 'DELETE',
    });
  }

  // Data Export

  /**
   * Export analytics data
   */
  async exportData(
    query: AnalyticsQuery,
    format: 'csv' | 'json' | 'xlsx' = 'csv',
    options: {
      includeHeaders?: boolean;
      compression?: 'gzip' | 'zip';
      maxRows?: number;
    } = {}
  ): Promise<Blob> {
    this.validateAdminPermissions();
    this.validateQuery(query);

    const response = await this.sdk.makeRequest('/admin/analytics/export', {
      method: 'POST',
      body: JSON.stringify({
        query,
        format,
        ...options,
      }),
    });

    return response.blob();
  }

  // Real-time Analytics

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<{
    activeUsers: number;
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    topEndpoints: Array<{
      endpoint: string;
      requests: number;
    }>;
    recentErrors: Array<{
      timestamp: Date;
      endpoint: string;
      error: string;
      userId?: string;
    }>;
  }> {
    this.validateAdminPermissions();

    const response = await this.sdk.makeRequest('/admin/analytics/realtime', {
      method: 'GET',
    });

    const data = await response.json();
    return data.data;
  }

  /**
   * Subscribe to real-time analytics updates
   */
  subscribeToRealTime(callback: (metrics: any) => void): () => void {
    this.validateAdminPermissions();

    // In a real implementation, this would use WebSocket or Server-Sent Events
    const interval = setInterval(async () => {
      try {
        const metrics = await this.getRealTimeMetrics();
        callback(metrics);
      } catch (error) {
        console.error('Real-time analytics error:', error);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }

  // Insights and Recommendations

  /**
   * Get AI-powered insights
   */
  async getInsights(
    query: AnalyticsQuery,
    type: 'usage' | 'performance' | 'revenue' | 'user-behavior' = 'usage'
  ): Promise<{
    insights: Array<{
      type: 'trend' | 'anomaly' | 'opportunity' | 'risk';
      title: string;
      description: string;
      confidence: number;
      impact: 'low' | 'medium' | 'high';
      recommendations: string[];
      data?: any;
    }>;
    summary: string;
    generatedAt: Date;
  }> {
    this.validateAdminPermissions();
    this.validateQuery(query);

    const response = await this.sdk.makeRequest('/admin/analytics/insights', {
      method: 'POST',
      body: JSON.stringify({ query, type }),
    });

    const data = await response.json();
    return data.data;
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
      !this.sdk.hasPermission('analytics')
    ) {
      throw new AuthenticationError(
        'Admin permissions required for analytics operations'
      );
    }
  }

  private validateQuery(query: AnalyticsQuery): void {
    if (!query.startDate || !query.endDate) {
      throw new _ValidationError(
        'query',
        query,
        'valid date range with startDate and endDate'
      );
    }

    if (query.startDate >= query.endDate) {
      throw new _ValidationError(
        'query',
        query,
        'startDate must be before endDate'
      );
    }

    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year
    if (query.endDate.getTime() - query.startDate.getTime() > maxRange) {
      throw new _ValidationError(
        'query',
        query,
        'date range must be within 1 year'
      );
    }
  }
}
