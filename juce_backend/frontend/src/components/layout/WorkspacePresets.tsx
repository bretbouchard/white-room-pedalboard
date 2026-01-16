import React, { useState } from 'react';
import { cn } from '@/utils';
import type { LayoutConfig } from './DAWLayout';

export interface WorkspacePresetsProps {
  currentPreset: string;
  onPresetChange: (preset: string) => void;
  onSavePreset: (name: string, config: LayoutConfig) => void;
  className?: string;
}

interface WorkspacePreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  config: Partial<LayoutConfig>;
}

const defaultPresets: WorkspacePreset[] = [
  {
    id: 'default',
    name: 'Default',
    description: 'Balanced layout for general music production',
    icon: '🎵',
    config: {
      panels: [
        {
          id: 'track-view',
          title: 'Track View',
          component: () => <div>Track View</div>,
          defaultSize: 60,
          minSize: 30,
          maxSize: 80,
          position: 'center',
          collapsed: false,
          docked: true,
          visible: true,
        },
        {
          id: 'mixer',
          title: 'Mixer',
          component: () => <div>Mixer</div>,
          defaultSize: 25,
          minSize: 15,
          maxSize: 40,
          position: 'right',
          collapsed: false,
          docked: true,
          visible: true,
        },
        {
          id: 'browser',
          title: 'Browser',
          component: () => <div>Browser</div>,
          defaultSize: 15,
          minSize: 10,
          maxSize: 30,
          position: 'left',
          collapsed: false,
          docked: true,
          visible: true,
        },
      ],
    },
  },
  {
    id: 'mixing',
    name: 'Mixing',
    description: 'Optimized for mixing with large mixer and minimal browser',
    icon: '🎚️',
    config: {
      panels: [
        {
          id: 'track-view',
          title: 'Track View',
          component: () => <div>Track View</div>,
          defaultSize: 45,
          minSize: 30,
          maxSize: 60,
          position: 'center',
          collapsed: false,
          docked: true,
          visible: true,
        },
        {
          id: 'mixer',
          title: 'Mixer',
          component: () => <div>Mixer</div>,
          defaultSize: 45,
          minSize: 30,
          maxSize: 60,
          position: 'right',
          collapsed: false,
          docked: true,
          visible: true,
        },
        {
          id: 'browser',
          title: 'Browser',
          component: () => <div>Browser</div>,
          defaultSize: 10,
          minSize: 8,
          maxSize: 20,
          position: 'left',
          collapsed: true,
          docked: true,
          visible: true,
        },
      ],
    },
  },
  {
    id: 'recording',
    name: 'Recording',
    description: 'Focused on recording with minimal distractions',
    icon: '🎤',
    config: {
      panels: [
        {
          id: 'track-view',
          title: 'Track View',
          component: () => <div>Track View</div>,
          defaultSize: 80,
          minSize: 60,
          maxSize: 90,
          position: 'center',
          collapsed: false,
          docked: true,
          visible: true,
        },
        {
          id: 'mixer',
          title: 'Mixer',
          component: () => <div>Mixer</div>,
          defaultSize: 20,
          minSize: 10,
          maxSize: 30,
          position: 'right',
          collapsed: false,
          docked: true,
          visible: true,
        },
        {
          id: 'browser',
          title: 'Browser',
          component: () => <div>Browser</div>,
          defaultSize: 15,
          minSize: 10,
          maxSize: 25,
          position: 'left',
          collapsed: true,
          docked: true,
          visible: false,
        },
      ],
    },
  },
  {
    id: 'editing',
    name: 'Editing',
    description: 'Maximized track view for detailed audio editing',
    icon: '✂️',
    config: {
      panels: [
        {
          id: 'track-view',
          title: 'Track View',
          component: () => <div>Track View</div>,
          defaultSize: 85,
          minSize: 70,
          maxSize: 95,
          position: 'center',
          collapsed: false,
          docked: true,
          visible: true,
        },
        {
          id: 'mixer',
          title: 'Mixer',
          component: () => <div>Mixer</div>,
          defaultSize: 15,
          minSize: 10,
          maxSize: 25,
          position: 'right',
          collapsed: true,
          docked: true,
          visible: true,
        },
        {
          id: 'browser',
          title: 'Browser',
          component: () => <div>Browser</div>,
          defaultSize: 12,
          minSize: 8,
          maxSize: 20,
          position: 'left',
          collapsed: true,
          docked: true,
          visible: true,
        },
      ],
    },
  },
  {
    id: 'mastering',
    name: 'Mastering',
    description: 'Focused on mastering with analysis tools',
    icon: '🎯',
    config: {
      panels: [
        {
          id: 'track-view',
          title: 'Track View',
          component: () => <div>Track View</div>,
          defaultSize: 50,
          minSize: 40,
          maxSize: 70,
          position: 'center',
          collapsed: false,
          docked: true,
          visible: true,
        },
        {
          id: 'mixer',
          title: 'Mixer',
          component: () => <div>Mixer</div>,
          defaultSize: 30,
          minSize: 20,
          maxSize: 40,
          position: 'right',
          collapsed: false,
          docked: true,
          visible: true,
        },
        {
          id: 'analyzer',
          title: 'Analyzer',
          component: () => <div>Analyzer</div>,
          defaultSize: 20,
          minSize: 15,
          maxSize: 30,
          position: 'bottom',
          collapsed: false,
          docked: true,
          visible: true,
        },
      ],
    },
  },
];

