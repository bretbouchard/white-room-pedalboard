import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

interface AuthProviderProps {
  children: React.ReactNode;
}

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

// Check if the key is valid (not a placeholder)
const isValidKey = publishableKey &&
  publishableKey.startsWith('pk_') &&
  !publishableKey.includes('xxxxxxxxxxxxxxxxxxxxx');

export const isAuthEnabled = Boolean(publishableKey && isValidKey);

if (!publishableKey) {
  console.warn('VITE_CLERK_PUBLISHABLE_KEY is not set. Clerk auth will be disabled.');
} else if (!isValidKey) {
  console.warn('VITE_CLERK_PUBLISHABLE_KEY appears to be a placeholder. Clerk auth will be disabled.');
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  if (!isAuthEnabled) {
    return <>{children}</>;
  }
  return <ClerkProvider publishableKey={publishableKey}>{children}</ClerkProvider>;
};

export default AuthProvider;
