import React from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { NavLink } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { isAuthEnabled } from '@/providers/AuthProvider';
import { cn } from '@/utils';

const navItems = [
  { to: '/', label: 'DAW' },
  { to: '/flow', label: 'Flow' },
  { to: '/library', label: 'Component Library' },
];

const navLinkClass = ({ isActive }: { isActive: boolean }): string =>
  cn(
    'text-sm font-medium px-4 py-2 rounded-full transition-colors duration-200',
    isActive
      ? 'bg-daw-accent-primary text-daw-bg-primary shadow-sm'
      : 'text-daw-text-secondary hover:text-daw-text-primary hover:bg-daw-surface-secondary',
  );

const AuthBar: React.FC = () => {
  const { user } = useUser();
  const isAdmin = Boolean((user?.publicMetadata as any)?.role === 'admin' || (user as any)?.privateMetadata?.role === 'admin');

  if (!isAuthEnabled) {
    return (
      <div className="w-full flex items-center justify-between p-2 border-b border-daw-border bg-daw-surface">
        <nav className="flex items-center gap-3">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} className={navLinkClass} end={item.to === '/'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-between p-2 border-b border-daw-border bg-daw-surface">
      <nav className="flex items-center gap-3">
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} className={navLinkClass} end={item.to === '/'}>
            {item.label}
          </NavLink>
        ))}
        {isAdmin ? (
          <NavLink to="/admin" className={navLinkClass}>
            Admin
          </NavLink>
        ) : null}
      </nav>
      <SignedIn>
        <UserButton afterSignOutUrl="/sign-in" />
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="px-3 py-1 rounded bg-daw-accent-primary text-white text-sm">Sign In</button>
        </SignInButton>
      </SignedOut>
    </div>
  );
};

export default AuthBar;
