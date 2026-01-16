import { DAIDClient } from './client';
import { DAIDGenerator } from './generator';
import { DAIDMetadata } from './types';

// Define proper types to replace 'any'
export interface ExpressRequest {
  path: string;
  url?: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  connection?: { remoteAddress?: string };
  query?: Record<string, string | string[] | undefined>;
  daid?: DAIDContext;
  daidClient?: DAIDClient;
}

export interface ExpressResponse {
  setHeader: (name: string, value: string) => void;
  statusCode: number;
  send: (body?: unknown) => void;
  json: (obj: unknown) => void;
  end: (chunk?: unknown, encoding?: string) => void;
}

export interface FastifyRequest {
  url: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  connection?: { remoteAddress?: string };
  path?: string;
  query?: Record<string, string | string[] | undefined>;
  daid?: DAIDContext;
  daidClient?: DAIDClient;
}

export interface FastifyReply {
  header: (name: string, value: string) => void;
  statusCode: number;
  addHook: (name: string, fn: (request: FastifyRequest, reply: FastifyReply, payload: unknown) => Promise<unknown>) => void;
}

export interface DAIDMiddlewareConfig {
  client?: DAIDClient;
  agentId: string;
  trackRequests?: boolean;
  trackResponses?: boolean;
  extractEntityFromPath?: (
    path: string,
    method: string
  ) => { entityType: string; entityId: string } | null;
  extractMetadata?: (req: ExpressRequest | FastifyRequest, res: ExpressResponse | FastifyReply) => DAIDMetadata;
  skipPaths?: string[];
  headerName?: string;
}

export interface DAIDContext {
  daid: string;
  parentDAIDs: string[];
  entityType: string;
  entityId: string;
  operation: string;
  metadata: DAIDMetadata;
}

// Express middleware type
export type ExpressMiddleware = (req: ExpressRequest, res: ExpressResponse, next: (error?: Error) => void) => void | Promise<void>;

