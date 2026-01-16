import React, { useState } from 'react';
import { Users, Lock, Unlock, Copy, Check, X } from 'lucide-react';
import { useCollaborationSession } from '@/hooks/useCollaboration';
import { useCollaborationStore } from '@/stores/collaborationStore';

interface SessionManagerProps {
  className?: string;
  onSessionCreated?: (sessionId: string) => void;
  onSessionJoined?: (sessionId: string) => void;
}

export function SessionManager({ className = '', onSessionCreated, onSessionJoined }: SessionManagerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [userName, setUserName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [copiedId, setCopiedId] = useState(false);

  const {
    currentSession,
    isJoining,
    joinError,
    createSession,
    joinSession,
  } = useCollaborationSession();

  const handleCreateSession = async () => {
    if (!sessionName.trim()) return;

    try {
      const newSessionId = await createSession(sessionName.trim());
      setSessionName('');
      setShowCreate(false);
      onSessionCreated?.(newSessionId);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleJoinSession = async () => {
    if (!sessionId.trim() || !userName.trim()) return;

    try {
      await joinSession(sessionId.trim(), userName.trim());
      setSessionId('');
      setUserName('');
      setShowJoin(false);
      onSessionJoined?.(sessionId);
    } catch (error) {
      console.error('Failed to join session:', error);
    }
  };

  const copySessionId = () => {
    if (currentSession?.id) {
      navigator.clipboard.writeText(currentSession.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  if (currentSession) {
    return (
      <div className={`bg-white border rounded-lg shadow-sm p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">
              {currentSession.name}
            </h3>
            <p className="text-sm text-gray-500">
              Session ID: <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                {currentSession.id}
              </code>
            </p>
            <p className="text-xs text-gray-400">
              Created: {new Date(currentSession.createdAt).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={copySessionId}
              className="flex items-center space-x-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              {copiedId ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy ID</span>
                </>
              )}
            </button>

            <button
              onClick={() => useCollaborationStore.getState().leaveSession()}
              className="px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Leave Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Create Session Button */}
      <button
        onClick={() => setShowCreate(true)}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        <Users className="w-4 h-4" />
        <span>Create Session</span>
      </button>

      {/* Join Session Button */}
      <button
        onClick={() => setShowJoin(true)}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <Unlock className="w-4 h-4" />
        <span>Join Session</span>
      </button>

      {/* Create Session Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Create Collaboration Session
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Name
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Enter session name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={50}
                />
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="w-4 h-4" />
                <span>You'll be the host of this session</span>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={!sessionName.trim() || isJoining}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isJoining ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Session Modal */}
      {showJoin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Join Collaboration Session
              </h3>
              <button
                onClick={() => setShowJoin(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={30}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session ID
                </label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  placeholder="Enter session ID..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ask the session host for the session ID
                </p>
              </div>

              {joinError && (
                <div className="flex items-center space-x-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  <Lock className="w-4 h-4" />
                  <span>{joinError}</span>
                </div>
              )}

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setShowJoin(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleJoinSession}
                  disabled={!sessionId.trim() || !userName.trim() || isJoining}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isJoining ? 'Joining...' : 'Join Session'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionManager;