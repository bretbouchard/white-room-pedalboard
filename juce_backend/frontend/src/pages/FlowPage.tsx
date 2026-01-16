import { DAIDProvider } from '@/lib/daid';
import { AccessibilityProvider } from '@/components/layout/AccessibilityProvider';
import AuthBar from '@/components/auth/AuthBar';
import { FlowWorkspace } from '@/components/flow/FlowWorkspace';
import { ReactFlowProvider } from '@xyflow/react';

export default function FlowPage() {
  return (
    <DAIDProvider
      config={{
        agentId: 'audio-agent-frontend',
        baseUrl: 'http://localhost:8081',
        timeout: 5000,
        autoTrack: true,
        trackPageViews: true,
        trackUserActions: true,
      }}
    >
      <AccessibilityProvider>
        <ReactFlowProvider>
          <div className="flex h-screen flex-col bg-daw-bg-primary text-daw-text-primary">
            <AuthBar />
            <div className="flex flex-1 min-h-0" style={{ height: 'calc(100vh - 64px)', minHeight: '400px' }}>
              <FlowWorkspace />
            </div>
          </div>
        </ReactFlowProvider>
      </AccessibilityProvider>
    </DAIDProvider>
  );
}
