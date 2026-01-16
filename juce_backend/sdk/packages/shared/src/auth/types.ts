// Minimal audit log entry for admin middleware
export interface AuditLogEntry {
  timestamp: Date;
  userId?: string;
  operation: string;
  resource: string;
  action: string;
  allowed: boolean;
  reason?: string;
  context?: Record<string, any>;
}
/**
 * Authentication and authorization type definitions
 */

export interface AuthCredentials {
  apiKey?: string;
  clerkToken?: string;
  customAuth?: Record<string, any>;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  permissions?: Permission[];
  expiresAt?: Date;
  user?: UserInfo;
}

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

export interface UserInfo {
  id: string;
  email?: string;
  name?: string;
  roles: string[];
  permissions: string[];
  metadata?: Record<string, any>;
}

export interface TokenInfo {
  token: string;
  refreshToken?: string;
  expiresAt?: Date;
  permissions: string[];
  user?: UserInfo;
  tokenType: 'bearer' | 'api-key' | 'custom';
}

export interface AuthState {
  isAuthenticated: boolean;
  user?: UserInfo;
  permissions: string[];
  tokenInfo?: TokenInfo;
  lastAuthTime?: Date;
  authMethod?: 'apiKey' | 'clerkToken' | 'customAuth';
}

export interface AuthConfig {
  apiUrl: string;
  timeout?: number;
  retries?: number;
  autoRefresh?: boolean;
  refreshThreshold?: number; // Minutes before expiry to refresh
  secureStorage?: boolean;
  storagePrefix?: string;
  debug?: boolean;
}

export interface CredentialStorageOptions {
  secure?: boolean;
  prefix?: string;
  encrypt?: boolean;
  encryptionKey?: string;
}

export interface PermissionCheck {
  resource: string;
  action: string;
  context?: Record<string, any>;
}

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  requiredPermissions?: string[];
  missingPermissions?: string[];
}

export interface RoleDefinition {
  name: string;
  permissions: string[];
  inherits?: string[];
  conditions?: Record<string, any>;
}

export interface AuthEvent {
  // Added 'refresh-failed' because TokenManager emits a specialized
  // event when refresh attempts fail; keep backwards-compatible
  // 'error' event as well.
  type:
    | 'login'
    | 'logout'
    | 'refresh'
    | 'refresh-failed'
    | 'permission-denied'
    | 'token-expired'
    | 'error';
  timestamp: Date;
  data?: any;
  error?: Error;
}

export interface AuthEventListener {
  (event: AuthEvent): void;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export interface AuthManagerOptions extends AuthConfig {
  credentialStorage?: CredentialStorageOptions;
  retryConfig?: RetryConfig;
  permissionCacheTtl?: number;
  auditLogging?: boolean;
}
