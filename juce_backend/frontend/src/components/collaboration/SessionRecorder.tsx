import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, Download, Clock, Users, Film } from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useFlowStore } from '@/stores/flowStore';

interface RecordingSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration: number;
  participants: string[];
  events: RecordedEvent[];
  isActive: boolean;
}

interface RecordedEvent {
  timestamp: number;
  userId: string;
  userName: string;
  userColor: string;
  type: 'node_add' | 'node_remove' | 'node_update' | 'edge_add' | 'edge_remove' | 'edge_update' | 'cursor_move' | 'selection_change';
  data: any;
}

interface SessionRecorderProps {
  className?: string;
}

export function SessionRecorder({ className = '' }: SessionRecorderProps) {
  const { users, currentSession, addActivity } = useCollaborationStore();
  const { daw, theory, activeView } = useFlowStore();
  const currentFlow = activeView === 'daw' ? daw : theory;
  const { nodes, edges } = currentFlow;

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSessions, setRecordingSessions] = useState<RecordingSession[]>([]);
  const [currentRecording, setCurrentRecording] = useState<RecordingSession | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackStartTimeRef = useRef<number>(0);

  // Load saved recordings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('collaboration_recordings');
    if (saved) {
      try {
        setRecordingSessions(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load recordings:', error);
      }
    }
  }, []);

  // Save recordings to localStorage
  useEffect(() => {
    if (recordingSessions.length > 0) {
      localStorage.setItem('collaboration_recordings', JSON.stringify(recordingSessions));
    }
  }, [recordingSessions]);

  const startRecording = () => {
    if (!currentSession) return;

    const newRecording: RecordingSession = {
      id: `recording_${Date.now()}`,
      name: `Session Recording - ${new Date().toLocaleString()}`,
      startTime: Date.now(),
      duration: 0,
      participants: users.map(u => u.name),
      events: [],
      isActive: true,
    };

    setCurrentRecording(newRecording);
    setIsRecording(true);

    // Start collecting events
    recordingIntervalRef.current = setInterval(() => {
      setCurrentRecording(prev => {
        if (!prev) return null;

        const updatedRecording = {
          ...prev,
          duration: Date.now() - prev.startTime,
        };

        // In a real implementation, we would collect actual events from the collaboration store
        // For now, we'll simulate some events
        const mockEvent: RecordedEvent = {
          timestamp: Date.now() - prev.startTime,
          userId: users[0]?.id || 'unknown',
          userName: users[0]?.name || 'Unknown',
          userColor: users[0]?.color || '#3b82f6',
          type: 'cursor_move',
          data: { x: Math.random() * 800, y: Math.random() * 600 },
        };

        updatedRecording.events.push(mockEvent);
        return updatedRecording;
      });
    }, 100);

    addActivity({
      userId: 'system',
      userName: 'System',
      userColor: '#6b7280',
      type: 'edit',
      data: { action: 'started_recording', sessionId: newRecording.id },
    });
  };

  const stopRecording = () => {
    if (!currentRecording) return;

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    const finalRecording = {
      ...currentRecording,
      endTime: Date.now(),
      isActive: false,
    };

    setRecordingSessions(prev => [...prev, finalRecording]);
    setCurrentRecording(null);
    setIsRecording(false);

    addActivity({
      userId: 'system',
      userName: 'System',
      userColor: '#6b7280',
      type: 'edit',
      data: { action: 'stopped_recording', sessionId: finalRecording.id },
    });
  };

  const playRecording = (recording: RecordingSession) => {
    if (recording.events.length === 0) return;

    setIsPlaying(true);
    setPlaybackProgress(0);
    playbackStartTimeRef.current = Date.now();

    const totalDuration = recording.duration;
    const interval = 50 / playbackSpeed; // Update every 50ms adjusted for playback speed

    playbackIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - playbackStartTimeRef.current) * playbackSpeed;
      const progress = Math.min((elapsed / totalDuration) * 100, 100);

      setPlaybackProgress(progress);

      // Find events that should be triggered at this timestamp
      const currentTimestamp = elapsed;
      const eventsToPlay = recording.events.filter(
        event => Math.abs(event.timestamp - currentTimestamp) < interval
      );

      // Apply events to the current state (this would update the flow store)
      eventsToPlay.forEach(event => {
        console.log('Playing event:', event);
        // In a real implementation, this would apply the events to the flow
      });

      if (progress >= 100) {
        stopPlayback();
      }
    }, interval);
  };

  const stopPlayback = () => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    setIsPlaying(false);
    setPlaybackProgress(0);
  };

  const downloadRecording = (recording: RecordingSession) => {
    const data = {
      ...recording,
      exportedAt: Date.now(),
      flowState: { nodes, edges }, // Include current flow state
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Film className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold">Session Recorder</h3>
      </div>

      {/* Recording Controls */}
      <div className="flex items-center space-x-2 mb-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={!currentSession}
            className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Square className="w-4 h-4" />
            <span>Start Recording</span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            <Square className="w-4 h-4" />
            <span>Stop Recording</span>
          </button>
        )}

        {currentRecording && (
          <div className="flex items-center space-x-2 text-sm text-red-600">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(Date.now() - currentRecording.startTime)}</span>
          </div>
        )}
      </div>

      {/* Playback Controls */}
      {isPlaying && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <button
              onClick={stopPlayback}
              className="flex items-center space-x-1 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              <Pause className="w-3 h-3" />
              <span className="text-xs">Pause</span>
            </button>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="text-xs px-2 py-1 border border-gray-300 rounded"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
            </select>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-100"
              style={{ width: `${playbackProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Recording List */}
      <div className="space-y-3">
        <h4 className="font-medium text-sm text-gray-900">Recorded Sessions</h4>
        {recordingSessions.length === 0 ? (
          <p className="text-sm text-gray-500">No recordings yet. Start recording to capture collaboration sessions.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recordingSessions.map(recording => (
              <div key={recording.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{recording.name}</div>
                  <div className="flex items-center space-x-2 text-gray-500 mt-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatDuration(recording.duration)}</span>
                    <Users className="w-3 h-3" />
                    <span>{recording.participants.length}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {!isPlaying ? (
                    <button
                      onClick={() => playRecording(recording)}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={stopPlayback}
                      className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                    >
                      <Pause className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => downloadRecording(recording)}
                    className="p-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionRecorder;