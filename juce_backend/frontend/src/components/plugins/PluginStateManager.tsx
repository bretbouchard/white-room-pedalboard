import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/utils';
import { useWebSocket } from '@/hooks/useWebSocket';
import { usePluginStore } from '@/stores/pluginStore';
import Button from '@/components/ui/Button';
import type { PluginInstance } from '@/types/plugins';

export interface PluginStateManagerProps {
  pluginInstance: PluginInstance;
  trackId: string;
  className?: string;
  showABComparison?: boolean;
}

interface PluginState {
  id: string;
  name: string;
  parameters: Record<string, number>;
  timestamp: string;
  description?: string;
}

/**
 * Plugin State Manager component with undo/redo and A/B comparison
 */
const PluginStateManager: React.FC<PluginStateManagerProps> = ({
  pluginInstance,
  trackId,
  className,
  showABComparison = true,
}) => {
  const [stateHistory, setStateHistory] = useState<PluginState[]>([]);
  const [currentStateIndex, setCurrentStateIndex] = useState(-1);
  const [stateA, setStateA] = useState<PluginState | null>(null);
  const [stateB, setStateB] = useState<PluginState | null>(null);
  const [activeComparison, setActiveComparison] = useState<'A' | 'B' | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  const { sendMessage } = useWebSocket();
  const { updatePluginInstance, undo, redo } = usePluginStore();

  // Create state snapshot
  const createStateSnapshot = useCallback((description?: string): PluginState => {
    const parameters: Record<string, number> = {};
    Object.entries(pluginInstance.parameters).forEach(([id, param]) => {
      parameters[id] = param.value;
    });

    return {
      id: `state_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: description || `State ${stateHistory.length + 1}`,
      parameters,
      timestamp: new Date().toISOString(),
      description,
    };
  }, [pluginInstance.parameters, stateHistory.length]);

  // Save current state to history
  const saveCurrentState = useCallback((description?: string) => {
    const newState = createStateSnapshot(description);
    
    setStateHistory(prev => {
      // Remove any states after current index (for branching)
      const newHistory = prev.slice(0, currentStateIndex + 1);
      newHistory.push(newState);
      
      // Limit history to 50 states
      return newHistory.slice(-50);
    });
    
    setCurrentStateIndex(prev => Math.min(prev + 1, 49));

    // Send to backend for persistence
    sendMessage({
      type: 'plugin.state.save',
      data: {
        track_id: trackId,
        plugin_id: pluginInstance.instance_id,
        state: newState,
      },
    });
  }, [createStateSnapshot, currentStateIndex, trackId, pluginInstance.instance_id, sendMessage]);

  // Restore state from history
  const restoreState = useCallback(async (state: PluginState) => {
    try {
      // Update plugin parameters
      const updatedParameters = { ...pluginInstance.parameters };
      Object.entries(state.parameters).forEach(([paramId, paramValue]) => {
        if (updatedParameters[paramId]) {
          updatedParameters[paramId] = {
            ...updatedParameters[paramId],
            value: paramValue,
          };
        }
      });

      updatePluginInstance(pluginInstance.instance_id, {
        parameters: updatedParameters,
        last_used: new Date().toISOString(),
      });

      // Send to backend
      sendMessage('plugin.state.restore', {
        track_id: trackId,
        plugin_id: pluginInstance.instance_id,
        state: state,
      });

    } catch (error) {
      console.error('Failed to restore plugin state:', error);
    }
  }, [pluginInstance, trackId, updatePluginInstance, sendMessage]);

  // Undo last change
  const handleUndo = useCallback(() => {
    if (currentStateIndex > 0) {
      const previousState = stateHistory[currentStateIndex - 1];
      restoreState(previousState);
      setCurrentStateIndex(prev => prev - 1);
    }
  }, [currentStateIndex, stateHistory, restoreState]);

  // Redo last undone change
  const handleRedo = useCallback(() => {
    if (currentStateIndex < stateHistory.length - 1) {
      const nextState = stateHistory[currentStateIndex + 1];
      restoreState(nextState);
      setCurrentStateIndex(prev => prev + 1);
    }
  }, [currentStateIndex, stateHistory, restoreState]);

  // A/B Comparison functions
  const setComparisonState = useCallback((slot: 'A' | 'B') => {
    const currentState = createStateSnapshot(`Comparison ${slot}`);
    if (slot === 'A') {
      setStateA(currentState);
    } else {
      setStateB(currentState);
    }
  }, [createStateSnapshot]);

  const switchToComparison = useCallback((slot: 'A' | 'B') => {
    const state = slot === 'A' ? stateA : stateB;
    if (state) {
      restoreState(state);
      setActiveComparison(slot);
    }
  }, [stateA, stateB, restoreState]);

  const clearComparison = useCallback(() => {
    setActiveComparison(null);
  }, []);

  // Auto-save on parameter changes
  useEffect(() => {
    if (!autoSaveEnabled) return;

    const timeoutId = setTimeout(() => {
      if (stateHistory.length === 0 || currentStateIndex === -1) {
        saveCurrentState('Initial state');
      } else {
        // Check if parameters have changed significantly
        const lastState = stateHistory[currentStateIndex];
        const hasSignificantChange = Object.entries(pluginInstance.parameters).some(([id, param]) => {
          const lastValue = lastState.parameters[id] || 0;
          return Math.abs(param.value - lastValue) > 0.01;
        });

        if (hasSignificantChange) {
          saveCurrentState('Auto-save');
        }
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(timeoutId);
  }, [pluginInstance.parameters, autoSaveEnabled, saveCurrentState, stateHistory, currentStateIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'z':
            if (event.shiftKey) {
              event.preventDefault();
              handleRedo();
            } else {
              event.preventDefault();
              handleUndo();
            }
            break;
          case 'y':
            event.preventDefault();
            handleRedo();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const canUndo = currentStateIndex > 0;
  const canRedo = currentStateIndex < stateHistory.length - 1;

  return (
    <div className={cn('plugin-state-manager bg-daw-surface-secondary rounded-lg p-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-daw-text-primary">State Manager</h4>
        <div className="flex items-center space-x-1">
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={(e) => setAutoSaveEnabled(e.target.checked)}
              className="w-3 h-3"
            />
            <span className="text-xs text-daw-text-secondary">Auto-save</span>
          </label>
        </div>
      </div>

      {/* Undo/Redo Controls */}
      <div className="flex items-center space-x-2 mb-3">
        <Button
          onClick={handleUndo}
          disabled={!canUndo}
          variant="secondary"
          size="sm"
          className="text-xs px-2 py-1"
          title="Undo (Ctrl+Z)"
        >
          ↶ Undo
        </Button>
        <Button
          onClick={handleRedo}
          disabled={!canRedo}
          variant="secondary"
          size="sm"
          className="text-xs px-2 py-1"
          title="Redo (Ctrl+Y)"
        >
          ↷ Redo
        </Button>
        <Button
          onClick={() => saveCurrentState('Manual save')}
          variant="accent"
          size="sm"
          className="text-xs px-2 py-1"
        >
          Save State
        </Button>
      </div>

      {/* A/B Comparison */}
      {showABComparison && (
        <div className="mb-3 p-2 bg-daw-surface-primary rounded border">
          <div className="text-xs font-medium text-daw-text-secondary mb-2">A/B Comparison</div>
          
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-daw-text-tertiary">State A</span>
                {stateA && (
                  <span className="text-xs text-green-400">●</span>
                )}
              </div>
              <div className="flex space-x-1">
                <Button
                  onClick={() => setComparisonState('A')}
                  variant="secondary"
                  size="sm"
                  className="text-xs px-2 py-1 flex-1"
                >
                  Set A
                </Button>
                <Button
                  onClick={() => switchToComparison('A')}
                  disabled={!stateA}
                  variant={activeComparison === 'A' ? 'accent' : 'secondary'}
                  size="sm"
                  className="text-xs px-2 py-1 flex-1"
                >
                  Load A
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-daw-text-tertiary">State B</span>
                {stateB && (
                  <span className="text-xs text-green-400">●</span>
                )}
              </div>
              <div className="flex space-x-1">
                <Button
                  onClick={() => setComparisonState('B')}
                  variant="secondary"
                  size="sm"
                  className="text-xs px-2 py-1 flex-1"
                >
                  Set B
                </Button>
                <Button
                  onClick={() => switchToComparison('B')}
                  disabled={!stateB}
                  variant={activeComparison === 'B' ? 'accent' : 'secondary'}
                  size="sm"
                  className="text-xs px-2 py-1 flex-1"
                >
                  Load B
                </Button>
              </div>
            </div>
          </div>

          {activeComparison && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-daw-text-secondary">
                Active: State {activeComparison}
              </span>
              <Button
                onClick={clearComparison}
                variant="secondary"
                size="sm"
                className="text-xs px-2 py-1"
              >
                Clear
              </Button>
            </div>
          )}
        </div>
      )}

      {/* State History */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-daw-text-secondary">History</div>
        <div className="max-h-32 overflow-y-auto space-y-1">
          {stateHistory.length === 0 ? (
            <div className="text-xs text-daw-text-tertiary text-center py-2">
              No saved states
            </div>
          ) : (
            stateHistory.slice().reverse().map((state, index) => {
              const actualIndex = stateHistory.length - 1 - index;
              const isCurrent = actualIndex === currentStateIndex;
              
              return (
                <div
                  key={state.id}
                  className={cn(
                    'flex items-center justify-between p-2 rounded cursor-pointer text-xs',
                    isCurrent
                      ? 'bg-daw-accent-primary/20 border border-daw-accent-primary'
                      : 'bg-daw-surface-primary hover:bg-daw-surface-tertiary'
                  )}
                  onClick={() => {
                    restoreState(state);
                    setCurrentStateIndex(actualIndex);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-daw-text-primary truncate">
                      {state.name}
                    </div>
                    <div className="text-daw-text-tertiary">
                      {new Date(state.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="text-daw-accent-primary ml-2">●</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Status */}
      <div className="mt-3 pt-2 border-t border-daw-surface-tertiary text-xs text-daw-text-tertiary">
        {stateHistory.length > 0 && (
          <div>
            State {currentStateIndex + 1} of {stateHistory.length}
            {canUndo && <span className="ml-2">• Can undo</span>}
            {canRedo && <span className="ml-2">• Can redo</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default PluginStateManager;