/**
 * Unified authentication manager that coordinates all authentication and authorization functionality
 */
import {
  AuthenticationError,
  ConfigurationError,
  SchillingerError,
  InvalidCredentialsError,
} from '../errors';

import {
  AuthCredentials,
  AuthResult,
  AuthState,
  // AuthConfig,
  AuthManagerOptions,
  UserInfo,
  TokenInfo,
  PermissionCheck,
  PermissionResult,
  AuthEvent,
  AuthEventListener,
  // ...existing code...
} from './types';
import { CredentialStorage } from './credential-storage';
import { TokenManager } from './token-manager';
import { PermissionManager } from './permission-manager';

export class AuthManager {
  private credentialStorage: CredentialStorage;
  private tokenManager: TokenManager;
  private permissionManager: PermissionManager;
  private authState: AuthState;
  private eventListeners: AuthEventListener[] = [];
  private config: AuthManagerOptions;

  constructor(options: AuthManagerOptions) {
    this.config = {
      timeout: 30000,
      retries: 3,
      autoRefresh: true,
      refreshThreshold: 5,
      secureStorage: true,
      storagePrefix: 'schillinger_sdk',
      debug: false,
      permissionCacheTtl: 300000, // 5 minutes
      auditLogging: false,
      ...options,
    };

    // Initialize storage
    this.credentialStorage = new CredentialStorage({
      secure: this.config.secureStorage,
      prefix: this.config.storagePrefix,
      ...this.config.credentialStorage,
    });

    // Initialize token manager
    this.tokenManager = new TokenManager(this.config, this.credentialStorage);

    // Initialize permission manager
    this.permissionManager = new PermissionManager(
      this.config.permissionCacheTtl,
      this.config.auditLogging
    );

    // Initialize auth state
    this.authState = {
      isAuthenticated: false,
      permissions: [],
    };

    // Set up event forwarding
    this.setupEventForwarding();

    // Load existing authentication state
    this.loadAuthState();
  }

  /**
   * Authenticate with the Schillinger System
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    try {
      // Lightweight debug logging to help triage tests where
      // authenticate() resolves to undefined. Avoid logging secrets;
      // only surface credential type and non-sensitive flags.
      try {
        console.log('[AuthManager] authenticate called', {
          credentialType: this.getCredentialType(credentials),
          hasApiKey: !!(credentials as any)?.apiKey,
          hasClerkToken: !!(credentials as any)?.clerkToken,
          hasCustomAuth: !!(credentials as any)?.customAuth,
        });
      } catch (e) {
        // swallow logging errors
      }

      this.validateCredentials(credentials);

      this.log('Starting authentication', {
        credentialType: this.getCredentialType(credentials),
      });

      // Store credentials for future refresh
      await this.credentialStorage.storeCredentials(credentials);

      // Perform authentication
      const authResult = await this.performAuthentication(credentials);

      // Quick shape debug to catch undefined results in tests
      try {
        console.log('[AuthManager] authenticate result', {
          success: !!authResult?.success,
          hasToken: !!authResult?.token,
          userId: authResult?.user?.id,
          expiresAt: authResult?.expiresAt,
        });
      } catch (e) {
        // swallow logging errors
      }

      if (authResult.success && authResult.token) {
        // Normalize expiresAt: server may return ISO string; ensure Date
        const normalizedExpiresAt = authResult.expiresAt
          ? typeof authResult.expiresAt === 'string'
            ? new Date(authResult.expiresAt)
            : authResult.expiresAt
          : undefined;

        // Create token info
        const tokenInfo: TokenInfo = {
          token: authResult.token,
          refreshToken: authResult.refreshToken,
          expiresAt: normalizedExpiresAt,
          permissions: authResult.permissions?.map(p => p.resource) || [],
          user: authResult.user,
          tokenType: this.getTokenType(credentials),
        };

        // Set token in token manager
        await this.tokenManager.setTokenInfo(tokenInfo);

        // Update auth state
        this.updateAuthState({
          isAuthenticated: true,
          user: authResult.user,
          permissions: tokenInfo.permissions,
          tokenInfo,
          lastAuthTime: new Date(),
          authMethod: this.getCredentialType(credentials) as any,
        });

        this.log('Authentication successful', {
          userId: authResult.user?.id,
          permissions: tokenInfo.permissions,
          expiresAt: authResult.expiresAt,
        });

        return authResult;
      } else {
        throw new AuthenticationError('Authentication failed');
      }
    } catch (error) {
      this.log('Authentication failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Clear any stored credentials on auth failure
      await this.credentialStorage.clearAll();

      // Update auth state
      this.updateAuthState({
        isAuthenticated: false,
        permissions: [],
      });

      // Preserve known SchillingerError subclasses (e.g. InvalidCredentialsError)
      // or any error that looks like a Schillinger error (has a `code` or
      // a descriptive `name`) so tests and callers can inspect specific
      // error types. Wrap only unexpected errors into a generic
      // AuthenticationError.
      const looksLikeSchillinger = (err: any) => {
        if (!err) return false;
        if (err instanceof SchillingerError) return true;
        if (typeof err.code === 'string' && err.code.length > 0) return true;
        if (typeof err.name === 'string' && err.name.endsWith('Error'))
          return true;
        return false;
      };

      const authError =
        looksLikeSchillinger(error) ||
        error instanceof ConfigurationError ||
        error instanceof AuthenticationError
          ? (error as Error)
          : new AuthenticationError('Authentication failed');

      this.emitEvent({
        type: 'error',
        timestamp: new Date(),
        error: authError,
      });

      throw authError;
    }
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && this.tokenManager.isTokenValid();
  }

  /**
   * Get current authentication state
   */
  getAuthState(): Readonly<AuthState> {
    return { ...this.authState };
  }

