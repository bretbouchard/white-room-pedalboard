/**
 * Simple cache functionality tests
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryCache } from "../cache/memory-cache";
import { generateCacheKey } from "../cache/cache-utils";
import { CacheKey } from "../cache/cache-types";

describe("Simple Cache Tests", () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache({
      ttl: 60000, // 1 minute
      maxEntries: 10,
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  it("should store and retrieve simple values", async () => {
    await cache.set("test-key", "test-value");
    const result = await cache.get("test-key");
    expect(result).toBe("test-value");
  });

  it("should handle complex objects", async () => {
    const complexObject = {
      pattern: [1, 2, 3, 4, 5],
      metadata: {
        complexity: 0.75,
        length: 5,
      },
      generators: { a: 3, b: 2 },
    };

    await cache.set("complex-key", complexObject);
    const result = await cache.get("complex-key");
    expect(result).toEqual(complexObject);
  });

  it("should generate consistent cache keys", () => {
    const keyData: CacheKey = {
      namespace: "test",
      operation: "generate",
      parameters: { a: 3, b: 2, option: "value" },
    };

    const key1 = generateCacheKey(keyData);
    const key2 = generateCacheKey(keyData);

    expect(key1).toBe(key2);
    expect(typeof key1).toBe("string");
    expect(key1.length).toBeGreaterThan(0);
  });

  it("should handle cache hits and misses", async () => {
    // Miss
    const miss = await cache.get("nonexistent");
    expect(miss).toBeNull();

    // Set and hit
    await cache.set("hit-test", "hit-value");
    const hit = await cache.get("hit-test");
    expect(hit).toBe("hit-value");

    // Check stats
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
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
      "missing",
    ]);

    expect(results.get("key1")).toBe("value1");
    expect(results.get("key2")).toBe("value2");
    expect(results.get("key3")).toBe("value3");
    expect(results.get("missing")).toBeNull();
  });

  it("should handle cache expiration", async () => {
    // Set with short TTL
    await cache.set("expire-test", "expire-value", 50); // 50ms

    // Should exist immediately
    expect(await cache.get("expire-test")).toBe("expire-value");

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Should be expired
    expect(await cache.get("expire-test")).toBeNull();
  });

  it("should handle cache clearing", async () => {
    await cache.set("clear1", "value1");
    await cache.set("clear2", "value2");

    expect(await cache.has("clear1")).toBe(true);
    expect(await cache.has("clear2")).toBe(true);

    await cache.clear();

    expect(await cache.has("clear1")).toBe(false);
    expect(await cache.has("clear2")).toBe(false);
  });

  it("should handle cache deletion", async () => {
    await cache.set("delete-test", "delete-value");
    expect(await cache.has("delete-test")).toBe(true);

    const deleted = await cache.delete("delete-test");
    expect(deleted).toBe(true);
    expect(await cache.has("delete-test")).toBe(false);

    // Deleting non-existent key should return false
    const notDeleted = await cache.delete("nonexistent");
    expect(notDeleted).toBe(false);
  });

  it("should provide cache statistics", async () => {
    await cache.set("stats1", "value1");
    await cache.set("stats2", "value2");
    await cache.get("stats1"); // Hit
    await cache.get("nonexistent"); // Miss

    const stats = cache.getStats();

    expect(stats.entries).toBe(2);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
    expect(stats.size).toBeGreaterThan(0);
  });

  it("should handle LRU eviction", async () => {
    // Fill cache to capacity (maxEntries = 10)
    for (let i = 0; i < 10; i++) {
      await cache.set(`key${i}`, `value${i}`);
    }

    // All entries should exist
    for (let i = 0; i < 10; i++) {
      expect(await cache.has(`key${i}`)).toBe(true);
    }

    // Add one more entry, should evict the least recently used
    await cache.set("key10", "value10");

    // Should have exactly 10 entries
    const stats = cache.getStats();
    expect(stats.entries).toBe(10);

    // The first key (least recently used) should be evicted
    expect(await cache.has("key0")).toBe(false);
    expect(await cache.has("key10")).toBe(true);
  });

  it("should emit events", async () => {
    const events: any[] = [];

    cache.addEventListener((event) => {
      events.push(event);
    });

    await cache.set("event-test", "event-value");
    await cache.get("event-test");
    await cache.delete("event-test");

    expect(events).toHaveLength(3);
    expect(events[0].type).toBe("set");
    expect(events[1].type).toBe("hit");
    expect(events[2].type).toBe("delete");

    events.forEach((event) => {
      expect(event.level).toBe("memory");
      expect(event.timestamp).toBeGreaterThan(0);
    });
  });
});
