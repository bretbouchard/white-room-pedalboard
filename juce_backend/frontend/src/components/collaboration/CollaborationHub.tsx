import React, { useState, useEffect } from 'react';
import { Users, MessageSquare, Activity, Film, Settings, Shield, X, Maximize2, Minimize2 } from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useIsMobile } from '@/hooks/useIsMobile';

// Import collaboration components (named exports)
import { UserPanel } from './UserPanel';
import { ChatPanel } from './ChatPanel';
import { ActivityFeed } from './ActivityFeed';
import { SessionRecorder } from './SessionRecorder';
import { PerformanceMonitor } from './PerformanceMonitor';
import { ConflictResolution } from './ConflictResolution';
import { SessionSecurity } from './SessionSecurity';

type ActiveTab = 'users' | 'chat' | 'activity' | 'recorder' | 'performance' | 'conflicts' | 'security';

interface CollaborationHubProps {
  className?: string;
}

export function CollaborationHub({ className = '' }: CollaborationHubProps) {
  const { currentSession, showUsers, showChat, showActivity } = useCollaborationStore();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState<ActiveTab>('users');
  const [isExpanded, setIsExpanded] = useState(!isMobile);

  const tabs = [
    { id: 'users' as const, label: 'Users', icon: Users, show: showUsers },
    { id: 'chat' as const, label: 'Chat', icon: MessageSquare, show: showChat },
    { id: 'activity' as const, label: 'Activity', icon: Activity, show: showActivity },
    { id: 'recorder' as const, label: 'Record', icon: Film, show: true },
    { id: 'performance' as const, label: 'Performance', icon: Settings, show: true },
    { id: 'conflicts' as const, label: 'Conflicts', icon: Settings, show: true },
    { id: 'security' as const, label: 'Security', icon: Shield, show: true },
  ].filter(tab => tab.show);

  // Auto-expand on desktop, collapse on mobile
  useEffect(() => {
    setIsExpanded(!isMobile);
  }, [isMobile]);

  if (!currentSession) {
    return null;
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'users':
        return <UserPanel className="h-full" />;
      case 'chat':
        return <ChatPanel className="h-full" />;
      case 'activity':
        return <ActivityFeed className="h-full" />;
      case 'recorder':
        return <SessionRecorder className="h-full" />;
      case 'performance':
        return <PerformanceMonitor className="h-full" />;
      case 'conflicts':
        return <ConflictResolution className="h-full" />;
      case 'security':
        return <SessionSecurity className="h-full" />;
      default:
        return null;
    }
  };

  if (isMobile) {
    // Mobile layout - Full screen modal
    return (
      <div className={`fixed inset-0 bg-white z-50 flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <h2 className="text-lg font-semibold">Collaboration</h2>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto border-b bg-gray-50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-sm font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {renderActiveTab()}
        </div>
      </div>
    );
  }

  // Desktop layout - Sidebar panel
  return (
    <div className={`bg-white border rounded-lg transition-all duration-300 ${className} ${
      isExpanded ? 'w-80' : 'w-12'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        {isExpanded && (
          <h2 className="font-semibold text-gray-900">Collaboration</h2>
        )}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          {isExpanded ? (
            <Minimize2 className="w-4 h-4 text-gray-500" />
          ) : (
            <Maximize2 className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>

      {isExpanded && (
        <>
          {/* Tab Navigation */}
          <div className="flex flex-wrap border-b">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1 px-3 py-2 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="h-96 overflow-y-auto">
            {renderActiveTab()}
          </div>
        </>
      )}
    </div>
  );
}

export default CollaborationHub;