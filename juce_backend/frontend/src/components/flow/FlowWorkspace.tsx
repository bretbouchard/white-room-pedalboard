import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  Handle,
  Position,
  type OnConnect,
  type NodeChange,
  type EdgeChange,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFlowStore } from '@/stores/flowStore';
import type { FlowHierarchy, FlowNodeType } from '@/types/flow';
import { useFlowSyncStore } from '@/stores/flowSyncStore';
import { useAGUIFlowBridge } from '@/agui/agui-flow-bridge';
import { CollaborationIndicator } from '@/components/collaboration/CollaborationIndicator';
import { PluginNode, pluginNodeType } from './PluginNode';
import PluginBrowserModal from './PluginBrowserModal';
import HierarchyView from './HierarchyView';
import NodeInspector from './NodeInspector';
import { AISuggestionPanel } from './AISuggestionPanel';
import { AISuggestionOverlay } from './AISuggestionOverlay';
import { initializeCollaborationIntegration } from '@/stores/collaborationStore';
import { createMusicalContent } from '@/utils/simpleMusicGenerator';

const HubNode: React.FC<NodeProps<any>> = ({ id, data }) => {
  // Type assertion to access known properties
  const nodeData = data as any;

  // Generate musical content for this node
  const musicalContent = useMemo(() => {
    try {
      return createMusicalContent(nodeData.type || 'unknown', id);
    } catch (error) {
      console.warn('Failed to generate musical content:', error);
      return null;
    }
  }, [nodeData.type, id]);

  // Format musical content for display
  const formatMusicalContent = (content: any): string => {
    if (!content) return '';

    if (content.notes && Array.isArray(content.notes)) {
      // Scale or chord
      if (content.name) return content.name;
      if (content.type) return `${content.root?.name || 'C'} ${content.type}`;
      return content.notes.slice(0, 3).map((n: any) => n.name).join('-');
    }

    if (content.chords && Array.isArray(content.chords)) {
      // Chord progression
      return content.chords.slice(0, 3).map((c: any) => c.name || 'C').join(' - ');
    }

    if (content.melody && content.melody.notes) {
      // Melody
      const notes = content.melody.notes.slice(0, 4);
      return notes.map((n: any) => n.name).join(' ');
    }

    if (content.sections) {
      // Song structure
      return Object.keys(content.sections).join(' • ');
    }

    if (content.pattern) {
      // Rhythm
      return `${content.pattern.join('')} (${content.timeSignature?.join('/') || '4/4'})`;
    }

    return 'Musical Pattern';
  };

  const musicalDescription = formatMusicalContent(musicalContent);

  return (
    <div
      data-node-id={id} // Add data attribute for AI overlay
      className="min-w-[180px] max-w-[220px] rounded-lg border border-daw-surface-tertiary bg-daw-surface-secondary px-3 py-2 shadow-sm"
      style={{
        borderColor: (nodeData.color as string | undefined) ?? undefined,
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-daw-accent-primary" />

      <div className="text-xs uppercase tracking-wide text-daw-text-tertiary">
        {nodeData.type?.replace('_', ' ') || 'Unknown'}
      </div>

      <div className="text-sm font-semibold text-daw-text-primary">
        {nodeData.label || 'Node'}
      </div>

      {/* Musical Content Display */}
      {musicalContent && (
        <div className="mt-2 text-xs text-daw-text-secondary">
          <div className="font-medium text-daw-text-primary mb-1">Musical Content:</div>
          <div className="truncate font-mono bg-daw-surface-tertiary rounded px-1 py-0.5">
            {musicalDescription}
          </div>

          {/* Additional details for certain node types */}
          {musicalContent && 'tempo' in musicalContent && musicalContent.tempo && (
            <div className="mt-1 text-xs">
              Tempo: {musicalContent.tempo} BPM
            </div>
          )}

          {musicalContent && 'key' in musicalContent && musicalContent.key && (
            <div className="mt-1 text-xs">
              Key: {musicalContent.key}
            </div>
          )}

          {musicalContent.notes && musicalContent.notes.length > 0 && (
            <div className="mt-1 text-xs">
              {musicalContent.notes.length} notes
            </div>
          )}
        </div>
      )}

      {nodeData.description && !musicalContent && (
        <div className="mt-1 text-xs text-daw-text-secondary truncate">
          {nodeData.description as string}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-daw-accent-secondary" />
    </div>
  );
};

const nodeTypes: Record<string, React.FC<any>> = {
  song: HubNode,
  section: HubNode,
  track: HubNode,
  clip: HubNode,
  bus: HubNode,
  effect: HubNode,
  analyzer: HubNode,
  automation: HubNode,
  theory_concept: HubNode,
  chord: HubNode,
  scale: HubNode,
  motif: HubNode,
  progression: HubNode,
  plugin: PluginNode,
};

export function FlowWorkspace(): React.ReactNode {
  // Simplified store access to debug infinite loop
  const activeView = useFlowStore(state => state.activeView);
  const nodes = useFlowStore(state => state.daw.nodes); // Fixed to use daw for now
  const edges = useFlowStore(state => state.daw.edges); // Fixed to use daw for now
  const setActiveView = useFlowStore(state => state.setActiveView);
  const hierarchy = useFlowStore(state => state.hierarchy);
  const selectedNodeId = useFlowStore(state => state.selectedNodeId);
  const addNode = useFlowStore(state => state.addNode);
  const addEdge = useFlowStore(state => state.addEdge);
  const removeNode = useFlowStore(state => state.removeNode);
  const updateNodeData = useFlowStore(state => state.updateNodeData);
  const selectNode = useFlowStore(state => state.selectNode);
  const applyNodes = useFlowStore(state => state.applyNodeChanges);
  const applyEdges = useFlowStore(state => state.applyEdgeChanges);

  // Audio engine integration (temporarily disabled due to missing backend endpoints)
  // const engineStore = useAudioEngineStore();
  // const { isInitializing, isInitialized } = useAutoInitializeAudioEngine();
  const { isInitialized } = { isInitializing: false, isInitialized: false }; // Mock values
  const routingManager = null; // Disabled until backend endpoints are implemented

  // Plugin system integration - temporarily disabled
  // const pluginStore = usePluginStore();
  // const enhancedPluginStore = useEnhancedPluginStore();
  const pluginStore = {
    setPluginParameter: (_instanceId: string, _parameterId: string, _value: number) => {
      void _instanceId; void _parameterId; void _value; // Mark as intentionally unused
    },
    bypassPlugin: (_instanceId: string, _bypassed: boolean) => {
      void _instanceId; void _bypassed; // Mark as intentionally unused
    }
  };
  const enhancedPluginStore = {
    trackPluginUsage: (_pluginId: string, _usageType: number) => {
      void _pluginId; void _usageType; // Mark as intentionally unused
    },
    pluginInstances: {}
  };
  const [showPluginBrowser, setShowPluginBrowser] = useState(false);

  // Connect plugin store with audio routing for parameter updates
  useEffect(() => {
    if (isInitialized && routingManager) {
      // Override plugin store methods to use audio routing
      const originalSetPluginParameter = pluginStore.setPluginParameter;
      const originalBypassPlugin = pluginStore.bypassPlugin;

      pluginStore.setPluginParameter = (instanceId: string, parameterId: string, value: number) => {
        // Call original method first
        originalSetPluginParameter(instanceId, parameterId, value);

        // Find the plugin node associated with this instance
        const pluginNode = nodes.find(node =>
          node.type === 'plugin' &&
          node.data.pluginInstanceId === instanceId
        );

        if (pluginNode) {
          // Execute async operation without changing function signature
          routingManager.setPluginParameter(pluginNode.id, parameterId, value)
            .then(() => {
              // Track usage in enhanced plugin database
              const plugin = enhancedPluginStore.pluginInstances[instanceId];
              if (plugin) {
                enhancedPluginStore.trackPluginUsage(plugin.plugin_metadata.id, 0); // Parameter adjustment
              }
            })
            .catch(error => {
              console.error('Failed to update plugin parameter through audio routing:', error);
            });
        }
      };

      pluginStore.bypassPlugin = (instanceId: string, bypassed: boolean) => {
        // Call original method first
        originalBypassPlugin(instanceId, bypassed);

        // Find the plugin node associated with this instance
        const pluginNode = nodes.find(node =>
          node.type === 'plugin' &&
          node.data.pluginInstanceId === instanceId
        );

        if (pluginNode) {
          // Execute async operation without changing function signature
          routingManager.setPluginBypass(pluginNode.id, bypassed)
            .catch(error => {
              console.error('Failed to update plugin bypass state through audio routing:', error);
            });
        }
      };

      // Cleanup function to restore original methods
      return () => {
        pluginStore.setPluginParameter = originalSetPluginParameter;
        pluginStore.bypassPlugin = originalBypassPlugin;
      };
    }
  }, [isInitialized, routingManager, nodes, pluginStore]);

  // useFlowTelemetry(); // Temporarily disabled - causing infinite loop

  // Initialize collaboration integration
  useEffect(() => {
    initializeCollaborationIntegration();
  }, []);

  // Synchronize flow changes with audio routing
  useEffect(() => {
    if (isInitialized && routingManager) {
      // Convert flow nodes and edges to audio graph
      routingManager.convertFlowToAudioGraph(nodes, edges).catch(error => {
        console.error('Failed to synchronize flow with audio routing:', error);
      });
    }
  }, [nodes, edges, isInitialized, routingManager]);

  // Handle audio node selection - temporarily disabled
  useEffect(() => {
    // Audio engine selection disabled
    // if (selectedNodeId) {
    //   engineStore.selectNode(selectedNodeId);
    // } else {
    //   engineStore.selectNode(null);
    // }
  }, [selectedNodeId]);

  // Initialize AG-UI Flow Bridge
  const aguiFlowBridge = useAGUIFlowBridge({
    onSuggestion: (suggestion) => {
      console.log('AI Suggestion received:', suggestion);
    },
    onUserFeedback: (feedback) => {
      console.log('User feedback recorded:', feedback);
    },
    enableAutoLayout: true,
    enableSmartSuggestions: true,
  });

  // Initialize collaboration hooks - temporarily disabled
  // const collaboration = useCollaboration();
  const collaboration = {
    updateSelection: (_selection: any) => {
      void _selection; // Mark as intentionally unused
    },
    updateCursor: (_cursor: any) => {
      void _cursor; // Mark as intentionally unused
    },
    transformAndSendChange: (_type: string, _change: any) => {
      void _type; void _change; // Mark as intentionally unused
    },
    updateViewport: (_viewport: any) => {
      void _viewport; // Mark as intentionally unused
    },
  };

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      applyNodes(changes);

      // Send changes through collaboration system
      changes.forEach(change => {
        collaboration.transformAndSendChange('node', change);
      });

      try {
        useFlowSyncStore.getState().publishPatch(activeView, { nodeChanges: changes });
      } catch (err) {
        console.debug('publishPatch nodeChanges failed', err);
      }
    },
    [applyNodes, activeView, collaboration],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      applyEdges(changes);

      // Send changes through collaboration system
      changes.forEach(change => {
        collaboration.transformAndSendChange('edge', change);
      });

      try {
        useFlowSyncStore.getState().publishPatch(activeView, { edgeChanges: changes });
      } catch (err) {
        console.debug('publishPatch edgeChanges failed', err);
      }
    },
    [applyEdges, activeView, collaboration],
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      const newEdge = addEdge({
        source: params.source!,
        target: params.target!,
        data: { type: 'signal' },
      });
      try {
        useFlowSyncStore.getState().publishPatch(activeView, { addedEdges: [newEdge] });
      } catch (err) {
        console.debug('publishPatch full (connect) failed', err);
      }
    },
    [addEdge, activeView],
  );

  const handleDeleteNode = useCallback(() => {
    if (selectedNodeId) {
      removeNode(selectedNodeId);
      try {
        useFlowSyncStore.getState().publishPatch(activeView, { removedNodes: [selectedNodeId] });
      } catch (err) {
        console.debug('publishPatch full (delete) failed', err);
      }
    }
  }, [removeNode, selectedNodeId, activeView]);

  const handleAddNode = useCallback(
    (type: FlowNodeType) => {
      const parentId = getSongId(hierarchy);
      const newNode = addNode({
        type,
        data: {
          parentId,
        } as any,
        position: { x: Math.random() * 400 - 200, y: 250 + Math.random() * 120 },
      });
      try {
        useFlowSyncStore.getState().publishPatch(activeView, { addedNodes: [newNode] });
      } catch (err) {
        console.debug(`publishPatch full (add ${type}) failed`, err);
      }
    },
    [addNode, hierarchy, activeView],
  );

  const selectedNode = useMemo(() => nodes.find(node => node.id === selectedNodeId), [nodes, selectedNodeId]);

  return (
    <div className="flex h-full min-h-[calc(100vh-80px)] w-full" style={{ width: '100%', height: '100%' }}>
      <aside className="w-72 border-r border-daw-border bg-daw-surface-secondary p-4 overflow-y-auto space-y-6">
        <div className="mb-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-daw-text-secondary">View</span>
            <select
              value={activeView}
              onChange={e => setActiveView(e.target.value as 'daw' | 'theory')}
              className="ml-2 rounded border border-daw-border bg-daw-surface px-2 py-1 text-sm"
            >
              <option value="daw">DAW</option>
              <option value="theory">Theory</option>
            </select>
          </label>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-daw-text-primary mb-3">Hierarchy</h2>
          <HierarchyView tree={hierarchy} onSelect={selectNode} selectedId={selectedNodeId} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-daw-text-primary mb-3">Quick Actions</h2>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleAddNode('section')}
              className="rounded bg-daw-accent-primary px-3 py-2 text-sm font-medium text-white hover:bg-daw-accent-primary/90"
            >
              Add Section
            </button>
            <button
              onClick={() => handleAddNode('track')}
              className="rounded border border-daw-border px-3 py-2 text-sm font-medium text-daw-text-secondary hover:bg-daw-surface"
            >
              Add Track
            </button>
            <button
              onClick={() => setShowPluginBrowser(true)}
              className="rounded border border-daw-border px-3 py-2 text-sm font-medium text-daw-text-secondary hover:bg-daw-surface"
            >
              Add Plugin
            </button>
            <button
              onClick={handleDeleteNode}
              disabled={!selectedNodeId}
              className="rounded border border-transparent px-3 py-2 text-sm font-medium text-red-300 hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Delete Selected
            </button>
          </div>
        </div>
        {selectedNode && <NodeInspector nodeId={selectedNode.id} onUpdate={updateNodeData as any} />}

        {/* AI Suggestions Panel */}
        <AISuggestionPanel
          activeSuggestions={aguiFlowBridge.activeSuggestions}
          suggestionHistory={aguiFlowBridge.suggestionHistory}
          onAcceptSuggestion={aguiFlowBridge.acceptSuggestion}
          onRejectSuggestion={aguiFlowBridge.rejectSuggestion}
          onRequestSuggestions={() => aguiFlowBridge.requestSuggestions()}
          className="mt-6"
        />

        {/* Collaboration Hub - Temporarily disabled to prevent infinite loops */}
        <div className="mt-6">
          <div className="bg-white border rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Collaboration Hub Disabled - Preventing infinite loops</p>
          </div>
        </div>

        {/* Audio Engine Panel - Temporarily disabled due to missing backend endpoints */}
        <div className="mt-6 space-y-4">
          <div className="bg-white border rounded-lg shadow-sm p-4">
            <p className="text-sm text-gray-600">Audio Engine Disabled - Backend endpoints not implemented</p>
          </div>

          {/* Audio Engine Components Temporarily Disabled */}
        </div>
      </aside>

      <main className="relative flex-1 w-full h-full min-h-0" style={{ width: '100%', height: '100%', minHeight: '400px' }}>
        <div className="w-full h-full" style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative' }}>
          <ReactFlow
          style={{ width: '100%', height: '100%' }}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, node) => {
            selectNode(node.id);
            collaboration.updateSelection({
              nodeIds: [node.id],
              edgeIds: [],
              view: 'daw'
            });
          }}
          onPaneClick={() => {
            collaboration.updateSelection({
              nodeIds: [],
              edgeIds: [],
              view: 'daw'
            });
          }}
          onMouseMove={(event) => {
            collaboration.updateCursor({
              x: event.clientX,
              y: event.clientY,
              view: 'daw'
            });
          }}
          onMove={(_, viewport) => {
            collaboration.updateViewport(viewport);
          }}
          fitView
        >
          <MiniMap pannable zoomable />
          <Controls position="bottom-right" />
          <Background gap={16} />

          {/* Collaboration Overlay */}
          {/* UserCursors - Temporarily disabled to prevent infinite loops */}
          <div className="absolute top-4 left-4 bg-white border rounded-lg shadow-sm p-2 text-xs">
            User Cursors Disabled
          </div>
          {/* UserSelections - Temporarily disabled to prevent infinite loops */}
          <div className="absolute top-16 left-4 bg-white border rounded-lg shadow-sm p-2 text-xs">
            User Selections Disabled
          </div>
        </ReactFlow>
        </div>

        {/* AI Suggestions Overlay */}
        <AISuggestionOverlay
          suggestions={aguiFlowBridge.activeSuggestions}
          nodes={nodes}
          edges={edges}
          onAcceptSuggestion={aguiFlowBridge.acceptSuggestion}
          onRejectSuggestion={aguiFlowBridge.rejectSuggestion}
        />

        {/* Collaboration Status Indicator */}
        <div className="absolute top-4 right-4 z-10">
          <CollaborationIndicator showCount={true} />
        </div>
      </main>

      {/* Plugin Browser Modal */}
      <PluginBrowserModal
        isOpen={showPluginBrowser}
        onClose={() => setShowPluginBrowser(false)}
        onPluginSelect={(plugin) => {
          // Add plugin as a flow node
          const pluginNode = {
            id: `plugin_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            type: pluginNodeType,
            position: { x: Math.random() * 400 - 200, y: Math.random() * 300 + 50 },
            data: {
              label: plugin.name,
              description: `${plugin.manufacturer} ${plugin.category}`,
              pluginName: plugin.name,
              pluginCategory: plugin.category,
              position: { x: 0, y: 0 },
              color: '#3b82f6',
              type: "plugin" as const,
              order: 0,
              path: [],
            } as any,
          };
          addNode(pluginNode);
        }}
      />
    </div>
  );
}

function getSongId(tree: FlowHierarchy): string | undefined {
  const songNode = tree.find(item => item.node.type === 'song');
  return songNode?.node.id;
}
