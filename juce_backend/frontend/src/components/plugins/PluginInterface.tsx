import React, { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import { usePluginStore } from '@/stores/pluginStore';
import Button from '@/components/ui/Button';
import type { PluginInstance } from '@/types/plugins';

export interface PluginInterfaceProps {
  pluginInstance: PluginInstance;
  trackId: string;
  className?: string;
  embedded?: boolean;
  showNativeUI?: boolean;
}

/**
 * Plugin Interface component that handles embedding native plugin UIs
 * and provides generic parameter controls for plugins
 */
const PluginInterface: React.FC<PluginInterfaceProps> = ({
  pluginInstance,
  trackId,
  className,
  embedded = true,
  showNativeUI = true,
}) => {
  const [uiMode, setUIMode] = useState<'native' | 'generic'>('native');
  const [isUILoaded, setIsUILoaded] = useState(false);
  const [uiError, setUIError] = useState<string | null>(null);
  const nativeUIRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { sendMessage } = useWebSocket();
  const { updatePluginInstance } = usePluginStore();

  // Check if plugin supports native UI embedding
  const supportsNativeUI = useCallback(() => {
    const format = pluginInstance.plugin_metadata.format;
    // VST3, AU, and WAM plugins typically support native UI embedding
    return ['VST3', 'AU', 'WAM'].includes(format) && showNativeUI;
  }, [pluginInstance.plugin_metadata.format, showNativeUI]);

  const initializeNativeUI = useCallback(async () => {
    try {
      setUIError(null);
      
      // Request native UI initialization from backend
      sendMessage({
        type: 'plugin.ui.initialize',
        data: {
          track_id: trackId,
          plugin_id: pluginInstance.instance_id,
          ui_type: 'native',
          container_id: `plugin-ui-${pluginInstance.instance_id}`,
        },
      });

      // For web-based plugins (WAM), we can embed directly
      if (pluginInstance.plugin_metadata.format === 'WAM') {
        await initializeWAMUI();
      }

    } catch (error) {
      console.error('Failed to initialize native UI:', error);
      setUIError('Failed to load native plugin interface');
      setUIMode('generic');
    }
  }, [pluginInstance.instance_id, trackId, sendMessage]);

  // Initialize plugin UI
  useEffect(() => {
    if (supportsNativeUI() && uiMode === 'native') {
      initializeNativeUI();
    } else if (!supportsNativeUI()) {
      setUIMode('generic');
    }
  }, [pluginInstance.instance_id, uiMode, supportsNativeUI, initializeNativeUI]);

  const initializeWAMUI = useCallback(async () => {
    if (!iframeRef.current) return;

    try {
      // Load WAM plugin UI in iframe
      const wamUrl = `/wam-ui/${pluginInstance.plugin_metadata.unique_id}`;
      iframeRef.current.src = wamUrl;
      
      // Set up communication with WAM UI
      const handleWAMMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'wam-parameter-change') {
          handleParameterChange(event.data.parameterId, event.data.value);
        }
      };

      window.addEventListener('message', handleWAMMessage);
      setIsUILoaded(true);

      return () => {
        window.removeEventListener('message', handleWAMMessage);
      };
    } catch (error) {
      console.error('Failed to initialize WAM UI:', error);
      setUIError('Failed to load WAM interface');
      setUIMode('generic');
    }
  }, [pluginInstance]);

  const handleParameterChange = useCallback((parameterId: string, value: number) => {
    // Update local state
    updatePluginInstance(pluginInstance.instance_id, {
      parameters: {
        ...pluginInstance.parameters,
        [parameterId]: {
          ...pluginInstance.parameters[parameterId],
          value,
        },
      },
      last_used: new Date().toISOString(),
    });

    // Send to backend
    sendMessage({
      type: 'plugin.parameter',
      data: {
        track_id: trackId,
        plugin_id: pluginInstance.instance_id,
        parameter_id: parameterId,
        parameter_value: value,
      },
    });
  }, [pluginInstance.instance_id, trackId, updatePluginInstance, sendMessage]);

  const handleUIToggle = useCallback(() => {
    setUIMode(current => current === 'native' ? 'generic' : 'native');
  }, []);

  const handleUIReload = useCallback(() => {
    setIsUILoaded(false);
    setUIError(null);
    if (uiMode === 'native') {
      initializeNativeUI();
    }
  }, [uiMode, initializeNativeUI]);

  const containerClasses = cn(
    'plugin-interface',
    embedded ? 'embedded' : 'standalone',
    className
  );

  return (
    <div className={containerClasses}>
      {/* UI Mode Controls */}
      <div className="flex items-center justify-between mb-2 p-2 bg-daw-surface-primary rounded">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-daw-text-secondary">
            Plugin Interface
          </span>
          {supportsNativeUI() && (
            <div className="flex items-center space-x-1">
              <Button
                onClick={handleUIToggle}
                variant={uiMode === 'native' ? 'accent' : 'secondary'}
                size="sm"
                className="text-xs px-2 py-1"
              >
                Native
              </Button>
              <Button
                onClick={handleUIToggle}
                variant={uiMode === 'generic' ? 'accent' : 'secondary'}
                size="sm"
                className="text-xs px-2 py-1"
              >
                Generic
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1">
          {uiError && (
            <Button
              onClick={handleUIReload}
              variant="secondary"
              size="sm"
              className="text-xs px-2 py-1"
              title="Reload plugin interface"
            >
              ↻
            </Button>
          )}
          <div className={cn(
            'w-2 h-2 rounded-full',
            isUILoaded ? 'bg-green-400' : 'bg-yellow-400'
          )} />
        </div>
      </div>

      {/* Error Display */}
      {uiError && (
        <div className="mb-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-400">
          {uiError}
        </div>
      )}

      {/* Native UI Container */}
      {uiMode === 'native' && supportsNativeUI() && (
        <div className="native-ui-container">
          {pluginInstance.plugin_metadata.format === 'WAM' ? (
            <iframe
              ref={iframeRef}
              className="w-full h-96 border border-daw-surface-tertiary rounded"
              title={`${pluginInstance.plugin_metadata.name} Interface`}
              onLoad={() => setIsUILoaded(true)}
              onError={() => {
                setUIError('Failed to load WAM interface');
                setUIMode('generic');
              }}
            />
          ) : (
            <div
              ref={nativeUIRef}
              id={`plugin-ui-${pluginInstance.instance_id}`}
              className="native-plugin-container w-full min-h-96 bg-daw-surface-secondary border border-daw-surface-tertiary rounded"
            >
              {!isUILoaded && (
                <div className="flex items-center justify-center h-96 text-daw-text-tertiary">
                  <div className="text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-daw-accent-primary border-t-transparent rounded-full mx-auto mb-2" />
                    <div className="text-sm">Loading native interface...</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Generic UI Container */}
      {uiMode === 'generic' && (
        <div className="generic-ui-container">
          <GenericPluginControls
            pluginInstance={pluginInstance}
            trackId={trackId}
            onParameterChange={handleParameterChange}
          />
        </div>
      )}
    </div>
  );
};

interface GenericPluginControlsProps {
  pluginInstance: PluginInstance;
  trackId: string;
  onParameterChange: (parameterId: string, value: number) => void;
}

const GenericPluginControls: React.FC<GenericPluginControlsProps> = ({
  pluginInstance,
  onParameterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Group parameters by category
  const parameterCategories = React.useMemo(() => {
    const categories: Record<string, typeof pluginInstance.parameters> = {
      all: pluginInstance.parameters,
    };

    Object.entries(pluginInstance.parameters).forEach(([id, param]) => {
      // Extract category from parameter name or type
      const category = param.parameter_type || 'general';
      if (!categories[category]) {
        categories[category] = {};
      }
      categories[category][id] = param;
    });

    return categories;
  }, [pluginInstance.parameters]);

  // Filter parameters based on search and category
  const filteredParameters = React.useMemo(() => {
    let params = parameterCategories[selectedCategory] || {};
    
    if (searchTerm) {
      const filtered: typeof params = {};
      Object.entries(params).forEach(([id, param]) => {
        if (
          param.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          param.name.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          filtered[id] = param;
        }
      });
      params = filtered;
    }

    return params;
  }, [parameterCategories, selectedCategory, searchTerm]);

  return (
    <div className="generic-plugin-controls space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex items-center space-x-2">
        <input
          type="text"
          placeholder="Search parameters..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-2 py-1 text-xs bg-daw-surface-primary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-2 py-1 text-xs bg-daw-surface-primary border border-daw-surface-tertiary rounded focus:border-daw-accent-primary focus:outline-none"
        >
          {Object.keys(parameterCategories).map(category => (
            <option key={category} value={category}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Parameter Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(filteredParameters).map(([paramId, parameter]) => (
          <ParameterControl
            key={paramId}
            parameterId={paramId}
            parameter={parameter}
            onChange={onParameterChange}
          />
        ))}
      </div>

      {Object.keys(filteredParameters).length === 0 && (
        <div className="text-center py-8 text-daw-text-tertiary">
          <div className="text-sm">No parameters found</div>
          {searchTerm && (
            <div className="text-xs mt-1">
              Try adjusting your search or category filter
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ParameterControlProps {
  parameterId: string;
  parameter: any;
  onChange: (parameterId: string, value: number) => void;
}

const ParameterControl: React.FC<ParameterControlProps> = ({
  parameterId,
  parameter,
  onChange,
}) => {
  const [localValue, setLocalValue] = useState(parameter.value);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      setLocalValue(parameter.value);
    }
  }, [parameter.value, isDragging]);

  const handleChange = useCallback((value: number) => {
    setLocalValue(value);
    onChange(parameterId, value);
  }, [parameterId, onChange]);

  const handleMouseDown = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const formatValue = (value: number) => {
    if (parameter.unit) {
      return `${value.toFixed(2)}${parameter.unit}`;
    }
    return value.toFixed(2);
  };

  return (
    <div className="parameter-control space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-daw-text-secondary truncate">
          {parameter.display_name}
        </label>
        <span className="text-xs text-daw-text-tertiary font-mono">
          {formatValue(localValue)}
        </span>
      </div>
      
      <input
        type="range"
        min={parameter.min_value}
        max={parameter.max_value}
        step={0.01}
        value={localValue}
        onChange={(e) => handleChange(parseFloat(e.target.value))}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        disabled={!parameter.is_automatable}
        className="w-full h-2 bg-daw-surface-primary rounded-lg appearance-none cursor-pointer slider"
      />
    </div>
  );
};

export default PluginInterface;