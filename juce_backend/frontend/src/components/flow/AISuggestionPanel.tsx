import React, { useState } from 'react';
import { X, Check, XCircle, Lightbulb, Brain, Zap, Settings, Workflow, ArrowRight } from 'lucide-react';
import type { FlowSuggestionEvent } from '@/agui/agui-flow-bridge';

interface AISuggestionPanelProps {
  activeSuggestions: Map<string, FlowSuggestionEvent>;
  suggestionHistory: FlowSuggestionEvent[];
  onAcceptSuggestion: (suggestionId: string) => void;
  onRejectSuggestion: (suggestionId: string, feedback?: string) => void;
  onRequestSuggestions?: () => void;
  className?: string;
}

const SuggestionIcon: Record<FlowSuggestionEvent['type'], React.ComponentType<{ className?: string }>> = {
  'node-suggestion': Lightbulb,
  'connection-recommendation': ArrowRight,
  'flow-optimization': Zap,
  'parameter-suggestion': Settings,
  'workflow-improvement': Workflow,
};

const SuggestionTypeColors: Record<FlowSuggestionEvent['type'], string> = {
  'node-suggestion': 'text-blue-500 bg-blue-50 border-blue-200',
  'connection-recommendation': 'text-green-500 bg-green-50 border-green-200',
  'flow-optimization': 'text-yellow-500 bg-yellow-50 border-yellow-200',
  'parameter-suggestion': 'text-purple-500 bg-purple-50 border-purple-200',
  'workflow-improvement': 'text-indigo-500 bg-indigo-50 border-indigo-200',
};

const SuggestionTypeLabels: Record<FlowSuggestionEvent['type'], string> = {
  'node-suggestion': 'Node Suggestion',
  'connection-recommendation': 'Connection',
  'flow-optimization': 'Flow Optimization',
  'parameter-suggestion': 'Parameter',
  'workflow-improvement': 'Workflow',
};