const WorkspacePresets: React.FC<WorkspacePresetsProps> = ({
  currentPreset,
  onPresetChange,
  onSavePreset,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Handle preset selection
  const handlePresetSelect = (presetId: string) => {
    onPresetChange(presetId);
    setIsOpen(false);
  };

  // Handle save new preset
  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      // This would normally get the current layout config
      const currentConfig: LayoutConfig = {
        panels: [],
        workspacePreset: currentPreset,
        menuVisible: true,
        keyboardShortcutsEnabled: true,
      };
      
      onSavePreset(newPresetName.trim(), currentConfig);
      setNewPresetName('');
      setShowSaveDialog(false);
    }
  };

  const currentPresetData = defaultPresets.find(p => p.id === currentPreset);

  return (
    <div className={cn('relative', className)}>
      {/* Preset Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center space-x-2 px-3 py-1 text-xs',
          'bg-daw-surface-secondary border border-daw-surface-tertiary rounded',
          'hover:bg-daw-surface-tertiary transition-colors duration-150',
          'focus:outline-none focus:ring-1 focus:ring-daw-accent-primary'
        )}
        aria-label="Select workspace preset"
      >
        <span>{currentPresetData?.icon || '🎵'}</span>
        <span className="text-daw-text-primary">{currentPresetData?.name || 'Default'}</span>
        <svg
          className={cn(
            'w-3 h-3 text-daw-text-secondary transition-transform duration-200',
            isOpen && 'rotate-180'
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
      </button>

      {/* Preset Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute bottom-full left-0 mb-2 w-64 py-2',
            'bg-daw-surface-primary border border-daw-surface-tertiary rounded-lg shadow-lg',
            'z-50'
          )}
        >
          <div className="px-3 py-2 border-b border-daw-surface-tertiary">
            <h3 className="text-sm font-semibold text-daw-text-primary">
              Workspace Presets
            </h3>
          </div>

          {/* Preset List */}
          <div className="max-h-64 overflow-y-auto">
            {defaultPresets.map(preset => (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset.id)}
                className={cn(
                  'w-full flex items-start space-x-3 px-3 py-2 text-left',
                  'hover:bg-daw-surface-tertiary transition-colors duration-150',
                  currentPreset === preset.id && 'bg-daw-accent-primary bg-opacity-20'
                )}
              >
                <span className="text-lg">{preset.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-daw-text-primary">
                      {preset.name}
                    </span>
                    {currentPreset === preset.id && (
                      <div className="w-2 h-2 bg-daw-accent-primary rounded-full" />
                    )}
                  </div>
                  <p className="text-xs text-daw-text-secondary mt-1">
                    {preset.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="px-3 py-2 border-t border-daw-surface-tertiary">
            <button
              onClick={() => setShowSaveDialog(true)}
              className={cn(
                'w-full px-3 py-2 text-sm text-daw-accent-primary',
                'hover:bg-daw-surface-tertiary rounded transition-colors duration-150'
              )}
            >
              + Save Current Layout
            </button>
          </div>
        </div>
      )}

      {/* Save Preset Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-daw-surface-primary border border-daw-surface-tertiary rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-daw-text-primary mb-4">
              Save Workspace Preset
            </h3>
            
            <div className="mb-4">
              <label htmlFor="preset-name-input" className="block text-sm font-medium text-daw-text-secondary mb-2">
                Preset Name
              </label>
              <input
                id="preset-name-input"
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Enter preset name..."
                className={cn(
                  'w-full px-3 py-2 bg-daw-surface-secondary border border-daw-surface-tertiary rounded',
                  'text-daw-text-primary placeholder-daw-text-tertiary',
                  'focus:outline-none focus:ring-1 focus:ring-daw-accent-primary'
                )}
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setNewPresetName('');
                }}
                className={cn(
                  'px-4 py-2 text-sm text-daw-text-secondary',
                  'hover:text-daw-text-primary transition-colors duration-150'
                )}
              >
                Cancel
              </button>
              <button
                onClick={handleSavePreset}
                disabled={!newPresetName.trim()}
                className={cn(
                  'px-4 py-2 text-sm bg-daw-accent-primary text-white rounded',
                  'hover:bg-daw-accent-primary hover:bg-opacity-80 transition-colors duration-150',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspacePresets;