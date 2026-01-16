import React, { useMemo } from 'react';
import { Lightbulb, ArrowRight, Zap, X, Check } from 'lucide-react';
import type { FlowSuggestionEvent } from '@/agui/agui-flow-bridge';
import type { Node, Edge } from '@xyflow/react';

interface AISuggestionOverlayProps {
  suggestions: Map<string, FlowSuggestionEvent>;
  nodes: Node[];
  edges: Edge[];
  onAcceptSuggestion: (suggestionId: string) => void;
  onRejectSuggestion: (suggestionId: string) => void;
  className?: string;
}

interface SuggestionOverlayProps {
  suggestion: FlowSuggestionEvent;
  onAccept: () => void;
  onReject: () => void;
}

// Node suggestion overlay
function NodeSuggestionOverlay({ suggestion, onAccept, onReject }: SuggestionOverlayProps) {
  const nodeSuggestion = suggestion.payload.suggestion as any;
  const { position, nodeType } = nodeSuggestion;

  return (
    <div
      className="absolute z-50 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      {/* Ghost node visualization */}
      <div className="relative pointer-events-auto">
        <div className="w-32 h-20 bg-blue-100 border-2 border-dashed border-blue-400 rounded-lg flex flex-col items-center justify-center shadow-lg backdrop-blur-sm bg-opacity-80">
          <Lightbulb className="w-6 h-6 text-blue-500 mb-1" />
          <div className="text-xs font-medium text-blue-700">Add {nodeType}</div>
          <div className="text-xs text-blue-600 mt-1">{Math.round(suggestion.payload.confidence * 100)}%</div>
        </div>

        {/* Action buttons */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-1">
          <button
            onClick={onAccept}
            className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center hover:bg-green-600 transition-colors shadow-md"
            title="Accept suggestion"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={onReject}
            className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
            title="Reject suggestion"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        {/* Reasoning tooltip */}
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-48 text-xs bg-gray-800 text-white p-2 rounded shadow-lg opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <div className="font-medium mb-1">AI Suggestion</div>
          <div>{suggestion.payload.reasoning}</div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"></div>
        </div>
      </div>
    </div>
  );
}

// Connection suggestion overlay
function ConnectionSuggestionOverlay({ suggestion, onAccept, onReject }: SuggestionOverlayProps) {
  const connSuggestion = suggestion.payload.suggestion as any;
  const { sourceId, targetId } = connSuggestion;

  // Find source and target nodes
  const sourceNode = document.querySelector(`[data-node-id="${sourceId}"]`);
  const targetNode = document.querySelector(`[data-node-id="${targetId}"]`);

  if (!sourceNode || !targetNode) return null;

  const sourceRect = sourceNode.getBoundingClientRect();
  const targetRect = targetNode.getBoundingClientRect();

  // Calculate connection path
  const sourceCenterX = sourceRect.left + sourceRect.width / 2;
  const sourceCenterY = sourceRect.top + sourceRect.height / 2;
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;

  return (
    <svg
      className="absolute inset-0 z-40 pointer-events-none"
      style={{ width: '100%', height: '100%' }}
    >
      {/* Suggested connection line */}
      <defs>
        <marker
          id={`arrowhead-${suggestion.id}`}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill="#10b981"
          />
        </marker>
      </defs>

      <line
        x1={sourceCenterX}
        y1={sourceCenterY}
        x2={targetCenterX}
        y2={targetCenterY}
        stroke="#10b981"
        strokeWidth="2"
        strokeDasharray="5,5"
        markerEnd={`url(#arrowhead-${suggestion.id})`}
        className="animate-pulse"
      />

      {/* Floating suggestion indicator */}
      <g
        transform={`translate(${(sourceCenterX + targetCenterX) / 2}, ${(sourceCenterY + targetCenterY) / 2})`}
        className="pointer-events-auto"
      >
        <rect
          x="-60"
          y="-20"
          width="120"
          height="40"
          rx="8"
          fill="white"
          stroke="#10b981"
          strokeWidth="2"
          className="drop-shadow-lg"
        />

        <foreignObject x="-55" y="-15" width="110" height="30">
          <div className="flex items-center justify-center h-full text-xs">
            <ArrowRight className="w-3 h-3 text-green-500 mr-1" />
            <span className="font-medium text-green-700">Connect</span>
            <span className="ml-1 text-gray-500">({Math.round(suggestion.payload.confidence * 100)}%)</span>
          </div>
        </foreignObject>

        {/* Action buttons */}
        <g transform="translate(40, -20)">
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="#10b981"
            className="cursor-pointer hover:bg-green-600 transition-colors"
            onClick={onAccept}
          />
          <path
            d="M 7 10 L 9 12 L 13 8"
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        <g transform="translate(-40, -20)">
          <circle
            cx="10"
            cy="10"
            r="8"
            fill="#ef4444"
            className="cursor-pointer hover:bg-red-600 transition-colors"
            onClick={onReject}
          />
          <path
            d="M 7 7 L 13 13 M 13 7 L 7 13"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      </g>

      {/* Tooltip */}
      <g transform={`translate(${(sourceCenterX + targetCenterX) / 2}, ${(sourceCenterY + targetCenterY) / 2 + 30})`}>
        <rect
          x="-80"
          y="-15"
          width="160"
          height="30"
          rx="4"
          fill="#1f2937"
          opacity="0.9"
        />
        <foreignObject x="-75" y="-10" width="150" height="20">
          <div className="text-white text-xs text-center">
            {suggestion.payload.reasoning}
          </div>
        </foreignObject>
      </g>
    </svg>
  );
}

// Flow optimization overlay
function FlowOptimizationOverlay({ suggestion, onAccept, onReject }: SuggestionOverlayProps) {
  const optimization = suggestion.payload.suggestion as any;
  const affectedNodes = optimization.changes.nodePositions ? Object.keys(optimization.changes.nodePositions) : [];

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start space-x-3">
          <Zap className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-sm text-yellow-800">
              Flow Optimization Available
            </h4>
            <p className="text-xs text-yellow-700 mt-1">
              {suggestion.payload.reasoning}
            </p>

            {affectedNodes.length > 0 && (
              <p className="text-xs text-yellow-600 mt-2">
                {affectedNodes.length} nodes can be repositioned
              </p>
            )}

            <div className="flex space-x-2 mt-3">
              <button
                onClick={onAccept}
                className="px-3 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 transition-colors"
              >
                Apply
              </button>
              <button
                onClick={onReject}
                className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AISuggestionOverlay({
  suggestions,
  onAcceptSuggestion,
  onRejectSuggestion,
  className = '',
}: AISuggestionOverlayProps) {
  // Group suggestions by type for efficient rendering
  const suggestionsByType = useMemo(() => {
    const grouped: Record<string, FlowSuggestionEvent[]> = {};
    suggestions.forEach(suggestion => {
      if (!grouped[suggestion.type]) {
        grouped[suggestion.type] = [];
      }
      grouped[suggestion.type].push(suggestion);
    });
    return grouped;
  }, [suggestions]);

  const renderSuggestion = (suggestion: FlowSuggestionEvent) => {
    const handlers = {
      'node-suggestion': () => (
        <NodeSuggestionOverlay
          key={suggestion.id}
          suggestion={suggestion}
          onAccept={() => onAcceptSuggestion(suggestion.id!)}
          onReject={() => onRejectSuggestion(suggestion.id!)}
        />
      ),
      'connection-recommendation': () => (
        <ConnectionSuggestionOverlay
          key={suggestion.id}
          suggestion={suggestion}
          onAccept={() => onAcceptSuggestion(suggestion.id!)}
          onReject={() => onRejectSuggestion(suggestion.id!)}
        />
      ),
      'flow-optimization': () => (
        <FlowOptimizationOverlay
          key={suggestion.id}
          suggestion={suggestion}
          onAccept={() => onAcceptSuggestion(suggestion.id!)}
          onReject={() => onRejectSuggestion(suggestion.id!)}
        />
      ),
      'parameter-suggestion': () => null, // These don't need overlays
      'workflow-improvement': () => null, // These don't need overlays
    };

    return handlers[suggestion.type]?.() || null;
  };

  // Only show one flow optimization at a time
  const flowOptimizations = suggestionsByType['flow-optimization'] || [];
  const primaryOptimization = flowOptimizations[0];

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Node suggestions */}
      {suggestionsByType['node-suggestion']?.map(renderSuggestion)}

      {/* Connection suggestions */}
      {suggestionsByType['connection-recommendation']?.map(renderSuggestion)}

      {/* Flow optimization (show only primary) */}
      {primaryOptimization && renderSuggestion(primaryOptimization)}

      {/* Parameter and workflow improvements are handled in the panel, not as overlays */}
    </div>
  );
}