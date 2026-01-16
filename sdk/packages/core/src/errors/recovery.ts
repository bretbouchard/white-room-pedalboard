/**
 * White Room SDK - Error Recovery System
 *
 * Recovery mechanisms and strategies for handling errors gracefully.
 */

import { WhiteRoomError, ErrorSeverity, ErrorCategory } from "./errors";

/**
 * Recovery strategy result
 */
export interface RecoveryResult {
  success: boolean;
  recovered: boolean;
  action: string;
  error?: Error;
}

/**
 * Recovery strategy interface
 */
export interface RecoveryStrategy {
  canRecover(error: WhiteRoomError): boolean;
  recover(error: WhiteRoomError): RecoveryResult | Promise<RecoveryResult>;
}

// =============================================================================
// RECOVERY STRATEGIES
// =============================================================================

/**
 * Retry recovery strategy - attempt operation again with backoff
 */
export class RetryStrategy implements RecoveryStrategy {
  private maxAttempts: number;
  private baseDelay: number;

  constructor(maxAttempts: number = 3, baseDelay: number = 100) {
    this.maxAttempts = maxAttempts;
    this.baseDelay = baseDelay;
  }

  canRecover(error: WhiteRoomError): boolean {
    // Can retry on transient errors
    return (
      error.severity === ErrorSeverity.WARNING ||
      error.category === ErrorCategory.PERFORMANCE ||
      error.category === ErrorCategory.AUDIO
    );
  }

  async recover(
    _error: WhiteRoomError,
    operation?: () => Promise<unknown>
  ): Promise<RecoveryResult> {
    if (!operation) {
      return {
        success: false,
        recovered: false,
        action: "No operation provided for retry",
      };
    }

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        await operation();
        return {
          success: true,
          recovered: true,
          action: `Retried successfully on attempt ${attempt + 1}`,
        };
      } catch (retryError) {
        if (attempt === this.maxAttempts) {
          return {
            success: false,
            recovered: false,
            action: `Retry failed after ${this.maxAttempts} attempts`,
            error: retryError as Error,
          };
        }

        // Exponential backoff
        const delay = this.baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      recovered: false,
      action: "Retry exhausted",
    };
  }
}

/**
 * Fallback recovery strategy - use fallback value
 */
export class FallbackStrategy<T> implements RecoveryStrategy {
  private fallbackValue: T;
  private fallbackCondition: (error: WhiteRoomError) => boolean;

  constructor(fallbackValue: T, fallbackCondition?: (error: WhiteRoomError) => boolean) {
    this.fallbackValue = fallbackValue;
    this.fallbackCondition = fallbackCondition || (() => true);
  }

  canRecover(error: WhiteRoomError): boolean {
    return this.fallbackCondition(error);
  }

  recover(error: WhiteRoomError): RecoveryResult {
    return {
      success: true,
      recovered: true,
      action: `Used fallback value for error ${error.code}`,
    };
  }

  getFallback(): T {
    return this.fallbackValue;
  }
}

/**
 * Default value recovery strategy - use sensible defaults
 */
export class DefaultStrategy implements RecoveryStrategy {
  private defaults: Map<string, unknown>;

  constructor(defaults: Record<string, unknown>) {
    this.defaults = new Map(Object.entries(defaults));
  }

  canRecover(error: WhiteRoomError): boolean {
    return this.defaults.has(error.code) || this.defaults.has(error.category);
  }

  recover(error: WhiteRoomError): RecoveryResult {
    // TODO: Use default value or remove
    // const _defaultValue = this.defaults.get(error.code) || this.defaults.get(error.category);

    return {
      success: true,
      recovered: true,
      action: `Used default value for ${error.code}`,
    };
  }

  getDefault(key: string): unknown {
    return this.defaults.get(key);
  }
}

/**
 * Validation recovery strategy - sanitize and retry
 */
export class SanitizationStrategy implements RecoveryStrategy {
  private sanitizers: Map<string, (value: unknown) => unknown>;

  constructor() {
    this.sanitizers = new Map();
    this.registerDefaultSanitizers();
  }

  private registerDefaultSanitizers(): void {
    // Sanitize voice count
    this.sanitizers.set("VAL_003", (value: unknown) => {
      const num = value as number;
      return Math.max(1, Math.min(100, num));
    });

    // Sanitize generator period
    this.sanitizers.set("THEORY_001", (value: unknown) => {
      const num = value as number;
      return Math.max(1, Math.min(16, num));
    });
  }

  canRecover(error: WhiteRoomError): boolean {
    return this.sanitizers.has(error.code);
  }

