// Initialize AGUIEventsClient (ensure this is correctly configured for your environment)
// Temporarily disabled due to missing backend endpoint
const aguiEventsClient = {
  sendAuditEvent: async (_event: any) => {
    // No-op - AGUI events endpoint not implemented
    console.warn('AGUI events disabled - endpoint not implemented');
    void _event; // Mark as intentionally unused
  },
  sendEvent: async (_event: any) => {
    // No-op - AGUI events endpoint not implemented
    console.warn('AGUI events disabled - endpoint not implemented');
    void _event; // Mark as intentionally unused
  }
};

// Define log levels
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Default log level (can be configured via environment variable)
const DEFAULT_LOG_LEVEL = LogLevel.INFO;
const currentLogLevel = (LogLevel[process.env.NEXT_PUBLIC_LOG_LEVEL as keyof typeof LogLevel] || DEFAULT_LOG_LEVEL);

const ENABLE_CENTRALIZED_LOGGING = process.env.NEXT_PUBLIC_ENABLE_CENTRALIZED_LOGGING === 'true';
const CENTRALIZED_LOGGING_URL = process.env.NEXT_PUBLIC_CENTRALIZED_LOGGING_URL || '/api/central-log'; // Configurable endpoint

/**
 * Sends logs to a centralized logging system via a fetch call.
 */
const sendToCentralizedLog = (level: LogLevel, message: string, ...args: any[]) => {
  if (ENABLE_CENTRALIZED_LOGGING) {
    fetch(CENTRALIZED_LOGGING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level: LogLevel[level],
        message,
        timestamp: new Date().toISOString(),
        context: args,
      }),
    }).catch(error => {
      console.error('Failed to send log to centralized system:', error);
    });
  }
};

const log = (level: LogLevel, message: string, ...args: any[]) => {
  if (level >= currentLogLevel) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [AG-UI Logger][${LogLevel[level]}]`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, ...args);
        break;
      case LogLevel.INFO:
        console.info(prefix, message, ...args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, ...args);
        // Send warnings to AG-UI events system
        aguiEventsClient.sendAuditEvent({
          type: 'log_warn',
          payload: { message, args, level: LogLevel[level] },
          metadata: { severity: 'warning' },
        });
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, ...args);
        // Send errors to AG-UI events system
        aguiEventsClient.sendAuditEvent({
          type: 'log_error',
          payload: { message, args, level: LogLevel[level] },
          metadata: { severity: 'error' },
        });
        break;
      default:
        console.log(prefix, message, ...args);
    }
    sendToCentralizedLog(level, message, ...args);
  }
};

export const logger = {
  debug: (message: string, ...args: any[]) => log(LogLevel.DEBUG, message, ...args),
  info: (message: string, ...args: any[]) => log(LogLevel.INFO, message, ...args),
  warn: (message: string, ...args: any[]) => log(LogLevel.WARN, message, ...args),
  error: (message: string, ...args: any[]) => log(LogLevel.ERROR, message, ...args),
};