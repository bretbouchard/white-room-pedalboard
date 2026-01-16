import React from 'react';
import { cn } from '@/utils';

export interface BadgeProps {
  className?: string;
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger';
}

export const Badge: React.FC<BadgeProps> = ({ className, children, variant = 'default' }) => {
  const variants = {
    default: 'bg-daw-accent-primary text-white',
    secondary: 'bg-daw-surface-tertiary text-daw-text-primary',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-black',
    danger: 'bg-red-500 text-white',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};