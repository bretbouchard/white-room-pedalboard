import { useContext } from 'react';
import { AccessibilityContext, type AccessibilityContextType } from '../components/layout/AccessibilityProvider';

export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

// Screen reader only utility class
export const srOnly = 'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';