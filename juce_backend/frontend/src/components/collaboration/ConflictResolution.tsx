import React, { useState, useEffect } from 'react';
import { AlertTriangle, GitMerge, User, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaborationStore';

interface Conflict {
  id: string;
  operation1: {
    userId: string;
    userName: string;
    userColor: string;
    type: string;
    description: string;
  };
  operation2: {
    userId: string;
    userName: string;
    userColor: string;
    type: string;
    description: string;
  };
  timestamp: number;
  resolution: 'pending' | 'resolved' | 'ignored';
  resolvedBy?: string;
  resolutionAction?: string;
}

interface ConflictResolutionProps {
  className?: string;
}

export function ConflictResolution({ className = '' }: ConflictResolutionProps) {
  const { conflicts, resolveConflict } = useCollaborationStore();
  const [activeConflicts, setActiveConflicts] = useState<Conflict[]>([]);

  // Simulate conflict detection (in real implementation, this would come from operational transform engine)
  useEffect(() => {
    const interval = setInterval(() => {
      // This would be replaced with actual conflict detection from the OT engine
      const mockConflicts: Conflict[] = conflicts.map(conflict => ({
        id: conflict.id,
        operation1: {
          userId: conflict.operation1.userId,
          userName: conflict.operation1.userName || 'User 1',
          userColor: conflict.operation1.userColor || '#3b82f6',
          type: conflict.operation1.type,
          description: getOperationDescription(conflict.operation1),
        },
        operation2: {
          userId: conflict.operation2.userId,
          userName: conflict.operation2.userName || 'User 2',
          userColor: conflict.operation2.userColor || '#ef4444',
          type: conflict.operation2.type,
          description: getOperationDescription(conflict.operation2),
        },
        timestamp: conflict.timestamp,
        resolution: conflict.resolution || 'pending',
        resolvedBy: conflict.resolvedBy,
        resolutionAction: conflict.resolutionAction,
      }));

      setActiveConflicts(mockConflicts);
    }, 1000);

    return () => clearInterval(interval);
  }, [conflicts]);

  const getOperationDescription = (operation: any): string => {
    switch (operation.type) {
      case 'node_add':
        return `Added node: ${operation.data.nodeId || operation.data.id || 'Unknown'}`;
      case 'node_remove':
        return `Removed node: ${operation.data.nodeId || 'Unknown'}`;
      case 'node_update':
        return `Updated node: ${operation.data.nodeId || 'Unknown'}`;
      case 'edge_add':
        return `Added connection: ${operation.data.edgeId || operation.data.id || 'Unknown'}`;
      case 'edge_remove':
        return `Removed connection: ${operation.data.edgeId || 'Unknown'}`;
      default:
        return `Performed ${operation.type} operation`;
    }
  };

  const handleResolveConflict = (conflictId: string, resolution: 'merge' | 'override' | 'ignore') => {
    resolveConflict(conflictId, resolution);
  };

  const getResolutionIcon = (resolution: string) => {
    switch (resolution) {
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'ignored': return <XCircle className="w-4 h-4 text-gray-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const pendingConflicts = activeConflicts.filter(c => c.resolution === 'pending');
  const resolvedConflicts = activeConflicts.filter(c => c.resolution !== 'pending');

  if (activeConflicts.length === 0) {
    return (
      <div className={`border rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 text-green-600">
          <CheckCircle className="w-5 h-5" />
          <h3 className="font-semibold">No Conflicts</h3>
        </div>
        <p className="text-sm text-gray-600 mt-2">All collaborative changes are synchronized successfully.</p>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <GitMerge className="w-5 h-5 text-yellow-600" />
        <h3 className="font-semibold">Conflict Resolution</h3>
        {pendingConflicts.length > 0 && (
          <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
            {pendingConflicts.length} pending
          </span>
        )}
      </div>

      {/* Pending Conflicts */}
      {pendingConflicts.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-sm text-gray-900">Pending Conflicts</h4>
          {pendingConflicts.map(conflict => (
            <div key={conflict.id} className="border-l-4 border-yellow-400 bg-yellow-50 p-3 rounded-r-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Edit Conflict</span>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(conflict.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-start space-x-2">
                      <div
                        className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: conflict.operation1.userColor }}
                      />
                      <div>
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span className="font-medium">{conflict.operation1.userName}</span>
                        </div>
                        <p className="text-gray-600 mt-1">{conflict.operation1.description}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-2">
                      <div
                        className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                        style={{ backgroundColor: conflict.operation2.userColor }}
                      />
                      <div>
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span className="font-medium">{conflict.operation2.userName}</span>
                        </div>
                        <p className="text-gray-600 mt-1">{conflict.operation2.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => handleResolveConflict(conflict.id, 'merge')}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                    >
                      Merge Changes
                    </button>
                    <button
                      onClick={() => handleResolveConflict(conflict.id, 'override')}
                      className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                    >
                      Keep Mine
                    </button>
                    <button
                      onClick={() => handleResolveConflict(conflict.id, 'ignore')}
                      className="px-3 py-1 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50 transition-colors"
                    >
                      Ignore
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolved Conflicts */}
      {resolvedConflicts.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="font-medium text-sm text-gray-900">Recently Resolved</h4>
          {resolvedConflicts.slice(-3).map(conflict => (
            <div key={conflict.id} className="flex items-center space-x-3 text-xs text-gray-600 p-2 bg-gray-50 rounded">
              {getResolutionIcon(conflict.resolution)}
              <div className="flex-1">
                <span>
                  Conflict between {conflict.operation1.userName} and {conflict.operation2.userName} was {conflict.resolution}
                </span>
                {conflict.resolvedBy && (
                  <span className="ml-1">by {conflict.resolvedBy}</span>
                )}
              </div>
              <span className="text-gray-400">
                {new Date(conflict.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ConflictResolution;