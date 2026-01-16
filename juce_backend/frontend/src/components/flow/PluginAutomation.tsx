/**
 * Plugin Parameter Automation Component
 * Provides automation lanes for plugin parameters in the flow workspace
 * Integrates with the timeline and automation system
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { usePluginStore } from '@/stores/pluginStore';
import { useAudioStore } from '@/stores/audioStore';
import type { PluginParameter } from '@/types/plugins';

interface PluginAutomationProps {
  pluginInstanceId: string;
  className?: string;
  width?: number;
  height?: number;
}

interface AutomationPoint {
  id: string;
  time: number;
  value: number;
  interpolationType: 'linear' | 'exponential' | 'step';
}

interface ParameterAutomation {
  parameterId: string;
  parameter: PluginParameter;
  points: AutomationPoint[];
  isAutomated: boolean;
  isRecording: boolean;
}

export const PluginAutomation: React.FC<PluginAutomationProps> = ({
  pluginInstanceId,
  className = '',
  width = 800,
}) => {
  const pluginStore = usePluginStore();
  const audioStore = useAudioStore();

  const pluginInstance = pluginStore.pluginInstances[pluginInstanceId];
  const [automatedParameters, setAutomatedParameters] = useState<Record<string, ParameterAutomation>>({});
  const [selectedParameter, setSelectedParameter] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(audioStore.transport.currentTime);

  // Update current time based on transport
  useEffect(() => {
    setCurrentTime(audioStore.transport.currentTime);
  }, [audioStore.transport.currentTime]);

  // Initialize automated parameters
  useEffect(() => {
    if (pluginInstance) {
      const initialAutomated: Record<string, ParameterAutomation> = {};

      // Get automatable parameters
      Object.entries(pluginInstance.parameters).forEach(([paramId, param]) => {
        if (param.is_automatable) {
          initialAutomated[paramId] = {
            parameterId: paramId,
            parameter: param,
            points: [
              {
                id: 'default',
                time: 0,
                value: param.default_value,
                interpolationType: 'linear',
              },
            ],
            isAutomated: false,
            isRecording: false,
          };
        }
      });

      setAutomatedParameters(initialAutomated);
    }
  }, [pluginInstance]);

  // Calculate parameter value at current time
  const calculateValue = useCallback((automation: ParameterAutomation, time: number): number => {
    if (automation.points.length === 0) return automation.parameter.default_value;
    if (automation.points.length === 1) return automation.points[0].value;

    // Find surrounding points
    let previousPoint = automation.points[0];
    let nextPoint = automation.points[automation.points.length - 1];

    for (let i = 0; i < automation.points.length; i++) {
      if (automation.points[i].time <= time) {
        previousPoint = automation.points[i];
      }
      if (automation.points[i].time >= time) {
        nextPoint = automation.points[i];
        break;
      }
    }

    // If we're after the last point, return its value
    if (time >= automation.points[automation.points.length - 1].time) {
      return automation.points[automation.points.length - 1].value;
    }

    // Calculate interpolated value
    const timeDiff = nextPoint.time - previousPoint.time;
    const valueDiff = nextPoint.value - previousPoint.value;
    const progress = (time - previousPoint.time) / timeDiff;

    switch (nextPoint.interpolationType) {
      case 'linear':
        return previousPoint.value + (valueDiff * progress);
      case 'exponential':
        return previousPoint.value * Math.pow(nextPoint.value / previousPoint.value, progress);
      case 'step':
        return progress >= 0.5 ? nextPoint.value : previousPoint.value;
      default:
        return previousPoint.value + (valueDiff * progress);
    }
  }, []);

  // Update plugin parameters based on automation
  useEffect(() => {
    if (pluginInstance) {
      Object.entries(automatedParameters).forEach(([paramId, automation]) => {
        if (automation.isAutomated) {
          const value = calculateValue(automation, currentTime);
          pluginStore.setPluginParameter(pluginInstanceId, paramId, value);
        }
      });
    }
  }, [pluginInstance, automatedParameters, currentTime, calculateValue, pluginStore]);

  // Handle recording
  useEffect(() => {
    if (isRecording && selectedParameter && pluginInstance) {
      const interval = setInterval(() => {
        setAutomatedParameters(prev => {
          const automation = prev[selectedParameter];
          if (!automation) return prev;

          const currentParam = pluginInstance.parameters[selectedParameter];
          if (!currentParam) return prev;

          // Add new automation point
          const newPoint: AutomationPoint = {
            id: `point_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            time: currentTime,
            value: currentParam.value,
            interpolationType: 'linear',
          };

          const updatedPoints = [...automation.points, newPoint]
            .sort((a, b) => a.time - b.time);

          return {
            ...prev,
            [selectedParameter]: {
              ...automation,
              points: updatedPoints,
            },
          };
        });
      }, 100); // Update every 100ms

      return () => clearInterval(interval);
    }
  }, [isRecording, selectedParameter, currentTime, pluginInstance]);

  const handleParameterToggle = (paramId: string) => {
    setAutomatedParameters(prev => ({
      ...prev,
      [paramId]: {
        ...prev[paramId],
        isAutomated: !prev[paramId]?.isAutomated,
      },
    }));
  };

  const handleRecordingToggle = (paramId: string) => {
    setSelectedParameter(paramId);
    setIsRecording(!isRecording);

    setAutomatedParameters(prev => ({
      ...prev,
      [paramId]: {
        ...prev[paramId],
        isRecording: !isRecording,
      },
    }));
  };

  const clearAutomation = (paramId: string) => {
    setAutomatedParameters(prev => ({
      ...prev,
      [paramId]: {
        ...prev[paramId],
        points: [
          {
            id: 'default',
            time: 0,
            value: prev[paramId].parameter.default_value,
            interpolationType: 'linear',
          },
        ],
        isAutomated: false,
        isRecording: false,
      },
    }));
  };

  const renderAutomationLane = (paramId: string, automation: ParameterAutomation) => {
    const maxValue = automation.parameter.max_value;
    const minValue = automation.parameter.min_value;
    const range = maxValue - minValue;

    return (
      <div key={paramId} className="border-b border-gray-200 last:border-b-0">
        <div className="flex items-center justify-between p-2 bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleParameterToggle(paramId)}
              className={`w-4 h-4 rounded transition-colors ${
                automation.isAutomated
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            />
            <span className="text-sm font-medium text-gray-700">
              {automation.parameter.display_name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRecordingToggle(paramId)}
              disabled={!automation.isAutomated}
              className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
                automation.isRecording
                  ? 'bg-red-500 text-white animate-pulse'
                  : automation.isAutomated
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {automation.isRecording ? '●' : '◉'}
            </button>
            <button
              onClick={() => clearAutomation(paramId)}
              disabled={!automation.isAutomated}
              className="w-6 h-6 rounded text-xs bg-gray-200 text-gray-600 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Automation lane canvas */}
        <div className="h-16 relative bg-white">
          <svg width={width} height={64} className="absolute inset-0">
            {/* Grid lines */}
            <line x1={0} y1={32} x2={width} y2={32} stroke="#e5e7eb" strokeWidth="1" />

            {/* Automation curve */}
            {automation.points.length > 1 && (
              <polyline
                points={automation.points
                  .map(point => `${(point.time / 10) * width},${64 - ((point.value - minValue) / range) * 56}`)
                  .join(' ')}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
              />
            )}

            {/* Automation points */}
            {automation.points.map((point) => (
              <circle
                key={point.id}
                cx={(point.time / 10) * width}
                cy={64 - ((point.value - minValue) / range) * 56}
                r="4"
                fill="#3b82f6"
                stroke="white"
                strokeWidth="2"
              />
            ))}

            {/* Current time indicator */}
            <line
              x1={(currentTime / 10) * width}
              y1={0}
              x2={(currentTime / 10) * width}
              y2={64}
              stroke="#ef4444"
              strokeWidth="2"
              strokeDasharray="2,2"
            />
          </svg>
        </div>
      </div>
    );
  };

  if (!pluginInstance) {
    return (
      <div className={`bg-white border rounded-lg shadow-sm p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <Settings className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Plugin not found</p>
        </div>
      </div>
    );
  }

  const automatableParameters = Object.entries(pluginInstance.parameters)
    .filter(([_paramKey, param]) => {
      void _paramKey; // Mark as intentionally unused
      return param.is_automatable;
    });

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-gray-900">Plugin Automation</h3>
        <div className="text-sm text-gray-500">
          {automatableParameters.length} parameters available
        </div>
      </div>

      <div style={{ width, height: automatableParameters.length * 80 }}>
        {automatableParameters.map(([paramId, _automation]) => {
          void _automation; // Mark as intentionally unused
          return (
          <div key={paramId}>
            {renderAutomationLane(paramId, automatedParameters[paramId])}
          </div>
          );
        })}
      </div>

      {automatableParameters.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm">No automatable parameters</p>
          <p className="text-xs text-gray-400 mt-1">
            This plugin doesn't support automation
          </p>
        </div>
      )}

      {/* Transport controls */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Time: {Math.floor(currentTime / 60)}:{String(Math.floor(currentTime % 60)).padStart(2, '0')}.{String(Math.floor((currentTime % 1) * 100)).padStart(2, '0')}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => audioStore.seek(0)}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              ◀◀
            </button>
            <button
              onClick={() => audioStore.play()}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                audioStore.transport.isPlaying
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {audioStore.transport.isPlaying ? '⏸' : '▶'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PluginAutomation;