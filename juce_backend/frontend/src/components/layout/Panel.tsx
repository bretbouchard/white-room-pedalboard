import React from 'react';
import { cn } from '@/utils';

interface PanelProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  actions?: React.ReactNode;
}

const Panel: React.FC<PanelProps> = ({
  children,
  title,
  className,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
  actions,
}) => {
  const panelClasses = cn(
    'bg-daw-surface-primary border border-daw-surface-tertiary rounded-lg',
    className
  );

  const headerClasses = cn(
    'flex items-center justify-between px-4 py-2 bg-daw-surface-secondary border-b border-daw-surface-tertiary',
    collapsible && 'cursor-pointer hover:bg-daw-surface-tertiary'
  );

  const contentClasses = cn(
    'transition-all duration-200 ease-in-out',
    collapsed ? 'h-0 hidden' : 'p-4'
  );

  const handleHeaderClick = () => {
    if (collapsible && onToggleCollapse) {
      onToggleCollapse();
    }
  };

  return (
    <div className={panelClasses}>
      {title && (
        <div className={headerClasses} onClick={handleHeaderClick}>
          <div className="flex items-center space-x-2">
            {collapsible && (
              <svg
                className={cn(
                  'w-4 h-4 transition-transform duration-200',
                  collapsed ? '-rotate-90' : 'rotate-0'
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
            <h3 className="text-sm font-semibold text-daw-text-primary">
              {title}
            </h3>
          </div>
          {actions && (
            <div className="flex items-center space-x-2">{actions}</div>
          )}
        </div>
      )}
      <div className={contentClasses}>{!collapsed && children}</div>
    </div>
  );
};

export default Panel;
