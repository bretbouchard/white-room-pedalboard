import React, { useMemo } from 'react';
import { Users, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useSessionUsers, useCurrentUser } from '@/stores/collaborationStore';

interface CollaborationIndicatorProps {
  className?: string;
  showCount?: boolean;
}

export function CollaborationIndicator({ className = '', showCount = true }: CollaborationIndicatorProps) {
  const users = useSessionUsers();
  const currentUser = useCurrentUser();

  const { status, color, text } = useMemo(() => {
    if (!currentUser) {
      return {
        status: 'disconnected',
        color: 'text-gray-500',
        text: 'Not connected',
      };
    }

    const activeUsers = users.filter(u => u.status === 'active').length;
    const totalUsers = users.length;

    if (totalUsers === 1) {
      return {
        status: 'connected',
        color: 'text-blue-500',
        text: 'Solo session',
      };
    }

    if (activeUsers === totalUsers) {
      return {
        status: 'active',
        color: 'text-green-500',
        text: `${totalUsers} users active`,
      };
    }

    return {
      status: 'partial',
      color: 'text-yellow-500',
      text: `${activeUsers}/${totalUsers} active`,
    };
  }, [users, currentUser]);

  const Icon = status === 'disconnected' ? WifiOff : status === 'active' ? Wifi : AlertCircle;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Icon className={`w-4 h-4 ${color}`} />

      <span className={`text-sm font-medium ${color}`}>
        {text}
      </span>

      {showCount && currentUser && users.length > 1 && (
        <div className="flex -space-x-2">
          {users.slice(0, 3).map((user, index) => (
            <div
              key={user.id}
              className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium ${index === 2 && users.length > 3 ? 'bg-gray-400' : ''}`}
              style={{ backgroundColor: user.color }}
              title={user.name}
            >
              {index === 2 && users.length > 3 ? `+${users.length - 3}` : user.name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface CollaborationStatusProps {
  className?: string;
  minimal?: boolean;
}

export function CollaborationStatus({ className = '', minimal = false }: CollaborationStatusProps) {
  const users = useSessionUsers();
  const currentUser = useCurrentUser();

  if (minimal) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${
          currentUser ? 'bg-green-500' : 'bg-gray-400'
        }`} />
        {users.length > 0 && (
          <span className="text-xs text-gray-600">
            {users.length} {users.length === 1 ? 'user' : 'users'}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between p-3 bg-white rounded-lg border ${className}`}>
      <div className="flex items-center space-x-3">
        <Users className="w-5 h-5 text-gray-600" />
        <div>
          <div className="text-sm font-medium text-gray-900">
            {currentUser ? 'Connected' : 'Offline'}
          </div>
          <div className="text-xs text-gray-500">
            {users.length > 0
              ? `${users.length} ${users.length === 1 ? 'user' : 'users'} in session`
              : 'No active session'
            }
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {currentUser && users.length > 1 && (
          <div className="flex -space-x-1">
            {users.slice(0, 3).map((user, index) => (
              <div
                key={user.id}
                className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium ${index === 2 && users.length > 3 ? 'bg-gray-400' : ''}`}
                style={{ backgroundColor: user.color }}
                title={user.name}
              >
                {index === 2 && users.length > 3 ? `+${users.length - 3}` : user.name.charAt(0).toUpperCase()}
              </div>
            ))}
          </div>
        )}

        <div className={`w-2 h-2 rounded-full ${
          currentUser ? 'bg-green-500' : 'bg-gray-400'
        }`} />
      </div>
    </div>
  );
}

interface RealTimeStatusProps {
  className?: string;
}

export function RealTimeStatus({ className = '' }: RealTimeStatusProps) {
  const { isConnected, isConnecting, isReconnecting, hasError } = useWebSocket();

  const statusInfo = useMemo(() => {
    if (isConnecting) {
      return {
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        text: 'Connecting...',
        icon: '⏳',
      };
    }

    if (isReconnecting) {
      return {
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200',
        text: 'Reconnecting...',
        icon: '🔄',
      };
    }

    if (hasError) {
      return {
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        text: 'Connection Error',
        icon: '❌',
      };
    }

    if (isConnected) {
      return {
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        text: 'Connected',
        icon: '✓',
      };
    }

    return {
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      text: 'Disconnected',
      icon: '○',
    };
  }, [isConnected, isConnecting, isReconnecting, hasError]);

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full border ${statusInfo.bgColor} ${statusInfo.borderColor} ${className}`}>
      <span className={statusInfo.color}>{statusInfo.icon}</span>
      <span className={`text-xs font-medium ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    </div>
  );
}

// Import useWebSocket from the correct location
import { useWebSocket } from '@/hooks/useWebSocket';