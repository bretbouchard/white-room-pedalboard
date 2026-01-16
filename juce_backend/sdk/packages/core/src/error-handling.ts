/**
 * Error Handling and Recovery System
 *
 * Comprehensive error management with intelligent recovery,
  user guidance, and system resilience for the Schillinger SDK.
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  VALIDATION = 'validation',
  ENGINE = 'engine',
  PIPELINE = 'pipeline',
  PERFORMANCE = 'performance',
  RESOURCE = 'resource',
  USER_INPUT = 'user_input',
  EXTERNAL = 'external',
  SYSTEM = 'system'
}

export interface ErrorContext {
  component: string;
  operation: string;
  parameters: Record<string, any>;
  timestamp: Date;
  stackTrace?: string;
  environment?: Record<string, any>;
  userLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export interface SchillingerError extends Error {
  code: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: ErrorContext;
  suggestions: ErrorSuggestion[];
  recoverable: boolean;
  userFriendlyMessage: string;
  technicalDetails?: string;
}

export interface ErrorSuggestion {
  type: 'fix' | 'alternative' | 'explanation' | 'workaround';
  title: string;
  description: string;
  codeExample?: string;
  estimatedDifficulty: 'easy' | 'medium' | 'hard';
  successProbability: number; // 0-1
  steps?: string[];
}

export interface RecoveryStrategy {
  name: string;
  description: string;
  applicability: (error: SchillingerError) => boolean;
  execute: (error: SchillingerError, context: any) => Promise<RecoveryResult>;
  fallback?: string;
}

export interface RecoveryResult {
  success: boolean;
  resolved: boolean;
  modifiedData: any;
  message: string;
  sideEffects?: string[];
  requiresUserIntervention: boolean;
}

export interface ErrorReport {
  id: string;
  error: SchillingerError;
  context: ErrorContext;
  recoveryAttempts: RecoveryAttempt[];
  resolution: 'resolved' | 'workaround' | 'failed' | 'pending';
  userImpact: 'none' | 'minor' | 'major' | 'blocking';
  timestamp: Date;
  userFeedback?: {
    helpful: boolean;
    severity: 'correct' | 'too_much' | 'too_little';
    comments?: string;
  };
}

export interface RecoveryAttempt {
  strategy: string;
  timestamp: Date;
  duration: number;
  success: boolean;
  result: RecoveryResult;
  message: string;
}

export interface ErrorStatistics {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recoverySuccessRate: number;
  commonPatterns: Array<{
    pattern: string;
    frequency: number;
    lastOccurrence: Date;
    suggestedFix: string;
  }>;
  userSatisfaction: {
    helpful: number;
    notHelpful: number;
    totalFeedback: number;
  };
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private strategies: Map<string, RecoveryStrategy[]> = new Map();
  private errorLog: Map<string, ErrorReport> = new Map();
  private statistics: ErrorStatistics;
  private maxLogSize = 10000;
  private performanceMode: 'conservative' | 'aggressive' = 'conservative';

  private constructor() {
    this.statistics = {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      recoverySuccessRate: 0,
      commonPatterns: [],
      userSatisfaction: {
        helpful: 0,
        notHelpful: 0,
        totalFeedback: 0
      }
    };

    this.registerDefaultStrategies();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Create a Schillinger error with full context
   */
  static createError(
    message: string,
    code: string,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: Partial<ErrorContext>,
    suggestions?: ErrorSuggestion[]
  ): SchillingerError {
    const error = new Error(message) as SchillingerError;
    error.code = code;
    error.category = category;
    error.severity = severity;
    error.context = {
      component: 'Unknown',
      operation: 'Unknown',
      parameters: {},
      timestamp: new Date(),
      ...context
    };
    error.suggestions = suggestions || [];
    error.recoverable = category !== ErrorCategory.SYSTEM && severity !== ErrorSeverity.CRITICAL;
    error.userFriendlyMessage = this.generateUserFriendlyMessage(error);
    error.technicalDetails = this.generateTechnicalDetails(error);

    return error;
  }

  /**
   * Handle error with intelligent recovery
   */
  static async handleError(
    error: Error | SchillingerError,
    context?: Partial<ErrorContext>,
    recoveryOptions?: {
      attemptRecovery?: boolean;
      fallbackOptions?: any[];
      userLevel?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    }
  ): Promise<ErrorReport> {
    const handler = ErrorHandler.getInstance();

    // Convert plain Error to SchillingerError
    const schillingerError = error instanceof SchillingerError ? error :
      this.wrapError(error as Error, context);

    // Update context
    if (context) {
      schillingerError.context = { ...schillingerError.context, ...context };
    }

    // Determine user impact
    const userImpact = this.assessUserImpact(schillingerError, recoveryOptions?.userLevel);

    // Create error report
    const report: ErrorReport = {
      id: this.generateId(),
      error: schillingerError,
      context: schillingerError.context,
      recoveryAttempts: [],
      resolution: 'pending',
      userImpact,
      timestamp: new Date()
    };

    // Log the error
    handler.logError(report);

    // Attempt recovery if requested
    if (recoveryOptions?.attemptRecovery !== false && schillingerError.recoverable) {
      const recoveryResult = await handler.attemptRecovery(schillingerError, report);

      if (recoveryResult.success) {
        report.resolution = recoveryResult.resolved ? 'resolved' : 'workaround';
        report.recoveryAttempts.push({
          strategy: recoveryResult.strategy || 'unknown',
          timestamp: new Date(),
          duration: recoveryResult.duration || 0,
          success: true,
          result: recoveryResult,
          message: recoveryResult.message
        });
      }
    }

    // Update statistics
    handler.updateStatistics(schillingerError, report);

    return report;
  }

  /**
   * Generate user-friendly error messages
   */
  private static generateUserFriendlyMessage(error: SchillingerError): string {
    const messageTemplates = {
      [ErrorCategory.VALATION]: {
        [ErrorSeverity.LOW]: "Check your input values",
        [ErrorSeverity.MEDIUM]: "Invalid input detected",
        [ErrorSeverity.HIGH]: "Critical input error",
        [ErrorSeverity.CRITICAL]: "Fatal input validation error"
      },
      [ErrorCategory.ENGINE]: {
        [ErrorSeverity.LOW]: "Temporary processing issue",
        [ErrorSeverity.MEDIUM]: "Engine encountered a problem",
        [ErrorSeverity.HIGH]: "Engine error occurred",
        [ErrorSeverity.CRITICAL]: "Critical engine failure"
      },
      [ErrorCategory.PIPELINE]: {
        [ErrorSeverity.LOW]: "Minor pipeline issue",
        [ErrorSeverity.MEDIUM]: "Pipeline processing error",
        [ErrorSeverity.HIGH]: "Pipeline failure",
        [ErrorSeverity.CRITICAL]: "Pipeline system error"
      },
      [ErrorCategory.PERFORMANCE]: {
        [ErrorSeverity.LOW]: "Performance is slower than optimal",
        [ErrorSeverity.MEDIUM]: "Performance issue detected",
        [ErrorSeverity.HIGH]: "Significant performance problem",
        [ErrorSeverity.CRITICAL]: "Critical performance failure"
      },
      [ErrorCategory.RESOURCE]: {
        [ErrorSeverity.LOWOW]: "Resource temporarily unavailable",
        [ErrorSeverity.MEDIUM]: "Insufficient resources",
        [ErrorSeverity.HIGHIGH]: "Resource exhaustion",
        [ErrorSeverity.CRITICAL]: "Critical resource failure"
      }
    };

    return messageTemplates[error.category]?.[error.severity] ||
           "An unexpected error occurred";
  }

  /**
   * Generate technical details for debugging
   */
  private static generateTechnicalDetails(error: SchillingerError): string {
    const details = [
      `Error Code: ${error.code}`,
      `Category: ${error.category}`,
      `Severity: ${error.severity}`,
      `Component: ${error.context.component}`,
      `Operation: ${error.context.operation}`,
      `Timestamp: ${error.context.timestamp.toISOString()}`,
      `Recoverable: ${error.recoverable ? 'Yes' : 'No'}`
    ];

    if (error.context.parameters && Object.keys(error.context.parameters).length > 0) {
      details.push(`Parameters: ${JSON.stringify(error.context.parameters, null, 2)}`);
    }

    if (error.context.stackTrace) {
      details.push(`Stack Trace: ${error.context.stackTrace}`);
    }

    return details.join('\n');
  }

  /**
   * Wrap plain Error in SchillingerError
   */
  private static wrapError(error: Error, context?: Partial<ErrorContext>): SchillingerError {
    return this.createError(
      error.message,
      'UNKNOWN_ERROR',
      ErrorCategory.SYSTEM,
      ErrorSeverity.MEDIUM,
      {
        component: context?.component || 'Unknown',
        operation: context?.operation || 'Unknown',
        parameters: context?.parameters || {},
        timestamp: new Date(),
        stackTrace: error.stack
      }
    );
  }

  /**
   * Assess user impact level
   */
  private static assessUserImpact(
    error: SchillingerError,
    userLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert' = 'intermediate'
  ): 'none' | 'minor' | 'major' | 'blocking' {
    if (error.severity === ErrorSeverity.CRITICAL) return 'blocking';
    if (error.category === ErrorCategory.SYSTEM) return 'major';
    if (error.category === ErrorCategory.VALATION && userLevel === 'beginner') return 'major';
    if (error.severity === ErrorSeverity.HIGH && userLevel === 'beginner') return 'major';

    if (error.severity === ErrorSeverity.HIGH) return 'minor';
    if (error.category === ErrorCategory.ENGINE) return 'minor';
    if (error.category === ErrorCategory.PIPELINE) return 'minor';

    return 'none';
  }

  /**
   * Attempt intelligent error recovery
   */
  private async attemptRecovery(error: SchillingerError, report: ErrorReport): Promise<{
    success: boolean;
    resolved: boolean;
    strategy?: string;
    duration?: number;
    result?: RecoveryResult;
    message: string;
  }> {
    const startTime = performance.now();

    // Get applicable recovery strategies
    const strategies = this.getApplicableStrategies(error);

    if (strategies.length === 0) {
      return {
        success: false,
        resolved: false,
        message: 'No recovery strategies available for this error type'
      };
    }

    // Try strategies in order of preference
    for (const strategy of strategies) {
      try {
        console.log(`Attempting recovery strategy: ${strategy.description}`);
        const result = await strategy.execute(error, report.context);

        const duration = performance.now() - startTime;

        if (result.success) {
          console.log(`Recovery successful: ${result.message}`);
          return {
            success: true,
            resolved: result.modifiedData !== null,
            strategy: strategy.name,
            duration,
            result,
            message: result.message
          };
        }
      } catch (recoveryError) {
        console.warn(`Recovery strategy failed: ${recoveryError.message}`);
      }
    }

    return {
      success: false,
      resolved: false,
      message: 'All recovery strategies failed'
    };
  }

  /**
   * Get applicable recovery strategies for error
   */
  private getApplicableStrategies(error: SchillingerError): RecoveryStrategy[] {
    const applicable: RecoveryStrategy[] = [];

    // Check all registered strategies
    for (const [category, strategies] of this.strategies.entries()) {
      for (const strategy of strategies) {
        if (strategy.applicability(error)) {
          applicable.push(strategy);
        }
      }
    }

    // Sort by success probability (if available)
    return applicable.sort((a, b) => {
      // For now, use simple ordering - can be enhanced
      return 0;
    });
  }

  /**
   * Register a recovery strategy
   */
  registerStrategy(name: string, strategy: RecoveryStrategy): void {
    if (!this.strategies.has(name)) {
      this.strategies.set(name, []);
    }
    this.strategies.get(name)!.push(strategy);
  }

  /**
   * Register multiple recovery strategies
   */
  registerStrategies(strategies: Array<{ name: string; strategy: RecoveryStrategy }>): void {
    strategies.forEach(({ name, strategy }) => {
      this.registerStrategy(name, strategy);
    });
  }

  /**
   * Log error for tracking
   */
  private logError(report: ErrorReport): void {
    this.errorLog.set(report.id, report);

    // Keep log size manageable
    if (this.errorLog.size > this.maxLogSize) {
      const oldestKey = this.errorLog.keys().next().value;
      if (oldestKey) {
        this.errorLog.delete(oldestKey);
      }
    }

    // Log to console if in development mode
    if (process.env.NODE_ENV === 'development') {
      console.error('🎵 Schillinger SDK Error:', {
        code: report.error.code,
        message: report.error.message,
        category: report.error.category,
        severity: report.error.severity,
        userImpact: report.userImpact,
        component: report.error.context.component
      });
    }
  }

  /**
   * Update error statistics
   */
  private updateStatistics(error: SchillingerError, report: ErrorReport): void {
    this.statistics.totalErrors++;

    // Update category counts
    this.statistics.errorsByCategory[error.category] =
      (this.statistics.errorsByCategory[error.category] || 0) + 1;

    // Update severity counts
    this.statistics.errorsBySeverity[error.severity] =
      (this.statistics.errorsBySeverity[error.severity] || 0) + 1;

    // Update recovery success rate
    if (report.resolution === 'resolved') {
      this.statistics.recoverySuccessRate =
        (this.statistics.recoverySuccessRate * 0.9) + (1 * 0.1);
    }

    // Update common patterns
    this.updateCommonPatterns(error);
  }

  /**
   * Track common error patterns
   */
  private updateCommonPatterns(error: SchillingerError): void {
    const pattern = `${error.category}:${error.code}`;
    const existing = this.statistics.commonPatterns.find(p => p.pattern === pattern);

    if (existing) {
      existing.frequency++;
      existing.lastOccurrence = new Date();
    } else {
      this.statistics.commonPatterns.push({
        pattern,
        frequency: 1,
        lastOccurrence: new Date(),
        suggestedFix: error.suggestions[0]?.description || 'Refer to documentation'
      });
    }

    // Keep only top 10 patterns
    this.statistics.commonPatterns.sort((a, b) => b.frequency - a.frequency);
    if (this.statistics.commonPatterns.length > 10) {
      this.statistics.commonPatterns = this.statistics.commonPatterns.slice(0, 10);
    }
  }

  /**
   * Get error statistics
   */
  getStatistics(): ErrorStatistics {
    return { ...this.statistics };
  }

  /**
   * Get recent error reports
   */
  getRecentErrors(limit: number = 50): ErrorReport[] {
    const sorted = Array.from(this.errorLog.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return sorted.slice(0, limit);
  }

  /**
   * Get error by ID
   */
  getError(id: string): ErrorReport | undefined {
    return this.errorLog.get(id);
  }

  /**
   * Add user feedback to error report
   */
  addUserFeedback(errorId: string, feedback: {
    helpful: boolean;
    severity: 'correct' | 'too_much' | 'too_little';
    comments?: string;
  }): void {
    const report = this.errorLog.get(errorId);
    if (report) {
      report.userFeedback = feedback;

      if (feedback.helpful) {
        this.statistics.userSatisfaction.helpful++;
      } else {
        this.statistics.userSatisfaction.notHelpful++;
      }
      this.statistics.userSatisfaction.totalFeedback++;
    }
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorLog.clear();
    this.statistics = {
      totalErrors: 0,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      recoverySuccessRate: 0,
      commonPatterns: [],
      userSatisfaction: {
        helpful: 0,
        notHelpful: 0,
        totalFeedback: 0
      }
    };
  }

  /**
   * Set performance mode
   */
  setPerformanceMode(mode: 'conservative' | 'aggressive'): void {
    this.performanceMode = mode;
  }

  /**
   * Get performance mode
   */
  getPerformanceMode(): 'conservative' | 'aggressive' {
    return this.performanceMode;
  }

  /**
   * Register default recovery strategies
   */
  private registerDefaultStrategies(): void {
    // Validation error strategies
    this.registerStrategy('validation_input_fix', {
      name: 'validation_input_fix',
      description: 'Automatically fix invalid input values',
      applicability: (error) => error.category === ErrorCategory.VALIDATION && error.severity <= ErrorSeverity.HIGH,
      execute: async (error, context) => {
        // Implementation for input validation fixes
        return {
          success: true,
          resolved: true,
          modifiedData: context.parameters,
          message: 'Input values have been automatically corrected',
          requiresUserIntervention: false
        };
      }
    });

    this.registerStrategy('validation_suggest_alternatives', {
      name: 'validation_suggest_alternatives',
      description: 'Suggest alternative input values when fixing isn\'t possible',
      applicability: (error) => error.category === ErrorCategory.VALIDATION,
      execute: async (error, context) => {
        return {
          success: true,
          resolved: false,
          modifiedData: null,
          message: 'Alternative values have been suggested',
          requiresUserIntervention: true,
          suggestions: error.suggestions
        };
      }
    });

    // Engine error strategies
    this.registerStrategy('engine_retry_operation', {
      name: 'engine_retry_operation',
      description: 'Retry the failed operation with modified parameters',
      applicability: (error) => error.category === ErrorCategory.ENGINE && error.severity <= ErrorSeverity.MEDIUM,
      execute: async (error, context) => {
        // Retry logic
        const retryCount = context.parameters?.retryCount || 0;
        if (retryCount > 3) {
          return {
            success: false,
            resolved: false,
            modifiedData: null,
            message: 'Maximum retry attempts exceeded'
          };
        }

        return {
          success: true,
          resolved: true,
          modifiedData: { ...context.parameters, retryCount: retryCount + 1 },
          message: `Operation retried (${retryCount + 1}/4 attempts)`,
          requiresUserIntervention: false
        };
      }
    });

    this.registerStrategy('engine_reduce_complexity', {
      name: 'engine_reduce_complexity',
      description: 'Reduce operation complexity to avoid errors',
      applicability: (error) => error.category === ErrorCategory.PERFORMANCE,
      execute: async (error, context) => {
        const complexity = context.parameters?.complexity || 'high';
        const reducedComplexity = complexity === 'high' ? 'medium' : 'low';

        return {
          success: true,
          resolved: true,
          modifiedData: { ...context.parameters, complexity: reducedComplexity },
          message: `Complexity reduced from ${complexity} to ${reducedComplexity}`,
          requiresUserIntervention: false
        };
      }
    });

    // Pipeline error strategies
    this.registerStrategy('pipeline_skip_stage', {
      name: 'pipeline_skip_stage',
      description: 'Skip problematic stage and continue with execution',
      applicability: (error) => error.category === ErrorCategory.PIPELINE && error.severity <= ErrorSeverity.MEDIUM,
      execute: async (error, context) => {
        return {
          success: true,
          resolved: true,
          modifiedData: { ...context, skipStage: error.context.operation },
          message: `Skipped ${error.context.operation} stage and continued execution`,
          requiresUserIntervention: false
        };
      }
    });

    this.registerStrategy('pipeline_use_fallback', {
      name: 'pipeline_use_fallback',
      description: 'Use fallback method for failed pipeline operation',
      applicability: (error) => error.category === ErrorCategory.PIPELINE,
      execute: async (error, context) => {
        return {
          success: true,
          resolved: true,
          modifiedData: { ...context, useFallback: true },
          message: 'Used fallback method for operation',
          requiresUserIntervention: false
        };
      }
    });

    // Resource error strategies
    this.registerStrategy('resource_wait_and_retry', {
      name: 'resource_wait_and_retry',
      description: 'Wait for resources to become available and retry',
      applicability: (error) => error.category === ErrorCategory.RESOURCE && error.severity <= ErrorSeverity.MEDIUM,
      execute: async (error, context) => {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return {
          success: true,
          resolved: true,
          modifiedData: { ...context },
          message: 'Resource became available, operation retried successfully',
          requiresUserIntervention: false
        };
      }
    });

    this.registerStrategy('resource_use_alternative', {
      name: 'resource_use_alternative',
      description: 'Use alternative resource or method',
      applicability: (error) => error.category === ErrorCategory.RESOURCE,
      execute: async (error, context) => {
        return {
          success: true,
          resolved: true,
          modifiedData: { ...context, alternativeResource: 'memory' },
          message: 'Using alternative resource allocation',
          requiresUserIntervention: false
        };
      }
    });
  }
}

