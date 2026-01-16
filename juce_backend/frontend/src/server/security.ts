/**
 * Security Utilities for White Room API
 *
 * Provides timing-safe comparisons, audit logging, and rate limiting
 * to protect against timing attacks, brute force, and enable forensics.
 */

import crypto from 'crypto';

/**
 * Timing-safe string comparison to prevent timing attacks
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns True if strings are equal, false otherwise
 *
 * @example
 * ```typescript
 * if (timingSafeEqual(userToken, storedToken)) {
 *   // Tokens match - proceed with authentication
 * }
 * ```
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // Different lengths = not equal (fast path)
  if (bufA.length !== bufB.length) {
    return false;
  }

  // Use crypto.timingSafeEqual for constant-time comparison
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed in window */
  maxRequests: number;
  /** Unique identifier for this rate limit (e.g., IP address, API key hash) */
  identifier: string;
}

/**
 * In-memory rate limiter (for production, use Redis or similar)
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  /**
   * Check if request should be rate limited
   *
   * @param config - Rate limit configuration
   * @returns Object with allowed status and retry time if blocked
   */
  checkLimit(config: RateLimitConfig): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const { windowMs, maxRequests, identifier } = config;

    // Get existing requests for this identifier
    let timestamps = this.requests.get(identifier) || [];

    // Filter out timestamps outside the current window
    timestamps = timestamps.filter(timestamp => now - timestamp < windowMs);

    // Check if limit exceeded
    if (timestamps.length >= maxRequests) {
      // Calculate when the oldest request will expire
      const oldestRequest = timestamps[0];
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Add current request timestamp
    timestamps.push(now);
    this.requests.set(identifier, timestamps);

    // Cleanup old entries periodically
    if (this.requests.size > 10000) {
      this.cleanup(now);
    }

    return { allowed: true };
  }

  /**
   * Clean up old timestamps to prevent memory leaks
   */
  private cleanup(now: number): void {
    for (const [identifier, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(
        timestamp => now - timestamp < 3600000 // Keep last hour
      );

      if (validTimestamps.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validTimestamps);
      }
    }
  }
}

// Singleton rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * Rate limit check middleware
 *
 * @param config - Rate limit configuration
 * @returns Object with allowed status and error response if blocked
 *
 * @example
 * ```typescript
 * const rateLimit = checkRateLimit({
 *   windowMs: 15 * 60 * 1000, // 15 minutes
 *   maxRequests: 10,
 *   identifier: ipAddress
 * });
 *
 * if (!rateLimit.allowed) {
 *   return NextResponse.json(
 *     { error: 'Too many requests' },
 *     { status: 429, headers: { 'Retry-After': rateLimit.retryAfter?.toString() } }
 *   );
 * }
 * ```
 */
export function checkRateLimit(config: RateLimitConfig): {
  allowed: boolean;
  retryAfter?: number;
} {
  return rateLimiter.checkLimit(config);
}

/**
 * Security audit log entry
 */
export interface AuditLogEntry {
  /** Timestamp in milliseconds */
  timestamp: number;
  /** API endpoint path */
  endpoint: string;
  /** HTTP method */
  method: string;
  /** SHA-256 hash of API key or token */
  apiKeyHash: string;
  /** Whether authentication succeeded */
  success: boolean;
  /** Client IP address */
  ip: string;
  /** User agent string */
  userAgent?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * In-memory audit log (for production, write to database or file)
 */
class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs = 10000; // Keep last 10k entries

  /**
   * Log a security event
   *
   * @param entry - Audit log entry
   */
  log(entry: AuditLogEntry): void {
    this.logs.push(entry);

    // Trim logs if exceeding maximum
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Get recent audit logs
   *
   * @param limit - Maximum number of entries to return
   * @returns Array of audit log entries
   */
  getRecentLogs(limit: number = 100): AuditLogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get failed authentication attempts
   *
   * @param since - Timestamp in milliseconds to filter from
   * @returns Array of failed authentication attempts
   */
  getFailedAttempts(since: number = Date.now() - 3600000): AuditLogEntry[] {
    return this.logs.filter(
      log => !log.success && log.timestamp >= since
    );
  }
}

// Singleton audit logger instance
const auditLogger = new AuditLogger();

/**
 * Log a security event for audit trail
 *
 * @param entry - Audit log entry
 *
 * @example
 * ```typescript
 * logSecurityEvent({
 *   timestamp: Date.now(),
 *   endpoint: '/api/admin/export-events',
 *   method: 'GET',
 *   apiKeyHash: crypto.createHash('sha256').update(apiKey).digest('hex'),
 *   success: true,
 *   ip: req.headers.get('x-forwarded-for') || 'unknown',
 *   userAgent: req.headers.get('user-agent') || undefined
 * });
 * ```
 */
export function logSecurityEvent(entry: AuditLogEntry): void {
  auditLogger.log(entry);
}

/**
 * Get audit logs for debugging/forensics
 *
 * @param limit - Maximum number of entries to return
 * @returns Array of audit log entries
 */
export function getAuditLogs(limit: number = 100): AuditLogEntry[] {
  return auditLogger.getRecentLogs(limit);
}

/**
 * Get failed authentication attempts for security monitoring
 *
 * @param since - Timestamp in milliseconds to filter from (default: 1 hour ago)
 * @returns Array of failed authentication attempts
 */
export function getFailedAuthAttempts(since?: number): AuditLogEntry[] {
  return auditLogger.getFailedAttempts(since);
}

/**
 * Hash an API key or token for audit logging (don't log raw secrets!)
 *
 * @param apiKey - API key or token to hash
 * @returns SHA-256 hash of the input
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Validate API key with timing-safe comparison
 *
 * @param providedKey - Key provided by client
 * @param storedKey - Expected key from environment/config
 * @returns True if keys match, false otherwise
 */
export function validateApiKey(providedKey: string | null, storedKey: string | undefined): boolean {
  if (!providedKey || !storedKey) {
    return false;
  }

  return timingSafeEqual(providedKey, storedKey);
}

/**
 * Extract client IP address from request headers
 *
 * @param headers - Request headers
 * @returns Client IP address or 'unknown'
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') || // Cloudflare
    'unknown'
  );
}