// Fastify middleware type
export type FastifyMiddleware = (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

/**
 * Create Express.js middleware for automatic DAID tracking
 */
export function createDAIDMiddleware(config: DAIDMiddlewareConfig): ExpressMiddleware {
  const client = config.client || new DAIDClient({ agentId: config.agentId });
  const headerName = config.headerName || 'x-daid';
  const skipPaths = config.skipPaths || ['/health', '/metrics', '/favicon.ico'];

  return async (req: ExpressRequest, res: ExpressResponse, next: (error?: Error) => void) => {
    try {
      // Skip certain paths
      if (skipPaths.some(path => req.path.startsWith(path))) {
        return next();
      }

      // Extract parent DAIDs from headers
      const parentDAIDs = extractParentDAIDs(req, headerName);

      // Extract entity information
      const entityInfo =
        config.extractEntityFromPath?.(req.path, req.method) ||
        extractEntityFromPath(req.path, req.method);

      if (!entityInfo) {
        return next();
      }

      // Determine operation
      const operation = determineOperation(req.method, req.path);

      // Extract metadata
      const metadata = config.extractMetadata?.(req, res) || extractDefaultMetadata(req);

      // Generate DAID for this request
      const daid = client.generateDAID({
        entityType: entityInfo.entityType,
        entityId: entityInfo.entityId,
        operation,
        parentDAIDs,
        metadata,
      });

      // Create DAID context
      const daidContext: DAIDContext = {
        daid,
        parentDAIDs,
        entityType: entityInfo.entityType,
        entityId: entityInfo.entityId,
        operation,
        metadata,
      };

      // Attach to request
      req.daid = daidContext;
      req.daidClient = client;

      // Set response header
      res.setHeader(headerName, daid);

      // Track request if enabled
      if (config.trackRequests) {
        try {
          await client.createProvenanceRecord({
            entityType: entityInfo.entityType,
            entityId: entityInfo.entityId,
            operation,
            parentDAIDs,
            metadata: {
              ...metadata,
              phase: 'request',
              timestamp: new Date().toISOString(),
            },
          });
        } catch (error) {
          // TODO: Implement proper logging infrastructure
          // console.warn('Failed to track request DAID:', error);
        }
      }

      // Wrap response methods to track responses
      if (config.trackResponses) {
        wrapResponseMethods(res, daidContext, client);
      }

      next();
    } catch (error) {
      // TODO: Implement proper logging infrastructure
      // console.error('DAID middleware error:', error);
      next(); // Continue even if DAID tracking fails
    }
  };
}

/**
 * Create Fastify middleware for automatic DAID tracking
 */
export function createFastifyDAIDMiddleware(config: DAIDMiddlewareConfig): FastifyMiddleware {
  const client = config.client || new DAIDClient({ agentId: config.agentId });
  const headerName = config.headerName || 'x-daid';
  const skipPaths = config.skipPaths || ['/health', '/metrics', '/favicon.ico'];

  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Skip certain paths
      if (skipPaths.some(path => request.url.startsWith(path))) {
        return;
      }

      // Extract parent DAIDs from headers
      const parentDAIDs = extractParentDAIDs(request, headerName);

      // Extract entity information
      const entityInfo =
        config.extractEntityFromPath?.(request.url, request.method) ||
        extractEntityFromPath(request.url, request.method);

      if (!entityInfo) {
        return;
      }

      // Determine operation
      const operation = determineOperation(request.method, request.url);

      // Extract metadata
      const metadata = config.extractMetadata?.(request, reply) || extractDefaultMetadata(request);

      // Generate DAID for this request
      const daid = client.generateDAID({
        entityType: entityInfo.entityType,
        entityId: entityInfo.entityId,
        operation,
        parentDAIDs,
        metadata,
      });

      // Create DAID context
      const daidContext: DAIDContext = {
        daid,
        parentDAIDs,
        entityType: entityInfo.entityType,
        entityId: entityInfo.entityId,
        operation,
        metadata,
      };

      // Attach to request
      request.daid = daidContext;
      request.daidClient = client;

      // Set response header
      reply.header(headerName, daid);

      // Track request if enabled
      if (config.trackRequests) {
        try {
          await client.createProvenanceRecord({
            entityType: entityInfo.entityType,
            entityId: entityInfo.entityId,
            operation,
            parentDAIDs,
            metadata: {
              ...metadata,
              phase: 'request',
              timestamp: new Date().toISOString(),
            },
          });
        } catch (error) {
          // TODO: Implement proper logging infrastructure
          // console.warn('Failed to track request DAID:', error);
        }
      }

      // Track responses using Fastify hooks
      if (config.trackResponses) {
        reply.addHook('onSend', async (_request: FastifyRequest, _reply: FastifyReply, payload: unknown) => {
          try {
            await client.createProvenanceRecord({
              entityType: entityInfo.entityType,
              entityId: entityInfo.entityId,
              operation: `${operation}_response`,
              parentDAIDs: [daid],
              metadata: {
                ...metadata,
                phase: 'response',
                statusCode: _reply.statusCode,
                timestamp: new Date().toISOString(),
              },
            });
          } catch (error) {
            // TODO: Implement proper logging infrastructure
            // console.warn('Failed to track response DAID:', error);
          }
          return payload;
        });
      }
    } catch (error) {
      // TODO: Implement proper logging infrastructure
      // console.error('DAID middleware error:', error);
      // Continue even if DAID tracking fails
    }
  };
}

/**
 * Extract parent DAIDs from request headers
 */
function extractParentDAIDs(req: ExpressRequest | FastifyRequest, headerName: string): string[] {
  const daidHeader = req.headers[headerName] || req.headers[headerName.toLowerCase()];
  if (!daidHeader) return [];

  if (typeof daidHeader === 'string') {
    return daidHeader
      .split(',')
      .map(d => d.trim())
      .filter(d => d.length > 0);
  }

  if (Array.isArray(daidHeader)) {
    return daidHeader
      .flatMap(h => h.split(',').map((d: string) => d.trim()))
      .filter((d: string) => d.length > 0);
  }

  return [];
}

/**
 * Extract entity information from request path
 */
