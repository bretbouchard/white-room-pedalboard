import React from 'react';
import { cn } from '@/utils';
import type { ComponentSize, ComponentVariant } from '@/types';

interface ButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    'className' | 'disabled'
  > {
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
  size?: ComponentSize;
  variant?: ComponentVariant;
  disabled?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      disabled,
      loading,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-daw-accent-primary disabled:pointer-events-none disabled:opacity-50';

    const variantClasses = {
      primary:
        'bg-daw-surface-secondary hover:bg-daw-surface-tertiary text-daw-text-primary border border-daw-surface-tertiary hover:border-daw-accent-primary',
      secondary:
        'bg-daw-surface-primary hover:bg-daw-surface-secondary text-daw-text-secondary border border-daw-surface-tertiary',
      accent:
        'bg-daw-accent-primary hover:bg-daw-accent-primary/80 text-daw-bg-primary border border-daw-accent-primary',
      danger: 'bg-red-600 hover:bg-red-700 text-white border border-red-600',
    };

    const sizeClasses = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 py-2',
      lg: 'h-12 px-6 text-lg',
      xl: 'h-14 px-8 text-xl',
    };

    return (
      <button
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
