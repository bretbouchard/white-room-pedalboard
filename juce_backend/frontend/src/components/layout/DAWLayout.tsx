import React, { useState, useCallback, useEffect } from 'react';
import { cn } from '@/utils';
import DockingSystem from './DockingSystem';
import WorkspacePresets from './WorkspacePresets';
import KeyboardShortcuts from './KeyboardShortcuts';
import MenuBar from './MenuBar';
import TrackViewContainer from '../daw/TrackViewContainer';
import MixingConsole from '../daw/MixingConsole';
import PluginBrowser from '../plugins/PluginBrowser';
import { useMixer } from '@/hooks/useAudio';
import { useAudioStore } from '@/stores/audioStore';

export interface DAWLayoutProps {
  children?: React.ReactNode;
  className?: string;
  onLayoutChange?: (layout: LayoutConfig) => void;
}

export interface LayoutConfig {
  panels: PanelConfig[];
  workspacePreset: string;
  menuVisible: boolean;
  keyboardShortcutsEnabled: boolean;
}

export interface PanelConfig {
  id: string;
  title: string;
  component: React.ComponentType<unknown>;
  defaultSize: number;
  minSize: number;
  maxSize: number;
  position: 'left' | 'right' | 'top' | 'bottom' | 'center';
  collapsed: boolean;
  docked: boolean;
  visible: boolean;
}

const defaultLayout: LayoutConfig = {
  panels: [
    {
      id: 'track-view',
      title: 'Track View',
      component: TrackViewContainer,
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
      component: MixingConsole,
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
      component: PluginBrowser,
      defaultSize: 25,
      minSize: 10,
      maxSize: 30,
      position: 'left',
      collapsed: false,
      docked: true,
      visible: true,
    },
  ],
  workspacePreset: 'default',
  menuVisible: true,
  keyboardShortcutsEnabled: true,
};

