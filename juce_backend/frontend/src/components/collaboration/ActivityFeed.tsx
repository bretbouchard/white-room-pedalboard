import React, { useMemo } from 'react';
import { Activity, Edit, Plus, Trash2, MessageCircle, User as UserIcon } from 'lucide-react';
import { useActivityFeed } from '@/stores/collaborationStore';

interface ActivityFeedProps {
  className?: string;
  maxItems?: number;
}

interface ActivityItemProps {
  event: {
    id: string;
    userId: string;
    userName: string;
    userColor: string;
    type: 'join' | 'leave' | 'edit' | 'select' | 'chat' | 'create' | 'delete';
    data: any;
    timestamp: number;
  };
}

const ActivityIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  join: UserIcon,
  leave: UserIcon,
  edit: Edit,
  select: Activity,
  chat: MessageCircle,
  create: Plus,
  delete: Trash2,
};

const getActivityText = (event: ActivityItemProps['event']): string => {
  switch (event.type) {
    case 'join':
      return 'joined the session';
    case 'leave':
      return 'left the session';
    case 'edit':
      if (event.data.operationType) {
        const operationType = event.data.operationType.replace('_', ' ');
        return `edited ${operationType}`;
      }
      return 'made changes';
    case 'select':
      return 'selected items';
    case 'chat':
      return `sent a message: "${event.data.message}"`;
    case 'create':
      return 'created new items';
    case 'delete':
      return 'deleted items';
    default:
      return 'performed an action';
  }
};

const formatTimestamp = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) { // Less than 1 minute
    return 'just now';
  } else if (diff < 3600000) { // Less than 1 hour
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  } else if (diff < 86400000) { // Less than 1 day
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  } else {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }
};

const ActivityItem: React.FC<ActivityItemProps> = ({ event }) => {
  const Icon = ActivityIcon[event.type] || Activity;
  const isCurrentUser = event.userId === 'current'; // This would come from store

  return (
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      {/* User indicator */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium flex-shrink-0"
        style={{ backgroundColor: event.userColor }}
      >
        {event.userName.charAt(0).toUpperCase()}
      </div>

      {/* Activity content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <Icon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-900">
            <span className={`font-medium ${isCurrentUser ? 'text-blue-600' : ''}`}>
              {event.userName}
            </span>
            <span className="text-gray-500">
              {getActivityText(event)}
            </span>
          </span>
        </div>

        {/* Additional details */}
        {event.data.conflict && (
          <div className="flex items-center space-x-1 text-xs text-amber-600 mt-1">
            <div className="w-2 h-2 bg-amber-400 rounded-full" />
            <span>Conflict resolved</span>
          </div>
        )}

        {event.data.targetId && (
          <div className="text-xs text-gray-500 mt-1 truncate">
            Target: {event.data.targetId}
          </div>
        )}
      </div>

      {/* Timestamp */}
      <div className="text-xs text-gray-400 flex-shrink-0">
        {formatTimestamp(event.timestamp)}
      </div>
    </div>
  );
};

export function ActivityFeed({ className = '', maxItems = 50 }: ActivityFeedProps) {
  const activityFeed = useActivityFeed();

  const recentActivity = useMemo(() => {
    return activityFeed.slice(0, maxItems);
  }, [activityFeed, maxItems]);

  if (recentActivity.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-1">
        {recentActivity.map(event => (
          <ActivityItem key={event.id} event={event} />
        ))}
      </div>

      {activityFeed.length > maxItems && (
        <div className="text-center py-2 text-xs text-gray-500">
          Showing {maxItems} of {activityFeed.length} activities
        </div>
      )}
    </div>
  );
}