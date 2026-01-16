import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CacheManager } from "../cache/cache-manager";
import { MemoryCache } from "../cache/memory-cache";
import { InMemoryStorageAdapter } from "../cache/in-memory-storage-adapter";
import {
  generateCacheKey,
  calculateEntrySize,
  isExpired,
  compressData,
  decompressData,
  formatBytes,
} from "../cache/cache-utils";
import { CacheConfiguration, CacheKey } from "../cache/cache-types";

let fetchMock: any;

beforeEach(() => {
  console.log("TEST: beforeEach START");
  fetchMock = vi.fn((_url, _options) => {
    // Default: always return a valid response object
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({}),
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  console.log("TEST: beforeEach END");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Cache Utils", () => {
  describe("generateCacheKey", () => {
    it("should generate consistent keys for same parameters", () => {
      const keyData: CacheKey = {
        namespace: "rhythm",
        operation: "generateResultant",
        parameters: { a: 3, b: 2 },
      };
      const key1 = generateCacheKey(keyData);
      const key2 = generateCacheKey(keyData);
      expect(key1).toBe(key2);
    });
    it("should generate different keys for different parameters", () => {
      const keyData1: CacheKey = {
        namespace: "rhythm",
        operation: "generateResultant",
        parameters: { a: 3, b: 2 },
      };
      const keyData2: CacheKey = {
        namespace: "rhythm",
        operation: "generateResultant",
        parameters: { a: 4, b: 3 },
      };
      const key1 = generateCacheKey(keyData1);
      const key2 = generateCacheKey(keyData2);
      expect(key1).not.toBe(key2);
    });
    it("should sort parameters for consistent key generation", () => {
      const keyData1: CacheKey = {
        namespace: "rhythm",
        operation: "generateResultant",
        parameters: { a: 3, b: 2, c: 1 },
      };
      const keyData2: CacheKey = {
        namespace: "rhythm",
        operation: "generateResultant",
        parameters: { c: 1, a: 3, b: 2 },
      };
      const key1 = generateCacheKey(keyData1);
      const key2 = generateCacheKey(keyData2);
      expect(key1).toBe(key2);
    });
  });
  describe("calculateEntrySize", () => {
    it("should calculate entry size correctly", () => {
      const entry = {
        key: "test",
        value: { data: "test" },
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
      };
      const size = calculateEntrySize(entry);
      expect(size).toBeGreaterThan(0);
    });
    it("should use provided size if available", () => {
      const entry = {
        key: "test",
        value: { data: "test" },
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
        size: 100,
      };
      const size = calculateEntrySize(entry);
      expect(size).toBe(100);
    });
  });
  describe("isExpired", () => {
    it("should return false for entries without TTL", () => {
      const entry = {
        key: "test",
        value: "test",
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
      };
      expect(isExpired(entry)).toBe(false);
    });
    it("should return false for non-expired entries", () => {
      const entry = {
        key: "test",
        value: "test",
        timestamp: Date.now(),
        ttl: 60000,
        accessCount: 0,
        lastAccessed: Date.now(),
      };
      expect(isExpired(entry)).toBe(false);
    });
    it("should return true for expired entries", () => {
      const entry = {
        key: "test",
        value: "test",
        timestamp: Date.now() - 120000,
        ttl: 60000,
        accessCount: 0,
        lastAccessed: Date.now() - 120000,
      };
      expect(isExpired(entry)).toBe(true);
    });
  });
  describe("compression", () => {
    it("should compress and decompress data correctly", () => {
      const originalData = {
        pattern: [1, 2, 3, 4, 5],
        metadata: { complexity: 0.5 },
      };
      const compressed = compressData(originalData);
      const decompressed = decompressData(compressed);
      expect(decompressed).toEqual(originalData);
    });
  });
  describe("formatBytes", () => {
    it("should format bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1024 * 1024)).toBe("1 MB");
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
    });
  });
});

describe("MemoryCache", () => {
  let cache: MemoryCache;
  beforeEach(() => {
    cache = new MemoryCache({
      ttl: 60000,
      maxSize: 1024 * 1024,
      maxEntries: 100,
    });
  });
  afterEach(() => {
    cache.destroy();
  });
  it("should store and retrieve values", async () => {
    await cache.set("test", "value");
    const result = await cache.get("test");
    expect(result).toBe("value");
  });
  it("should return null for non-existent keys", async () => {
    const result = await cache.get("nonexistent");
    expect(result).toBeNull();
  });
  it("should handle multiple operations", async () => {
    const entries = new Map([
      ["key1", "value1"],
      ["key2", "value2"],
      ["key3", "value3"],
    ]);
    await cache.setMultiple(entries);
    const results = await cache.getMultiple([
      "key1",
      "key2",
      "key3",
      "nonexistent",
    ]);
    expect(results.get("key1")).toBe("value1");
    expect(results.get("key2")).toBe("value2");
    expect(results.get("key3")).toBe("value3");
    expect(results.get("nonexistent")).toBeNull();
  });
});

describe("CacheManager", () => {
  let cacheManager: CacheManager;
  let config: CacheConfiguration;
  beforeEach(() => {
    console.log("TEST: CacheManager beforeEach START");
    config = {
      memory: {
        ttl: 60000,
        maxSize: 1024 * 1024,
        maxEntries: 100,
      },
      persistent: {
        ttl: 24 * 60 * 60 * 1000,
        maxSize: 100 * 1024 * 1024,
        maxEntries: 10000,
        storageAdapter: new InMemoryStorageAdapter(),
      },
      network: {
        ttl: 60 * 60 * 1000,
        endpoint: "/api/cache",
        timeout: 5000,
      },
      global: {
        enableCompression: true,
        enableEncryption: false,
        syncInterval: 60000,
        offlineMode: false,
      },
    };
    console.log("TEST: CacheManager before CacheManager constructor");
    cacheManager = new CacheManager(config);
    console.log("TEST: CacheManager after CacheManager constructor");
  });
  afterEach(() => {
    cacheManager.destroy();
  });
  it("should set and get values with multi-level fallback", async () => {
    // Minimal isolation test for cacheManager.set
    setTimeout(async () => {
      try {
        console.log("ISOLATION: before cacheManager.set");
        if (typeof cacheManager !== "undefined") {
          await cacheManager.set(
            { namespace: "iso", operation: "test", parameters: {} },
            { foo: "bar" },
          );
          console.log("ISOLATION: after cacheManager.set");
        } else {
          console.log("ISOLATION: cacheManager is undefined");
        }
      } catch (e) {
        console.error("ISOLATION: error in cacheManager.set", e);
      }
    }, 1000);
    console.log("TEST: set and get values with multi-level fallback - START");
    const keyData: CacheKey = {
      namespace: "rhythm",
      operation: "generateResultant",
      parameters: { a: 3, b: 2 },
    };
    // Always return a valid response for any fetch call
    fetchMock.mockImplementation((url, options) => {
      if (options && options.method === "PUT") {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({}),
        });
      }
      if (options && options.method === "HEAD") {
        return Promise.resolve({ ok: true, status: 200, statusText: "OK" });
      }
      // GET or other
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({
          key: "test",
          value: { pattern: [1, 2, 3] },
          timestamp: Date.now(),
          accessCount: 1,
          lastAccessed: Date.now(),
        }),
      });
    });
    console.log("TEST: before cacheManager.set");
    console.log("DEBUG typeof cacheManager.set:", typeof cacheManager.set);
    console.log("DEBUG cacheManager.set:", cacheManager.set);
    let proto = cacheManager;
    const protoChain = [];
    while (proto) {
      protoChain.push(proto.constructor && proto.constructor.name);
      proto = Object.getPrototypeOf(proto);
      if (proto === Object.prototype) break;
    }
    console.log("DEBUG cacheManager prototype chain:", protoChain);
    await cacheManager.set(keyData, { pattern: [1, 2, 3] });
    console.log("TEST: after cacheManager.set");
    console.log("TEST: before cacheManager.get");
    const result = await cacheManager.get(keyData);
    console.log("TEST: after cacheManager.get", result);
    expect(result).toEqual({ pattern: [1, 2, 3] });
    console.log("TEST: set and get values with multi-level fallback - END");
  }, 20000);
  it("should handle offline mode", async () => {
    console.log("TEST: handle offline mode - START");
    cacheManager.setOfflineMode(true);
    const keyData: CacheKey = {
      namespace: "rhythm",
      operation: "generateResultant",
      parameters: { a: 3, b: 2 },
    };
    fetchMock.mockImplementation((_url, _options) => {
      // Should not be called, but if it is, always resolve
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({}),
      });
    });
    console.log("TEST: before cacheManager.set (offline)");
    await cacheManager.set(keyData, { pattern: [1, 2, 3] });
    console.log("TEST: after cacheManager.set (offline)");
    console.log("TEST: before cacheManager.get (offline)");
    const result = await cacheManager.get(keyData);
    console.log("TEST: after cacheManager.get (offline)", result);
    expect(result).toEqual({ pattern: [1, 2, 3] });
    expect(global.fetch).not.toHaveBeenCalled();
    console.log("TEST: handle offline mode - END");
  }, 20000);
  it("should provide cache metrics", () => {
    const metrics = cacheManager.getMetrics();
    expect(metrics).toHaveLength(3);
    expect(metrics[0].level).toBe("memory");
    expect(metrics[1].level).toBe("persistent");
    expect(metrics[2].level).toBe("network");
  });
  it("should handle cache invalidation", async () => {
    console.log("TEST: handle cache invalidation - START");

    // Use offline mode to avoid network cache timing issues
    cacheManager.setOfflineMode(true);

    const keyData: CacheKey = {
      namespace: "rhythm",
      operation: "generateResultant",
      parameters: { a: 3, b: 2 },
    };

    console.log("TEST: before cacheManager.set (invalidate)");
    await cacheManager.set(keyData, { pattern: [1, 2, 3] });
    console.log("TEST: after cacheManager.set (invalidate)");
    console.log("TEST: before cacheManager.has (before invalidate)");
    const hasBefore = await cacheManager.has(keyData);
    console.log("TEST: after cacheManager.has (before invalidate)", hasBefore);
    expect(hasBefore).toBe(true);
    console.log("TEST: before cacheManager.invalidate");

    // Create a promise that resolves when invalidation completes
    // Use a timeout to prevent hanging if event never fires
    const invalidationPromise = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Invalidation event timeout"));
      }, 5000);

      // Listen for the invalidate event
      const listener = (event: any) => {
        if (event.type === "invalidate") {
          clearTimeout(timeout);
          resolve();
        }
      };

      cacheManager.addEventListener(listener);
    });

    // Trigger invalidation
    cacheManager.invalidate();

    // Wait for both the debounced invalidation (1000ms) and the event
    try {
      await Promise.all([
        invalidationPromise,
        new Promise((resolve) => setTimeout(resolve, 1100)),
      ]);
    } catch (error) {
      console.error("Invalidation failed:", error);
      throw error;
    }

    console.log("TEST: after cacheManager.invalidate");
    console.log("TEST: before cacheManager.has (after invalidate)");
    const hasAfter = await cacheManager.has(keyData);
    console.log("TEST: after cacheManager.has (after invalidate)", hasAfter);
    expect(hasAfter).toBe(false);
    console.log("TEST: handle cache invalidation - END");
  }, 20000);
  it("should handle configuration updates", () => {
    const newConfig = {
      global: {
        syncInterval: 30000,
        offlineMode: true,
      },
    };
    cacheManager.updateConfiguration(newConfig);
    const updatedConfig = cacheManager.getConfiguration();
    expect(updatedConfig.global.syncInterval).toBe(30000);
    expect(updatedConfig.global.offlineMode).toBe(true);
  });
});
