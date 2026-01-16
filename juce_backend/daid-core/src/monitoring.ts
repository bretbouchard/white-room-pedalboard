/**
 * DAID monitoring and recovery system
 */

import { DAIDValidator } from './validation';
import { ProvenanceChainBuilder } from './provenance-chain';
import { DAIDGenerator } from './generator';
import { ProvenanceRecord } from './types';

// Define proper type for backup data to replace 'any'
export interface DAIDBackupData {
  daid?: string;
  record?: ProvenanceRecord;
  [key: string]: unknown;
}

export interface DAIDHealthCheck {
  daid: string;
  status: 'healthy' | 'warning' | 'error' | 'missing';
  lastChecked: string;
  issues: string[];
  suggestions: string[];
  metadata: {
    checkDuration: number;
    integrityScore: number;
    provenanceComplete: boolean;
  };
}

export interface DAIDHealthReport {
  totalDAIDs: number;
  healthyCount: number;
  warningCount: number;
  errorCount: number;
  missingCount: number;
  overallHealth: number; // 0-100 percentage
  checks: DAIDHealthCheck[];
  summary: {
    commonIssues: Record<string, number>;
    criticalIssues: string[];
    recommendations: string[];
  };
  generatedAt: string;
}

export interface DAIDSyncStatus {
  daid: string;
  localExists: boolean;
  remoteExists: boolean;
  inSync: boolean;
  lastSynced?: string;
  syncErrors: string[];
  conflictResolution?: 'local' | 'remote' | 'merge' | 'manual';
}

export interface DAIDRecoveryOptions {
  strategy: 'regenerate' | 'repair' | 'restore' | 'merge';
  sourceDAID?: string;
  backupData?: DAIDBackupData;
  preserveMetadata?: boolean;
  validateAfterRecovery?: boolean;
}

export interface DAIDRecoveryResult {
  success: boolean;
  recoveredDAID?: string;
  originalDAID: string;
  strategy: string;
  errors: string[];
  warnings: string[];
  metadata: {
    recoveryTime: number;
    dataPreserved: boolean;
    validationPassed: boolean;
  };
}

/**
 * DAID health monitoring system
 */
export class DAIDHealthMonitor {
  private chainBuilder: ProvenanceChainBuilder;
  private healthCache: Map<string, DAIDHealthCheck> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private config: {
    checkInterval: number;
    cacheTimeout: number;
    enableAutoRecovery: boolean;
    healthThreshold: number;
  };

  constructor(chainBuilder: ProvenanceChainBuilder, config?: Partial<DAIDHealthMonitor['config']>) {
    this.chainBuilder = chainBuilder;
    this.config = {
      checkInterval: 60000, // 1 minute
      cacheTimeout: 300000, // 5 minutes
      enableAutoRecovery: false,
      healthThreshold: 80,
      ...config,
    };
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);

