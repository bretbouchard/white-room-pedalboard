/**
 * In-memory storage adapter for caching
 *
 * Simple implementation of CacheStorageAdapter using an in-memory Map.
 * This is used as a fallback when persistent storage is not available.
 */

import type { CacheEntry, CacheStorageAdapter } from "./cache-types";

export class InMemoryStorageAdapter implements CacheStorageAdapter {
  private storage: Map<string, CacheEntry>;

  constructor() {
    this.storage = new Map();
  }

  async get(key: string): Promise<CacheEntry | null> {
    const entry = this.storage.get(key);
    return entry ?? null;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    this.storage.set(key, entry);
  }

  async delete(key: string): Promise<boolean> {
    return this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }

  async keys(): Promise<string[]> {
    return Array.from(this.storage.keys());
  }

  async size(): Promise<number> {
    return this.storage.size;
  }
}
