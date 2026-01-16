/**
 * Additional middleware utilities for the API Gateway
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError as _ValidationError } from '@schillinger-sdk/shared';

/**
 * Request ID middleware for tracing
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestId =
    (req.headers['x-request-id'] as string) || generateRequestId();
  req.headers['x-request-id'] = requestId;
  res.setHeader('x-request-id', requestId);
  next();
}

/**
 * Response time middleware
 */
export function responseTimeMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    res.setHeader('x-response-time', `${duration}ms`);
  });
  next();
}

/**
 * Content type validation middleware
 */
export function validateContentType(expectedType: string = 'application/json') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes(expectedType)) {
      throw new _ValidationError('content-type', contentType, expectedType, {
        received: contentType,
        expected: expectedType,
      });
    }
    next();
  };
}

/**
 * Request size validation middleware
 */
export function validateRequestSize(maxSizeBytes: number = 10 * 1024 * 1024) {
  // 10MB default
  return (req: Request, _res: Response, next: NextFunction): void => {
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength, 10) > maxSizeBytes) {
      throw new _ValidationError(
        'request-size',
        contentLength,
        `maximum ${maxSizeBytes} bytes`,
        { maxSize: maxSizeBytes, actualSize: contentLength }
      );
    }
    next();
  };
}

/**
 * API version validation middleware
 */
export function validateApiVersion(supportedVersions: string[] = ['v1']) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const version = (req.headers['api-version'] as string) || 'v1';

    if (!supportedVersions.includes(version)) {
      throw new _ValidationError(
        'api-version',
        version,
        `one of: ${supportedVersions.join(', ')}`,
        { supported: supportedVersions, requested: version }
      );
    }

    req.headers['api-version'] = version;
    next();
  };
}

/**
 * Request timeout middleware
 */
export function requestTimeoutMiddleware(timeoutMs: number = 30000) {
  // 30 seconds default
  return (_req: Request, res: Response, next: NextFunction): void => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request Timeout',
          message: `Request timed out after ${timeoutMs}ms`,
          code: 'REQUEST_TIMEOUT',
          timestamp: new Date().toISOString(),
        });
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  // Remove sensitive headers
  res.removeHeader('X-Powered-By');

  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
}

/**
 * CORS preflight handler
 */
export function corsPreflightHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.method === 'OPTIONS') {
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, X-API-Key'
    );
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    res.status(204).end();
    return;
  }

  next();
}

/**
 * Request validation summary middleware
 */
export function requestValidationSummary(
  _req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Add validation summary to request for debugging
  (_req as any).validationSummary = {
    contentType: _req.headers['content-type'],
    contentLength: _req.headers['content-length'],
    apiVersion: _req.headers['api-version'],
    requestId: _req.headers['x-request-id'],
    userAgent: _req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  };
  next();
}

/**
 * Error boundary middleware for async route handlers
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Response formatting middleware
 */
export function responseFormatter(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const originalJson = res.json;

  res.json = function (data: any) {
    const formattedResponse = {
      success: res.statusCode < 400,
      data: res.statusCode < 400 ? data : undefined,
      error: res.statusCode >= 400 ? data : undefined,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'],
    };

    return originalJson.call(this, formattedResponse);
  };

  next();
}

/**
 * Health check middleware
 */
export function healthCheckMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.path === '/health' || req.path === '/api/v1/health') {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
    });
    return;
  }

  next();
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Combine multiple middleware functions
 */
export function combineMiddleware(
  ...middlewares: Array<
    (req: Request, res: Response, next: NextFunction) => void
  >
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    let index = 0;

    function dispatch(): void {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];
      try {
        middleware(req, res, dispatch);
      } catch (error) {
        next(error);
      }
    }

    dispatch();
  };
}
