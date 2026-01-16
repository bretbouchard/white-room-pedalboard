import DAWLayout from '@/components/layout/DAWLayout';
import { AccessibilityProvider } from '@/components/layout/AccessibilityProvider';
import { DAIDProvider } from '@/lib/daid';
import ApprovalPanel from '@/components/ApprovalPanel';

function App() {
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
        <DAWLayout>

            <ApprovalPanel />
        </DAWLayout>
      </AccessibilityProvider>
    </DAIDProvider>
  );
}

export default App;
