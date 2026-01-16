import React, { useState, useEffect } from 'react';
import { Shield, Key, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useCollaborationStore } from '@/stores/collaborationStore';

interface SecurityMetrics {
  sessionId: string;
  encryptionEnabled: boolean;
  participantValidation: boolean;
  sessionAge: number;
  lastActivity: number;
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
}

interface SessionSecurityProps {
  className?: string;
}

export function SessionSecurity({ className = '' }: SessionSecurityProps) {
  const { currentSession, users } = useCollaborationStore();
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Simulate security scan
  useEffect(() => {
    if (!currentSession) return;

    const scanSecurity = () => {
      setIsScanning(true);

      // Simulate security analysis
      setTimeout(() => {
        const now = Date.now();
        const sessionAge = now - currentSession.createdAt;
        const lastActivity = Math.max(...users.map(u => u.lastActivity), now);

        const warnings: string[] = [];
        let riskLevel: 'low' | 'medium' | 'high' = 'low';

        // Analyze potential security risks
        if (users.length > 10) {
          warnings.push('High participant count may impact security');
          riskLevel = 'medium';
        }

        if (sessionAge > 2 * 60 * 60 * 1000) { // 2 hours
          warnings.push('Session has been active for more than 2 hours');
          riskLevel = 'medium';
        }

        if (now - lastActivity > 30 * 60 * 1000) { // 30 minutes
          warnings.push('Session has been inactive for more than 30 minutes');
          riskLevel = 'medium';
        }

        const unknownUsers = users.filter(u => !u.name || u.name.startsWith('User'));
        if (unknownUsers.length > 0) {
          warnings.push(`${unknownUsers.length} anonymous participants detected`);
          if (riskLevel === 'low') riskLevel = 'medium';
        }

        // Check for session security features
        const encryptionEnabled = true; // Would be determined by actual session config
        const participantValidation = currentSession.settings.requireApproval;

        setSecurityMetrics({
          sessionId: currentSession.id,
          encryptionEnabled,
          participantValidation,
          sessionAge,
          lastActivity,
          riskLevel,
          warnings,
        });

        setIsScanning(false);
      }, 1500);
    };

    scanSecurity();
    const interval = setInterval(scanSecurity, 30000); // Scan every 30 seconds

    return () => clearInterval(interval);
  }, [currentSession, users]);

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  if (!currentSession || !securityMetrics) {
    return (
      <div className={`border rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-400">Session Security</h3>
        </div>
        <p className="text-sm text-gray-500 mt-2">Analyzing session security...</p>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${className} ${getRiskLevelColor(securityMetrics.riskLevel)}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5" />
          <h3 className="font-semibold">Session Security</h3>
          {isScanning && (
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          )}
        </div>
        <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-sm font-medium ${getRiskLevelColor(securityMetrics.riskLevel)}`}>
          {getRiskLevelIcon(securityMetrics.riskLevel)}
          <span className="capitalize">{securityMetrics.riskLevel} Risk</span>
        </div>
      </div>

      {/* Security Metrics */}
      <div className="space-y-3">
        {/* Session Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <Key className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-gray-600">Session ID</p>
              <p className="font-mono text-xs">{securityMetrics.sessionId.substring(0, 8)}...</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-gray-600">Duration</p>
              <p className="font-medium">{formatDuration(securityMetrics.sessionAge)}</p>
            </div>
          </div>
        </div>

        {/* Security Features */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Encryption:</span>
            <span className={`font-medium ${securityMetrics.encryptionEnabled ? 'text-green-600' : 'text-red-600'}`}>
              {securityMetrics.encryptionEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Participant Validation:</span>
            <span className={`font-medium ${securityMetrics.participantValidation ? 'text-green-600' : 'text-yellow-600'}`}>
              {securityMetrics.participantValidation ? 'Required' : 'Optional'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Active Participants:</span>
            <span className="font-medium">{users.length}</span>
          </div>
        </div>

        {/* Security Warnings */}
        {securityMetrics.warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-gray-900">Security Warnings</h4>
            <div className="space-y-1">
              {securityMetrics.warnings.map((warning, index) => (
                <div key={index} className="flex items-start space-x-2 text-xs">
                  <AlertTriangle className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{warning}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {securityMetrics.riskLevel !== 'low' && (
          <div className="pt-3 border-t border-current border-opacity-20">
            <h4 className="font-medium text-sm text-gray-900 mb-2">Recommended Actions</h4>
            <div className="space-y-1 text-xs">
              {securityMetrics.riskLevel === 'high' && (
                <p className="text-red-600">• Consider ending the session and creating a new one</p>
              )}
              {users.length > 10 && (
                <p className="text-yellow-600">• Consider limiting session participants</p>
              )}
              {securityMetrics.sessionAge > 2 * 60 * 60 * 1000 && (
                <p className="text-yellow-600">• Consider refreshing the session</p>
              )}
              {!securityMetrics.participantValidation && (
                <p className="text-yellow-600">• Enable participant approval for better security</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionSecurity;