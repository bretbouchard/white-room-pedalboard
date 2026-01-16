/**
 * Provenance Query API for comprehensive provenance tracking
 */

import {
  ProvenanceChainBuilder,
  ProvenanceNode,
  ProvenanceQuery,
  ProvenanceVisualizationData,
} from './provenance-chain';
import { DAIDClient } from './client';
import { ProvenanceRecord } from './types';

export interface ProvenanceAPIConfig {
  baseUrl?: string;
  apiKey?: string;
  agentId: string;
  enableCaching?: boolean;
  cacheTimeout?: number;
}

export interface ProvenanceSearchResult {
  nodes: ProvenanceNode[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface ProvenanceAnalytics {
  entityCounts: Record<string, number>;
  operationCounts: Record<string, number>;
  agentCounts: Record<string, number>;
  timelineData: {
    timestamp: string;
    count: number;
  }[];
  relationshipStats: {
    totalRelationships: number;
    averageDepth: number;
    maxDepth: number;
    orphanedNodes: number;
  };
}

/**
 * Comprehensive provenance query API
 */
export class ProvenanceAPI {
  private chainBuilder: ProvenanceChainBuilder;
  private client: DAIDClient;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private config: ProvenanceAPIConfig;

  constructor(config: ProvenanceAPIConfig) {
    this.config = {
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      ...config,
    };

    this.chainBuilder = new ProvenanceChainBuilder();
    this.client = new DAIDClient({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      agentId: config.agentId,
    });
  }

  /**
   * Add a provenance record to tracking
   */
  async addProvenanceRecord(daid: string, record: ProvenanceRecord): Promise<void> {
    // Add to local chain builder
    this.chainBuilder.addRecord(daid, record);

    // Store remotely if configured
    if (this.config.baseUrl) {
      try {
        await this.storeRemoteRecord(daid, record);
      } catch (error) {
        // TODO: Implement proper logging infrastructure
// console.warn('Failed to store provenance record remotely:', error);
      }
    }

    // Clear related cache entries
    this.invalidateCache(`entity:${record.entityType}:${record.entityId}`);
    this.invalidateCache(`daid:${daid}`);
  }

  /**
   * Get complete provenance chain for a DAID
   */
  async getProvenanceChain(daid: string): Promise<ProvenanceNode[]> {
    const cacheKey = `chain:${daid}`;

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getFromCache<ProvenanceNode[]>(cacheKey);
      if (cached) return cached;
    }

    // Try local chain builder first
    const chain = this.chainBuilder.getChain(daid);
    if (chain) {
      const nodes = Array.from(chain.nodes.values());
      this.setCache(cacheKey, nodes);
      return nodes;
    }

    // Fallback to remote API
    if (this.config.baseUrl) {
      try {
        const remoteChain = await this.fetchRemoteChain(daid);
        this.setCache(cacheKey, remoteChain);
        return remoteChain;
      } catch (error) {
        // TODO: Implement proper logging infrastructure
// console.warn('Failed to fetch remote provenance chain:', error);
      }
    }

    return [];
  }

  /**
   * Get provenance chain for an entity
   */
  async getEntityProvenance(entityType: string, entityId: string): Promise<ProvenanceNode[]> {
    const cacheKey = `entity:${entityType}:${entityId}`;

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getFromCache<ProvenanceNode[]>(cacheKey);
      if (cached) return cached;
    }

    // Try local chain builder first
    const chain = this.chainBuilder.getEntityChain(entityType, entityId);
    if (chain) {
      const nodes = Array.from(chain.nodes.values());
      this.setCache(cacheKey, nodes);
      return nodes;
    }

    // Fallback to remote API
    if (this.config.baseUrl) {
      try {
        const remoteChain = await this.fetchRemoteEntityChain(entityType, entityId);
        this.setCache(cacheKey, remoteChain);
        return remoteChain;
      } catch (error) {
        // TODO: Implement proper logging infrastructure
// console.warn('Failed to fetch remote entity provenance:', error);
      }
    }

    return [];
  }

  /**
   * Query provenance records with advanced filtering
   */
  async queryProvenance(
    query: ProvenanceQuery,
    options?: {
      limit?: number;
      offset?: number;
      sortBy?: 'timestamp' | 'depth' | 'entityType';
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<ProvenanceSearchResult> {
    const cacheKey = `query:${JSON.stringify({ query, options })}`;

    // Check cache first
    if (this.config.enableCaching) {
      const cached = this.getFromCache<ProvenanceSearchResult>(cacheKey);
      if (cached) return cached;
    }

    // Query local chain builder
    let nodes = this.chainBuilder.queryProvenance(query);

    // Apply sorting
    if (options?.sortBy) {
      nodes = this.sortNodes(nodes, options.sortBy, options.sortOrder || 'desc');
    }

    // Apply pagination
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    const totalCount = nodes.length;
    const paginatedNodes = nodes.slice(offset, offset + limit);
    const hasMore = offset + limit < totalCount;

    const result: ProvenanceSearchResult = {
      nodes: paginatedNodes,
      totalCount,
      hasMore,
      nextCursor: hasMore ? `${offset + limit}` : undefined,
    };

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * Get ancestors of a DAID
   */
  async getAncestors(daid: string, maxDepth?: number): Promise<ProvenanceNode[]> {
    const cacheKey = `ancestors:${daid}:${maxDepth || 'all'}`;

    if (this.config.enableCaching) {
      const cached = this.getFromCache<ProvenanceNode[]>(cacheKey);
      if (cached) return cached;
    }

    const ancestors = this.chainBuilder.getAncestors(daid, maxDepth);
    this.setCache(cacheKey, ancestors);
    return ancestors;
  }

  /**
   * Get descendants of a DAID
   */
  async getDescendants(daid: string, maxDepth?: number): Promise<ProvenanceNode[]> {
    const cacheKey = `descendants:${daid}:${maxDepth || 'all'}`;

    if (this.config.enableCaching) {
      const cached = this.getFromCache<ProvenanceNode[]>(cacheKey);
      if (cached) return cached;
    }

    const descendants = this.chainBuilder.getDescendants(daid, maxDepth);
    this.setCache(cacheKey, descendants);
    return descendants;
  }

  /**
   * Get siblings of a DAID
   */
  async getSiblings(daid: string): Promise<ProvenanceNode[]> {
    const cacheKey = `siblings:${daid}`;

    if (this.config.enableCaching) {
      const cached = this.getFromCache<ProvenanceNode[]>(cacheKey);
      if (cached) return cached;
    }

    const siblings = this.chainBuilder.getSiblings(daid);
    this.setCache(cacheKey, siblings);
    return siblings;
  }

  /**
   * Generate visualization data for provenance
   */
  async getVisualizationData(
    daid: string,
    options?: {
      maxDepth?: number;
      includeAncestors?: boolean;
      includeDescendants?: boolean;
      layout?: 'hierarchical' | 'force' | 'circular';
    }
  ): Promise<ProvenanceVisualizationData> {
    const cacheKey = `visualization:${daid}:${JSON.stringify(options)}`;

    if (this.config.enableCaching) {
      const cached = this.getFromCache<ProvenanceVisualizationData>(cacheKey);
      if (cached) return cached;
    }

    const visualizationData = this.chainBuilder.generateVisualizationData(daid, options);
    this.setCache(cacheKey, visualizationData);
    return visualizationData;
  }

  /**
   * Get provenance analytics
   */
  async getAnalytics(
    timeRange?: { start: string; end: string },
    entityTypes?: string[]
  ): Promise<ProvenanceAnalytics> {
    const cacheKey = `analytics:${JSON.stringify({ timeRange, entityTypes })}`;

    if (this.config.enableCaching) {
      const cached = this.getFromCache<ProvenanceAnalytics>(cacheKey);
      if (cached) return cached;
    }

    const query: ProvenanceQuery = {
      timeRange,
      ...(entityTypes && entityTypes.length > 0 ? { entityType: entityTypes[0] } : {}),
    };

    const allNodes = this.chainBuilder.queryProvenance(query);
    const analytics = this.calculateAnalytics(allNodes);

    this.setCache(cacheKey, analytics);
    return analytics;
  }

  /**
   * Validate provenance integrity
   */
  async validateIntegrity(daid: string): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const chain = this.chainBuilder.getChain(daid);
    if (!chain) {
      return {
        isValid: false,
        issues: ['DAID not found in provenance tracking'],
        suggestions: ['Ensure the DAID was properly recorded'],
      };
    }

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check for orphaned nodes
    for (const [_nodeDaid, node] of chain.nodes) {
      if (node.parents.length > 0) {
        for (const parentDAID of node.parents) {
          if (!chain.nodes.has(parentDAID)) {
            issues.push(`Missing parent node: ${parentDAID}`);
            suggestions.push('Ensure all parent DAIDs are properly recorded');
          }
        }
      }
    }

    // Check for circular references
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCircularReference = (nodeDaid: string): boolean => {
      if (recursionStack.has(nodeDaid)) return true;
      if (visited.has(nodeDaid)) return false;

      visited.add(nodeDaid);
      recursionStack.add(nodeDaid);

      const node = chain.nodes.get(nodeDaid);
      if (node) {
        for (const childDAID of node.children) {
          if (hasCircularReference(childDAID)) return true;
        }
      }

      recursionStack.delete(nodeDaid);
      return false;
    };

    for (const nodeDaid of chain.nodes.keys()) {
      if (hasCircularReference(nodeDaid)) {
        issues.push('Circular reference detected in provenance chain');
        suggestions.push('Review and fix circular dependencies');
        break;
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions,
    };
  }

  /**
   * Export provenance data
   */
  async exportProvenance(
    format: 'json' | 'csv' | 'graphml',
    query?: ProvenanceQuery
  ): Promise<string> {
    const nodes = query ? this.chainBuilder.queryProvenance(query) : [];

    switch (format) {
      case 'json':
        return JSON.stringify(nodes, null, 2);

      case 'csv':
        return this.exportToCSV(nodes);

      case 'graphml':
        return this.exportToGraphML(nodes);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Import provenance data
   */
  async importProvenance(data: string, format: 'json'): Promise<void> {
    if (format !== 'json') {
      throw new Error(`Unsupported import format: ${format}`);
    }

    const chainData = JSON.parse(data);
    this.chainBuilder.importChain(chainData);

    // Clear cache after import
    this.clearCache();
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    // This is a simplified implementation
    return {
      size: this.cache.size,
      hitRate: 0.85, // Placeholder
    };
  }

  private async storeRemoteRecord(daid: string, record: ProvenanceRecord): Promise<void> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/provenance/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
      body: JSON.stringify({ daid, record }),
    });

    if (!response.ok) {
      throw new Error(`Failed to store provenance record: ${response.statusText}`);
    }
  }

  private async fetchRemoteChain(daid: string): Promise<ProvenanceNode[]> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/provenance/chain/${daid}`, {
      headers: {
        ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch provenance chain: ${response.statusText}`);
    }

