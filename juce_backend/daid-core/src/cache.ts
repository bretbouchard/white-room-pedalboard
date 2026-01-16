import { CacheInvalidationRule } from './types';
import { DAIDGenerator } from './generator';

export class CacheManager {
  private rules: Map<string, CacheInvalidationRule> = new Map();
  private cache: Map<string, unknown> = new Map();

  /**
   * Register cache invalidation rules
   */
  addRule(rule: CacheInvalidationRule): void {
    this.rules.set(rule.entityType, rule);
  }

  /**
   * Get cached data by DAID
   */
  get(daid: string): unknown | null {
    if (this.cache.has(daid)) {
      return this.cache.get(daid);
    }
    return null;
  }

  /**
   * Set cached data with DAID key
   */
  set(daid: string, data: unknown): void {
    this.cache.set(daid, data);
  }

  /**
   * Invalidate cache based on entity changes
   */
  invalidateByEntity(entityType: string, entityId: string): string[] {
    const invalidatedDAIDs: string[] = [];
    const rule = this.rules.get(entityType);

    if (!rule) {
      return invalidatedDAIDs;
    }

    // Find all DAIDs that need invalidation
    for (const [daid] of this.cache.entries()) {
      const components = DAIDGenerator.parse(daid);
      if (!components) continue;

      // Direct match
      if (components.entityType === entityType && components.entityId === entityId) {
        this.cache.delete(daid);
        invalidatedDAIDs.push(daid);
        continue;
      }

      // Cascade invalidation
      if (rule.cascadeTo.includes(components.entityType)) {
        this.cache.delete(daid);
        invalidatedDAIDs.push(daid);
      }
    }

    return invalidatedDAIDs;
  }

  /**
   * Invalidate specific DAIDs
   */
  invalidateDAIDs(daids: string[]): void {
    daids.forEach(daid => this.cache.delete(daid));
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; rules: number } {
    return {
      size: this.cache.size,
      rules: this.rules.size,
    };
  }
}
