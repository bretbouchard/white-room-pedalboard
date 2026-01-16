/**
 * React components for provenance visualization
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ProvenanceAPI, ProvenanceAPIConfig } from './provenance-api';
import { ProvenanceNode, ProvenanceQuery, ProvenanceVisualizationData } from './provenance-chain';

// Basic component interfaces (these would typically come from a UI library)
interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

interface ButtonProps extends BaseComponentProps {
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}

// Basic UI components (simplified implementations)
const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  disabled,
  variant = 'primary',
  className = '',
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded ${variant === 'primary' ? 'bg-blue-500 text-white' : 'bg-gray-200'} ${className}`}
  >
    {children}
  </button>
);

const Input: React.FC<InputProps> = ({ value, onChange, placeholder, className = '' }) => (
  <input
    type="text"
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    className={`px-3 py-2 border rounded ${className}`}
  />
);

const Select: React.FC<SelectProps> = ({ value, onChange, options, className = '' }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    className={`px-3 py-2 border rounded ${className}`}
  >
    {options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

// Provenance context
interface ProvenanceContextValue {
  api: ProvenanceAPI | null;
  isInitialized: boolean;
  error: string | null;
}

const ProvenanceContext = React.createContext<ProvenanceContextValue | null>(null);

// Provenance provider
interface ProvenanceProviderProps {
  children: React.ReactNode;
  config: ProvenanceAPIConfig;
}

export const ProvenanceProvider: React.FC<ProvenanceProviderProps> = ({ children, config }) => {
  const [api, setApi] = useState<ProvenanceAPI | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const provenanceAPI = new ProvenanceAPI(config);
      setApi(provenanceAPI);
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize provenance API');
    }
  }, [config]);

  const contextValue: ProvenanceContextValue = {
    api,
    isInitialized,
    error,
  };

  return <ProvenanceContext.Provider value={contextValue}>{children}</ProvenanceContext.Provider>;
};

// Hook to use provenance API
export const useProvenance = (): ProvenanceContextValue => {
  const context = React.useContext(ProvenanceContext);
  if (!context) {
    throw new Error('useProvenance must be used within a ProvenanceProvider');
  }
  return context;
};

// Provenance chain viewer component
interface ProvenanceChainViewerProps {
  daid: string;
  maxDepth?: number;
  showAncestors?: boolean;
  showDescendants?: boolean;
  onNodeClick?: (node: ProvenanceNode) => void;
}

export const ProvenanceChainViewer: React.FC<ProvenanceChainViewerProps> = ({
  daid,
  maxDepth = 10,
  showAncestors = true,
  showDescendants = true,
  onNodeClick,
}) => {
  const { api } = useProvenance();
  const [nodes, setNodes] = useState<ProvenanceNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChain = useCallback(async () => {
    if (!api || !daid) return;

    setLoading(true);
    setError(null);

    try {
      const chainNodes = await api.getProvenanceChain(daid);
      setNodes(chainNodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load provenance chain');
    } finally {
      setLoading(false);
    }
  }, [api, daid]);

  useEffect(() => {
    loadChain();
  }, [loadChain]);

  if (loading) {
    return <div className="p-4">Loading provenance chain...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-700">Error: {error}</p>
        <Button onClick={loadChain} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="provenance-chain-viewer">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Provenance Chain</h3>
        <p className="text-sm text-gray-600">{nodes.length} nodes found</p>
      </div>

      <div className="space-y-2">
        {nodes.map(node => (
          <ProvenanceNodeCard key={node.daid} node={node} onClick={() => onNodeClick?.(node)} />
        ))}
      </div>
    </div>
  );
};

// Provenance node card component
interface ProvenanceNodeCardProps {
  node: ProvenanceNode;
  onClick?: () => void;
}

const ProvenanceNodeCard: React.FC<ProvenanceNodeCardProps> = ({ node, onClick }) => {
  return (
    <div
      className={`p-3 border rounded-lg bg-white shadow-sm ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-sm">
            {node.components.entityType}:{node.components.entityId}
          </h4>
          <p className="text-xs text-gray-600">
            Operation: {node.record.operation} | Agent: {node.components.agentId}
          </p>
          <p className="text-xs text-gray-500">{new Date(node.timestamp).toLocaleString()}</p>
        </div>
        <div className="text-right">
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Depth: {node.depth}
          </span>
        </div>
      </div>

      {node.parents.length > 0 && (
        <div className="mt-2 text-xs">
          <span className="text-gray-600">Parents: </span>
          <span className="font-mono text-gray-800">{node.parents.length} node(s)</span>
        </div>
      )}
    </div>
  );
};

// Provenance search component
interface ProvenanceSearchProps {
  onResults?: (nodes: ProvenanceNode[]) => void;
}

export const ProvenanceSearch: React.FC<ProvenanceSearchProps> = ({ onResults }) => {
  const { api } = useProvenance();
  const [query, setQuery] = useState<ProvenanceQuery>({});
  const [results, setResults] = useState<ProvenanceNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!api) return;

    setLoading(true);
    setError(null);

    try {
      const searchResults = await api.queryProvenance(query);
      setResults(searchResults.nodes);
      onResults?.(searchResults.nodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [api, query, onResults]);

  const updateQuery = (field: keyof ProvenanceQuery, value: string) => {
    setQuery(prev => ({
      ...prev,
      [field]: value || undefined,
    }));
  };

  return (
    <div className="provenance-search">
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-3">Search Provenance</h3>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Input
            value={query.entityType || ''}
            onChange={value => updateQuery('entityType', value)}
            placeholder="Entity Type"
          />
          <Input
            value={query.entityId || ''}
            onChange={value => updateQuery('entityId', value)}
            placeholder="Entity ID"
          />
          <Input
            value={query.agentId || ''}
            onChange={value => updateQuery('agentId', value)}
            placeholder="Agent ID"
          />
          <Input
            value={query.operation || ''}
            onChange={value => updateQuery('operation', value)}
            placeholder="Operation"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setQuery({});
              setResults([]);
              setError(null);
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-700 text-sm">Error: {error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Results ({results.length})</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {results.map(node => (
              <ProvenanceNodeCard key={node.daid} node={node} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Provenance visualization component
interface ProvenanceVisualizationProps {
  daid: string;
  layout?: 'hierarchical' | 'force' | 'circular';
  maxDepth?: number;
  width?: number;
  height?: number;
}

export const ProvenanceVisualization: React.FC<ProvenanceVisualizationProps> = ({
  daid,
  layout = 'hierarchical',
  maxDepth = 5,
  width = 800,
  height = 600,
}) => {
  const { api } = useProvenance();
  const [visualizationData, setVisualizationData] = useState<ProvenanceVisualizationData | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVisualization = useCallback(async () => {
    if (!api || !daid) return;

    setLoading(true);
    setError(null);

    try {
      const data = await api.getVisualizationData(daid, {
        layout,
        maxDepth,
        includeAncestors: true,
        includeDescendants: true,
      });
      setVisualizationData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load visualization');
    } finally {
      setLoading(false);
    }
  }, [api, daid, layout, maxDepth]);

  useEffect(() => {
    loadVisualization();
  }, [loadVisualization]);

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p>Loading visualization...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-red-50 border border-red-200 rounded"
        style={{ width, height }}
      >
        <div className="text-center">
          <p className="text-red-700 mb-2">Error: {error}</p>
          <Button onClick={loadVisualization}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!visualizationData || visualizationData.nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 border border-gray-200 rounded"
        style={{ width, height }}
      >
        <p className="text-gray-600">No provenance data to visualize</p>
      </div>
    );
  }

  // This is a simplified visualization - in a real implementation,
  // you would use a proper graph visualization library like D3.js, vis.js, or Cytoscape.js
  return (
    <div className="provenance-visualization border rounded" style={{ width, height }}>
      <div className="p-4 border-b bg-gray-50">
        <h4 className="font-medium">Provenance Graph</h4>
        <p className="text-sm text-gray-600">
          {visualizationData.nodes.length} nodes, {visualizationData.edges.length} edges
        </p>
      </div>

      <div className="p-4 overflow-auto" style={{ height: height - 80 }}>
        <div className="text-center text-gray-500">
          <p>Graph visualization would be rendered here</p>
          <p className="text-sm mt-2">
            Layout: {visualizationData.layout.type} | Nodes: {visualizationData.nodes.length} |
            Edges: {visualizationData.edges.length}
          </p>

          {/* Simple node list as placeholder */}
          <div className="mt-4 text-left">
            <h5 className="font-medium mb-2">Nodes:</h5>
            <div className="space-y-1 text-sm">
              {visualizationData.nodes.slice(0, 10).map(node => (
                <div key={node.id} className="p-2 bg-blue-50 rounded">
                  {node.label} ({node.type})
                </div>
              ))}
              {visualizationData.nodes.length > 10 && (
                <div className="text-gray-500">
                  ... and {visualizationData.nodes.length - 10} more nodes
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Hook for provenance chain data
export const useProvenanceChain = (daid: string) => {
  const { api } = useProvenance();
  const [data, setData] = useState<ProvenanceNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadChain = useCallback(async () => {
    if (!api || !daid) return;

    setLoading(true);
    setError(null);

    try {
      const nodes = await api.getProvenanceChain(daid);
      setData(nodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load provenance chain');
    } finally {
      setLoading(false);
    }
  }, [api, daid]);

  useEffect(() => {
    loadChain();
  }, [loadChain]);

  return {
    data,
    loading,
    error,
    refetch: loadChain,
  };
};

// Hook for entity provenance
export const useEntityProvenance = (entityType: string, entityId: string) => {
  const { api } = useProvenance();
  const [data, setData] = useState<ProvenanceNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProvenance = useCallback(async () => {
    if (!api || !entityType || !entityId) return;

    setLoading(true);
    setError(null);

    try {
      const nodes = await api.getEntityProvenance(entityType, entityId);
      setData(nodes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load entity provenance');
    } finally {
      setLoading(false);
    }
  }, [api, entityType, entityId]);

  useEffect(() => {
    loadProvenance();
  }, [loadProvenance]);

  return {
    data,
    loading,
    error,
    refetch: loadProvenance,
  };
};
