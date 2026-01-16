/**
 * WebSocket connection status indicator component
 */

import React from 'react';
import { useWebSocketStatus } from '../../hooks/useWebSocket';

interface WebSocketStatusProps {
  showText?: boolean;
  showDescription?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({
  showText = true,
  showDescription = false,
  className = '',
  size = 'md',
}) => {
  const statusInfo = useWebSocketStatus();

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const iconSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
  };

  return (
    <div className={`flex items-center gap-2 ${sizeClasses[size]} ${className}`}>
      <span 
        className={`${iconSizes[size]} font-mono`}
        style={{ color: statusInfo.color }}
        title={statusInfo.description}
      >
        {statusInfo.icon}
      </span>
      
      {showText && (
        <span 
          className="font-medium"
          style={{ color: statusInfo.color }}
        >
          {statusInfo.text}
        </span>
      )}
      
      {showDescription && (
        <span className="text-gray-500 text-xs">
          {statusInfo.description}
        </span>
      )}
    </div>
  );
};

/**
 * Detailed WebSocket status panel for debugging
 */
export const WebSocketStatusPanel: React.FC = () => {
  const statusInfo = useWebSocketStatus();

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border">
      <h3 className="text-lg font-semibold mb-3">WebSocket Status</h3>
      
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span>Status:</span>
          <WebSocketStatus showDescription />
        </div>
        
        {statusInfo.reconnectAttempts > 0 && (
          <div className="flex items-center justify-between">
            <span>Reconnect Attempts:</span>
            <span>{statusInfo.reconnectAttempts} / {statusInfo.maxReconnectAttempts}</span>
          </div>
        )}
        
        {statusInfo.lastError && (
          <div className="flex items-start justify-between">
            <span>Last Error:</span>
            <span className="text-red-500 text-sm max-w-xs text-right">
              {statusInfo.lastError}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};