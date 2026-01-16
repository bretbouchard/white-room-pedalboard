import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../src/server/db'; // Adjust path as needed
import crypto from 'crypto';
import {
  timingSafeEqual,
  validateApiKey,
  checkRateLimit,
  logSecurityEvent,
  hashApiKey,
  getClientIp
} from '../../../src/server/security';
import { validateExportParams } from '../../../src/server/validation';

// CRITICAL SECURITY FIX: Remove hardcoded fallback token
// Admin token must be set via environment variable in production
const ADMIN_SECRET_TOKEN = process.env.ADMIN_SECRET_TOKEN;

// Validate required environment variable on startup
if (!ADMIN_SECRET_TOKEN) {
  throw new Error(
    'ADMIN_SECRET_TOKEN environment variable is required in production. ' +
    'Set a secure token with at least 32 characters.'
  );
}

// Validate token strength
if (ADMIN_SECRET_TOKEN.length < 32) {
  throw new Error(
    'ADMIN_SECRET_TOKEN must be at least 32 characters long. ' +
    `Current length: ${ADMIN_SECRET_TOKEN.length}`
  );
}

// Timing-safe token comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // Different lengths = not equal (fast path)
  if (bufA.length !== bufB.length) {
    return false;
  }

  // Use crypto.timingSafeEqual for constant-time comparison
  return crypto.timingSafeEqual(bufA, bufB);
}