  /**
   * Get current user information
   */
  getCurrentUser(): UserInfo | undefined {
    return this.authState.user ? { ...this.authState.user } : undefined;
  }

  /**
   * Get user permissions
   */
  getUserPermissions(): string[] {
    return [...this.authState.permissions];
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(
    resource: string,
    action: string,
    context?: Record<string, any>
  ): Promise<boolean> {
    if (!this.isAuthenticated() || !this.authState.user) {
      return false;
    }

    try {
      const result = await this.permissionManager.checkPermission(
        this.authState.user,
        { resource, action, context }
      );
      return result.allowed;
    } catch (error) {
      this.log('Permission check failed', { resource, action, error });
      return false;
    }
  }

  /**
   * Check permission and get detailed result
   */
  async checkPermission(
    resource: string,
    action: string,
    context?: Record<string, any>
  ): Promise<PermissionResult> {
    if (!this.isAuthenticated() || !this.authState.user) {
      return {
        allowed: false,
        reason: 'Not authenticated',
      };
    }

    return this.permissionManager.checkPermission(this.authState.user, {
      resource,
      action,
      context,
    });
  }

  /**
   * Require permission and throw error if not allowed
   */
  async requirePermission(
    resource: string,
    action: string,
    context?: Record<string, any>
  ): Promise<void> {
    if (!this.isAuthenticated() || !this.authState.user) {
      throw new AuthenticationError('Authentication required');
    }

    await this.permissionManager.requirePermission(this.authState.user, {
      resource,
      action,
      context,
    });
  }

  /**
   * Check multiple permissions at once
   */
  async checkMultiplePermissions(
    checks: PermissionCheck[]
  ): Promise<PermissionResult[]> {
    if (!this.isAuthenticated() || !this.authState.user) {
      return checks.map(() => ({
        allowed: false,
        reason: 'Not authenticated',
      }));
    }

    return this.permissionManager.checkMultiplePermissions(
      this.authState.user,
      checks
    );
  }

  /**
   * Get authorization header for API requests
   */
  getAuthorizationHeader(): string | null {
    return this.tokenManager.getAuthorizationHeader();
  }

  /**
   * Get current token information
   */
  getTokenInfo(): TokenInfo | undefined {
    return this.tokenManager.getTokenInfo();
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<void> {
    try {
      await this.tokenManager.refreshToken();

      // Update auth state with new token info
      const tokenInfo = this.tokenManager.getTokenInfo();
      if (tokenInfo) {
        this.updateAuthState({
          ...this.authState,
          tokenInfo,
          permissions: tokenInfo.permissions,
        });
      }
    } catch (error) {
      this.log('Token refresh failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Clear auth state on refresh failure
      await this.logout();
      throw error;
    }
  }

  /**
   * Logout and clear all authentication data
   */
  async logout(): Promise<void> {
    try {
      this.log('Logging out');

      // Clear token manager
      await this.tokenManager.clearToken();

      // Clear credential storage
      await this.credentialStorage.clearAll();

      // Clear permission cache
      this.permissionManager.clearPermissionCache();

      // Update auth state
      this.updateAuthState({
        isAuthenticated: false,
        permissions: [],
        user: undefined,
        tokenInfo: undefined,
        lastAuthTime: undefined,
        authMethod: undefined,
      });

      this.log('Logout successful');
    } catch (error) {
      this.log('Logout error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Continue with logout even if there are errors
    }
  }

  /**
   * Get effective permissions for current user
   */
  getEffectivePermissions(): string[] {
    if (!this.authState.user) {
      return [];
    }

    return this.permissionManager.getUserEffectivePermissions(
      this.authState.user
    );
  }

  /**
   * Add authentication event listener
   */
  addEventListener(listener: AuthEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove authentication event listener
   */
  removeEventListener(listener: AuthEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Get authentication statistics
   */
  getStats(): {
    isAuthenticated: boolean;
    tokenStats: ReturnType<TokenManager['getStats']>;
    permissionStats: ReturnType<PermissionManager['getStats']>;
    storageStats: ReturnType<CredentialStorage['getStats']>;
    lastAuthTime?: Date;
    authMethod?: string;
  } {
    return {
      isAuthenticated: this.isAuthenticated(),
      tokenStats: this.tokenManager.getStats(),
      permissionStats: this.permissionManager.getStats(),
      storageStats: this.credentialStorage.getStats(),
      lastAuthTime: this.authState.lastAuthTime,
      authMethod: this.authState.authMethod,
    };
  }

  /**
   * Get audit log entries
   */
  getAuditLog(userId?: string, resource?: string, limit?: number) {
    return this.permissionManager.getAuditLog(userId, resource, limit);
  }

  /**
   * Clear permission cache
   */
  clearPermissionCache(): void {
    this.permissionManager.clearPermissionCache();
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.tokenManager.dispose();
    this.permissionManager.dispose();
    this.eventListeners = [];
  }

  // Private helper methods

  /**
   * Perform the actual authentication request
   */
  private async performAuthentication(
    credentials: AuthCredentials
  ): Promise<AuthResult> {
    const url = `${this.config.apiUrl}/auth/login`;

    const response = await this.makeRequest(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 401) {
        throw new InvalidCredentialsError(
          errorData.message || 'Invalid credentials'
        );
      }

      throw new AuthenticationError(
        errorData.message ||
          `Authentication failed: ${response.status} ${response.statusText}`,
        { status: response.status, statusText: response.statusText }
      );
    }

    return response.json();
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    let lastError: Error;

    for (let attempt = 1; attempt <= (this.config.retries || 3); attempt++) {
      try {
        // Create timeout signal if AbortSignal.timeout is available
        const timeoutMs = this.config.timeout || 30000;
        let signal: AbortSignal | undefined;

        if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
          signal = AbortSignal.timeout(timeoutMs);
        } else if (options.signal) {
          signal = options.signal;
        }

        const response = await fetch(url, {
          ...options,
          ...(signal && { signal }),
        });

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt === (this.config.retries || 3)) {
          break;
        }

        // Wait before retry
        await this.delay(1000 * attempt);
      }
    }

    throw lastError!;
  }

  /**
   * Validate authentication credentials
   */
  private validateCredentials(credentials: AuthCredentials): void {
    if (!credentials || typeof credentials !== 'object') {
      throw new ConfigurationError('Credentials must be an object', {
        error: 'Credentials must be an object',
      } as any);
    }

    const hasApiKey =
      credentials.apiKey && typeof credentials.apiKey === 'string';
    const hasClerkToken =
      credentials.clerkToken && typeof credentials.clerkToken === 'string';
    const hasCustomAuth =
      credentials.customAuth && typeof credentials.customAuth === 'object';

    if (!hasApiKey && !hasClerkToken && !hasCustomAuth) {
      throw new ConfigurationError(
        'Must provide apiKey, clerkToken, or customAuth',
        { error: 'Must provide apiKey, clerkToken, or customAuth' } as any
      );
    }

    // Validate API key format
    if (hasApiKey && credentials.apiKey!.length < 10) {
      throw new ConfigurationError('API key appears to be invalid', {
        error: 'API key appears to be invalid',
      } as any);
    }

    // Validate Clerk token format
    if (hasClerkToken && !credentials.clerkToken!.startsWith('sess_')) {
      throw new ConfigurationError('Clerk token appears to be invalid', {
        error: 'Clerk token appears to be invalid',
      } as any);
    }
  }

  /**
   * Get credential type for logging
   */
  private getCredentialType(credentials: AuthCredentials): string {
    if (credentials.apiKey) return 'apiKey';
    if (credentials.clerkToken) return 'clerkToken';
    if (credentials.customAuth) return 'customAuth';
    return 'unknown';
  }

  /**
   * Get token type based on credentials
   */
  private getTokenType(credentials: AuthCredentials): TokenInfo['tokenType'] {
    if (credentials.apiKey) return 'api-key';
    if (credentials.clerkToken) return 'bearer';
    if (credentials.customAuth) return 'custom';
    return 'bearer';
  }

  /**
   * Update authentication state
   */
  private updateAuthState(newState: Partial<AuthState>): void {
    this.authState = { ...this.authState, ...newState };

    this.emitEvent({
      type: newState.isAuthenticated ? 'login' : 'logout',
      timestamp: new Date(),
      data: {
        isAuthenticated: this.authState.isAuthenticated,
        user: this.authState.user,
        permissions: this.authState.permissions,
      },
    });
  }

  /**
   * Load existing authentication state on initialization
   */
  private async loadAuthState(): Promise<void> {
    try {
      const tokenInfo = this.tokenManager.getTokenInfo();

      if (tokenInfo && this.tokenManager.isTokenValid()) {
        this.updateAuthState({
          isAuthenticated: true,
          user: tokenInfo.user,
          permissions: tokenInfo.permissions,
          tokenInfo,
        });

        this.log('Loaded existing authentication state', {
          userId: tokenInfo.user?.id,
          permissions: tokenInfo.permissions,
        });
      }
    } catch (error) {
      this.log('Failed to load auth state', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Set up event forwarding from sub-managers
   */
  private setupEventForwarding(): void {
    // Forward token manager events
    this.tokenManager.addEventListener(event => {
      this.emitEvent(event);

      // Update auth state based on token events
      if (event.type === 'logout' || event.type === 'token-expired') {
        this.updateAuthState({
          isAuthenticated: false,
          permissions: [],
          user: undefined,
          tokenInfo: undefined,
        });
      }
    });

    // Forward permission manager events
    this.permissionManager.addEventListener(event => {
      this.emitEvent(event);
    });
  }

  /**
   * Emit authentication event
   */
  private emitEvent(event: AuthEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        this.log('Error in auth event listener', { error });
      }
    });
  }

  /**
   * Log debug information
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      const timestamp = new Date().toISOString();
      console.log(`[AuthManager ${timestamp}] ${message}`, data || '');
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