    // TODO: Implement proper logging infrastructure
// console.log('DAID health monitoring started');
  }

  /**
   * Stop continuous health monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      // TODO: Implement proper logging infrastructure
// console.log('DAID health monitoring stopped');
    }
  }

  /**
   * Perform health check on a specific DAID
   */
  async checkDAIDHealth(daid: string): Promise<DAIDHealthCheck> {
    const startTime = Date.now();

    // Check cache first
    const cached = this.healthCache.get(daid);
    if (cached && Date.now() - new Date(cached.lastChecked).getTime() < this.config.cacheTimeout) {
      return cached;
    }

    const issues: string[] = [];
    const suggestions: string[] = [];
    let status: DAIDHealthCheck['status'] = 'healthy';
    let integrityScore = 100;
    let provenanceComplete = true;

    try {
      // Basic DAID validation
      const integrityCheck = DAIDValidator.validateEnhanced(daid);
      if (!integrityCheck.isValid) {
        status = 'error';
        issues.push(...integrityCheck.errors);
        integrityScore -= 50;
      } else if (integrityCheck.warnings.length > 0) {
        status = 'warning';
        issues.push(...integrityCheck.warnings);
        integrityScore -= 20;
      }

      // Check provenance completeness
      const chain = this.chainBuilder.getChain(daid);
      if (!chain) {
        issues.push('DAID not found in provenance tracking');
        provenanceComplete = false;
        integrityScore -= 30;
        if (status === 'healthy') status = 'warning';
      } else {
        // Check for orphaned references
        const node = chain.nodes.get(daid);
        if (node) {
          for (const parentDAID of node.parents) {
            if (!chain.nodes.has(parentDAID)) {
              issues.push(`Missing parent DAID: ${parentDAID}`);
              provenanceComplete = false;
              integrityScore -= 10;
              if (status === 'healthy') status = 'warning';
            }
          }
        }
      }

      // Generate suggestions based on issues
      if (issues.length > 0) {
        suggestions.push(...this.generateSuggestions(issues));
      }
    } catch (error) {
      status = 'error';
      issues.push(`Health check failed: ${error}`);
      integrityScore = 0;
    }

    const healthCheck: DAIDHealthCheck = {
      daid,
      status,
      lastChecked: new Date().toISOString(),
      issues,
      suggestions,
      metadata: {
        checkDuration: Date.now() - startTime,
        integrityScore: Math.max(0, integrityScore),
        provenanceComplete,
      },
    };

    // Cache the result
    this.healthCache.set(daid, healthCheck);

    return healthCheck;
  }

  /**
   * Perform health check on multiple DAIDs
   */
  async checkMultipleDAIDs(daids: string[]): Promise<DAIDHealthReport> {
    const _startTime = Date.now();
    const checks: DAIDHealthCheck[] = [];

    let healthyCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let missingCount = 0;

    const commonIssues: Record<string, number> = {};
    const criticalIssues: string[] = [];

    // Check each DAID
    for (const daid of daids) {
      try {
        const check = await this.checkDAIDHealth(daid);
        checks.push(check);

        // Count statuses
        switch (check.status) {
          case 'healthy':
            healthyCount++;
            break;
          case 'warning':
            warningCount++;
            break;
          case 'error':
            errorCount++;
            break;
          case 'missing':
            missingCount++;
            break;
        }

        // Collect issues
        for (const issue of check.issues) {
          commonIssues[issue] = (commonIssues[issue] || 0) + 1;

          // Identify critical issues
          if (check.status === 'error' && !criticalIssues.includes(issue)) {
            criticalIssues.push(issue);
          }
        }
      } catch (error) {
        // Handle individual check failures
        checks.push({
          daid,
          status: 'error',
          lastChecked: new Date().toISOString(),
          issues: [`Health check failed: ${error}`],
          suggestions: ['Retry health check', 'Verify DAID format'],
          metadata: {
            checkDuration: 0,
            integrityScore: 0,
            provenanceComplete: false,
          },
        });
        errorCount++;
      }
    }

    // Calculate overall health
    const totalDAIDs = daids.length;
    const overallHealth =
      totalDAIDs > 0 ? Math.round(((healthyCount + warningCount * 0.5) / totalDAIDs) * 100) : 100;

    // Generate recommendations
    const recommendations = this.generateRecommendations(checks, overallHealth);

    return {
      totalDAIDs,
      healthyCount,
      warningCount,
      errorCount,
      missingCount,
      overallHealth,
      checks,
      summary: {
        commonIssues: Object.fromEntries(
          Object.entries(commonIssues)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
        ),
        criticalIssues,
        recommendations,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Perform automatic health check on all tracked DAIDs
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const _stats = this.chainBuilder.getStatistics();
      // TODO: Implement proper logging infrastructure
// console.log(`Performing health check on ${_stats.totalNodes} DAIDs...`);

      // Get all DAIDs from the chain builder
      const allDAIDs: string[] = [];
      // This is a simplified approach - in a real implementation,
      // you'd have a method to get all DAIDs from the chain builder

      if (allDAIDs.length > 0) {
        const report = await this.checkMultipleDAIDs(allDAIDs);

        if (report.overallHealth < this.config.healthThreshold) {
          // TODO: Implement proper logging infrastructure
// console.warn(`DAID health below threshold: ${report.overallHealth}%`);

          if (this.config.enableAutoRecovery) {
            await this.performAutoRecovery(report);
          }
        }
      }
    } catch (error) {
      // TODO: Implement proper logging infrastructure
// console.error('Health check failed:', error);
    }
  }

  /**
   * Perform automatic recovery for unhealthy DAIDs
   */
  private async performAutoRecovery(report: DAIDHealthReport): Promise<void> {
    const recovery = new DAIDRecoveryManager(this.chainBuilder);

    for (const check of report.checks) {
      if (check.status === 'error' || check.status === 'missing') {
        try {
          const result = await recovery.recoverDAID(check.daid, {
            strategy: 'repair',
            validateAfterRecovery: true,
          });

          if (result.success) {
            // TODO: Implement proper logging infrastructure
// console.log(`Auto-recovered DAID: ${check.daid}`);
          } else {
            // TODO: Implement proper logging infrastructure
// console.warn(`Auto-recovery failed for DAID: ${check.daid}`, result.errors);
          }
        } catch (error) {
          // TODO: Implement proper logging infrastructure
// console.error(`Auto-recovery error for DAID: ${check.daid}`, error);
        }
      }
    }
  }

  private generateSuggestions(issues: string[]): string[] {
    const suggestions: string[] = [];

    for (const issue of issues) {
      if (issue.includes('Invalid DAID format')) {
        suggestions.push('Regenerate DAID using DAIDGenerator.generate()');
      } else if (issue.includes('Missing parent')) {
        suggestions.push('Ensure all parent DAIDs are properly recorded');
      } else if (issue.includes('not found in provenance')) {
        suggestions.push('Add DAID to provenance tracking system');
      } else if (issue.includes('timestamp')) {
        suggestions.push('Verify timestamp format and accuracy');
      } else if (issue.includes('hash')) {
        suggestions.push('Recalculate provenance hash');
      }
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }

  private generateRecommendations(checks: DAIDHealthCheck[], overallHealth: number): string[] {
    const recommendations: string[] = [];

    if (overallHealth < 50) {
      recommendations.push('Critical: Immediate attention required for DAID integrity');
    } else if (overallHealth < 80) {
      recommendations.push('Warning: Review and fix DAID issues to improve system health');
    }

    const errorCount = checks.filter(c => c.status === 'error').length;
    if (errorCount > 0) {
      recommendations.push(`Fix ${errorCount} DAIDs with critical errors`);
    }

    const missingCount = checks.filter(c => c.status === 'missing').length;
    if (missingCount > 0) {
      recommendations.push(`Restore ${missingCount} missing DAIDs from backup`);
    }

    return recommendations;
  }

  /**
   * Clear health cache
   */
  clearCache(): void {
    this.healthCache.clear();
  }

  /**
   * Get health statistics
   */
  getHealthStats(): {
    cachedChecks: number;
    monitoringActive: boolean;
    lastCheckTime?: string;
  } {
    const lastCheck = Array.from(this.healthCache.values()).sort(
      (a, b) => new Date(b.lastChecked).getTime() - new Date(a.lastChecked).getTime()
    )[0];

    return {
      cachedChecks: this.healthCache.size,
      monitoringActive: !!this.monitoringInterval,
      lastCheckTime: lastCheck?.lastChecked,
    };
  }
}

/**
 * DAID recovery manager
 */
export class DAIDRecoveryManager {
  private chainBuilder: ProvenanceChainBuilder;

  constructor(chainBuilder: ProvenanceChainBuilder) {
    this.chainBuilder = chainBuilder;
  }

  /**
   * Recover a corrupted or missing DAID
   */
  async recoverDAID(daid: string, options: DAIDRecoveryOptions): Promise<DAIDRecoveryResult> {
    const startTime = Date.now();
    const result: DAIDRecoveryResult = {
      success: false,
      originalDAID: daid,
      strategy: options.strategy,
      errors: [],
      warnings: [],
      metadata: {
        recoveryTime: 0,
        dataPreserved: false,
        validationPassed: false,
      },
    };

    try {
      switch (options.strategy) {
        case 'regenerate':
          result.recoveredDAID = await this.regenerateDAID(daid, options);
          break;
        case 'repair':
          result.recoveredDAID = await this.repairDAID(daid, options);
          break;
        case 'restore':
          result.recoveredDAID = await this.restoreDAID(daid, options);
          break;
        case 'merge':
          result.recoveredDAID = await this.mergeDAID(daid, options);
          break;
        default:
          throw new Error(`Unknown recovery strategy: ${options.strategy}`);
      }

      // Validate recovered DAID
      if (result.recoveredDAID && options.validateAfterRecovery) {
        const validation = DAIDValidator.validateEnhanced(result.recoveredDAID);
        result.metadata.validationPassed = validation.isValid;

        if (!validation.isValid) {
          result.warnings.push('Recovered DAID failed validation');
          result.warnings.push(...validation.errors);
        }
      }

      result.success = !!result.recoveredDAID;
      result.metadata.dataPreserved = options.preserveMetadata !== false;
    } catch (error) {
      result.errors.push(`Recovery failed: ${error}`);
    }

    result.metadata.recoveryTime = Date.now() - startTime;
    return result;
  }

  /**
   * Regenerate a DAID from scratch
   */
  private async regenerateDAID(daid: string, _options: DAIDRecoveryOptions): Promise<string> {
    // Parse original DAID to extract components
    const components = DAIDGenerator.parse(daid);
    if (!components) {
      throw new Error('Cannot parse original DAID for regeneration');
    }

    // Generate new DAID with same entity information
    const newDAID = DAIDGenerator.generate({
      agentId: components.agentId,
      entityType: components.entityType,
      entityId: components.entityId,
      operation: 'recover',
      metadata: {
        recoveryStrategy: 'regenerate',
        originalDAID: daid,
        recoveredAt: new Date().toISOString(),
      },
    });

    return newDAID;
  }

  /**
   * Repair a corrupted DAID
   */
  private async repairDAID(daid: string, options: DAIDRecoveryOptions): Promise<string> {
    // Try to fix common DAID format issues
    let repairedDAID = daid;

    // Fix common format issues
    if (!daid.startsWith('daid:')) {
      repairedDAID = 'daid:' + daid;
    }

    // Validate the repaired DAID
    const validation = DAIDValidator.validateEnhanced(repairedDAID);
    if (validation.isValid) {
      return repairedDAID;
    }

    // If repair fails, fall back to regeneration
    return this.regenerateDAID(daid, options);
  }

  /**
   * Restore a DAID from backup data
   */
  private async restoreDAID(daid: string, options: DAIDRecoveryOptions): Promise<string> {
    if (!options.backupData) {
      throw new Error('Backup data required for restore strategy');
    }

    // Restore from backup data
    const backupDAID = options.backupData.daid;
    if (!backupDAID) {
      throw new Error('No DAID found in backup data');
    }

    // Validate restored DAID
    const validation = DAIDValidator.validateEnhanced(backupDAID);
    if (!validation.isValid) {
      throw new Error('Backup DAID is invalid');
    }

    // Restore provenance record if available
    if (options.backupData.record) {
      this.chainBuilder.addRecord(backupDAID, options.backupData.record);
    }

    return backupDAID;
  }

  /**
   * Merge conflicting DAIDs
   */
  private async mergeDAID(daid: string, options: DAIDRecoveryOptions): Promise<string> {
    if (!options.sourceDAID) {
      throw new Error('Source DAID required for merge strategy');
    }

    // Get both DAIDs' provenance information
    const originalChain = this.chainBuilder.getChain(daid);
    const sourceChain = this.chainBuilder.getChain(options.sourceDAID);

    if (!originalChain && !sourceChain) {
      throw new Error('Neither DAID found in provenance tracking');
    }

    // Use the DAID with more complete provenance information
    if (originalChain && sourceChain) {
      return originalChain.nodes.size >= sourceChain.nodes.size ? daid : options.sourceDAID;
    }

    return originalChain ? daid : options.sourceDAID;
  }
}

/**
 * DAID synchronization manager
 */
export class DAIDSynchronizationManager {
  private chainBuilder: ProvenanceChainBuilder;
  private remoteEndpoint?: string;

  constructor(chainBuilder: ProvenanceChainBuilder, remoteEndpoint?: string) {
    this.chainBuilder = chainBuilder;
    this.remoteEndpoint = remoteEndpoint;
  }

  /**
   * Check synchronization status of a DAID
   */
  async checkSyncStatus(daid: string): Promise<DAIDSyncStatus> {
    const localExists = !!this.chainBuilder.getChain(daid);
    let remoteExists = false;
    let inSync = false;
    const syncErrors: string[] = [];

    if (this.remoteEndpoint) {
      try {
        // Check if DAID exists remotely
        const response = await fetch(`${this.remoteEndpoint}/api/v1/daid/${daid}/exists`);
        remoteExists = response.ok && (await response.json()).exists;

        // Check if local and remote versions match
        if (localExists && remoteExists) {
          const syncResponse = await fetch(
            `${this.remoteEndpoint}/api/v1/daid/${daid}/sync-status`
          );
          if (syncResponse.ok) {
            const syncData = await syncResponse.json();
            inSync = syncData.inSync;
          }
        }
      } catch (error) {
        syncErrors.push(`Failed to check remote status: ${error}`);
      }
    }

    return {
      daid,
      localExists,
      remoteExists,
      inSync: localExists && remoteExists && inSync,
      syncErrors,
    };
  }

  /**
   * Synchronize a DAID between local and remote
   */
  async synchronizeDAID(
    daid: string,
    direction: 'push' | 'pull' | 'bidirectional' = 'bidirectional'
  ): Promise<boolean> {
    if (!this.remoteEndpoint) {
      throw new Error('Remote endpoint not configured');
    }

    try {
      const syncStatus = await this.checkSyncStatus(daid);

      if (direction === 'push' || direction === 'bidirectional') {
        if (syncStatus.localExists && !syncStatus.remoteExists) {
          await this.pushDAIDToRemote(daid);
        }
      }

      if (direction === 'pull' || direction === 'bidirectional') {
        if (!syncStatus.localExists && syncStatus.remoteExists) {
          await this.pullDAIDFromRemote(daid);
        }
      }

      return true;
    } catch (error) {
      // TODO: Implement proper logging infrastructure
// console.error(`DAID synchronization failed: ${error}`);
      return false;
    }
  }

  private async pushDAIDToRemote(daid: string): Promise<void> {
    const chain = this.chainBuilder.getChain(daid);
    if (!chain) {
      throw new Error('DAID not found locally');
    }

    const exportData = this.chainBuilder.exportChain(daid);

    const response = await fetch(`${this.remoteEndpoint}/api/v1/daid/${daid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exportData),
    });

    if (!response.ok) {
      throw new Error(`Failed to push DAID: ${response.statusText}`);
    }
  }

  private async pullDAIDFromRemote(daid: string): Promise<void> {
    const response = await fetch(`${this.remoteEndpoint}/api/v1/daid/${daid}`);

    if (!response.ok) {
      throw new Error(`Failed to pull DAID: ${response.statusText}`);
    }

    const chainData = await response.json();
    this.chainBuilder.importChain(chainData);
  }
}