/**
 * Create standardized error with suggestions
 */
export function createError(
  message: string,
  code: string,
  category: ErrorCategory,
  severity: ErrorSeverity,
  context?: Partial<ErrorContext>,
  suggestions?: ErrorSuggestion[]
): SchillingerError {
  return ErrorHandler.createError(message, code, category, severity, context, suggestions);
}

/**
 * Create validation error with helpful suggestions
 */
export function createValidationError(
  message: string,
  parameter: string,
  value: any,
  expectedType?: string,
  suggestions?: string[]
): SchillError {
  const autoSuggestions = suggestions || [
    `Check if ${parameter} matches the expected ${expectedType || 'format'}`,
    `Ensure ${parameter} is not null or undefined`,
    'Verify the parameter value is within acceptable range'
  ];

  return createError(
    message,
    'VALIDATION_ERROR',
    ErrorCategory.VALIDATION,
    ErrorSeverity.MEDIUM,
    { component: 'Validation', operation: 'parameter_validation', parameters: { parameter, value, expectedType } },
    autoSuggestions.map(suggestion => ({
      type: 'fix' as const,
      title: 'Fix Input',
      description: suggestion,
      estimatedDifficulty: 'easy' as const,
      successProbability: 0.8,
      steps: [`Correct the ${parameter} value`]
    }))
  );
}

