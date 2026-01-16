/**
 * Main API Gateway implementation
 */

import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { SchillingerError, AuthenticationError } from "@schillinger-sdk/shared";

import { authMiddleware } from "./auth";
import { rateLimitMiddleware } from "./rate-limiting";
import { validationMiddleware } from "./validation";

export interface GatewayConfig {
  port?: number;
  corsOrigins?: string[];
  rateLimit: {
    windowMs: number;
    max: number;
  };
  auth: {
    jwtSecret: string;
    clerkPublishableKey: string;
  };
  apiPrefix?: string;
}

export class SchillingerGateway {
  private app: Express;
  private config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = {
      port: config.port || 3000,
      corsOrigins: config.corsOrigins || ["http://localhost:3000"],
      rateLimit: config.rateLimit,
      auth: config.auth,
      apiPrefix: config.apiPrefix || "/api/v1",
    };

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
          },
        },
      }),
    );

    // CORS middleware
    this.app.use(
      cors({
        origin: this.config.corsOrigins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      }),
    );

    // Body parsing middleware
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Rate limiting middleware
    this.app.use(rateLimitMiddleware(this.config.rateLimit));

    // Request logging middleware
    this.app.use(this.requestLogger);
  }

  private setupRoutes(): void {
    const apiRouter = express.Router();

    // Health check endpoint
    apiRouter.get("/health", (_req: Request, res: Response) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
      });
    });

    // Authentication routes
    apiRouter.post(
      "/auth/login",
      validationMiddleware.validateLogin,
      this.handleLogin,
    );
    apiRouter.post(
      "/auth/refresh",
      authMiddleware(this.config.auth),
      this.handleRefresh,
    );
    apiRouter.post(
      "/auth/logout",
      authMiddleware(this.config.auth),
      this.handleLogout,
    );

    // Core API routes (protected)
    apiRouter.use("/core", authMiddleware(this.config.auth));
    apiRouter.use("/rhythm", authMiddleware(this.config.auth));
    apiRouter.use("/harmony", authMiddleware(this.config.auth));
    apiRouter.use("/composition", authMiddleware(this.config.auth));
    apiRouter.use("/analysis", authMiddleware(this.config.auth));

    // Admin routes (require admin permissions)
    apiRouter.use("/admin", authMiddleware(this.config.auth, ["admin"]));

    // Mount API router
    this.app.use(this.config.apiPrefix || "/api/v1", apiRouter);

    // Catch-all route for undefined endpoints
    this.app.use("*", (req: Request, res: Response) => {
      res.status(404).json({
        error: "Not Found",
        message: `Endpoint ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use(
      (error: Error, req: Request, res: Response, _next: NextFunction) => {
        // TODO: Use next() for error handling if needed
        const schillingerError = SchillingerError.handle(error);

        // Log error for monitoring
        // Log error for monitoring
        console.error("Gateway Error:", {
          error: schillingerError.toJSON(),
          request: {
            method: req.method,
            url: req.url,
            headers: req.headers,
            body: req.body,
          },
          timestamp: new Date().toISOString(),
        });

        // Send error response
        res.status(this.getStatusCode(schillingerError)).json({
          error: schillingerError.name,
          message: schillingerError.message,
          code: schillingerError.code,
          suggestions: schillingerError.suggestions,
          timestamp: new Date().toISOString(),
        });
      },
    );
  }

  private requestLogger = (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      console.log(
        `${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`,
      );
    });

    next();
  };

  private handleLogin = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // This would integrate with your actual authentication service
      const { email, password, apiKey } = req.body;

      // Placeholder implementation - replace with actual auth logic
      if (apiKey) {
        // API key authentication
        res.json({
          success: true,
          token: "mock-jwt-token",
          permissions: ["core", "analysis"],
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      } else if (email && password) {
        // Email/password authentication
        res.json({
          success: true,
          token: "mock-jwt-token",
          permissions: ["core"],
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        });
      } else {
        throw new AuthenticationError("Invalid credentials provided");
      }
    } catch (error) {
      next(error);
    }
  };

  private handleRefresh = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Token refresh logic would go here
      res.json({
        success: true,
        token: "new-mock-jwt-token",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (error) {
      next(error);
    }
  };

  private handleLogout = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      // Logout logic would go here (invalidate token, etc.)
      res.json({
        success: true,
        message: "Successfully logged out",
      });
    } catch (error) {
      next(error);
    }
  };

  private getStatusCode(error: SchillingerError): number {
    switch (error.category) {
      case "validation":
        return 400;
      case "auth":
        return 401;
      case "network":
        return error.code === "RATE_LIMIT_ERROR" ? 429 : 500;
      case "processing":
        return 500;
      default:
        return 500;
    }
  }

  /**
   * Start the gateway server
   */
  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.config.port, () => {
        console.log(`Schillinger Gateway running on port ${this.config.port}`);
        console.log(
          `API available at http://localhost:${this.config.port}${this.config.apiPrefix}`,
        );
        resolve();
      });
    });
  }

  /**
   * Get the Express app instance for testing
   */
  public getApp(): Express {
    return this.app;
  }

  /**
   * Add custom route handler
   */
  public addRoute(
    method: "get" | "post" | "put" | "delete" | "patch",
    path: string,
    handler: (req: Request, res: Response, next: NextFunction) => void,
    requireAuth: boolean = true,
  ): void {
    const fullPath = `${this.config.apiPrefix}${path}`;

    if (requireAuth) {
      this.app[method](fullPath, authMiddleware(this.config.auth), handler);
    } else {
      this.app[method](fullPath, handler);
    }
  }
}
