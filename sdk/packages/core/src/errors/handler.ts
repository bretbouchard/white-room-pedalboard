/**
 * White Room SDK - Error Handler
 *
 * Central error handling and management system.
 */

import { WhiteRoomError, ErrorSeverity, ErrorCategory } from "./errors";
import { ErrorRecoveryManager, defaultRecoveryManager } from "./recovery";

/**
 * Error log entry
 */
export interface ErrorLogEntry {
  error: WhiteRoomError;
  recovered: boolean;
  action: string;
  timestamp: Date;
}

/**
 * Error statistics
 */
export interface ErrorStatistics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recoveredErrors: number;
  unrecoveredErrors: number;
  recoveryRate: number;
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableRecovery: boolean;
  enableStatistics: boolean;
  maxLogSize: number;
}

/**
 * Error handler - central error management
 */
export class ErrorHandler {
  private config: ErrorHandlerConfig;
  private recoveryManager: ErrorRecoveryManager;
  private errorLog: ErrorLogEntry[];
  private errorCounts: Map<string, number>;

  constructor(config?: Partial<ErrorHandlerConfig>) {
    this.config = {
      enableLogging: true,
      enableRecovery: true,
      enableStatistics: true,
      maxLogSize: 1000,
      ...config,
    };

    this.recoveryManager = defaultRecoveryManager;
    this.errorLog = [];
    this.errorCounts = new Map();
  }

  /**
   * Handle an error
   */
  async handle(error: Error | WhiteRoomError): Promise<void> {
    const whiteRoomError =
      error instanceof WhiteRoomError
        ? error
        : new WhiteRoomError("UNKNOWN", error.message, ErrorSeverity.ERROR, ErrorCategory.UNKNOWN);

    // Log error
    if (this.config.enableLogging) {
      this.logError(whiteRoomError);
    }

    // Update statistics
    if (this.config.enableStatistics) {
      this.updateStatistics(whiteRoomError);
    }

    // Attempt recovery
    if (this.config.enableRecovery) {
      const recoveryResult = await this.recoveryManager.recover(whiteRoomError);

      this.logRecovery(whiteRoomError, recoveryResult);

      // If not recovered, throw for caller to handle
      if (!recoveryResult.recovered && whiteRoomError.severity !== ErrorSeverity.INFO) {
        throw whiteRoomError;
      }
    }
  }

  /**
   * Execute operation with error handling
   */
  async execute<T>(
    operation: () => T,
    options?: {
      context?: Record<string, unknown>;
      onError?: (error: WhiteRoomError) => void;
      rethrow?: boolean;
    }
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const whiteRoomError =
        error instanceof WhiteRoomError
          ? error
          : new WhiteRoomError(
              "UNKNOWN",
              String(error),
              ErrorSeverity.ERROR,
              ErrorCategory.UNKNOWN,
              options?.context
            );

      if (options?.onError) {
        options.onError(whiteRoomError);
      }

      await this.handle(whiteRoomError);

      // If we get here and shouldn't rethrow, return undefined
      if (options?.rethrow === false) {
        return undefined as T;
      }

      throw whiteRoomError;
    }
  }

  /**
   * Log an error
   */
  private logError(error: WhiteRoomError): void {
    // Increment count
    const key = `${error.category}:${error.code}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);

    // Add to log (with size limit)
    this.errorLog.push({
      error,
      recovered: false,
      action: "logged",
      timestamp: new Date(),
    });

    if (this.errorLog.length > this.config.maxLogSize) {
      this.errorLog.shift(); // Remove oldest entry
    }
  }

  /**
   * Log recovery attempt
   */
  private logRecovery(error: WhiteRoomError, result: { recovered: boolean; action: string }): void {
    const lastEntry = this.errorLog[this.errorLog.length - 1];

    if (lastEntry && lastEntry.error === error) {
      lastEntry.recovered = result.recovered;
      lastEntry.action = result.action;
    }
  }

  /**
   * Update error statistics
   */
  private updateStatistics(_error: WhiteRoomError): void {
    // Statistics are calculated on demand from error log
  }

  /**
   * Get error statistics
   */
  getStatistics(): ErrorStatistics {
    const stats: ErrorStatistics = {
      totalErrors: this.errorLog.length,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      recoveredErrors: 0,
      unrecoveredErrors: 0,
      recoveryRate: 0,
    };

    for (const entry of this.errorLog) {
      const { error, recovered } = entry;

      // Count by category
      stats.errorsByCategory[error.category] = (stats.errorsByCategory[error.category] || 0) + 1;

      // Count by severity
      stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;

      // Count recovered vs unrecovered
      if (recovered) {
        stats.recoveredErrors++;
      } else {
        stats.unrecoveredErrors++;
      }
    }

    // Calculate recovery rate
    if (stats.totalErrors > 0) {
      stats.recoveryRate = stats.recoveredErrors / stats.totalErrors;
    }

    return stats;
  }

  /**
   * Get error log
   */
  getErrorLog(): ErrorLogEntry[] {
    return [...this.errorLog];
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count: number = 10): ErrorLogEntry[] {
    return this.errorLog.slice(-count);
  }

  /**
   * Clear error log
   */
  clearLog(): void {
    this.errorLog = [];
    this.errorCounts.clear();
  }

  /**
   * Get error count for specific error
   */
  getErrorCount(category: ErrorCategory, code: string): number {
    const key = `${category}:${code}`;
    return this.errorCounts.get(key) || 0;
  }

  /**
   * Set recovery manager
   */
  setRecoveryManager(manager: ErrorRecoveryManager): void {
    this.recoveryManager = manager;
  }

  /**
   * Enable/disable logging
   */
  setLogging(enabled: boolean): void {
    this.config.enableLogging = enabled;
  }

  /**
   * Enable/disable recovery
   */
  setRecovery(enabled: boolean): void {
    this.config.enableRecovery = enabled;
  }

  /**
   * Enable/disable statistics
   */
  setStatistics(enabled: boolean): void {
    this.config.enableStatistics = enabled;
  }
}

// =============================================================================
// DEFAULT ERROR HANDLER
// =============================================================================

/**
 * Default global error handler
 */
export const defaultErrorHandler = new ErrorHandler();

/**
 * Handle error with default handler
 */
export async function handleError(error: Error | WhiteRoomError): Promise<void> {
  return defaultErrorHandler.handle(error);
}

/**
 * Execute operation with default error handling
 */
export async function withErrorHandling<T>(
  operation: () => T,
  options?: {
    context?: Record<string, unknown>;
    onError?: (error: WhiteRoomError) => void;
    rethrow?: boolean;
  }
): Promise<T> {
  return defaultErrorHandler.execute(operation, options);
}
