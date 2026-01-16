/**
 * Centralized Error Handling System
 *
 * Provides comprehensive error management including:
 * - Error logging and reporting
 * - Severity-based handling strategies
 * - Recovery action execution
 * - Error listener notifications
 * - Error export for debugging
 */

import * as fs from 'fs'
import * as path from 'path'
import { WhiteRoomError, ErrorSeverity, ErrorCategory, RecoveryAction } from './ErrorTypes'

/**
 * Error log entry structure
 */
export interface ErrorLog {
  timestamp: Date
  category: ErrorCategory
  severity: ErrorSeverity
  code: string
  message: string
  details: string
  context: Record<string, any>
  stack?: string
  recoveryAttempted: boolean
  recoverySuccessful: boolean
}

/**
 * Error statistics
 */
export interface ErrorStatistics {
  totalErrors: number
  errorsByCategory: Record<ErrorCategory, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  mostFrequentErrors: Array<{ code: string; count: number }>
  recentErrors: ErrorLog[]
}

/**
 * Error handler configuration
 */
export interface ErrorHandlerConfig {
  logFilePath?: string
  maxLogFileSize?: number
  enableConsoleLogging?: boolean
  enableFileLogging?: boolean
  autoRecoveryEnabled?: boolean
  maxLogEntries?: number
}

/**
 * Centralized error handling system
 *
 * Singleton pattern ensures consistent error handling across the application.
 * All errors should be routed through this handler for proper logging,
 * recovery, and user notification.
 */
export class ErrorHandler {
  private static instance: ErrorHandler
  private errorLog: ErrorLog[]
  private errorListeners: Set<(error: WhiteRoomError) => void>
  private config: ErrorHandlerConfig
  private errorCounts: Map<string, number>

