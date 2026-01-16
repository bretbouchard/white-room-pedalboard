import React, { useCallback } from 'react';
import { cn } from '@/utils';

export interface SelectionToolsProps {
  hasSelection: boolean;
  canCut: boolean;
  canCopy: boolean;
  canPaste: boolean;
  canDelete: boolean;
  canTrim: boolean;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onTrim: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onInvertSelection: () => void;
  onSplitAtPlayhead: () => void;
  onCreateCrossfade: () => void;
  className?: string;
}

const SelectionTools: React.FC<SelectionToolsProps> = ({
  hasSelection,
  canCut,
  canCopy,
  canPaste,
  canDelete,
  canTrim,
  onCut,
  onCopy,
  onPaste,
  onDelete,
  onTrim,
  onSelectAll,
  onDeselectAll,
  onInvertSelection,
  onSplitAtPlayhead,
  onCreateCrossfade,
  className,
}) => {
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const { ctrlKey, metaKey, key } = event;
    const modifier = ctrlKey || metaKey;

    switch (key) {
      case 'x':
        if (modifier && canCut) {
          event.preventDefault();
          onCut();
        }
        break;
      case 'c':
        if (modifier && canCopy) {
          event.preventDefault();
          onCopy();
        }
        break;
      case 'v':
        if (modifier && canPaste) {
          event.preventDefault();
          onPaste();
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (canDelete) {
          event.preventDefault();
          onDelete();
        }
        break;
      case 'a':
        if (modifier) {
          event.preventDefault();
          onSelectAll();
        }
        break;
      case 'd':
        if (modifier) {
          event.preventDefault();
          onDeselectAll();
        }
        break;
      case 'i':
        if (modifier) {
          event.preventDefault();
          onInvertSelection();
        }
        break;
      case 's':
        if (modifier && event.shiftKey) {
          event.preventDefault();
          onSplitAtPlayhead();
        }
        break;
      case 'f':
        if (modifier) {
          event.preventDefault();
          onCreateCrossfade();
        }
        break;
      case 't':
        if (modifier && canTrim) {
          event.preventDefault();
          onTrim();
        }
        break;
    }
  }, [
    canCut, canCopy, canPaste, canDelete, canTrim,
    onCut, onCopy, onPaste, onDelete, onTrim,
    onSelectAll, onDeselectAll, onInvertSelection,
    onSplitAtPlayhead, onCreateCrossfade
  ]);

  const toolbarClasses = cn(
    'flex items-center space-x-1 p-2 bg-daw-surface-secondary border border-daw-surface-tertiary rounded',
    className
  );

  const buttonClasses = (enabled: boolean) => cn(
    'px-3 py-1 text-sm rounded transition-colors duration-150',
    enabled
      ? 'bg-daw-surface-primary text-daw-text-primary hover:bg-daw-surface-tertiary cursor-pointer'
      : 'bg-daw-surface-tertiary text-daw-text-tertiary cursor-not-allowed opacity-50'
  );

  return (
    <div 
      className={toolbarClasses}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="toolbar"
      aria-label="Selection tools"
    >
      {/* Basic editing operations */}
      <div className="flex items-center space-x-1 border-r border-daw-surface-tertiary pr-2">
        <button
          onClick={onCut}
          disabled={!canCut}
          className={buttonClasses(canCut)}
          title="Cut (Ctrl+X)"
          aria-label="Cut selected regions"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m-6-8h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2V8a2 2 0 012-2z" />
          </svg>
          Cut
        </button>
        
        <button
          onClick={onCopy}
          disabled={!canCopy}
          className={buttonClasses(canCopy)}
          title="Copy (Ctrl+C)"
          aria-label="Copy selected regions"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Copy
        </button>
        
        <button
          onClick={onPaste}
          disabled={!canPaste}
          className={buttonClasses(canPaste)}
          title="Paste (Ctrl+V)"
          aria-label="Paste regions"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Paste
        </button>
        
        <button
          onClick={onDelete}
          disabled={!canDelete}
          className={buttonClasses(canDelete)}
          title="Delete (Del)"
          aria-label="Delete selected regions"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </button>
      </div>

      {/* Selection operations */}
      <div className="flex items-center space-x-1 border-r border-daw-surface-tertiary pr-2">
        <button
          onClick={onSelectAll}
          className={buttonClasses(true)}
          title="Select All (Ctrl+A)"
          aria-label="Select all regions"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          All
        </button>
        
        <button
          onClick={onDeselectAll}
          disabled={!hasSelection}
          className={buttonClasses(hasSelection)}
          title="Deselect All (Ctrl+D)"
          aria-label="Deselect all regions"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          None
        </button>
        
        <button
          onClick={onInvertSelection}
          className={buttonClasses(true)}
          title="Invert Selection (Ctrl+I)"
          aria-label="Invert selection"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Invert
        </button>
      </div>

      {/* Advanced editing operations */}
      <div className="flex items-center space-x-1 border-r border-daw-surface-tertiary pr-2">
        <button
          onClick={onSplitAtPlayhead}
          className={buttonClasses(true)}
          title="Split at Playhead (Ctrl+Shift+S)"
          aria-label="Split regions at playhead position"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Split
        </button>
        
        <button
          onClick={onTrim}
          disabled={!canTrim}
          className={buttonClasses(canTrim)}
          title="Trim to Selection (Ctrl+T)"
          aria-label="Trim regions to selection"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
          Trim
        </button>
        
        <button
          onClick={onCreateCrossfade}
          disabled={!hasSelection}
          className={buttonClasses(hasSelection)}
          title="Create Crossfade (Ctrl+F)"
          aria-label="Create crossfade between selected regions"
        >
          <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Crossfade
        </button>
      </div>

      {/* Status indicator */}
      <div className="text-xs text-daw-text-secondary">
        {hasSelection ? 'Selection active' : 'No selection'}
      </div>
    </div>
  );
};

export default SelectionTools;