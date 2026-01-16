import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { isAuthEnabled } from '@/providers/AuthProvider';

type Props = { children: React.ReactNode };

function hasAdminRole(user: any): boolean {
  if (!user) return false;
  // Prefer explicit publicMetadata/privateMetadata role flag
  const pm = (user.publicMetadata as any) || {};
  const priv = (user.privateMetadata as any) || {};
  if (pm.role === 'admin' || priv.role === 'admin') return true;

  // Fallback: attempt to check organization memberships (if loaded)
  const memberships = (user.organizationMemberships as any[]) || [];
  if (Array.isArray(memberships) && memberships.some((m) => m?.role === 'admin')) return true;

  return false;
}

const AdminRoute: React.FC<Props> = ({ children }) => {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isAuthEnabled) {
    return <>{children}</>;
  }

  if (!isLoaded) return null;
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  if (!hasAdminRole(user)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default AdminRoute;
