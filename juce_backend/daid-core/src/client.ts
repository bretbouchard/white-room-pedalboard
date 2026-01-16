import { DAIDGenerator } from './generator';
import { ProvenanceRecord, SystemDAIDPatterns } from './types';

export interface DAIDClientConfig {
  baseUrl?: string;
  apiKey?: string;
  agentId: string;
  timeout?: number;
}

export class DAIDClient {
  private config: Required<DAIDClientConfig>;

  constructor(config: DAIDClientConfig) {
    this.config = {
      baseUrl: config.baseUrl !== undefined ? config.baseUrl : 'http://localhost:8080',
      apiKey: config.apiKey || '',
      agentId: config.agentId,
      timeout: config.timeout || 5000,
    };
  }

  /**
   * Create a new provenance record and return its DAID
   */
  async createProvenanceRecord(record: Omit<ProvenanceRecord, 'agentId'>): Promise<string> {
    const daid = DAIDGenerator.generate({
      ...record,
      agentId: this.config.agentId,
    });

    // Store the record if we have a backend URL
    if (this.config.baseUrl && this.config.baseUrl !== 'http://localhost:8080') {
      try {
        await this.storeRecord(daid, { ...record, agentId: this.config.agentId });
      } catch (error) {
        // Continue anyway - DAID generation is local-first
        // TODO: Implement proper error logging infrastructure
      }
    }

    return daid;
  }

  /**
   * Get provenance chain for an entity
   */
  async getProvenanceChain(entityType: string, entityId: string): Promise<string[]> {
    if (!this.config.baseUrl) {
      throw new Error('Base URL required for provenance chain retrieval');
    }

    const response = await this.fetch(`/api/v1/provenance/chain/${entityType}/${entityId}`);

    if (!response.ok) {
      throw new Error(`Failed to get provenance chain: ${response.statusText}`);
    }

    const data = (await response.json()) as { chain?: string[] };
    return data.chain || [];
  }

  /**
   * Invalidate cache for specific DAIDs
   */
  async invalidateCache(daids: string[]): Promise<void> {
    if (!this.config.baseUrl) {
      return; // No-op for local-only usage
    }

    try {
      await this.fetch('/api/v1/cache/invalidate', {
        method: 'POST',
        body: JSON.stringify({ daids }),
      });
    } catch (error) {
      // TODO: Implement proper cache invalidation error handling
    }
  }

  /**
   * Discover DAID patterns across systems
   */
  async discoverSystemPatterns(): Promise<SystemDAIDPatterns> {
    if (!this.config.baseUrl) {
      return {};
    }

    try {
      const response = await this.fetch('/api/v1/systems/patterns');
      if (response.ok) {
        return (await response.json()) as SystemDAIDPatterns;
      }
    } catch (error) {
      // TODO: Implement proper system pattern discovery error handling
    }

    return {};
  }

  /**
   * Generate DAID locally without storing
   */
  generateDAID(params: Omit<Parameters<typeof DAIDGenerator.generate>[0], 'agentId'>): string {
    return DAIDGenerator.generate({
      ...params,
      agentId: this.config.agentId,
    });
  }

  private async storeRecord(daid: string, record: ProvenanceRecord): Promise<void> {
    const response = await this.fetch('/api/v1/provenance/records', {
      method: 'POST',
      body: JSON.stringify({ daid, record }),
    });

    if (!response.ok) {
      throw new Error(`Failed to store DAID record: ${response.statusText}`);
    }
  }

  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}