export function AISuggestionPanel({
  activeSuggestions,
  suggestionHistory,
  onAcceptSuggestion,
  onRejectSuggestion,
  onRequestSuggestions,
  className = '',
}: AISuggestionPanelProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());

  const toggleExpanded = (suggestionId: string) => {
    setExpandedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suggestionId)) {
        newSet.delete(suggestionId);
      } else {
        newSet.add(suggestionId);
      }
      return newSet;
    });
  };

  const getSuggestionDescription = (suggestion: FlowSuggestionEvent): string => {
    const { suggestion: data } = suggestion.payload;

    switch (suggestion.type) {
      case 'node-suggestion':
        // Type guard for NodeSuggestion
        if ('nodeType' in data && 'reason' in data) {
          return `Add ${data.nodeType} node: ${data.reason}`;
        }
        return `Add node: ${suggestion.payload.reasoning || 'Unknown reason'}`;
      case 'connection-recommendation':
        // Type guard for ConnectionSuggestion
        if ('sourceId' in data && 'targetId' in data && 'reason' in data) {
          return `Connect ${data.sourceId} → ${data.targetId}: ${data.reason}`;
        }
        return `Connection suggestion: ${suggestion.payload.reasoning || 'Unknown reason'}`;
      case 'flow-optimization':
        // Type guard for FlowOptimization
        if ('type' in data && 'reason' in data) {
          return `${data.type.charAt(0).toUpperCase() + data.type.slice(1)} optimization: ${data.reason}`;
        }
        return `Flow optimization: ${suggestion.payload.reasoning || 'Unknown reason'}`;
      case 'parameter-suggestion':
        // Type guard for ParameterSuggestion
        if ('nodeId' in data && 'reason' in data) {
          return `Update ${data.nodeId} parameters: ${data.reason}`;
        }
        return `Parameter suggestion: ${suggestion.payload.reasoning || 'Unknown reason'}`;
      case 'workflow-improvement':
        // Type guard for WorkflowImprovement
        if ('suggestions' in data && Array.isArray(data.suggestions)) {
          return `${data.suggestions.length} workflow improvements`;
        }
        return `Workflow improvement: ${suggestion.payload.reasoning || 'Unknown reason'}`;
      default:
        return suggestion.payload.reasoning || 'Suggestion';
    }
  };

  const getSuggestionDetails = (suggestion: FlowSuggestionEvent): React.ReactNode => {
    const { suggestion: data } = suggestion.payload;

    switch (suggestion.type) {
      case 'node-suggestion':
        return (
          <div className="space-y-2 text-sm">
            <div><strong>Node Type:</strong> {'nodeType' in data ? data.nodeType : 'Unknown'}</div>
            <div><strong>Position:</strong> {'position' in data ? `(${Math.round(data.position.x)}, ${Math.round(data.position.y)})` : 'Unknown'}</div>
            {'data' in data && data.data && Object.keys(data.data).length > 0 && (
              <div><strong>Properties:</strong> {JSON.stringify(data.data, null, 2)}</div>
            )}
          </div>
        );

      case 'connection-recommendation':
        return (
          <div className="space-y-2 text-sm">
            <div><strong>Source:</strong> {'sourceId' in data ? data.sourceId : 'Unknown'}</div>
            <div><strong>Target:</strong> {'targetId' in data ? data.targetId : 'Unknown'}</div>
            <div><strong>Type:</strong> {'connectionType' in data ? data.connectionType : 'Unknown'}</div>
          </div>
        );

      case 'flow-optimization':
        return (
          <div className="space-y-2 text-sm">
            <div><strong>Type:</strong> {'type' in data ? data.type : 'Unknown'}</div>
            {'changes' in data && data.changes?.nodePositions && (
              <div><strong>Node Position Changes:</strong> {Object.keys(data.changes.nodePositions).length} nodes</div>
            )}
            {'changes' in data && data.changes?.nodeRemovals && (
              <div><strong>Nodes to Remove:</strong> {data.changes.nodeRemovals.length} nodes</div>
            )}
            {'changes' in data && data.changes?.edgeOptimizations && (
              <div><strong>Edge Optimizations:</strong> {data.changes.edgeOptimizations.length} edges</div>
            )}
          </div>
        );

      case 'parameter-suggestion':
        return (
          <div className="space-y-2 text-sm">
            <div><strong>Target Node:</strong> {'nodeId' in data ? data.nodeId : 'Unknown'}</div>
            <div><strong>Parameters:</strong></div>
            <pre className="text-xs bg-gray-50 p-2 rounded">
              {'parameters' in data ? JSON.stringify(data.parameters, null, 2) : 'No parameters'}
            </pre>
          </div>
        );

      case 'workflow-improvement':
        return (
          <div className="space-y-2 text-sm">
            <div><strong>Suggestions:</strong></div>
            <ul className="list-disc list-inside space-y-1">
              {'suggestions' in data && Array.isArray(data.suggestions) ? data.suggestions.map((s, idx) => (
                <li key={idx}>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    s.impact === 'high' ? 'bg-red-100 text-red-700' :
                    s.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {s.impact.toUpperCase()}
                  </span>
                  <span className="ml-2">{s.description}</span>
                </li>
              )) : (
                <li>No suggestions available</li>
              )}
            </ul>
          </div>
        );

      default:
        return <div className="text-sm">{JSON.stringify(data, null, 2)}</div>;
    }
  };

  const renderSuggestion = (suggestion: FlowSuggestionEvent) => {
    const Icon = SuggestionIcon[suggestion.type];
    const confidence = suggestion.payload.confidence;
    const isExpanded = expandedSuggestions.has(suggestion.id!);
    const colorClass = SuggestionTypeColors[suggestion.type];

    return (
      <div
        key={suggestion.id}
        className={`border rounded-lg p-4 space-y-3 transition-all duration-200 ${colorClass}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2 flex-1">
            <Icon className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{SuggestionTypeLabels[suggestion.type]}</div>
              <div className="text-xs text-gray-600 mt-1">
                {getSuggestionDescription(suggestion)}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
            <span className={`text-xs px-2 py-1 rounded-full ${
              confidence > 0.8 ? 'bg-green-100 text-green-700' :
              confidence > 0.6 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {Math.round(confidence * 100)}%
            </span>
          </div>
        </div>

        {/* Reasoning */}
        <div className="text-xs text-gray-600">
          <strong>AI Reasoning:</strong> {suggestion.payload.reasoning}
        </div>

        {/* Expandable Details */}
        <div className="space-y-2">
          <button
            onClick={() => toggleExpanded(suggestion.id!)}
            className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
          >
            {isExpanded ? 'Hide Details' : 'Show Details'}
          </button>

          {isExpanded && (
            <div className="text-sm bg-white bg-opacity-50 p-3 rounded border border-gray-200">
              {getSuggestionDetails(suggestion)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={() => onAcceptSuggestion(suggestion.id!)}
              className="flex items-center space-x-1 px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Accept</span>
            </button>
            <button
              onClick={() => onRejectSuggestion(suggestion.id!)}
              className="flex items-center space-x-1 px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject</span>
            </button>
          </div>

          <div className="text-xs text-gray-500">
            {new Date(suggestion.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold">AI Suggestions</h3>
          {activeSuggestions.size > 0 && (
            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
              {activeSuggestions.size} active
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {onRequestSuggestions && (
            <button
              onClick={onRequestSuggestions}
              className="text-xs px-2 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
            >
              Request
            </button>
          )}

          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              showHistory
                ? 'bg-gray-200 text-gray-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {showHistory ? 'Hide' : 'History'}
          </button>

          <button
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Suggestions */}
      <div className="max-h-96 overflow-y-auto">
        {activeSuggestions.size > 0 ? (
          <div className="p-4 space-y-3">
            {Array.from(activeSuggestions.values()).map(renderSuggestion)}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Lightbulb className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No active AI suggestions</p>
            {onRequestSuggestions && (
              <button
                onClick={onRequestSuggestions}
                className="mt-2 text-xs text-purple-600 hover:text-purple-800 transition-colors"
              >
                Request suggestions
              </button>
            )}
          </div>
        )}
      </div>

      {/* History Section */}
      {showHistory && suggestionHistory.length > 0 && (
        <div className="border-t">
          <div className="p-4 border-b bg-gray-50">
            <h4 className="font-medium text-sm">Recent History</h4>
          </div>
          <div className="max-h-64 overflow-y-auto p-4 space-y-2">
            {suggestionHistory.slice(-10).reverse().map(suggestion => (
              <div
                key={suggestion.id}
                className="text-xs p-2 bg-gray-50 rounded border border-gray-200 opacity-60"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{SuggestionTypeLabels[suggestion.type]}</span>
                  <span className="text-gray-500">
                    {new Date(suggestion.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-gray-600 mt-1 truncate">
                  {getSuggestionDescription(suggestion)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}