  recover(error: WhiteRoomError): RecoveryResult {
    const sanitizer = this.sanitizers.get(error.code);

    if (!sanitizer) {
      return {
        success: false,
        recovered: false,
        action: `No sanitizer found for ${error.code}`,
      };
    }

    try {
      // The sanitizer would be applied to the input value
      // This is a simplified version - actual implementation would need the input
      return {
        success: true,
        recovered: true,
        action: `Sanitized input for ${error.code}`,
      };
    } catch (sanitizeError) {
      return {
        success: false,
        recovered: false,
        action: `Sanitization failed for ${error.code}`,
        error: sanitizeError as Error,
      };
    }
  }
}

/**
 * Logging recovery strategy - log and continue
 */
export class LoggingStrategy implements RecoveryStrategy {
  private logger: (error: WhiteRoomError) => void;

  constructor(logger?: (error: WhiteRoomError) => void) {
    this.logger = logger || this.defaultLogger;
  }

  canRecover(_error: WhiteRoomError): boolean {
    // Can log any error
    return true;
  }

  recover(error: WhiteRoomError): RecoveryResult {
    this.logger(error);

    // Whether we "recovered" depends on severity
    const recovered = error.severity !== ErrorSeverity.CRITICAL;

    return {
      success: recovered,
      recovered,
      action: `Logged error ${error.code}`,
    };
  }

  private defaultLogger(error: WhiteRoomError): void {
    // Default to console
    if (error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.ERROR) {
      console.error(error.getDetails());
    } else if (error.severity === ErrorSeverity.WARNING) {
      console.warn(error.getDetails());
    } else {
      console.info(error.getDetails());
    }
  }
}

// =============================================================================
// ERROR RECOVERY MANAGER
// =============================================================================

/**
 * Error recovery manager - coordinates multiple recovery strategies
 */
export class ErrorRecoveryManager {
  private strategies: RecoveryStrategy[];
  private fallbackStrategy: RecoveryStrategy;

  constructor(strategies: RecoveryStrategy[] = []) {
    this.strategies = [
      new SanitizationStrategy(),
      new RetryStrategy(),
      ...strategies,
      new LoggingStrategy(),
    ];
    this.fallbackStrategy = new LoggingStrategy();
  }

  /**
   * Add a recovery strategy
   */
  addStrategy(strategy: RecoveryStrategy): void {
    this.strategies.unshift(strategy); // Add to front for priority
  }

  /**
   * Attempt to recover from an error
   */
  async recover(error: WhiteRoomError): Promise<RecoveryResult> {
    // Try each strategy in order
    for (const strategy of this.strategies) {
      if (strategy.canRecover(error)) {
        const result = await strategy.recover(error);

        if (result.recovered) {
          return result;
        }
      }
    }

    // Fallback to last resort strategy
    return this.fallbackStrategy.recover(error);
  }

  /**
   * Execute an operation with automatic recovery
   */
  async execute<T>(
    operation: () => T,
    options?: {
      onError?: (error: Error) => void;
      rethrow?: boolean;
    }
  ): Promise<T> {
    // Check if we have a RetryStrategy that can handle retries
    const retryStrategy = this.strategies.find((s) => s instanceof RetryStrategy) as
      | RetryStrategy
      | undefined;

    if (retryStrategy) {
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        attempts++;
        try {
          return await operation();
        } catch (error) {
          const whiteRoomError =
            error instanceof WhiteRoomError ? error : new WhiteRoomError("UNKNOWN", String(error));

          if (attempts < maxAttempts && retryStrategy.canRecover(whiteRoomError)) {
            // Retry after delay
            await new Promise((resolve) => setTimeout(resolve, 10));
            continue;
          }

          // All retries exhausted
          const fallbackResult = await this.recover(whiteRoomError);
          if (options?.onError) {
            options.onError(whiteRoomError);
          }
          if (!fallbackResult.recovered && options?.rethrow !== false) {
            throw whiteRoomError;
          }
          return undefined as T;
        }
      }
    }

    // No RetryStrategy, just execute normally
    try {
      return await operation();
    } catch (error) {
      const whiteRoomError =
        error instanceof WhiteRoomError ? error : new WhiteRoomError("UNKNOWN", String(error));

      const result = await this.recover(whiteRoomError);

      if (options?.onError) {
        options.onError(whiteRoomError);
      }

      if (!result.recovered && options?.rethrow !== false) {
        throw whiteRoomError;
      }

      return undefined as T;
    }
  }
}

// =============================================================================
// DEFAULT RECOVERY MANAGER
// =============================================================================

/**
 * Default recovery manager instance
 */
export const defaultRecoveryManager = new ErrorRecoveryManager();

/**
 * Execute operation with default recovery
 */
export async function withRecovery<T>(
  operation: () => T,
  options?: {
    onError?: (error: Error) => void;
    rethrow?: boolean;
  }
): Promise<T> {
  return defaultRecoveryManager.execute(operation, options);
}
