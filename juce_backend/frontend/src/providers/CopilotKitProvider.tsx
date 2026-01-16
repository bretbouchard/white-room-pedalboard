import { PropsWithChildren, ReactElement } from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import { isCopilotEnabled } from '@/config/copilot';

const DEFAULT_RUNTIME_URL = 'http://localhost:8081/api/copilotkit';

export function CopilotKitProvider({ children }: PropsWithChildren): ReactElement {
  if (!isCopilotEnabled) {
    return <>{children}</>;
  }

  const runtimeUrl =
    (typeof window !== 'undefined' && (import.meta.env.VITE_COPILOTKIT_RUNTIME_URL as string | undefined)) ||
    DEFAULT_RUNTIME_URL;

  return <CopilotKit runtimeUrl={runtimeUrl}>{children}</CopilotKit>;
}

export default CopilotKitProvider;
