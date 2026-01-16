/**
 * Comprehensive provenance tracking and chain building system
 */

import { DAIDComponents, ProvenanceRecord } from './types';
import { DAIDGenerator } from './generator';

// Define proper type for edge metadata to replace 'any'
export interface ProvenanceEdgeMetadata {
  [key: string]: unknown;
}

// Define proper type for visualization node
export interface VisualizationNode {
  id: string;
  label: string;
  type: string;
  metadata: Record<string, unknown>;
  position?: { x: number; y: number };
}

// Define proper type for visualization edge
export interface VisualizationEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string;
}

// Define proper type for chain export data
export interface ChainExportData {
  rootDAID: string;
  nodes: ProvenanceNode[];
  edges: ProvenanceEdge[];
  metadata: {
    totalNodes: number;
    maxDepth: number;
    createdAt: string;
    lastUpdated: string;
  };
}

export interface ProvenanceNode {
  daid: string;
  components: DAIDComponents;
  record: ProvenanceRecord;
  timestamp: string;
  depth: number;
  children: string[];
  parents: string[];
}

export interface ProvenanceChain {
  rootDAID: string;
  nodes: Map<string, ProvenanceNode>;
  edges: ProvenanceEdge[];
  metadata: {
    totalNodes: number;
    maxDepth: number;
    createdAt: string;
    lastUpdated: string;
  };
}

export interface ProvenanceEdge {
  source: string;
  target: string;
  relationship: 'parent' | 'child' | 'sibling' | 'derived';
  metadata?: ProvenanceEdgeMetadata;
}

export interface ProvenanceQuery {
  entityType?: string;
  entityId?: string;
  agentId?: string;
  operation?: string;
  timeRange?: {
    start: string;
    end: string;
  };
  maxDepth?: number;
  includeMetadata?: boolean;
}

export interface ProvenanceVisualizationData {
  nodes: VisualizationNode[];
  edges: VisualizationEdge[];
  layout: {
    type: 'hierarchical' | 'force' | 'circular';
    direction?: 'top-bottom' | 'left-right';
  };
}

/**
 * Provenance chain builder for comprehensive tracking
 */
export class ProvenanceChainBuilder {
  private chains: Map<string, ProvenanceChain> = new Map();
  private nodeIndex: Map<string, string> = new Map(); // DAID -> Chain ID mapping
  private entityIndex: Map<string, Set<string>> = new Map(); // Entity -> DAIDs mapping

  /**
   * Add a provenance record to the chain
   */
  addRecord(daid: string, record: ProvenanceRecord): void {
    const components = DAIDGenerator.parse(daid);
    if (!components) {
      throw new Error(`Invalid DAID format: ${daid}`);
    }

    // Create or get chain
    const chainId = this.getOrCreateChainId(daid, record);
    let chain = this.chains.get(chainId);

    if (!chain) {
      chain = this.createNewChain(daid, components, record);
      this.chains.set(chainId, chain);
    }

    // Create provenance node
    const node: ProvenanceNode = {
      daid,
      components,
      record,
      timestamp: components.timestamp,
      depth: this.calculateDepth(record.parentDAIDs || []),
      children: [],
      parents: record.parentDAIDs || [],
    };

    // Add node to chain
    chain.nodes.set(daid, node);
    chain.metadata.totalNodes = chain.nodes.size;
    chain.metadata.maxDepth = Math.max(chain.metadata.maxDepth, node.depth);
    chain.metadata.lastUpdated = new Date().toISOString();

    // Update indexes
    this.nodeIndex.set(daid, chainId);
    this.updateEntityIndex(components.entityType, components.entityId, daid);

    // Create edges for parent relationships
    this.createEdges(chain, daid, record.parentDAIDs || []);

    // Update children references in parent nodes
    this.updateParentChildren(chain, daid, record.parentDAIDs || []);
  }

