import { SystemDAIDPatterns } from './types';

// Type definitions for OpenAPI spec
interface OpenAPIInfo {
  title?: string;
  version?: string;
  description?: string;
}

interface OpenAPIComponents {
  schemas?: Record<string, Record<string, unknown>>;
}

interface OpenAPISpec {
  info?: OpenAPIInfo;
  paths?: Record<string, Record<string, unknown>>;
  components?: OpenAPIComponents;
}

// Type definitions for MCP tools
interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: {
    properties?: Record<string, unknown>;
  };
}

interface MCPToolsResponse {
  tools?: MCPTool[];
}

// Type definitions for GraphQL schema
interface GraphQLField {
  name: string;
  type?: { name?: string };
}

interface GraphQLType extends Record<string, unknown> {
  name?: string;
  fields?: GraphQLField[];
}

interface GraphQLSchema {
  data?: {
    __schema?: {
      types?: GraphQLType[];
    };
  };
}

export interface SystemEndpoint {
  name: string;
  baseUrl: string;
  type: 'openapi' | 'mcp' | 'graphql';
  apiKey?: string;
  timeout?: number;
}

export interface DiscoveryOptions {
  includeMetadata?: boolean;
  maxConcurrency?: number;
  timeout?: number;
  retryAttempts?: number;
}

export interface DiscoveredPattern {
  entityType: string;
  operations: string[];
  agentIds: string[];
  endpoints: string[];
  metadata?: Record<string, unknown>;
}

export class SystemDiscovery {
  private endpoints: Map<string, SystemEndpoint> = new Map();
  private cache: Map<string, SystemDAIDPatterns> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Register a system endpoint for discovery
   */
  registerEndpoint(endpoint: SystemEndpoint): void {
    this.endpoints.set(endpoint.name, endpoint);
    // Clear cache for this system
    this.cache.delete(endpoint.name);
    this.cacheExpiry.delete(endpoint.name);
  }

  /**
   * Remove a system endpoint
   */
  unregisterEndpoint(systemName: string): void {
    this.endpoints.delete(systemName);
    this.cache.delete(systemName);
    this.cacheExpiry.delete(systemName);
  }

  /**
   * Discover DAID patterns from all registered systems
   */
  async discoverAllSystems(options: DiscoveryOptions = {}): Promise<SystemDAIDPatterns> {
    const patterns: SystemDAIDPatterns = {};
    const systems = Array.from(this.endpoints.keys());

    const maxConcurrency = options.maxConcurrency || 3;
    const chunks = this.chunkArray(systems, maxConcurrency);

    for (const chunk of chunks) {
      const promises = chunk.map(systemName =>
        this.discoverSystem(systemName, options).catch(_error => {
          // TODO: Implement proper system discovery error logging
          return null;
        })
      );

      const results = await Promise.all(promises);

      results.forEach((result, index) => {
        if (result) {
          const systemName = chunk[index];
          patterns[systemName!] = {
            entityTypes: result.entityType.split(',').filter(Boolean),
            operations: result.operations,
            agentIds: result.agentIds,
          };
        }
      });
    }

    return patterns;
  }

  /**
   * Discover DAID patterns from a specific system
   */
  async discoverSystem(
    systemName: string,
    options: DiscoveryOptions = {}
  ): Promise<DiscoveredPattern | null> {
    // Check cache first
    const cached = this.getCachedPattern(systemName);
    if (cached) {
      return cached;
    }

    const endpoint = this.endpoints.get(systemName);
    if (!endpoint) {
      throw new Error(`System ${systemName} not registered`);
    }

    let pattern: DiscoveredPattern | null = null;

    try {
      switch (endpoint.type) {
        case 'openapi':
          pattern = await this.discoverFromOpenAPI(endpoint, options);
          break;
        case 'mcp':
          pattern = await this.discoverFromMCP(endpoint, options);
          break;
        case 'graphql':
          pattern = await this.discoverFromGraphQL(endpoint, options);
          break;
        default:
          throw new Error(`Unsupported endpoint type: ${endpoint.type}`);
      }

      if (pattern) {
        this.cachePattern(systemName, pattern);
      }

      return pattern;
    } catch (error) {
      // TODO: Implement proper discovery error logging
      return null;
    }
  }