function extractEntityFromPath(
  path: string,
  _method: string
): { entityType: string; entityId: string } | null {
  // Common REST patterns
  const patterns = [
    // /api/v1/users/123 -> { entityType: 'user', entityId: '123' }
    /^\/api\/v\d+\/([^\/]+)\/([^\/\?]+)/,
    // /users/123 -> { entityType: 'user', entityId: '123' }
    /^\/([^\/]+)\/([^\/\?]+)/,
    // /api/users/123 -> { entityType: 'user', entityId: '123' }
    /^\/api\/([^\/]+)\/([^\/\?]+)/,
  ];

  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match) {
      const [, entityType, entityId] = match;

      // Skip if entityId looks like another resource name
      if (entityId && entityId.match(/^[a-zA-Z]+$/)) {
        continue;
      }

      return {
        entityType: entityType!.replace(/s$/, ''), // Remove plural 's'
        entityId: entityId!,
      };
    }
  }

  return null;
}

/**
 * Determine operation from HTTP method and path
 */
function determineOperation(method: string, path: string): string {
  const baseOperation = method.toLowerCase();

  // Add more specific operation names based on path patterns
  if (path.includes('/search')) return 'search';
  if (path.includes('/export')) return 'export';
  if (path.includes('/import')) return 'import';
  if (path.includes('/validate')) return 'validate';
  if (path.includes('/analyze')) return 'analyze';

  // Map HTTP methods to operations
  switch (baseOperation) {
    case 'get':
      return 'read';
    case 'post':
      return 'create';
    case 'put':
      return 'update';
    case 'patch':
      return 'modify';
    case 'delete':
      return 'delete';
    default:
      return baseOperation;
  }
}

/**
 * Extract default metadata from request
 */
function extractDefaultMetadata(req: ExpressRequest | FastifyRequest): DAIDMetadata {
  return {
    userAgent: req.headers['user-agent'],
    ip: req.ip || req.connection?.remoteAddress,
    method: req.method,
    path: req.path || req.url,
    query: req.query,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Wrap response methods to track response DAIDs
 */
function wrapResponseMethods(res: ExpressResponse, context: DAIDContext, client: DAIDClient): void {
  const originalSend = res.send;
  const originalJson = res.json;
  const originalEnd = res.end;

  const trackResponse = async (statusCode: number) => {
    try {
      await client.createProvenanceRecord({
        entityType: context.entityType,
        entityId: context.entityId,
        operation: `${context.operation}_response`,
        parentDAIDs: [context.daid],
        metadata: {
          ...context.metadata,
          phase: 'response',
          statusCode,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      // TODO: Implement proper logging infrastructure
      // console.warn('Failed to track response DAID:', error);
    }
  };

  res.send = function (body: unknown) {
    trackResponse(res.statusCode);
    return originalSend.call(this, body);
  };

  res.json = function (obj: unknown) {
    trackResponse(res.statusCode);
    return originalJson.call(this, obj);
  };

  res.end = function (chunk?: unknown, encoding?: string) {
    trackResponse(res.statusCode);
    return originalEnd.call(this, chunk, encoding);
  };
}

/**
 * Utility function to create a simple DAID for manual tracking
 */
export function createRequestDAID(config: {
  agentId: string;
  entityType: string;
  entityId: string;
  operation?: string;
  parentDAIDs?: string[];
  metadata?: DAIDMetadata;
}): string {
  return DAIDGenerator.generate({
    agentId: config.agentId,
    entityType: config.entityType,
    entityId: config.entityId,
    operation: config.operation || 'request',
    parentDAIDs: config.parentDAIDs || [],
    metadata: config.metadata || {},
  });
}

/**
 * Utility function to validate DAID in middleware
 */
export function validateDAIDInRequest(req: ExpressRequest | FastifyRequest, headerName: string = 'x-daid'): boolean {
  const daid = req.headers[headerName] || req.headers[headerName.toLowerCase()];
  if (!daid) return false;

  if (Array.isArray(daid)) {
    return daid.some(d => DAIDGenerator.isValid(d));
  }

  return DAIDGenerator.isValid(daid);
}
