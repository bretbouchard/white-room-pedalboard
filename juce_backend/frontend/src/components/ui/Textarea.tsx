import React from 'react';
import { cn } from '@/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ className, ...props }) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-daw-surface-tertiary bg-daw-surface-primary px-3 py-2 text-sm ring-offset-background placeholder:text-daw-text-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-daw-accent-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
};