  /**
   * Discover patterns from OpenAPI specification
   */
  private async discoverFromOpenAPI(
    endpoint: SystemEndpoint,
    options: DiscoveryOptions
  ): Promise<DiscoveredPattern | null> {
    const specUrl = `${endpoint.baseUrl}/openapi.json`;
    const response = await this.fetchWithTimeout(specUrl, {
      headers: endpoint.apiKey ? { Authorization: `Bearer ${endpoint.apiKey}` } : {},
      timeout: options.timeout || endpoint.timeout || 5000,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch OpenAPI spec: ${response.statusText}`);
    }

    const spec = await response.json();
    return this.extractPatternsFromOpenAPI(spec, endpoint, options);
  }

  /**
   * Discover patterns from MCP tools endpoint
   */
  private async discoverFromMCP(
    endpoint: SystemEndpoint,
    options: DiscoveryOptions
  ): Promise<DiscoveredPattern | null> {
    const toolsUrl = `${endpoint.baseUrl}/mcp/tools`;
    const response = await this.fetchWithTimeout(toolsUrl, {
      headers: endpoint.apiKey ? { Authorization: `Bearer ${endpoint.apiKey}` } : {},
      timeout: options.timeout || endpoint.timeout || 5000,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch MCP tools: ${response.statusText}`);
    }

    const tools = await response.json();
    return this.extractPatternsFromMCP(tools, endpoint, options);
  }

