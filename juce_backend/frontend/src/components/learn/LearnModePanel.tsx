/**
 * Learn Mode Panel Component
 *
 * Provides a comprehensive interface for capturing and mapping control identities
 * from various input sources (MIDI, keyboard, mouse, touch, etc.)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge, Progress, Alert, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Mic, MicOff, Settings, Info, CheckCircle, XCircle, Clock, Activity } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useWebSocketStore } from '@/stores/websocketStore';

interface LearnSession {
  sessionId: string;
  targetParameter: string;
  targetName: string;
  mode: 'inactive' | 'waiting' | 'capturing' | 'analyzing' | 'complete';
  timeout: number;
  startTime?: number;
  capturedIdentity?: ControlIdentity;
  capturedSamples: Array<{
    timestamp: number;
    inputType: string;
    data: any;
    value: number;
  }>;
}

interface ControlIdentity {
  controlId: string;
  controlType: string;
  name: string;
  description: string;
  sourceInfo: Record<string, any>;
  characteristics: Record<string, any>;
  isContinuous: boolean;
  isMomentary: boolean;
  isToggle: boolean;
  hasPressure: boolean;
  hasVelocity: boolean;
  min?: number;
  max?: number;
  current?: number;
  possibleValues?: any[];
}

export const LearnModePanel: React.FC = () => {
  const [activeSessions, setActiveSessions] = useState<LearnSession[]>([]);
  const [capturedIdentities, setCapturedIdentities] = useState<ControlIdentity[]>([]);
  const [isLearning, setIsLearning] = useState(false);
  const [currentSession, setCurrentSession] = useState<LearnSession | null>(null);
  const [settings, setSettings] = useState({
    timeout: 10,
    minSamples: 3,
    maxSamples: 50,
    analysisTime: 2,
    captureContinuous: true,
    captureDiscrete: true,
  });

  const { sendMessage, isConnected } = useWebSocket();
  const websocketStore = useWebSocketStore();

  // Handle WebSocket messages
  useEffect(() => {
    const unsubscribe = websocketStore.subscribe((message) => {
      const data = message.data as any;

      switch (data.type) {
        case 'LEARN_SESSION_STARTED':
          handleSessionStarted(data.session);
          break;
        case 'LEARN_SESSION_UPDATED':
          handleSessionUpdated(data.session);
          break;
        case 'LEARN_SESSION_COMPLETED':
          handleSessionCompleted(data.session);
          break;
        case 'LEARN_SESSION_CANCELLED':
          handleSessionCancelled(data.sessionId);
          break;
        case 'CONTROL_IDENTITY_CAPTURED':
          handleIdentityCaptured(data.identity);
          break;
      }
    });

    return unsubscribe;
  }, [websocketStore.subscribe]);

  const handleSessionStarted = (session: LearnSession) => {
    setActiveSessions(prev => [...prev, session]);
    setCurrentSession(session);
    setIsLearning(true);
  };

  const handleSessionUpdated = (session: LearnSession) => {
    setActiveSessions(prev =>
      prev.map(s => s.sessionId === session.sessionId ? session : s)
    );
    if (currentSession?.sessionId === session.sessionId) {
      setCurrentSession(session);
    }
  };

  const handleSessionCompleted = (session: LearnSession) => {
    setActiveSessions(prev => prev.filter(s => s.sessionId !== session.sessionId));
    if (currentSession?.sessionId === session.sessionId) {
      setCurrentSession(null);
      setIsLearning(false);
    }
    if (session.capturedIdentity) {
      setCapturedIdentities(prev => [...prev, session.capturedIdentity]);
    }
  };

  const handleSessionCancelled = (sessionId: string) => {
    setActiveSessions(prev => prev.filter(s => s.sessionId !== sessionId));
    if (currentSession?.sessionId === sessionId) {
      setCurrentSession(null);
      setIsLearning(false);
    }
  };

  const handleIdentityCaptured = (identity: ControlIdentity) => {
    setCapturedIdentities(prev => [...prev, identity]);
  };

  const startLearnSession = useCallback((targetParameter: string, targetName: string) => {
    const sessionId = `learn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    sendMessage('START_LEARN_SESSION', {
      sessionId,
      targetParameter,
      targetName,
      ...settings,
    });
  }, [sendMessage, settings]);

  const cancelLearnSession = useCallback((sessionId: string) => {
    sendMessage('CANCEL_LEARN_SESSION', {
      sessionId,
    });
  }, [sendMessage]);

  const getProgressPercentage = (session: LearnSession): number => {
    if (session.mode === 'complete') return 100;
    if (session.mode === 'analyzing') return 90;
    if (session.mode === 'capturing') {
      const progress = (session.capturedSamples.length / session.capturedSamples.length) * 80;
      return Math.min(progress, 80);
    }
    if (session.mode === 'waiting') return 10;
    return 0;
  };

  const getStatusIcon = (mode: string) => {
    switch (mode) {
      case 'waiting':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'capturing':
        return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'analyzing':
        return <Settings className="w-4 h-4 text-purple-500 animate-spin" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (session: LearnSession) => {
    const colors = {
      inactive: 'secondary',
      waiting: 'warning',
      capturing: 'primary',
      analyzing: 'secondary',
      complete: 'success',
    };

    return (
      <Badge variant={colors[session.mode] as any}>
        {session.mode.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Learn Mode</h2>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <Tabs defaultValue="learn" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="learn">Learn Control</TabsTrigger>
          <TabsTrigger value="identities">Captured Identities</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="learn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mic className="w-5 h-5" />
                <span>Capture Control Identity</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Parameter</label>
                  <input
                    type="text"
                    placeholder="e.g., mixer.channel_1.volume"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    id="targetParameter"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Display Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Channel 1 Volume"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    id="targetName"
                  />
                </div>
              </div>

              <Button
                onClick={() => {
                  const parameter = (document.getElementById('targetParameter') as HTMLInputElement)?.value;
                  const name = (document.getElementById('targetName') as HTMLInputElement)?.value;
                  if (parameter && name) {
                    startLearnSession(parameter, name);
                  }
                }}
                disabled={isLearning}
                className="w-full"
              >
                {isLearning ? (
                  <>
                    <MicOff className="w-4 h-4 mr-2" />
                    Learning in Progress...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Start Learning
                  </>
                )}
              </Button>

              {currentSession && (
                <div className="space-y-4">
                  <Alert>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(currentSession.mode)}
                        <span>Learning: {currentSession.targetName}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelLearnSession(currentSession.sessionId)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </Alert>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{getProgressPercentage(currentSession)}%</span>
                    </div>
                    <Progress value={getProgressPercentage(currentSession)} />
                  </div>

                  {currentSession.capturedSamples.length > 0 && (
                    <div className="text-sm text-gray-600">
                      Captured {currentSession.capturedSamples.length} samples
                      {currentSession.mode === 'capturing' && (
                        <span> - Keep interacting with your control...</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {activeSessions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeSessions.map(session => (
                    <div key={session.sessionId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(session.mode)}
                        <div>
                          <div className="font-medium">{session.targetName}</div>
                          <div className="text-sm text-gray-600">{session.targetParameter}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(session)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelLearnSession(session.sessionId)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="identities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Captured Control Identities</span>
                <Badge variant="outline">
                  {capturedIdentities.length} total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {capturedIdentities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No control identities captured yet. Start a learning session to capture controls.
                </div>
              ) : (
                <div className="space-y-3">
                  {capturedIdentities.map(identity => (
                    <div key={identity.controlId} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{identity.name}</div>
                          <div className="text-sm text-gray-600">{identity.description}</div>
                          <div className="mt-2 flex items-center space-x-4 text-sm">
                            <Badge variant="outline">{identity.controlType}</Badge>
                            {identity.isContinuous && <Badge variant="secondary">Continuous</Badge>}
                            {identity.isMomentary && <Badge variant="secondary">Momentary</Badge>}
                            {identity.isToggle && <Badge variant="secondary">Toggle</Badge>}
                          </div>
                          {identity.characteristics?.confidence && (
                            <div className="mt-2 text-sm">
                              <span className="font-medium">Confidence: </span>
                              <span>{Math.round(identity.characteristics.confidence * 100)}%</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          {identity.min !== undefined && identity.max !== undefined && (
                            <div>Range: {identity.min.toFixed(2)} - {identity.max.toFixed(2)}</div>
                          )}
                          {identity.current !== undefined && (
                            <div>Current: {identity.current.toFixed(2)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learn Mode Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Timeout (seconds)</label>
                  <input
                    type="number"
                    value={settings.timeout}
                    onChange={(e) => setSettings(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="1"
                    max="60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Analysis Time (seconds)</label>
                  <input
                    type="number"
                    value={settings.analysisTime}
                    onChange={(e) => setSettings(prev => ({ ...prev, analysisTime: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="0.5"
                    max="10"
                    step="0.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Minimum Samples</label>
                  <input
                    type="number"
                    value={settings.minSamples}
                    onChange={(e) => setSettings(prev => ({ ...prev, minSamples: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="1"
                    max="20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Maximum Samples</label>
                  <input
                    type="number"
                    value={settings.maxSamples}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxSamples: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    min="5"
                    max="100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.captureContinuous}
                    onChange={(e) => setSettings(prev => ({ ...prev, captureContinuous: e.target.checked }))}
                  />
                  <span className="text-sm">Capture continuous controls</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.captureDiscrete}
                    onChange={(e) => setSettings(prev => ({ ...prev, captureDiscrete: e.target.checked }))}
                  />
                  <span className="text-sm">Capture discrete controls</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};