    const data = await response.json();
    return data.nodes || [];
  }

  private async fetchRemoteEntityChain(
    entityType: string,
    entityId: string
  ): Promise<ProvenanceNode[]> {
    const response = await fetch(
      `${this.config.baseUrl}/api/v1/provenance/entity/${entityType}/${entityId}`,
      {
        headers: {
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch entity provenance: ${response.statusText}`);
    }

    const data = await response.json();
    return data.nodes || [];
  }

  private sortNodes(nodes: ProvenanceNode[], sortBy: string, sortOrder: string): ProvenanceNode[] {
    return nodes.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'timestamp':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'depth':
          comparison = a.depth - b.depth;
          break;
        case 'entityType':
          comparison = a.components.entityType.localeCompare(b.components.entityType);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  private calculateAnalytics(nodes: ProvenanceNode[]): ProvenanceAnalytics {
    const entityCounts: Record<string, number> = {};
    const operationCounts: Record<string, number> = {};
    const agentCounts: Record<string, number> = {};
    const timelineData: { timestamp: string; count: number }[] = [];

    let totalDepth = 0;
    let maxDepth = 0;
    let orphanedNodes = 0;

    for (const node of nodes) {
      // Count entities
      entityCounts[node.components.entityType] =
        (entityCounts[node.components.entityType] || 0) + 1;

      // Count operations
      operationCounts[node.record.operation] = (operationCounts[node.record.operation] || 0) + 1;

      // Count agents
      agentCounts[node.components.agentId] = (agentCounts[node.components.agentId] || 0) + 1;

      // Track depth stats
      totalDepth += node.depth;
      maxDepth = Math.max(maxDepth, node.depth);

      // Count orphaned nodes
      if (node.parents.length === 0 && node.children.length === 0) {
        orphanedNodes++;
      }
    }

    // Generate timeline data (simplified - group by day)
    const timelineMap = new Map<string, number>();
    for (const node of nodes) {
      const date = new Date(node.timestamp).toISOString().split('T')[0];
      if (date) {
        timelineMap.set(date, (timelineMap.get(date) || 0) + 1);
      }
    }

    for (const [date, count] of timelineMap) {
      timelineData.push({ timestamp: date, count });
    }

    timelineData.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return {
      entityCounts,
      operationCounts,
      agentCounts,
      timelineData,
      relationshipStats: {
        totalRelationships: nodes.reduce((sum, node) => sum + node.parents.length, 0),
        averageDepth: nodes.length > 0 ? totalDepth / nodes.length : 0,
        maxDepth,
        orphanedNodes,
      },
    };
  }

  private exportToCSV(nodes: ProvenanceNode[]): string {
    const headers = [
      'DAID',
      'EntityType',
      'EntityId',
      'AgentId',
      'Operation',
      'Timestamp',
      'Depth',
      'Parents',
    ];
    const rows = nodes.map(node => [
      node.daid,
      node.components.entityType,
      node.components.entityId,
      node.components.agentId,
      node.record.operation,
      node.timestamp,
      node.depth.toString(),
      node.parents.join(';'),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  private exportToGraphML(nodes: ProvenanceNode[]): string {
    // Simplified GraphML export
    let graphml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    graphml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
    graphml += '<graph id="provenance" edgedefault="directed">\n';

    // Add nodes
    for (const node of nodes) {
      graphml += `<node id="${node.daid}">\n`;
      graphml += `<data key="entityType">${node.components.entityType}</data>\n`;
      graphml += `<data key="entityId">${node.components.entityId}</data>\n`;
      graphml += `<data key="operation">${node.record.operation}</data>\n`;
      graphml += '</node>\n';
    }

    // Add edges
    for (const node of nodes) {
      for (const parentDAID of node.parents) {
        graphml += `<edge source="${parentDAID}" target="${node.daid}"/>\n`;
      }
    }

    graphml += '</graph>\n</graphml>';
    return graphml;
  }

  private getFromCache<T>(key: string): T | null {
    if (!this.config.enableCaching) return null;

    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > (this.config.cacheTimeout || 300000)) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: unknown): void {
    if (!this.config.enableCaching) return;

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  private invalidateCache(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}
