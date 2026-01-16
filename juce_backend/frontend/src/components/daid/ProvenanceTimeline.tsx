/**
 * Provenance Timeline Component
 * 
 * Displays a chronological timeline of provenance records for an entity,
 * showing the complete history of transformations and operations.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useDAIDStore } from '../../stores/daidStore';
import { DAIDRecord, OperationType, ProvenanceTimelineProps } from '../../types/daid';

interface TimelineEvent {
  id: string;
  record: DAIDRecord;
  timestamp: Date;
  title: string;
  description: string;
  icon: string;
  color: string;
  metadata: any;
}

export const ProvenanceTimeline: React.FC<ProvenanceTimelineProps> = ({
  entity_type,
  entity_id,
  max_depth,
  show_ai_operations = true,
  show_user_actions = true,
  interactive = true,
  height = 400,
  onRecordSelect
}) => {
  const {
    getProvenanceChain,
    refreshProvenanceChain,
    selectRecord,
    loading,
    errors
  } = useDAIDStore();

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Get provenance chain for the entity
  const provenanceChain = getProvenanceChain(entity_type, entity_id);

  // Refresh chain on mount and when entity changes
  useEffect(() => {
    refreshProvenanceChain(entity_type, entity_id);
  }, [entity_type, entity_id, refreshProvenanceChain]);

  // Convert provenance records to timeline events
  const timelineEvents = useMemo(() => {
    if (!provenanceChain) return [];

    const events: TimelineEvent[] = provenanceChain.provenance_chain
      .filter(record => {
        // Apply depth filter
        if (max_depth !== undefined && record.depth > max_depth) return false;
        
        // Apply operation type filters
        if (!show_ai_operations && record.operation === OperationType.AI_DECISION) return false;
        if (!show_user_actions && record.operation === OperationType.USER_INTERACTION) return false;
        
        // Apply text filter
        if (filterText) {
          const searchText = filterText.toLowerCase();
          const recordText = `${record.operation} ${record.entity_id} ${JSON.stringify(record.operation_metadata)}`.toLowerCase();
          if (!recordText.includes(searchText)) return false;
        }
        
        return true;
      })
      .map(record => ({
        id: record.daid,
        record,
        timestamp: new Date(record.created_at),
        title: getEventTitle(record),
        description: getEventDescription(record),
        icon: getEventIcon(record.operation),
        color: getEventColor(record.operation),
        metadata: record.operation_metadata
      }));

    // Sort events
    return events.sort((a, b) => {
      const timeA = a.timestamp.getTime();
      const timeB = b.timestamp.getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [provenanceChain, max_depth, show_ai_operations, show_user_actions, filterText, sortOrder]);

  const handleEventClick = (event: TimelineEvent) => {
    if (!interactive) return;

    setSelectedEventId(event.id);
    selectRecord(event.record);
    onRecordSelect?.(event.record);
  };

  const handleRefresh = () => {
    refreshProvenanceChain(entity_type, entity_id);
  };

  if (loading.chains) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading provenance timeline...</span>
      </div>
    );
  }

  if (errors.chains) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="text-red-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading timeline</h3>
            <p className="text-sm text-red-700 mt-1">{errors.chains}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="ml-auto bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!provenanceChain || timelineEvents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p>No provenance records found for this entity</p>
        <button
          onClick={handleRefresh}
          className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="provenance-timeline">
      {/* Timeline Controls */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search events..."
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sort:</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            {timelineEvents.length} events
          </span>
          <button
            onClick={handleRefresh}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Refresh timeline"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div 
        className="relative overflow-y-auto"
        style={{ height: `${height}px` }}
      >
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        <div className="space-y-4">
          {timelineEvents.map((event, _index) => {
            void _index; // Mark as intentionally unused
            return (
            <div
              key={event.id}
              className={`relative flex items-start space-x-4 p-3 rounded-lg transition-all duration-200 ${
                interactive ? 'cursor-pointer hover:bg-gray-50' : ''
              } ${
                selectedEventId === event.id ? 'bg-blue-50 border-2 border-blue-200' : 'border border-gray-200'
              }`}
              onClick={() => handleEventClick(event)}
            >
              {/* Timeline dot */}
              <div
                className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-sm"
                style={{ backgroundColor: event.color }}
              >
                <span className="text-white text-xs font-medium">
                  {event.icon}
                </span>
              </div>

              {/* Event content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {event.title}
                  </h4>
                  <time className="text-xs text-gray-500 whitespace-nowrap ml-2">
                    {event.timestamp.toLocaleString()}
                  </time>
                </div>
                
                <p className="text-sm text-gray-600 mt-1">
                  {event.description}
                </p>

                {/* Metadata preview */}
                {Object.keys(event.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    <details className="group">
                      <summary className="cursor-pointer hover:text-gray-700">
                        View metadata ({Object.keys(event.metadata).length} items)
                      </summary>
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </div>
                )}

                {/* Depth indicator */}
                {event.record.depth > 0 && (
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <span>Depth: {event.record.depth}</span>
                    {event.record.parent_daids.length > 0 && (
                      <span className="ml-2">
                        Parents: {event.record.parent_daids.length}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Helper functions
function getEventTitle(record: DAIDRecord): string {
  const operationNames: Record<OperationType, string> = {
    [OperationType.CREATE]: 'Created',
    [OperationType.UPDATE]: 'Updated',
    [OperationType.DELETE]: 'Deleted',
    [OperationType.TRANSFORM]: 'Transformed',
    [OperationType.ANALYZE]: 'Analyzed',
    [OperationType.PROCESS]: 'Processed',
    [OperationType.EXPORT]: 'Exported',
    [OperationType.IMPORT]: 'Imported',
    [OperationType.AI_DECISION]: 'AI Decision',
    [OperationType.USER_INTERACTION]: 'User Action'
  };

  const operationName = operationNames[record.operation] || record.operation;
  return `${operationName} ${record.entity_type} "${record.entity_id}"`;
}

function getEventDescription(record: DAIDRecord): string {
  const metadata = record.operation_metadata;
  
  if (record.operation === OperationType.AI_DECISION) {
    return metadata.reasoning || metadata.decision || 'AI made a decision';
  }
  
  if (record.operation === OperationType.USER_INTERACTION) {
    const actionType = metadata.action_type || 'interaction';
    return `User performed ${actionType}`;
  }
  
  if (record.operation === OperationType.UPDATE && metadata.parameter_name) {
    return `Changed ${metadata.parameter_name} from ${metadata.old_value} to ${metadata.new_value}`;
  }
  
  return metadata.description || `${record.operation} operation on ${record.entity_type}`;
}

function getEventIcon(operation: OperationType): string {
  const iconMap: Record<OperationType, string> = {
    [OperationType.CREATE]: '+',
    [OperationType.UPDATE]: '✎',
    [OperationType.DELETE]: '×',
    [OperationType.TRANSFORM]: '⟲',
    [OperationType.ANALYZE]: '🔍',
    [OperationType.PROCESS]: '⚙',
    [OperationType.EXPORT]: '↗',
    [OperationType.IMPORT]: '↙',
    [OperationType.AI_DECISION]: '🤖',
    [OperationType.USER_INTERACTION]: '👤'
  };
  
  return iconMap[operation] || '•';
}

function getEventColor(operation: OperationType): string {
  const colorMap: Record<OperationType, string> = {
    [OperationType.CREATE]: '#10B981',
    [OperationType.UPDATE]: '#3B82F6',
    [OperationType.DELETE]: '#EF4444',
    [OperationType.TRANSFORM]: '#F59E0B',
    [OperationType.ANALYZE]: '#8B5CF6',
    [OperationType.PROCESS]: '#6B7280',
    [OperationType.EXPORT]: '#8B4513',
    [OperationType.IMPORT]: '#059669',
    [OperationType.AI_DECISION]: '#EC4899',
    [OperationType.USER_INTERACTION]: '#6366F1'
  };
  
  return colorMap[operation] || '#6B7280';
}