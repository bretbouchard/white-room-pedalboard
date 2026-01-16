import React, { useState } from 'react';
import { Users, MessageSquare, Activity, Crown, Shield, User as UserIcon } from 'lucide-react';
import { useSessionUsers, useCurrentUser, useCollaborationStore } from '@/stores/collaborationStore';

interface UserPanelProps {
  className?: string;
}

const StatusIndicator: React.FC<{ status: 'active' | 'idle' | 'away' }> = ({ status }) => {
  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-yellow-500',
    away: 'bg-gray-400',
  };

  return (
    <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
  );
};

const UserAvatar: React.FC<{ user: any; isCurrent?: boolean; isHost?: boolean }> = ({
  user,
  isCurrent = false,
  isHost = false,
}) => {
  return (
    <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center space-x-2">
        {/* User color dot */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium"
          style={{ backgroundColor: user.color }}
        >
          {user.name.charAt(0).toUpperCase()}
        </div>

        {/* Status indicator */}
        <StatusIndicator status={user.status} />

        {/* Roles */}
        <div className="flex space-x-1">
          {isHost && (
            <div className="p-1 bg-yellow-100 rounded" title="Host">
              <Crown className="w-3 h-3 text-yellow-600" />
            </div>
          )}
          {user.permissions?.canManageUsers && !isHost && (
            <div className="p-1 bg-blue-100 rounded" title="Moderator">
              <Shield className="w-3 h-3 text-blue-600" />
            </div>
          )}
          {isCurrent && (
            <div className="p-1 bg-green-100 rounded" title="You">
              <UserIcon className="w-3 h-3 text-green-600" />
            </div>
          )}
        </div>
      </div>

      {/* User info */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-900 truncate">
          {user.name}
          {isCurrent && <span className="text-gray-500"> (You)</span>}
        </div>
        <div className="text-xs text-gray-500">
          {user.status === 'active' && 'Active now'}
          {user.status === 'idle' && 'Idle'}
          {user.status === 'away' && 'Away'}
        </div>
      </div>
    </div>
  );
};

export function UserPanel({ className = '' }: UserPanelProps) {
  const {
    currentSession,
    leaveSession,
  } = useCollaborationStore();

  const users = useSessionUsers();
  const currentUser = useCurrentUser();

  const [activeTab, setActiveTab] = useState<'users' | 'chat' | 'activity'>('users');

  if (!currentSession) {
    return (
      <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
        <div className="p-4 text-center text-gray-500">
          <Users className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No active session</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold text-gray-900">{currentSession.name}</h3>
          <p className="text-xs text-gray-500">
            {users.length} {users.length === 1 ? 'user' : 'users'} connected
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Leave session button */}
          {currentUser && (
            <button
              onClick={leaveSession}
              className="text-sm px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            >
              Leave
            </button>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Users</span>
          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'chat'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'activity'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Activity</span>
        </button>
      </div>

      {/* Tab content */}
      <div className="h-96 overflow-y-auto">
        {/* Users tab */}
        {activeTab === 'users' && (
          <div className="p-4 space-y-2">
            {users.map(user => (
              <UserAvatar
                key={user.id}
                user={user}
                isCurrent={user.id === currentUser?.id}
                isHost={user.id === currentSession.ownerId}
              />
            ))}
          </div>
        )}

        {/* Chat tab - Placeholder for now */}
        {activeTab === 'chat' && (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Chat coming soon</p>
          </div>
        )}

        {/* Activity tab - Placeholder for now */}
        {activeTab === 'activity' && (
          <div className="p-4 text-center text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Activity feed coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}