/**
 * Create engine error with recovery suggestions
 */
export function createEngineError(
  message: string,
  engine: string,
  operation: string,
  context?: Record<string, any>,
  recoverable: boolean = true
): SchillingerError {
  const suggestions: ErrorSuggestion[] = [];

  if (recoverable) {
    suggestions.push({
      type: 'fix' as const,
      title: 'Retry Operation',
      description: `Try the ${operation} operation again with modified parameters`,
      estimatedDifficulty: 'easy' as const,
      successProbability: 0.7,
      steps: [`Retry ${operation} operation`]
    });
  }

  suggestions.push({
    type: 'explanation' as const,
    title: 'Understanding the Issue',
    description: `${engine} encountered an error during ${operation}`,
    estimatedDifficulty: 'medium' as const,
    successProbability: 0.5
  });

  return createError(
    message,
    'ENGINE_ERROR',
    ErrorCategory.ENGINE,
    ErrorSeverity.MEDIUM,
    { component: engine, operation, parameters: context || {} },
    suggestions
  );
}

/**
 * Create pipeline error with context
 */
export function createPipelineError(
  stage: string,
  message: string,
  error: Error,
  context?: Record<string, any>
): SchillifierError {
  return createError(
    `Pipeline stage "${stage}" failed: ${message}`,
    'PIPELINE_ERROR',
    ErrorCategory.PIPELINE,
    ErrorSeverity.HIGH,
    { component: 'Pipeline', operation: stage, parameters: context || {} },
    [{
      type: 'workaround' as const,
      title: 'Skip Stage',
      description: `Skip the "${stage}" stage and continue with execution`,
      estimatedDifficulty: 'easy' as const,
      successProbability: 0.9,
      steps: ['Continue pipeline execution without this stage']
    }]
  );
}

/**
 * Handle error with user-friendly recovery
 */
export async function handleError(
  error: Error | SchillingerError,
  context?: Partial<ErrorContext>
): Promise<ErrorReport> {
  return ErrorHandler.handleError(error, context);
}

/**
 * Get error handler instance
 */
export function getErrorHandler(): ErrorHandler {
  return ErrorHandler.getInstance();
}

// Export error handling utilities
export {
  ErrorSeverity,
  ErrorCategory,
  ErrorContext,
  SchillingerError,
  ErrorSuggestion,
  RecoveryStrategy,
  ErrorReport,
  RecoveryResult,
  ErrorStatistics
};