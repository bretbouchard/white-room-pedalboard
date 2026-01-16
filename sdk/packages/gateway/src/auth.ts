/**
 * Authentication middleware for the API Gateway
 */

import { Request, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticationError } from "@schillinger-sdk/shared";
import type { JwtPayload } from "jsonwebtoken";
// Prefer Clerk server-side verification when available
let verifyTokenFn: undefined | ((token: string, opts: any) => Promise<any>);
try {
  // Dynamically require to avoid forcing consumers to install it unless used
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const clerk = require("@clerk/backend");
  verifyTokenFn = clerk.verifyToken as typeof verifyTokenFn;
} catch (_) {
  verifyTokenFn = undefined;
}

export interface AuthConfig {
  jwtSecret: string;
  clerkPublishableKey: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    permissions: string[];
    tokenType: "jwt" | "apiKey" | "clerk";
  };
}

/**
 * Authentication middleware factory
 */
export function authMiddleware(
  config: AuthConfig,
  requiredPermissions: string[] = [],
) {
  return async (
    req: AuthenticatedRequest,
    _res: any,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const token = extractToken(req);

      if (!token) {
        throw new AuthenticationError("No authentication token provided");
      }

      // Determine token type and validate accordingly
      const user = await validateToken(token, config);

      // Check permissions
      if (requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.every(
          (permission) =>
            user &&
            user.permissions &&
            (user.permissions.includes(permission) ||
              user.permissions.includes("admin")),
        );
        if (!hasPermission) {
          throw new AuthenticationError(
            `Insufficient permissions. Required: ${requiredPermissions.join(", ")}`,
          );
        }
      }

      req.user = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Extract token from request headers
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Check for API key in headers
  const apiKey = req.headers["x-api-key"] as string;
  if (apiKey) {
    return apiKey;
  }

  return null;
}

/**
 * Validate token and return user information
 */
async function validateToken(
  token: string,
  config: AuthConfig,
): Promise<AuthenticatedRequest["user"]> {
  // Try JWT validation first
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;

    return {
      id: decoded.sub || decoded.id,
      email: decoded.email,
      permissions: decoded.permissions || ["core"],
      tokenType: "jwt",
    };
  } catch (jwtError) {
    // JWT validation failed, try other methods
  }

  // Try API key validation
  if (token.startsWith("sk_")) {
    return await validateApiKey(token);
  }

  // Try Clerk token validation
  if (config.clerkPublishableKey && token.startsWith("clerk_")) {
    return await validateClerkToken(token, config.clerkPublishableKey);
  }

  throw new AuthenticationError("Invalid or expired token");
}

/**
 * Validate API key
 */
async function validateApiKey(
  apiKey: string,
): Promise<AuthenticatedRequest["user"]> {
  // This would typically query a database or external service
  // For now, we'll use a simple validation

  if (apiKey.length < 32) {
    throw new AuthenticationError("Invalid API key format");
  }

  // Mock validation - replace with actual API key validation
  const mockApiKeys = {
    sk_test_1234567890abcdef1234567890abcdef: {
      id: "api_user_1",
      permissions: ["core", "analysis"],
    },
    sk_live_abcdef1234567890abcdef1234567890: {
      id: "api_user_2",
      permissions: ["core", "analysis", "admin"],
    },
  };

  const keyData = mockApiKeys[apiKey as keyof typeof mockApiKeys];

  if (!keyData) {
    throw new AuthenticationError("Invalid API key");
  }

  return {
    id: keyData.id,
    permissions: keyData.permissions,
    tokenType: "apiKey",
  };
}

/**
 * Validate Clerk token
 */
async function validateClerkToken(
  token: string,
  _publishableKey: string,
): Promise<AuthenticatedRequest["user"]> {
  // TODO: Use publishableKey for validation
  // Prefer first-class verification via Clerk backend when available
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (verifyTokenFn && secretKey) {
    try {
      const verified = await verifyTokenFn(token, { secretKey });
      const sub = verified?.sub as string | undefined;
      const email =
        (verified?.email as string | undefined) ||
        (verified?.claims?.email as string | undefined);
      if (!sub)
        throw new AuthenticationError("Invalid Clerk token: missing sub");
      return {
        id: sub,
        email,
        permissions: ["core"],
        tokenType: "clerk",
      };
    } catch (err: any) {
      throw new AuthenticationError(
        `Invalid Clerk token: ${err?.message || "verification failed"}`,
      );
    }
  }

  // Fallback: minimally decode without verification for development only
  try {
    const decoded = jwt.decode(token) as JwtPayload | null;
    const sub = decoded?.sub as string | undefined;
    const email = decoded?.email as string | undefined;
    if (!sub) throw new Error("missing sub");
    return {
      id: sub,
      email,
      permissions: ["core"],
      tokenType: "clerk",
    };
  } catch {
    throw new AuthenticationError("Invalid Clerk token");
  }
}

/**
 * Generate JWT token for testing/development
 */
export function generateTestToken(
  payload: { id: string; email?: string; permissions?: string[] },
  secret: string,
  expiresIn: string = "24h",
): string {
  return jwt.sign(
    {
      sub: payload.id,
      email: payload.email,
      permissions: payload.permissions || ["core"],
      iat: Math.floor(Date.now() / 1000),
    },
    secret as jwt.Secret,
    { expiresIn } as jwt.SignOptions,
  );
}

/**
 * Middleware to check if user has admin permissions
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  _res: any,
  next: NextFunction,
): void {
  if (
    !req.user ||
    !req.user.permissions ||
    !req.user.permissions.includes("admin")
  ) {
    throw new AuthenticationError("Admin permissions required");
  }
  next();
}

/**
 * Middleware to check specific permissions
 */
export function requirePermissions(permissions: string[]) {
  return (req: AuthenticatedRequest, _res: any, next: NextFunction): void => {
    if (!req.user || !req.user.permissions) {
      throw new AuthenticationError("Authentication required");
    }
    const hasPermission = permissions.every(
      (permission) =>
        req.user &&
        req.user.permissions &&
        (req.user.permissions.includes(permission) ||
          req.user.permissions.includes("admin")),
    );
    if (!hasPermission) {
      throw new AuthenticationError(
        `Insufficient permissions. Required: ${permissions.join(", ")}`,
      );
    }
    next();
  };
}