const DAWLayout: React.FC<DAWLayoutProps> = ({
  children,
  className,
  onLayoutChange,
}) => {
  const [layout, setLayout] = useState<LayoutConfig>(defaultLayout);
  const [isDragging, setIsDragging] = useState(false);
  const [focusedPanel, setFocusedPanel] = useState<string | null>(null);
  const mixer = useMixer();
  const { removeTrack, selectedTrackId } = useAudioStore();

  // Handle layout changes
  const handleLayoutChange = useCallback((newLayout: LayoutConfig) => {
    setLayout(newLayout);
    onLayoutChange?.(newLayout);
  }, [onLayoutChange]);

  // Handle panel resize
  const handlePanelResize = useCallback((panelId: string, newSize: number) => {
    setLayout(prev => ({
      ...prev,
      panels: prev.panels.map(panel =>
        panel.id === panelId ? { ...panel, defaultSize: newSize } : panel
      ),
    }));
  }, []);

  // Handle panel collapse/expand
  const handlePanelToggle = useCallback((panelId: string) => {
    setLayout(prev => ({
      ...prev,
      panels: prev.panels.map(panel =>
        panel.id === panelId ? { ...panel, collapsed: !panel.collapsed } : panel
      ),
    }));
  }, []);

  // Handle panel visibility
  const handlePanelVisibility = useCallback((panelId: string, visible: boolean) => {
    setLayout(prev => ({
      ...prev,
      panels: prev.panels.map(panel =>
        panel.id === panelId ? { ...panel, visible } : panel
      ),
    }));
  }, []);

  // Handle workspace preset change
  const handleWorkspacePresetChange = useCallback((preset: string) => {
    setLayout(prev => ({ ...prev, workspacePreset: preset }));
  }, []);

  // Handle keyboard shortcuts
  const handleKeyboardShortcut = useCallback((shortcut: string) => {
    switch (shortcut) {
      case 'add-audio-track':
        mixer.addTrack('audio');
        break;
      case 'add-midi-track':
        mixer.addTrack('midi');
        break;
      case 'add-instrument-track':
        mixer.addTrack('instrument');
        break;
      case 'delete-track':
        // Delete the currently selected track
        console.log('Delete track action triggered, selectedTrackId:', selectedTrackId);
        if (selectedTrackId) {
          if (window.confirm('Are you sure you want to delete this track? This action cannot be undone.')) {
            removeTrack(selectedTrackId);
          }
        } else {
          alert('Please select a track to delete first.');
        }
        break;
      case 'toggle-menu':
        setLayout(prev => ({ ...prev, menuVisible: !prev.menuVisible }));
        break;
      case 'toggle-browser':
        handlePanelToggle('browser');
        break;
      case 'toggle-mixer':
        handlePanelToggle('mixer');
        break;
      case 'focus-track-view':
        setFocusedPanel('track-view');
        break;
      // File menu actions
      case 'new-project':
        if (window.confirm('Create a new project? Any unsaved changes will be lost.')) {
          console.log('New project created');
        }
        break;
      case 'open-project':
        console.log('Open project dialog');
        break;
      case 'save-project':
        console.log('Project saved');
        break;
      case 'save-as-project':
        console.log('Save as project dialog');
        break;
      case 'import-audio':
        console.log('Import audio dialog');
        break;
      case 'export-audio':
        console.log('Export audio dialog');
        break;
      // Flow menu actions
      case 'new-flow':
        if (window.confirm('Create a new flow? Current flow will be cleared.')) {
          console.log('New flow created');
        }
        break;
      case 'clear-flow':
        if (window.confirm('Clear current flow? This action cannot be undone.')) {
          console.log('Flow cleared');
        }
        break;
      case 'import-flow':
        console.log('Import flow dialog');
        break;
      case 'export-flow':
        console.log('Export flow dialog');
        break;
      case 'analyze-flow':
        console.log('Analyzing flow...');
        break;
      case 'optimize-flow':
        console.log('Optimizing flow...');
        break;
      default:
        break;
    }
  }, [handlePanelToggle, mixer, removeTrack, selectedTrackId]);

  // Keyboard event handling
  useEffect(() => {
    if (!layout.keyboardShortcutsEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const { ctrlKey, metaKey, key } = event;
      const modifier = ctrlKey || metaKey;

      if (modifier && key === 'm') {
        event.preventDefault();
        handleKeyboardShortcut('toggle-menu');
      } else if (modifier && key === 'b') {
        event.preventDefault();
        handleKeyboardShortcut('toggle-browser');
      } else if (modifier && key === 'x') {
        event.preventDefault();
        handleKeyboardShortcut('toggle-mixer');
      } else if (key === 'Tab' && !modifier) {
        event.preventDefault();
        handleKeyboardShortcut('focus-track-view');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [layout.keyboardShortcutsEnabled, handleKeyboardShortcut]);

  const layoutClasses = cn(
    'h-screen flex flex-col bg-daw-bg-primary text-daw-text-primary',
    isDragging && 'select-none',
    className
  );

  return (
    <div className={layoutClasses}>
      {/* Menu Bar */}
      {layout.menuVisible && (
        <MenuBar
          onMenuAction={handleKeyboardShortcut}
          onWorkspacePresetChange={handleWorkspacePresetChange}
          currentPreset={layout.workspacePreset}
        />
      )}

      {/* Main Layout Area */}
      <div className="flex-1 flex min-h-0">
        <DockingSystem
          layout={layout}
          onLayoutChange={handleLayoutChange}
          onPanelResize={handlePanelResize}
          onPanelToggle={handlePanelToggle}
          onPanelVisibility={handlePanelVisibility}
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          focusedPanel={focusedPanel}
          onPanelFocus={setFocusedPanel}
        />
      </div>

      {/* Workspace Presets */}
      <WorkspacePresets
        currentPreset={layout.workspacePreset}
        onPresetChange={handleWorkspacePresetChange}
        onSavePreset={(name, config) => {
          // Save custom preset logic
          console.log('Saving preset:', name, config);
        }}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcuts
        enabled={layout.keyboardShortcutsEnabled}
        onToggle={(enabled) => 
          setLayout(prev => ({ ...prev, keyboardShortcutsEnabled: enabled }))
        }
      />

      {children}
    </div>
  );
};

export default DAWLayout;
