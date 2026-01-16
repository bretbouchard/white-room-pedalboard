/**
 * Secure credential storage system with encryption support
 */

import { CredentialStorageOptions, AuthCredentials, TokenInfo } from "./types";

export class CredentialStorage {
  private options: Required<CredentialStorageOptions>;
  private storageKey: string;

  constructor(options: CredentialStorageOptions = {}) {
    this.options = {
      secure: options.secure ?? true,
      prefix: options.prefix ?? "schillinger_sdk",
      encrypt: options.encrypt ?? false,
      encryptionKey: options.encryptionKey ?? "",
    };

    this.storageKey = `${this.options.prefix}_credentials`;
  }

  /**
   * Store credentials securely
   */
  async storeCredentials(credentials: AuthCredentials): Promise<void> {
    try {
      const data = this.options.encrypt
        ? await this.encrypt(JSON.stringify(credentials))
        : JSON.stringify(credentials);

      if (this.isSecureStorageAvailable()) {
        await this.storeSecurely(this.storageKey, data);
      } else {
        this.storeInMemory(this.storageKey, data);
      }
    } catch (error) {
      throw new Error(
        `Failed to store credentials: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Retrieve stored credentials
   */
  async getCredentials(): Promise<AuthCredentials | null> {
    try {
      let data: string | null;

      if (this.isSecureStorageAvailable()) {
        data = await this.getSecurely(this.storageKey);
      } else {
        data = this.getFromMemory(this.storageKey);
      }

      if (!data) {
        return null;
      }

      const decryptedData = this.options.encrypt
        ? await this.decrypt(data)
        : data;

      return JSON.parse(decryptedData);
    } catch (error) {
      console.warn("Failed to retrieve credentials:", error);
      return null;
    }
  }

  /**
   * Store token information
   */
  async storeTokenInfo(tokenInfo: TokenInfo): Promise<void> {
    try {
      const tokenKey = `${this.options.prefix}_token`;
      const data = this.options.encrypt
        ? await this.encrypt(JSON.stringify(tokenInfo))
        : JSON.stringify(tokenInfo);

      if (this.isSecureStorageAvailable()) {
        await this.storeSecurely(tokenKey, data);
      } else {
        this.storeInMemory(tokenKey, data);
      }
    } catch (error) {
      throw new Error(
        `Failed to store token info: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Retrieve stored token information
   */
  async getTokenInfo(): Promise<TokenInfo | null> {
    try {
      const tokenKey = `${this.options.prefix}_token`;
      let data: string | null;

      if (this.isSecureStorageAvailable()) {
        data = await this.getSecurely(tokenKey);
      } else {
        data = this.getFromMemory(tokenKey);
      }

      if (!data) {
        return null;
      }

      const decryptedData = this.options.encrypt
        ? await this.decrypt(data)
        : data;

      const tokenInfo = JSON.parse(decryptedData);

      // Convert expiresAt string back to Date if present
      if (tokenInfo.expiresAt) {
        tokenInfo.expiresAt = new Date(tokenInfo.expiresAt);
      }

      return tokenInfo;
    } catch (error) {
      console.warn("Failed to retrieve token info:", error);
      return null;
    }
  }

  /**
   * Clear all stored credentials and tokens
   */
  async clearAll(): Promise<void> {
    try {
      const credentialKey = this.storageKey;
      const tokenKey = `${this.options.prefix}_token`;

      if (this.isSecureStorageAvailable()) {
        await this.removeSecurely(credentialKey);
        await this.removeSecurely(tokenKey);
      } else {
        this.removeFromMemory(credentialKey);
        this.removeFromMemory(tokenKey);
      }
    } catch (error) {
      console.warn("Failed to clear stored data:", error);
    }
  }

  /**
   * Check if secure storage is available
   */
  private isSecureStorageAvailable(): boolean {
    if (typeof window !== "undefined") {
      // Browser environment - use localStorage/sessionStorage
      return this.options.secure
        ? typeof window.sessionStorage !== "undefined"
        : typeof window.localStorage !== "undefined";
    }

    if (typeof process !== "undefined" && process.versions?.node) {
      // Node.js environment - could use keytar or similar
      return false; // For now, fall back to memory storage
    }

    // React Native or other environments
    return false;
  }

  /**
   * Store data securely (browser)
   */
  private async storeSecurely(_key: string, data: string): Promise<void> {
    if (typeof window !== "undefined") {
      const storage = this.options.secure
        ? window.sessionStorage
        : window.localStorage;
      storage.setItem(_key, data);
    }
  }

  /**
   * Retrieve data securely (browser)
   */
  private async getSecurely(_key: string): Promise<string | null> {
    if (typeof window !== "undefined") {
      const storage = this.options.secure
        ? window.sessionStorage
        : window.localStorage;
      return storage.getItem(_key);
    }
    return null;
  }

  /**
   * Remove data securely (browser)
   */
  private async removeSecurely(_key: string): Promise<void> {
    if (typeof window !== "undefined") {
      const storage = this.options.secure
        ? window.sessionStorage
        : window.localStorage;
      storage.removeItem(_key);
    }
  }

  // In-memory storage fallback
  private memoryStorage = new Map<string, string>();

  private storeInMemory(_key: string, data: string): void {
    this.memoryStorage.set(_key, data);
  }

  private getFromMemory(_key: string): string | null {
    return this.memoryStorage.get(_key) || null;
  }

  private removeFromMemory(_key: string): void {
    this.memoryStorage.delete(_key);
  }

  /**
   * Simple encryption (for demonstration - use proper encryption in production)
   */
  private async encrypt(data: string): Promise<string> {
    if (!this.options.encryptionKey) {
      throw new Error("Encryption key required for encrypted storage");
    }

    // This is a simple XOR encryption for demonstration
    // In production, use proper encryption like AES
    const key = this.options.encryptionKey;
    let encrypted = "";

    for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(
        data.charCodeAt(i) ^ key.charCodeAt(i % key.length),
      );
    }

    return btoa(encrypted);
  }

  /**
   * Simple decryption (for demonstration - use proper decryption in production)
   */
  private async decrypt(encryptedData: string): Promise<string> {
    if (!this.options.encryptionKey) {
      throw new Error("Encryption key required for encrypted storage");
    }

    try {
      const encrypted = atob(encryptedData);
      const key = this.options.encryptionKey;
      let decrypted = "";

      for (let i = 0; i < encrypted.length; i++) {
        decrypted += String.fromCharCode(
          encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length),
        );
      }

      return decrypted;
    } catch (error) {
      throw new Error("Failed to decrypt data");
    }
  }

  /**
   * Get storage statistics
   */
  getStats(): {
    hasCredentials: boolean;
    hasToken: boolean;
    storageType: "secure" | "memory";
    encrypted: boolean;
  } {
    return {
      hasCredentials:
        this.memoryStorage.has(this.storageKey) ||
        (typeof window !== "undefined" &&
          (window.localStorage?.getItem(this.storageKey) !== null ||
            window.sessionStorage?.getItem(this.storageKey) !== null)),
      hasToken:
        this.memoryStorage.has(`${this.options.prefix}_token`) ||
        (typeof window !== "undefined" &&
          (window.localStorage?.getItem(`${this.options.prefix}_token`) !==
            null ||
            window.sessionStorage?.getItem(`${this.options.prefix}_token`) !==
              null)),
      storageType: this.isSecureStorageAvailable() ? "secure" : "memory",
      encrypted: this.options.encrypt,
    };
  }
}
