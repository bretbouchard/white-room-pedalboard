import React from 'react';
import { cn } from '@/utils';

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, children, className }) => {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        className={cn(
          'flex h-10 w-full rounded-md border border-daw-surface-tertiary bg-daw-surface-primary px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-daw-accent-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        {children}
      </select>
    </div>
  );
};

export const SelectTrigger: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn('flex h-10 w-full items-center justify-between rounded-md border border-daw-surface-tertiary bg-daw-surface-primary px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-daw-accent-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props}>
    {children}
  </div>
);

export const SelectValue: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ className, ...props }) => (
  <span className={cn('block truncate', className)} {...props} />
);

export const SelectContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => (
  <div className={cn('relative z-50 min-w-[8rem] overflow-hidden rounded-md border border-daw-surface-tertiary bg-daw-surface-primary text-daw-text-primary shadow-md', className)} {...props}>
    {children}
  </div>
);

export const SelectItem: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ value, children, className }) => (
  <div
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-daw-surface-secondary focus:bg-daw-surface-secondary',
      className
    )}
  >
    {children}
  </div>
);