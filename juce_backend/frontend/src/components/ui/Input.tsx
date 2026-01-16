import React from 'react';
import { cn } from '@/utils';
import type { ComponentSize } from '@/types';

interface InputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'size' | 'className' | 'disabled'
  > {
  label?: string;
  error?: string;
  helperText?: string;
  className?: string;
  size?: ComponentSize;
  disabled?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = 'text',
      size = 'md',
      disabled,
      label,
      error,
      helperText,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'flex w-full rounded border bg-daw-surface-secondary px-3 py-2 text-daw-text-primary placeholder:text-daw-text-tertiary focus:outline-none focus:ring-2 focus:ring-daw-accent-primary disabled:cursor-not-allowed disabled:opacity-50';

    const sizeClasses = {
      sm: 'h-8 text-sm',
      md: 'h-10',
      lg: 'h-12 text-lg',
      xl: 'h-14 text-xl',
    };

    const borderClasses = error
      ? 'border-red-500 focus:border-red-500'
      : 'border-daw-surface-tertiary focus:border-daw-accent-primary';

    return (
      <div className="space-y-2">
        {label && (
          <label className="text-sm font-medium text-daw-text-primary">
            {label}
          </label>
        )}
        <input
          type={type}
          className={cn(
            baseClasses,
            size ? sizeClasses[size] : sizeClasses.md,
            borderClasses,
            className
          )}
          ref={ref}
          disabled={disabled}
          {...props}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-daw-text-tertiary">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