  /**
   * Discover patterns from GraphQL schema
   */
  private async discoverFromGraphQL(
    endpoint: SystemEndpoint,
    options: DiscoveryOptions
  ): Promise<DiscoveredPattern | null> {
    const introspectionQuery = `
      query IntrospectionQuery {
        __schema {
          types {
            name
            fields {
              name
              type {
                name
              }
            }
          }
        }
      }
    `;

    const response = await this.fetchWithTimeout(endpoint.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(endpoint.apiKey ? { Authorization: `Bearer ${endpoint.apiKey}` } : {}),
      },
      body: JSON.stringify({ query: introspectionQuery }),
      timeout: options.timeout || endpoint.timeout || 5000,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch GraphQL schema: ${response.statusText}`);
    }

    const schema = await response.json();
    return this.extractPatternsFromGraphQL(schema, endpoint, options);
  }

  /**
   * Extract DAID patterns from OpenAPI specification
   */
  private extractPatternsFromOpenAPI(
    spec: OpenAPISpec,
    endpoint: SystemEndpoint,
    options: DiscoveryOptions
  ): DiscoveredPattern {
    const entityTypes = new Set<string>();
    const operations = new Set<string>();
    const endpoints_list = new Set<string>();
    const agentIds = new Set<string>();

    // Extract from paths
    Object.entries(spec.paths || {}).forEach(([path, pathItem]: [string, unknown]) => {
      Object.entries(pathItem as Record<string, unknown>).forEach(([method, operation]: [string, unknown]) => {
        if (typeof operation === 'object' && operation && 'operationId' in operation) {
          operations.add((operation as Record<string, unknown>).operationId as string);
          endpoints_list.add(`${method.toUpperCase()} ${path}`);

          // Look for DAID patterns in parameters, responses, etc.
          this.extractDAIDPatternsFromOperation(operation, entityTypes, agentIds);
        }
      });
    });

    // Extract from components/schemas
    Object.entries(spec.components?.schemas || {}).forEach(
      ([schemaName, schema]: [string, unknown]) => {
        if (this.looksLikeDAIDEntity(schemaName, schema as Record<string, unknown>)) {
          entityTypes.add(schemaName.toLowerCase());
        }
      }
    );

    return {
      entityType: Array.from(entityTypes).join(','),
      operations: Array.from(operations),
      agentIds: Array.from(agentIds),
      endpoints: Array.from(endpoints_list),
      metadata: options.includeMetadata
        ? {
            title: spec.info?.title,
            version: spec.info?.version,
            description: spec.info?.description,
            discoveredAt: new Date().toISOString(),
          }
        : undefined,
    };
  }

  /**
   * Extract DAID patterns from MCP tools
   */
  private extractPatternsFromMCP(
    tools: MCPToolsResponse,
    endpoint: SystemEndpoint,
    options: DiscoveryOptions
  ): DiscoveredPattern {
    const entityTypes = new Set<string>();
    const operations = new Set<string>();
    const agentIds = new Set<string>();
    const endpoints_list = new Set<string>();

    tools.tools?.forEach((tool: MCPTool) => {
      operations.add(tool.name);
      endpoints_list.add(`MCP ${tool.name}`);

      // Extract entity types from tool descriptions and parameters
      if (tool.description) {
        this.extractEntityTypesFromText(tool.description, entityTypes);
      }

      if (tool.inputSchema?.properties) {
        Object.keys(tool.inputSchema.properties).forEach(prop => {
          if (prop.includes('daid') || prop.includes('entity')) {
            this.extractEntityTypesFromText(prop, entityTypes);
          }
        });
      }
    });

    return {
      entityType: Array.from(entityTypes).join(','),
      operations: Array.from(operations),
      agentIds: Array.from(agentIds),
      endpoints: Array.from(endpoints_list),
      metadata: options.includeMetadata
        ? {
            toolCount: tools.tools?.length || 0,
            discoveredAt: new Date().toISOString(),
          }
        : undefined,
    };
  }

  /**
   * Extract DAID patterns from GraphQL schema
   */
  private extractPatternsFromGraphQL(
    schema: GraphQLSchema,
    endpoint: SystemEndpoint,
    options: DiscoveryOptions
  ): DiscoveredPattern {
    const entityTypes = new Set<string>();
    const operations = new Set<string>();
    const agentIds = new Set<string>();
    const endpoints_list = new Set<string>();

    schema.data?.__schema?.types?.forEach((type: GraphQLType) => {
      if (type.name && !type.name.startsWith('__')) {
        if (this.looksLikeDAIDEntity(type.name, type)) {
          entityTypes.add(type.name.toLowerCase());
        }

        type.fields?.forEach((field: GraphQLField) => {
          operations.add(field.name);
          endpoints_list.add(`GraphQL ${type.name}.${field.name}`);
        });
      }
    });

    return {
      entityType: Array.from(entityTypes).join(','),
      operations: Array.from(operations),
      agentIds: Array.from(agentIds),
      endpoints: Array.from(endpoints_list),
      metadata: options.includeMetadata
        ? {
            typeCount: schema.data?.__schema?.types?.length || 0,
            discoveredAt: new Date().toISOString(),
          }
        : undefined,
    };
  }

  // Helper methods
  private getCachedPattern(systemName: string): DiscoveredPattern | null {
    const expiry = this.cacheExpiry.get(systemName);
    if (expiry && Date.now() < expiry) {
      const cached = this.cache.get(systemName);
      return (cached as unknown as DiscoveredPattern) || null;
    }
    return null;
  }

  private cachePattern(systemName: string, pattern: DiscoveredPattern): void {
    // Convert DiscoveredPattern to SystemDAIDPatterns format for cache
    const systemPattern: SystemDAIDPatterns = {
      [systemName]: {
        entityTypes: pattern.entityType ? pattern.entityType.split(',') : [],
        operations: pattern.operations,
        agentIds: pattern.agentIds
      }
    };
    this.cache.set(systemName, systemPattern);
    this.cacheExpiry.set(systemName, Date.now() + this.CACHE_TTL);
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async fetchWithTimeout(url: string, options: Record<string, unknown>): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), (options.timeout || 5000) as number);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private extractDAIDPatternsFromOperation(
    operation: Record<string, unknown>,
    entityTypes: Set<string>,
    _agentIds: Set<string>
  ): void {
    // Look for DAID patterns in operation
    const operationStr = JSON.stringify(operation).toLowerCase();
    if (operationStr.includes('daid')) {
      // Extract potential entity types and agent IDs
      const matches = operationStr.match(/daid[^"]*:([^:"]+)/g);
      matches?.forEach(match => {
        const parts = match.split(':');
        if (parts.length > 1 && parts[1]) {
          entityTypes.add(parts[1] as string);
        }
      });
    }
  }

  private looksLikeDAIDEntity(name: string, schema: Record<string, unknown>): boolean {
    const nameStr = name.toLowerCase();
    const schemaStr: string = JSON.stringify(schema).toLowerCase();

    return (
      nameStr.includes('daid') ||
      schemaStr.includes('daid') ||
      schemaStr.includes('provenance') ||
      (('properties' in schema) &&
        Object.keys((schema as Record<string, Record<string, unknown>>).properties || {}).some(
          prop => prop.toLowerCase().includes('daid') || prop.toLowerCase().includes('provenance')
        ))
    );
  }

  private extractEntityTypesFromText(text: string, entityTypes: Set<string>): void {
    const words = text.toLowerCase().split(/\W+/);
    const commonEntityWords = [
      'user',
      'agent',
      'task',
      'file',
      'document',
      'pattern',
      'style',
      'composition',
    ];

    words.forEach(word => {
      if (commonEntityWords.includes(word) && word.length > 2) {
        entityTypes.add(word);
      }
    });
  }
}
