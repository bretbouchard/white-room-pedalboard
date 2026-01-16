/**
 * Theory Cache
 * Caches theory computation results
 */

export class TheoryCache {
  private cache: Map<string, any> = new Map();
  private config: any;

  constructor(config?: any) {
    this.config = config || {};
  }

  get(key: string): any | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: any): void {
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
