/**
 * Tests for the credential storage system
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CredentialStorage } from "../credential-storage";
import { AuthCredentials, TokenInfo } from "../types";

// Mock localStorage and sessionStorage
const mockStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock window object
Object.defineProperty(global, "window", {
  value: {
    localStorage: mockStorage,
    sessionStorage: mockStorage,
  },
  writable: true,
});

describe("CredentialStorage", () => {
  let credentialStorage: CredentialStorage;

  beforeEach(() => {
    credentialStorage = new CredentialStorage({
      secure: true,
      prefix: "test_sdk",
      encrypt: false,
    });

    // Reset mocks
    mockStorage.getItem.mockReset();
    mockStorage.setItem.mockReset();
    mockStorage.removeItem.mockReset();
    mockStorage.clear.mockReset();
  });

  describe("credential storage", () => {
    it("should store and retrieve credentials", async () => {
      const credentials: AuthCredentials = {
        apiKey: "test-api-key-12345",
      };

      mockStorage.getItem.mockReturnValueOnce(JSON.stringify(credentials));

      await credentialStorage.storeCredentials(credentials);
      const retrieved = await credentialStorage.getCredentials();

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        "test_sdk_credentials",
        JSON.stringify(credentials),
      );
      expect(retrieved).toEqual(credentials);
    });

    it("should handle missing credentials gracefully", async () => {
      mockStorage.getItem.mockReturnValueOnce(null);

      const retrieved = await credentialStorage.getCredentials();
      expect(retrieved).toBeNull();
    });

    it("should handle corrupted credential data", async () => {
      mockStorage.getItem.mockReturnValueOnce("invalid-json");

      const retrieved = await credentialStorage.getCredentials();
      expect(retrieved).toBeNull();
    });
  });

  describe("token storage", () => {
    it("should store and retrieve token info", async () => {
      const tokenInfo: TokenInfo = {
        token: "test-token",
        refreshToken: "test-refresh-token",
        expiresAt: new Date("2024-12-31T23:59:59Z"),
        permissions: ["rhythm:read"],
        tokenType: "bearer",
      };

      const storedData = JSON.stringify(tokenInfo);
      mockStorage.getItem.mockReturnValueOnce(storedData);

      await credentialStorage.storeTokenInfo(tokenInfo);
      const retrieved = await credentialStorage.getTokenInfo();

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        "test_sdk_token",
        storedData,
      );
      expect(retrieved).toEqual(tokenInfo);
      expect(retrieved?.expiresAt).toBeInstanceOf(Date);
    });

    it("should handle token info without expiry date", async () => {
      const tokenInfo: TokenInfo = {
        token: "test-token",
        permissions: ["rhythm:read"],
        tokenType: "bearer",
      };

      const storedData = JSON.stringify(tokenInfo);
      mockStorage.getItem.mockReturnValueOnce(storedData);

      await credentialStorage.storeTokenInfo(tokenInfo);
      const retrieved = await credentialStorage.getTokenInfo();

      expect(retrieved).toEqual(tokenInfo);
      expect(retrieved?.expiresAt).toBeUndefined();
    });
  });

  describe("encryption", () => {
    it("should encrypt and decrypt data when encryption is enabled", async () => {
      const encryptedStorage = new CredentialStorage({
        secure: true,
        prefix: "test_sdk",
        encrypt: true,
        encryptionKey: "test-encryption-key",
      });

      const credentials: AuthCredentials = {
        apiKey: "secret-api-key",
      };

      await encryptedStorage.storeCredentials(credentials);

      // The stored data should be encrypted (base64 encoded)
      const storedCall = vi.mocked(mockStorage.setItem).mock.calls[0];
      expect(storedCall[1]).not.toEqual(JSON.stringify(credentials));
      expect(storedCall[1]).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 pattern

      // Mock the encrypted data retrieval
      mockStorage.getItem.mockReturnValueOnce(storedCall[1]);

      const retrieved = await encryptedStorage.getCredentials();
      expect(retrieved).toEqual(credentials);
    });

    it("should throw error when encryption key is missing", async () => {
      const encryptedStorage = new CredentialStorage({
        encrypt: true,
        // No encryption key provided
      });

      const credentials: AuthCredentials = {
        apiKey: "secret-api-key",
      };

      await expect(
        encryptedStorage.storeCredentials(credentials),
      ).rejects.toThrow("Encryption key required for encrypted storage");
    });

    it("should handle decryption errors gracefully", async () => {
      const encryptedStorage = new CredentialStorage({
        encrypt: true,
        encryptionKey: "test-key",
      });

      // Mock corrupted encrypted data
      mockStorage.getItem.mockReturnValueOnce("corrupted-data");

      const retrieved = await encryptedStorage.getCredentials();
      expect(retrieved).toBeNull();
    });
  });

  describe("storage fallback", () => {
    it("should use memory storage when browser storage is not available", async () => {
      // Create storage without browser environment
      const originalWindow = global.window;
      (global as any).window = undefined;

      const memoryStorage = new CredentialStorage({
        secure: true,
        prefix: "test_sdk",
      });

      const credentials: AuthCredentials = {
        apiKey: "test-api-key",
      };

      await memoryStorage.storeCredentials(credentials);
      const retrieved = await memoryStorage.getCredentials();

      expect(retrieved).toEqual(credentials);

      // Restore window
      (global as any).window = originalWindow;
    });

    it("should use localStorage when secure is false", async () => {
      const insecureStorage = new CredentialStorage({
        secure: false,
        prefix: "test_sdk",
      });

      const credentials: AuthCredentials = {
        apiKey: "test-api-key",
      };

      await insecureStorage.storeCredentials(credentials);

      // Should use localStorage instead of sessionStorage
      expect(mockStorage.setItem).toHaveBeenCalledWith(
        "test_sdk_credentials",
        JSON.stringify(credentials),
      );
    });
  });

  describe("cleanup", () => {
    it("should clear all stored data", async () => {
      await credentialStorage.clearAll();

      expect(mockStorage.removeItem).toHaveBeenCalledWith(
        "test_sdk_credentials",
      );
      expect(mockStorage.removeItem).toHaveBeenCalledWith("test_sdk_token");
    });

    it("should handle cleanup errors gracefully", async () => {
      mockStorage.removeItem.mockImplementationOnce(() => {
        throw new Error("Storage error");
      });

      // Should not throw
      await expect(credentialStorage.clearAll()).resolves.not.toThrow();
    });
  });

  describe("statistics", () => {
    it("should provide storage statistics", () => {
      mockStorage.getItem.mockReturnValueOnce("some-credentials");
      mockStorage.getItem.mockReturnValueOnce("some-token");

      const stats = credentialStorage.getStats();

      expect(stats).toEqual({
        hasCredentials: true,
        hasToken: true,
        storageType: "secure",
        encrypted: false,
      });
    });

    it("should detect memory storage type", () => {
      // Create storage without browser environment
      const originalWindow = global.window;
      (global as any).window = undefined;

      const memoryStorage = new CredentialStorage();
      const stats = memoryStorage.getStats();

      expect(stats.storageType).toBe("memory");

      // Restore window
      (global as any).window = originalWindow;
    });
  });
});