// Simple redaction function (should be consistent with agui-events-client)
function redactObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const redacted: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (key.toLowerCase().includes('api_key') || key.toLowerCase().includes('password')) {
        redacted[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'string' && obj[key].length > 256) {
        redacted[key] = obj[key].substring(0, 256) + '...';
      } else {
        redacted[key] = redactObject(obj[key]);
      }
    }
  }
  return redacted;
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request.headers);
  const userAgent = request.headers.get('user-agent') || undefined;

  // SECURITY FIX: Add rate limiting (10 requests per 15 minutes)
  const rateLimit = checkRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    identifier: clientIp
  });

  if (!rateLimit.allowed) {
    // Log rate limit violation
    logSecurityEvent({
      timestamp: Date.now(),
      endpoint: '/api/admin/export-events',
      method: 'POST',
      apiKeyHash: 'rate-limited',
      success: false,
      ip: clientIp,
      userAgent,
      context: { reason: 'rate_limit_exceeded' }
    });

    return new NextResponse(
      'Too many requests. Please try again later.',
      {
        status: 429,
        headers: { 'Retry-After': rateLimit.retryAfter?.toString() }
      }
    );
  }

  // Authentication and Authorization Check
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Log failed authentication
    logSecurityEvent({
      timestamp: Date.now(),
      endpoint: '/api/admin/export-events',
      method: 'POST',
      apiKeyHash: 'missing',
      success: false,
      ip: clientIp,
      userAgent,
      context: { reason: 'missing_auth_header' }
    });

    return new NextResponse('Unauthorized: Missing or invalid Authorization header', { status: 401 });
  }

  const token = authHeader.split(' ')[1];

  // SECURITY FIX: Use timing-safe comparison to prevent timing attacks
  if (!timingSafeEqual(token, ADMIN_SECRET_TOKEN)) {
    // Log failed authentication attempt
    logSecurityEvent({
      timestamp: Date.now(),
      endpoint: '/api/admin/export-events',
      method: 'POST',
      apiKeyHash: hashApiKey(token),
      success: false,
      ip: clientIp,
      userAgent,
      context: { reason: 'invalid_token' }
    });

    return new NextResponse('Unauthorized: Invalid token', { status: 401 });
  }

  // Log successful authentication
  logSecurityEvent({
    timestamp: Date.now(),
    endpoint: '/api/admin/export-events',
    method: 'POST',
    apiKeyHash: hashApiKey(token),
    success: true,
    ip: clientIp,
    userAgent
  });

  try {
    const { userId, runId, startDate, endDate } = await request.json();

    const startTimestamp = startDate ? new Date(startDate).getTime() : undefined;
    const endTimestamp = endDate ? new Date(endDate).getTime() : undefined;

    const events = await db.getEventsFiltered({
      runId,
      userId,
      startDate: startTimestamp,
      endDate: endTimestamp,
      limit: 100000, // A large limit for export
    });

    // Apply redaction to all exported events
    const exportedEvents = events.map(event => ({
      ...event,
      payload: redactObject(event.payload), // Apply redaction
    }));

    return NextResponse.json({
      ok: true,
      events: exportedEvents,
      exportedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error exporting AG-UI events:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const clientIp = getClientIp(req.headers);
  const userAgent = req.headers.get('user-agent') || undefined;

  // SECURITY FIX: Add rate limiting (10 requests per 15 minutes)
  const rateLimit = checkRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    identifier: clientIp
  });

  if (!rateLimit.allowed) {
    // Log rate limit violation
    logSecurityEvent({
      timestamp: Date.now(),
      endpoint: '/api/admin/export-events',
      method: 'GET',
      apiKeyHash: 'rate-limited',
      success: false,
      ip: clientIp,
      userAgent,
      context: { reason: 'rate_limit_exceeded' }
    });

    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': rateLimit.retryAfter?.toString() }
      }
    );
  }

  // SECURITY FIX: Use timing-safe API key comparison
  const apiKey = req.headers.get('x-api-key');

  if (!validateApiKey(apiKey, process.env.ADMIN_API_KEY)) {
    // Log failed authentication attempt
    logSecurityEvent({
      timestamp: Date.now(),
      endpoint: '/api/admin/export-events',
      method: 'GET',
      apiKeyHash: apiKey ? hashApiKey(apiKey) : 'missing',
      success: false,
      ip: clientIp,
      userAgent,
      context: { reason: 'invalid_api_key' }
    });

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Log successful authentication
  logSecurityEvent({
    timestamp: Date.now(),
    endpoint: '/api/admin/export-events',
    method: 'GET',
    apiKeyHash: hashApiKey(apiKey!),
    success: true,
    ip: clientIp,
    userAgent
  });

  // SECURITY FIX: Validate all input parameters
  const { searchParams } = new URL(req.url);
  const validation = validateExportParams({
    limit: searchParams.get('limit') || undefined,
    runId: searchParams.get('runId') || undefined,
    userId: searchParams.get('userId') || undefined,
    startDate: searchParams.get('startDate') || undefined,
    endDate: searchParams.get('endDate') || undefined
  });

  if (!validation.valid) {
    // Log validation failure
    logSecurityEvent({
      timestamp: Date.now(),
      endpoint: '/api/admin/export-events',
      method: 'GET',
      apiKeyHash: hashApiKey(apiKey!),
      success: false,
      ip: clientIp,
      userAgent,
      context: { reason: 'validation_failed', error: validation.error }
    });

    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    );
  }

  const { limit, runId, userId, startDate, endDate } = validation.parsed!;

  try {
    const events = await db.getEventsFiltered({
      limit,
      runId,
      userId,
      startDate,
      endDate,
    });

    const duration = Date.now() - startTime;
    console.log(`API GET /api/admin/export-events took ${duration}ms`);
    return NextResponse.json({ success: true, count: events.length, events });
  } catch (error: any) {
    console.error('Error fetching AG-UI events for export:', error);
    const duration = Date.now() - startTime;
    console.log(`API GET /api/admin/export-events failed after ${duration}ms`);

    // Log server error
    logSecurityEvent({
      timestamp: Date.now(),
      endpoint: '/api/admin/export-events',
      method: 'GET',
      apiKeyHash: hashApiKey(apiKey!),
      success: false,
      ip: clientIp,
      userAgent,
      context: { reason: 'server_error', error: error.message }
    });

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
