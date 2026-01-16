/**
 * Plugin Manager Component
 * Interface for managing plugins in the Schillinger Audio Agent
 */

import React, { useState, useEffect } from 'react';

interface Plugin {
  id: string;
  name: string;
  type: string;
  category: string;
  author: string;
  version: string;
  description: string;
  instances: number;
  active_instances: number;
}


interface PluginSystemStatus {
  initialized: boolean;
  total_plugins: number;
  active_instances: number;
  execution_stats: {
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    average_execution_time: number;
  };
}

export const PluginManager: React.FC = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [systemStatus, setSystemStatus] = useState<PluginSystemStatus | null>(null);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlugins();
    loadSystemStatus();
  }, []);

  const loadPlugins = async () => {
    try {
      const response = await fetch('/api/plugins');
      const data = await response.json();
      setPlugins(data.plugins || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load plugins:', err);
      setError('Failed to load plugins');
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStatus = async () => {
    try {
      const response = await fetch('/api/plugins/system/status');
      const status = await response.json();
      setSystemStatus(status);
    } catch (err) {
      console.error('Failed to load system status:', err);
    }
  };

  const loadPluginDetails = async (pluginId: string) => {
    try {
      const response = await fetch(`/api/plugins/${pluginId}`);
      const details = await response.json();
      setSelectedPlugin(details);
    } catch (err) {
      console.error('Failed to load plugin details:', err);
    }
  };

  const createInstance = async (pluginId: string) => {
    try {
      const response = await fetch(`/api/plugins/${pluginId}/instances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          config: {},
          permissions: ['execute']
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create instance');
      }

      const result = await response.json();
      if (result.success) {
        await loadPlugins();
        await loadPluginDetails(pluginId);
      }
    } catch (err) {
      console.error('Failed to create instance:', err);
      setError('Failed to create plugin instance');
    }
  };

  
  const reloadPlugin = async (pluginId: string) => {
    try {
      const response = await fetch(`/api/plugins/${pluginId}/reload`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to reload plugin');
      }

      const result = await response.json();
      if (result.success) {
        await loadPlugins();
        if (selectedPlugin && selectedPlugin.id === pluginId) {
          await loadPluginDetails(pluginId);
        }
      }
    } catch (err) {
      console.error('Failed to reload plugin:', err);
      setError('Failed to reload plugin');
    }
  };

  
  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Plugin Manager</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* System Status */}
      {systemStatus && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">System Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Initialized:</span>
              <span className="ml-2 font-medium">{systemStatus.initialized ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Plugins:</span>
              <span className="ml-2 font-medium">{systemStatus.total_plugins}</span>
            </div>
            <div>
              <span className="text-gray-600">Active Instances:</span>
              <span className="ml-2 font-medium">{systemStatus.active_instances}</span>
            </div>
            <div>
              <span className="text-gray-600">Executions:</span>
              <span className="ml-2 font-medium">{systemStatus.execution_stats.total_executions}</span>
            </div>
          </div>
        </div>
      )}

      {/* Plugin List */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Available Plugins</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plugins.map((plugin) => (
            <div
              key={plugin.id}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedPlugin?.id === plugin.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => loadPluginDetails(plugin.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold">{plugin.name}</h4>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
                  {plugin.version}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{plugin.description}</p>
              <div className="flex justify-between items-center text-xs text-gray-500">
                <span>{plugin.type}</span>
                <span>{plugin.author}</span>
              </div>
              <div className="flex justify-between items-center mt-2 text-xs">
                <span>Instances: {plugin.instances}</span>
                <span>Active: {plugin.active_instances}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plugin Details */}
      {selectedPlugin && (
        <div className="border rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{selectedPlugin.name}</h3>
            <button
              onClick={() => reloadPlugin(selectedPlugin.id)}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reload Plugin
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">Metadata</h4>
              <div className="space-y-1 text-sm">
                <div><span className="text-gray-600">Type:</span> {selectedPlugin.type}</div>
                <div><span className="text-gray-600">Category:</span> {selectedPlugin.category}</div>
                <div><span className="text-gray-600">Author:</span> {selectedPlugin.author}</div>
                <div><span className="text-gray-600">Version:</span> {selectedPlugin.version}</div>
                <div><span className="text-gray-600">Description:</span> {selectedPlugin.description}</div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Instances</h4>
              <div className="space-y-2">
                {selectedPlugin.instances > 0 ? (
                  <div className="text-sm">
                    <div>Total instances: {selectedPlugin.instances}</div>
                    <div>Active instances: {selectedPlugin.active_instances}</div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No instances running</div>
                )}
              </div>

              <button
                onClick={() => createInstance(selectedPlugin.id)}
                className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Create Instance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginManager;