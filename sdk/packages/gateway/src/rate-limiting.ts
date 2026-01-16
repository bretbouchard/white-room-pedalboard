/**
 * Rate limiting middleware for the API Gateway
 */

import rateLimit from "express-rate-limit";
import { Request, Response } from "express";
import { RateLimitError } from "@schillinger-sdk/shared";

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

/**
 * Create rate limiting middleware
 */
export function rateLimitMiddleware(config: RateLimitConfig) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      error: "Too Many Requests",
      message: "Too many requests from this IP, please try again later.",
      retryAfter: Math.ceil(config.windowMs / 1000),
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (_req: Request, res: Response) => {
      const retryAfter = Math.ceil(config.windowMs / 1000);
      const error = new RateLimitError(retryAfter);

      res.status(429).json({
        error: error.name,
        message: error.message,
        code: error.code,
        suggestions: error.suggestions,
        retryAfter,
        timestamp: new Date().toISOString(),
      });
    },
    keyGenerator: (req: Request): string => {
      // Use IP address as default key
      return req.ip || req.connection.remoteAddress || "unknown";
    },
    skip: (req: Request): boolean => {
      // Skip rate limiting for health checks
      return req.path === "/api/v1/health";
    },
  });
}

/**
 * Create stricter rate limiting for authentication endpoints
 */
export function authRateLimitMiddleware() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: {
      error: "Too Many Authentication Attempts",
      message:
        "Too many authentication attempts from this IP, please try again later.",
      retryAfter: 15 * 60, // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      const retryAfter = 15 * 60; // 15 minutes
      const error = new RateLimitError(retryAfter);

      res.status(429).json({
        error: error.name,
        message: "Too many authentication attempts. Please try again later.",
        code: error.code,
        suggestions: [
          "Wait 15 minutes before trying again",
          "Check your credentials are correct",
          "Contact support if you continue to have issues",
        ],
        retryAfter,
        timestamp: new Date().toISOString(),
      });
    },
  });
}

/**
 * Create more permissive rate limiting for authenticated users
 */
export function authenticatedRateLimitMiddleware() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Higher limit for authenticated users
    message: {
      error: "Rate Limit Exceeded",
      message: "Rate limit exceeded for authenticated user.",
      retryAfter: Math.ceil(15 * 60),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any): string => {
      // Use user ID if available, otherwise fall back to IP
      return req.user?.id || req.ip || "unknown";
    },
  });
}

/**
 * Create very strict rate limiting for admin endpoints
 */
export function adminRateLimitMiddleware() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // Very limited for admin operations
    message: {
      error: "Admin Rate Limit Exceeded",
      message: "Admin operation rate limit exceeded.",
      retryAfter: 60,
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any): string => {
      return req.user?.id || req.ip || "unknown";
    },
  });
}