  private constructor(config: ErrorHandlerConfig = {}) {
    this.errorLog = []
    this.errorListeners = new Set()
    this.errorCounts = new Map()
    this.config = {
      logFilePath: path.join(process.cwd(), 'logs', 'errors.log'),
      maxLogFileSize: 10 * 1024 * 1024, // 10MB
      enableConsoleLogging: true,
      enableFileLogging: true,
      autoRecoveryEnabled: true,
      maxLogEntries: 10000,
      ...config
    }

    // Ensure log directory exists
    if (this.config.enableFileLogging && this.config.logFilePath) {
      const logDir = path.dirname(this.config.logFilePath)
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
    }
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: ErrorHandlerConfig): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(config)
    }
    return ErrorHandler.instance
  }

  /**
   * Handle an error
   *
   * This is the main entry point for error handling. All errors should
   * be routed through this method for consistent processing.
   */
  async handleError(error: Error | WhiteRoomError): Promise<void> {
    // Convert to WhiteRoomError if needed
    const whiteRoomError = error instanceof WhiteRoomError
      ? error
      : this.convertError(error)

    // Log error
    this.logError(whiteRoomError)

    // Track error frequency
    this.trackError(whiteRoomError)

    // Notify listeners
    this.notifyListeners(whiteRoomError)

    // Take action based on severity
    await this.handleBySeverity(whiteRoomError)
  }

  /**
   * Convert standard Error to WhiteRoomError
   *
   * Analyzes the error message and stack trace to determine
   * the most appropriate WhiteRoomError type.
   */
  private convertError(error: Error): WhiteRoomError {
    const { ValidationError, FileNotFoundError, NetworkError, UserError } = require('./ErrorTypes')

    const message = error.message.toLowerCase()
    const stack = error.stack?.toLowerCase() || ''

    // Analyze error patterns
    if (message.includes('enoent') || message.includes('file not found')) {
      const match = error.message.match(/'([^']+)'/) || error.message.match(/"([^"]+)"/)
      const filePath = match ? match[1] : 'unknown'
      return new FileNotFoundError(filePath)
    }

    if (message.includes('eacces') || message.includes('permission denied')) {
      const match = error.message.match(/'([^']+)'/) || error.message.match(/"([^"]+)"/)
      const filePath = match ? match[1] : 'unknown'
      return new (require('./ErrorTypes').FilePermissionError)(filePath, 'access')
    }

    if (message.includes('network') || message.includes('fetch') || message.includes('http')) {
      return new NetworkError('request', 'unknown', error.message)
    }

    if (message.includes('timeout')) {
      return new (require('./ErrorTypes').TimeoutError)('operation', 30000)
    }

    if (message.includes('invalid') || message.includes('validation')) {
      return new ValidationError('unknown', 'unknown', error.message)
    }

    // Default to user error
    return new UserError(error.message, error.stack)
  }

  /**
   * Log error to file and console
   */
  private logError(error: WhiteRoomError): void {
    const logEntry: ErrorLog = {
      timestamp: error.timestamp,
      category: error.category,
      severity: error.severity,
      code: error.code,
      message: error.userMessage,
      details: error.technicalDetails,
      context: error.context,
      stack: error.stack,
      recoveryAttempted: false,
      recoverySuccessful: false
    }

    // Add to in-memory log
    this.errorLog.push(logEntry)

    // Trim log if too large
    if (this.errorLog.length > (this.config.maxLogEntries || 10000)) {
      this.errorLog = this.errorLog.slice(-this.config.maxLogEntries)
    }

    // Console log with colors
    if (this.config.enableConsoleLogging) {
      this.logToConsole(error)
    }

    // Write to file
    if (this.config.enableFileLogging) {
      this.writeToLogfile(logEntry)
    }
  }

  /**
   * Log error to console with appropriate formatting
   */
  private logToConsole(error: WhiteRoomError): void {
    const colors = {
      [ErrorSeverity.DEBUG]: '\x1b[36m',     // Cyan
      [ErrorSeverity.INFO]: '\x1b[34m',      // Blue
      [ErrorSeverity.WARNING]: '\x1b[33m',   // Yellow
      [ErrorSeverity.ERROR]: '\x1b[31m',     // Red
      [ErrorSeverity.CRITICAL]: '\x1b[35m',  // Magenta
      [ErrorSeverity.FATAL]: '\x1b[41m\x1b[37m' // White on red
    }

    const reset = '\x1b[0m'
    const color = colors[error.severity] || colors[ErrorSeverity.ERROR]

    console.error(`${color}[${error.severity.toUpperCase()}]${reset} ${error.code}`)
    console.error(`${color}Message:${reset} ${error.userMessage}`)
    console.error(`${color}Details:${reset} ${error.technicalDetails}`)

    if (Object.keys(error.context).length > 0) {
      console.error(`${color}Context:${reset} ${JSON.stringify(error.context, null, 2)}`)
    }

    if (error.stack && error.severity >= ErrorSeverity.ERROR) {
      console.error(`${color}Stack:${reset}\n${error.stack}`)
    }

    if (error.recoveryActions.length > 0) {
      console.error(`${color}Recovery Options:${reset}`)
      error.recoveryActions.forEach((action, i) => {
        const recommended = action.isRecommended ? ' [RECOMMENDED]' : ''
        const automatic = action.isAutomatic ? ' [AUTO]' : ''
        console.error(`  ${i + 1}.${recommended}${automatic} ${action.title}`)
        if (action.description) {
          console.error(`     ${action.description}`)
        }
      })
    }
  }

  /**
   * Write error to log file
   */
  private writeToLogfile(logEntry: ErrorLog): void {
    if (!this.config.logFilePath) return

    try {
      // Check file size
      if (fs.existsSync(this.config.logFilePath)) {
        const stats = fs.statSync(this.config.logFilePath)
        if (stats.size > (this.config.maxLogFileSize || 10 * 1024 * 1024)) {
          // Rotate log file
          const backupPath = this.config.logFilePath + '.old'
          if (fs.existsSync(backupPath)) {
            fs.unlinkSync(backupPath)
          }
          fs.renameSync(this.config.logFilePath, backupPath)
        }
      }

      // Write log entry
      const logLine = JSON.stringify(logEntry) + '\n'
      fs.appendFileSync(this.config.logFilePath, logLine)
    } catch (err) {
      // If logging fails, log to console
      console.error('Failed to write to log file:', err)
    }
  }

  /**
   * Track error frequency
   */
  private trackError(error: WhiteRoomError): void {
    const key = error.code
    const count = this.errorCounts.get(key) || 0
    this.errorCounts.set(key, count + 1)
  }

  /**
   * Notify all registered error listeners
   */
  private notifyListeners(error: WhiteRoomError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error)
      } catch (err) {
        console.error('Error in error listener:', err)
      }
    })
  }

  /**
   * Handle error based on severity
   */
  private async handleBySeverity(error: WhiteRoomError): Promise<void> {
    switch (error.severity) {
      case ErrorSeverity.FATAL:
        await this.handleFatal(error)
        break

      case ErrorSeverity.CRITICAL:
        await this.handleCritical(error)
        break

      case ErrorSeverity.ERROR:
        await this.handleErrorSeverity(error)
        break

      case ErrorSeverity.WARNING:
        await this.handleWarning(error)
        break

      case ErrorSeverity.INFO:
        await this.handleInfo(error)
        break

      case ErrorSeverity.DEBUG:
        // Just log, no action needed
        break
    }
  }

  /**
   * Handle fatal errors
   */
  private async handleFatal(error: WhiteRoomError): Promise<void> {
    console.error('FATAL ERROR - Application must terminate')
    console.error('Attempting to save state before exit...')

    // TODO: Implement state saving
    // TODO: Generate crash report
    // TODO: Report to crash reporting service

    // Attempt automatic recovery if available
    if (this.config.autoRecoveryEnabled && error.hasAutomaticRecovery()) {
      await this.attemptRecovery(error)
    }

    // Terminate application
    process.exit(1)
  }

  /**
   * Handle critical errors
   */
  private async handleCritical(error: WhiteRoomError): Promise<void> {
    console.error('CRITICAL ERROR - Application may be unstable')

    // Attempt automatic recovery if available
    if (this.config.autoRecoveryEnabled && error.hasAutomaticRecovery()) {
      await this.attemptRecovery(error)
    }

    // Show alert to user (would be implemented by UI layer)
    // Offer recovery actions
    // Save state if possible
    // Report to crash reporting service
  }

  /**
   * Handle error severity
   */
  private async handleErrorSeverity(error: WhiteRoomError): Promise<void> {
    console.error('ERROR - Operation failed')

    // Attempt automatic recovery if available
    if (this.config.autoRecoveryEnabled && error.hasAutomaticRecovery()) {
      await this.attemptRecovery(error)
    }

    // Show error to user
    // Offer recovery actions
  }

  /**
   * Handle warning
   */
  private async handleWarning(error: WhiteRoomError): Promise<void> {
    console.warn('WARNING - Potential issue detected')

    // Show warning to user
    // No recovery needed for warnings
  }

  /**
   * Handle info
   */
  private async handleInfo(error: WhiteRoomError): Promise<void> {
    console.info('INFO - User notification')

    // Show info to user
    // No recovery needed for info messages
  }

  /**
   * Attempt automatic recovery
   */
  private async attemptRecovery(error: WhiteRoomError): Promise<void> {
    const automaticActions = error.recoveryActions.filter(a => a.isAutomatic)

    for (const action of automaticActions) {
      try {
        console.log(`Attempting automatic recovery: ${action.title}`)
        await action.action()
        console.log(`Recovery successful: ${action.title}`)

        // Update log entry
        const lastEntry = this.errorLog[this.errorLog.length - 1]
        if (lastEntry) {
          lastEntry.recoveryAttempted = true
          lastEntry.recoverySuccessful = true
        }

        return
      } catch (err) {
        console.error(`Recovery failed: ${action.title}`, err)

        // Update log entry
        const lastEntry = this.errorLog[this.errorLog.length - 1]
        if (lastEntry) {
          lastEntry.recoveryAttempted = true
          lastEntry.recoverySuccessful = false
        }
      }
    }
  }

  /**
   * Register error listener
   *
   * Returns an unsubscribe function.
   */
  onError(listener: (error: WhiteRoomError) => void): () => void {
    this.errorListeners.add(listener)

    // Return unsubscribe function
    return () => {
      this.errorListeners.delete(listener)
    }
  }

  /**
   * Get error log
   */
  getErrorLog(filter?: {
    category?: ErrorCategory
    severity?: ErrorSeverity
    code?: string
    limit?: number
  }): ErrorLog[] {
    let log = [...this.errorLog]

    if (filter) {
      if (filter.category) {
        log = log.filter(entry => entry.category === filter.category)
      }
      if (filter.severity) {
        log = log.filter(entry => entry.severity === filter.severity)
      }
      if (filter.code) {
        log = log.filter(entry => entry.code === filter.code)
      }
      if (filter.limit) {
        log = log.slice(-filter.limit)
      }
    }

    return log
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): ErrorStatistics {
    const errorsByCategory: Record<ErrorCategory, number> = {} as any
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as any

    // Initialize counters
    Object.values(ErrorCategory).forEach(cat => errorsByCategory[cat] = 0)
    Object.values(ErrorSeverity).forEach(sev => errorsBySeverity[sev] = 0)

    // Count errors
    this.errorLog.forEach(entry => {
      errorsByCategory[entry.category]++
      errorsBySeverity[entry.severity]++
    })

    // Most frequent errors
    const mostFrequentErrors = Array.from(this.errorCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Recent errors (last 10)
    const recentErrors = this.errorLog.slice(-10)

    return {
      totalErrors: this.errorLog.length,
      errorsByCategory,
      errorsBySeverity,
      mostFrequentErrors,
      recentErrors
    }
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = []
    this.errorCounts.clear()
  }

  /**
   * Export error report
   */
  async exportErrorReport(): Promise<string> {
    const statistics = this.getErrorStatistics()

    const report = {
      generatedAt: new Date().toISOString(),
      summary: statistics,
      errors: this.errorLog,
      systemInfo: {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memoryUsage: process.memoryUsage()
      }
    }

    return JSON.stringify(report, null, 2)
  }

  /**
   * Export error report to file
   */
  async exportErrorReportToFile(filePath: string): Promise<void> {
    const report = await this.exportErrorReport()
    fs.writeFileSync(filePath, report, 'utf-8')
  }
}
