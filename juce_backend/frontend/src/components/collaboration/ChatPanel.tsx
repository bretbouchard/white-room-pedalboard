import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Minimize2, Maximize2, MessageCircle } from 'lucide-react';
import { useChatMessages, useCollaborationStore } from '@/stores/collaborationStore';
import type { ChatMessage } from '@/stores/collaborationStore';

interface ChatPanelProps {
  className?: string;
  defaultExpanded?: boolean;
}

interface MessageProps {
  message: ChatMessage;
  isOwn: boolean;
}

const ChatMessage: React.FC<MessageProps> = ({ message, isOwn }) => {
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[80%] px-3 py-2 rounded-lg ${
          isOwn
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {!isOwn && (
          <div
            className="text-xs font-medium mb-1"
            style={{ color: message.userColor }}
          >
            {message.userName}
          </div>
        )}

        <div className="text-sm break-words">
          {message.message}
        </div>

        <div className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
};

const SystemMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex justify-center my-2">
    <div className="px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600 text-center">
      {message}
    </div>
  </div>
);

export function ChatPanel({ className = '' }: ChatPanelProps) {
  const { showChat, toggleChat } = useCollaborationStore();
  const [message, setMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMessages = useChatMessages();
  const { currentUser, currentSession } = useCollaborationStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && !isMinimized) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [chatMessages, isMinimized]);

  const sendMessage = () => {
    if (!message.trim() || !currentUser || !currentSession) return;

    const { sendChatMessage } = useCollaborationStore.getState();
    sendChatMessage(message);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!showChat) return null;

  return (
    <div className={`bg-white border rounded-lg shadow-sm flex flex-col ${className} ${
      isMinimized ? 'h-auto' : 'h-96'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-sm">Chat</span>
          {currentSession && (
            <span className="text-xs text-gray-500">
              ({chatMessages.length} messages)
            </span>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? (
              <Maximize2 className="w-4 h-4" />
            ) : (
              <Minimize2 className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={toggleChat}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  Start a conversation with your collaborators
                </p>
              </div>
            ) : (
              <>
                {chatMessages.map((msg) => {
                  if (msg.type === 'system') {
                    return (
                      <SystemMessage
                        key={msg.id}
                        message={msg.message}
                      />
                    );
                  }

                  const isOwn = msg.userId === currentUser?.id;
                  return (
                    <ChatMessage
                      key={msg.id}
                      message={msg}
                      isOwn={isOwn}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t">
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!currentUser || !currentSession}
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim() || !currentUser || !currentSession}
                className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                title="Send message (Enter)"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {!currentUser && (
              <p className="text-xs text-gray-500 mt-2">
                Join a session to participate in chat
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}