export const isCopilotEnabled =
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENABLE_COPILOTKIT === 'true';