  /**
   * Get complete provenance chain for a DAID
   */
  getChain(daid: string): ProvenanceChain | null {
    const chainId = this.nodeIndex.get(daid);
    return chainId ? this.chains.get(chainId) || null : null;
  }

  /**
   * Get provenance chain for an entity
   */
  getEntityChain(entityType: string, entityId: string): ProvenanceChain | null {
    const entityKey = `${entityType}:${entityId}`;
    const daids = this.entityIndex.get(entityKey);

    if (!daids || daids.size === 0) {
      return null;
    }

    // Get the most recent DAID for this entity
    const sortedDAIDs = Array.from(daids).sort((a, b) => {
      const aComponents = DAIDGenerator.parse(a);
      const bComponents = DAIDGenerator.parse(b);
      if (!aComponents || !bComponents) return 0;
      return new Date(bComponents.timestamp).getTime() - new Date(aComponents.timestamp).getTime();
    });

    const latestDAID = sortedDAIDs[0];
    return latestDAID ? this.getChain(latestDAID) : null;
  }

  /**
   * Query provenance records
   */
  queryProvenance(query: ProvenanceQuery): ProvenanceNode[] {
    const results: ProvenanceNode[] = [];

    for (const chain of this.chains.values()) {
      for (const node of chain.nodes.values()) {
        if (this.matchesQuery(node, query)) {
          results.push(node);
        }
      }
    }

    // Sort by timestamp (most recent first)
    return results.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get ancestors of a DAID (all parent nodes)
   */
  getAncestors(daid: string, maxDepth?: number): ProvenanceNode[] {
    const chain = this.getChain(daid);
    if (!chain) return [];

    const ancestors: ProvenanceNode[] = [];
    const visited = new Set<string>();
    const queue: { daid: string; depth: number }[] = [{ daid, depth: 0 }];

    while (queue.length > 0) {
      const { daid: currentDAID, depth } = queue.shift()!;

      if (visited.has(currentDAID) || (maxDepth && depth >= maxDepth)) {
        continue;
      }

      visited.add(currentDAID);
      const node = chain.nodes.get(currentDAID);

      if (node && currentDAID !== daid) {
        ancestors.push(node);
      }

      if (node) {
        for (const parentDAID of node.parents) {
          queue.push({ daid: parentDAID, depth: depth + 1 });
        }
      }
    }

    return ancestors;
  }

  /**
   * Get descendants of a DAID (all child nodes)
   */
  getDescendants(daid: string, maxDepth?: number): ProvenanceNode[] {
    const chain = this.getChain(daid);
    if (!chain) return [];

    const descendants: ProvenanceNode[] = [];
    const visited = new Set<string>();
    const queue: { daid: string; depth: number }[] = [{ daid, depth: 0 }];

    while (queue.length > 0) {
      const { daid: currentDAID, depth } = queue.shift()!;

      if (visited.has(currentDAID) || (maxDepth && depth >= maxDepth)) {
        continue;
      }

      visited.add(currentDAID);
      const node = chain.nodes.get(currentDAID);

      if (node && currentDAID !== daid) {
        descendants.push(node);
      }

      if (node) {
        for (const childDAID of node.children) {
          queue.push({ daid: childDAID, depth: depth + 1 });
        }
      }
    }

    return descendants;
  }

  /**
   * Get siblings of a DAID (nodes with same parents)
   */
  getSiblings(daid: string): ProvenanceNode[] {
    const chain = this.getChain(daid);
    if (!chain) return [];

    const node = chain.nodes.get(daid);
    if (!node || node.parents.length === 0) return [];

    const siblings: ProvenanceNode[] = [];
    const siblingDAIDs = new Set<string>();

    // Find all nodes that share at least one parent
    for (const parentDAID of node.parents) {
      const parentNode = chain.nodes.get(parentDAID);
      if (parentNode) {
        for (const childDAID of parentNode.children) {
          if (childDAID !== daid) {
            siblingDAIDs.add(childDAID);
          }
        }
      }
    }

    for (const siblingDAID of siblingDAIDs) {
      const siblingNode = chain.nodes.get(siblingDAID);
      if (siblingNode) {
        siblings.push(siblingNode);
      }
    }

    return siblings;
  }

  /**
   * Generate visualization data for a provenance chain
   */
  generateVisualizationData(
    daid: string,
    options?: {
      maxDepth?: number;
      includeAncestors?: boolean;
      includeDescendants?: boolean;
      layout?: 'hierarchical' | 'force' | 'circular';
    }
  ): ProvenanceVisualizationData {
    const chain = this.getChain(daid);
    if (!chain) {
      return {
        nodes: [],
        edges: [],
        layout: { type: 'hierarchical', direction: 'top-bottom' },
      };
    }

    const maxDepth = options?.maxDepth || 10;
    const includeAncestors = options?.includeAncestors !== false;
    const includeDescendants = options?.includeDescendants !== false;
    const layout = options?.layout || 'hierarchical';

    const relevantNodes = new Set<string>([daid]);

    // Add ancestors
    if (includeAncestors) {
      const ancestors = this.getAncestors(daid, maxDepth);
      ancestors.forEach(node => relevantNodes.add(node.daid));
    }

    // Add descendants
    if (includeDescendants) {
      const descendants = this.getDescendants(daid, maxDepth);
      descendants.forEach(node => relevantNodes.add(node.daid));
    }

    // Generate visualization nodes
    const visNodes = Array.from(relevantNodes)
      .map(nodeDaid => {
        const node = chain.nodes.get(nodeDaid);
        if (!node) return null;

        return {
          id: nodeDaid,
          label: `${node.components.entityType}:${node.components.entityId}`,
          type: node.components.entityType,
          metadata: {
            agentId: node.components.agentId,
            operation: node.record.operation,
            timestamp: node.timestamp,
            depth: node.depth,
          },
        };
      })
      .filter((node): node is NonNullable<typeof node> => node !== null);

    // Generate visualization edges
    const visEdges: VisualizationEdge[] = [];
    for (const edge of chain.edges) {
      if (relevantNodes.has(edge.source) && relevantNodes.has(edge.target)) {
        visEdges.push({
          id: `${edge.source}-${edge.target}`,
          source: edge.source,
          target: edge.target,
          type: edge.relationship,
          label: edge.relationship,
        });
      }
    }

    return {
      nodes: visNodes,
      edges: visEdges,
      layout: {
        type: layout,
        direction: layout === 'hierarchical' ? 'top-bottom' : undefined,
      },
    };
  }

  /**
   * Export provenance chain as JSON
   */
  exportChain(daid: string): ChainExportData | null {
    const chain = this.getChain(daid);
    if (!chain) return null;

    return {
      rootDAID: chain.rootDAID,
      nodes: Array.from(chain.nodes.entries()).map(([_daid, node]) => ({
        ...node,
      })),
      edges: chain.edges,
      metadata: chain.metadata,
    };
  }

  /**
   * Import provenance chain from JSON
   */
  importChain(chainData: ChainExportData): void {
    const chain: ProvenanceChain = {
      rootDAID: chainData.rootDAID,
      nodes: new Map(),
      edges: chainData.edges || [],
      metadata: chainData.metadata || {
        totalNodes: 0,
        maxDepth: 0,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    };

    // Reconstruct nodes map
    for (const nodeData of chainData.nodes || []) {
      chain.nodes.set(nodeData.daid, {
        daid: nodeData.daid,
        components: nodeData.components,
        record: nodeData.record,
        timestamp: nodeData.timestamp,
        depth: nodeData.depth,
        children: nodeData.children || [],
        parents: nodeData.parents || [],
      });

      // Update indexes
      this.nodeIndex.set(nodeData.daid, chain.rootDAID);
      if (nodeData.components) {
        this.updateEntityIndex(
          nodeData.components.entityType,
          nodeData.components.entityId,
          nodeData.daid
        );
      }
    }

    this.chains.set(chain.rootDAID, chain);
  }

  /**
   * Clear all provenance data
   */
  clear(): void {
    this.chains.clear();
    this.nodeIndex.clear();
    this.entityIndex.clear();
  }

  /**
   * Get statistics about provenance tracking
   */
  getStatistics(): {
    totalChains: number;
    totalNodes: number;
    totalEntities: number;
    averageChainLength: number;
    maxChainDepth: number;
  } {
    let totalNodes = 0;
    let maxDepth = 0;

    for (const chain of this.chains.values()) {
      totalNodes += chain.nodes.size;
      maxDepth = Math.max(maxDepth, chain.metadata.maxDepth);
    }

    return {
      totalChains: this.chains.size,
      totalNodes,
      totalEntities: this.entityIndex.size,
      averageChainLength: this.chains.size > 0 ? totalNodes / this.chains.size : 0,
      maxChainDepth: maxDepth,
    };
  }

  private getOrCreateChainId(daid: string, record: ProvenanceRecord): string {
    // If this DAID has parents, use the chain of the first parent
    if (record.parentDAIDs && record.parentDAIDs.length > 0) {
      const firstParentDAID = record.parentDAIDs[0];
      if (firstParentDAID) {
        const parentChainId = this.nodeIndex.get(firstParentDAID);
        if (parentChainId) {
          return parentChainId;
        }
      }
    }

    // Otherwise, this DAID becomes the root of a new chain
    return daid;
  }

  private createNewChain(
    rootDAID: string,
    _components: DAIDComponents,
    _record: ProvenanceRecord
  ): ProvenanceChain {
    return {
      rootDAID,
      nodes: new Map(),
      edges: [],
      metadata: {
        totalNodes: 0,
        maxDepth: 0,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  private calculateDepth(parentDAIDs: string[]): number {
    if (parentDAIDs.length === 0) return 0;

    let maxParentDepth = 0;
    for (const parentDAID of parentDAIDs) {
      const chain = this.getChain(parentDAID);
      if (chain) {
        const parentNode = chain.nodes.get(parentDAID);
        if (parentNode) {
          maxParentDepth = Math.max(maxParentDepth, parentNode.depth);
        }
      }
    }

    return maxParentDepth + 1;
  }

  private createEdges(chain: ProvenanceChain, daid: string, parentDAIDs: string[]): void {
    for (const parentDAID of parentDAIDs) {
      const edge: ProvenanceEdge = {
        source: parentDAID,
        target: daid,
        relationship: 'parent',
      };
      chain.edges.push(edge);
    }
  }

  private updateParentChildren(chain: ProvenanceChain, daid: string, parentDAIDs: string[]): void {
    for (const parentDAID of parentDAIDs) {
      const parentNode = chain.nodes.get(parentDAID);
      if (parentNode && !parentNode.children.includes(daid)) {
        parentNode.children.push(daid);
      }
    }
  }

  private updateEntityIndex(entityType: string, entityId: string, daid: string): void {
    const entityKey = `${entityType}:${entityId}`;
    if (!this.entityIndex.has(entityKey)) {
      this.entityIndex.set(entityKey, new Set());
    }
    this.entityIndex.get(entityKey)!.add(daid);
  }

  private matchesQuery(node: ProvenanceNode, query: ProvenanceQuery): boolean {
    if (query.entityType && node.components.entityType !== query.entityType) {
      return false;
    }

    if (query.entityId && node.components.entityId !== query.entityId) {
      return false;
    }

    if (query.agentId && node.components.agentId !== query.agentId) {
      return false;
    }

    if (query.operation && node.record.operation !== query.operation) {
      return false;
    }

    if (query.timeRange) {
      const nodeTime = new Date(node.timestamp).getTime();
      const startTime = new Date(query.timeRange.start).getTime();
      const endTime = new Date(query.timeRange.end).getTime();

      if (nodeTime < startTime || nodeTime > endTime) {
        return false;
      }
    }

    return true;
  }
}
