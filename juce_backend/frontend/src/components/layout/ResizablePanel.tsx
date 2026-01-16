import React, { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/utils';

export interface ResizablePanelProps {
  children: React.ReactNode;
  title: string;
  defaultSize: number;
  minSize: number;
  maxSize: number;
  position: 'left' | 'right' | 'top' | 'bottom' | 'center';
  collapsed: boolean;
  onResize?: (size: number) => void;
  onToggleCollapse?: () => void;
  onFocus?: () => void;
  className?: string;
  resizable?: boolean;
  collapsible?: boolean;
  focused?: boolean;
}

const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  title,
  defaultSize,
  minSize,
  maxSize,
  position,
  collapsed,
  onResize,
  onToggleCollapse,
  onFocus,
  className,
  resizable = true,
  collapsible = true,
  focused = false,
}) => {
  const [size, setSize] = useState(defaultSize);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(0);

  const isHorizontal = position === 'left' || position === 'right';
  const isCenter = position === 'center';


  // Handle resize start
  const handleResizeStart = useCallback((event: React.MouseEvent) => {
    if (!resizable || isCenter) return;
    
    event.preventDefault();
    setIsResizing(true);
    startPosRef.current = isHorizontal ? event.clientX : event.clientY;
    startSizeRef.current = size;
    
    document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [resizable, isHorizontal, size]);

  // Handle resize move
  const handleResizeMove = useCallback((event: MouseEvent) => {
    if (!isResizing || isCenter) return;

    const currentPos = isHorizontal ? event.clientX : event.clientY;
    const delta = currentPos - startPosRef.current;
    
    let newSize = startSizeRef.current;
    
    if (position === 'left' || position === 'top') {
      newSize += (delta / (isHorizontal ? window.innerWidth : window.innerHeight)) * 100;
    } else {
      newSize -= (delta / (isHorizontal ? window.innerWidth : window.innerHeight)) * 100;
    }

    // Clamp size to min/max bounds
    newSize = Math.max(minSize, Math.min(maxSize, newSize));
    
    setSize(newSize);
    onResize?.(newSize);
  }, [isResizing, isHorizontal, position, minSize, maxSize, onResize]);

  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    if (!isResizing) return;
    
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [isResizing]);

  // Mouse event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Handle panel focus
  const handlePanelClick = useCallback(() => {
    onFocus?.();
  }, [onFocus]);

  // Calculate panel styles
  const getPanelStyle = () => {
    if (isCenter) {
      return { flex: '1 1 auto', minHeight: 0 };
    }

    if (collapsed) {
      return isHorizontal ? { width: '2rem' } : { height: '2rem' };
    }
    
    // For left/right panels, use 100% width of container since container controls the size
    return isHorizontal
      ? { width: '100%' }
      : { height: `${size}%` };
  };

  // Get resize handle position classes
  const getResizeHandleClasses = () => {
    const baseClasses = 'absolute bg-daw-surface-tertiary hover:bg-daw-accent-primary transition-colors duration-200';

    if (isCenter) {
      return '';
    }

    switch (position) {
      case 'left':
        return cn(baseClasses, 'right-0 top-0 w-1 h-full cursor-col-resize');
      case 'right':
        return cn(baseClasses, 'left-0 top-0 w-1 h-full cursor-col-resize');
      case 'top':
        return cn(baseClasses, 'bottom-0 left-0 w-full h-1 cursor-row-resize');
      case 'bottom':
        return cn(baseClasses, 'top-0 left-0 w-full h-1 cursor-row-resize');
      default:
        return baseClasses;
    }
  };

  const panelClasses = cn(
    'relative bg-daw-surface-primary border border-daw-surface-tertiary',
    'flex flex-col',
    'transition-all duration-200 ease-in-out',
    focused && 'ring-2 ring-daw-accent-primary ring-opacity-50',
    collapsed && 'overflow-hidden',
    isResizing && 'transition-none',
    isCenter && 'flex-1 min-h-0',
    className
  );

  const headerClasses = cn(
    'flex items-center justify-between px-3 py-2 bg-daw-surface-secondary',
    'border-b border-daw-surface-tertiary text-sm font-medium',
    collapsible && 'cursor-pointer hover:bg-daw-surface-tertiary',
    focused && 'bg-daw-accent-primary bg-opacity-20'
  );

  const contentClasses = cn(
    'flex-1 min-h-0 flex flex-col',
    collapsed && 'hidden'
  );

  return (
    <section
      ref={panelRef}
      className={panelClasses}
      style={getPanelStyle()}
      onClick={handlePanelClick}
      aria-label={title}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePanelClick();
        }
      }}
    >
      {/* Panel Header */}
      <button 
        className={cn(headerClasses, collapsible && 'w-full text-left')}
        onClick={collapsible ? onToggleCollapse : undefined}
        disabled={!collapsible}
        aria-expanded={collapsible ? !collapsed : undefined}
        onKeyDown={(e) => {
          if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onToggleCollapse?.();
          }
        }}
      >
        <div className="flex items-center space-x-2">
          {collapsible && (
            <svg
              className={cn(
                'w-3 h-3 transition-transform duration-200',
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
          <span className="text-daw-text-primary truncate">{title}</span>
        </div>
        
        {/* Panel Actions */}
        <div className="flex items-center space-x-1">
          {focused && (
            <div className="w-2 h-2 bg-daw-accent-primary rounded-full" />
          )}
        </div>
      </button>

      {/* Panel Content */}
      <div className={contentClasses}>
        {children}
      </div>

      {/* Resize Handle */}
      {resizable && !collapsed && !isCenter && (
        <button
          className={getResizeHandleClasses()}
          onMouseDown={handleResizeStart}
          aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
          aria-label={`Resize ${title} panel`}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
              e.preventDefault();
              const delta = e.shiftKey ? 10 : 1;
              const direction = (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 1;
              const newSize = size + (direction * delta);
              const clampedSize = Math.max(minSize, Math.min(maxSize, newSize));
              setSize(clampedSize);
              onResize?.(clampedSize);
            }
          }}
        />
      )}
    </section>
  );
};

export default ResizablePanel;
