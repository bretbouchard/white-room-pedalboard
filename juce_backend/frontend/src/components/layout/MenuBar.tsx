import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils';

export interface MenuBarProps {
  onMenuAction: (action: string) => void;
  onWorkspacePresetChange: (preset: string) => void;
  currentPreset: string;
  className?: string;
}

interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  separator?: boolean;
  submenu?: MenuItem[];
  action?: string;
}

const menuStructure: MenuItem[] = [
  {
    id: 'file',
    label: 'File',
    submenu: [
      { id: 'new', label: 'New Project', shortcut: 'Ctrl+N', action: 'new-project' },
      { id: 'open', label: 'Open Project', shortcut: 'Ctrl+O', action: 'open-project' },
      { id: 'save', label: 'Save Project', shortcut: 'Ctrl+S', action: 'save-project' },
      { id: 'save-as', label: 'Save As...', shortcut: 'Ctrl+Shift+S', action: 'save-as-project' },
      { id: 'sep1', label: '', separator: true },
      { id: 'import', label: 'Import Audio', shortcut: 'Ctrl+I', action: 'import-audio' },
      { id: 'export', label: 'Export Audio', shortcut: 'Ctrl+E', action: 'export-audio' },
      { id: 'sep2', label: '', separator: true },
      { id: 'recent', label: 'Recent Projects', submenu: [] },
    ],
  },
  {
    id: 'flow',
    label: 'Flow',
    submenu: [
      { id: 'new-flow', label: 'New Flow', shortcut: 'Ctrl+Shift+N', action: 'new-flow' },
      { id: 'clear-flow', label: 'Clear Flow', shortcut: 'Ctrl+Shift+Del', action: 'clear-flow' },
      { id: 'sep1', label: '', separator: true },
      { id: 'import-flow', label: 'Import Flow...', shortcut: 'Ctrl+Shift+I', action: 'import-flow' },
      { id: 'export-flow', label: 'Export Flow...', shortcut: 'Ctrl+Shift+E', action: 'export-flow' },
      { id: 'sep2', label: '', separator: true },
      { id: 'flow-templates', label: 'Flow Templates', submenu: [
        { id: 'basic-mixer', label: 'Basic Mixer', action: 'flow-template-basic-mixer' },
        { id: 'advanced-processing', label: 'Advanced Processing', action: 'flow-template-advanced-processing' },
        { id: 'live-performance', label: 'Live Performance', action: 'flow-template-live-performance' },
        { id: 'podcast-setup', label: 'Podcast Setup', action: 'flow-template-podcast' },
      ]},
      { id: 'sep3', label: '', separator: true },
      { id: 'analyze-flow', label: 'Analyze Flow', shortcut: 'F9', action: 'analyze-flow' },
      { id: 'optimize-flow', label: 'Optimize Flow', shortcut: 'F10', action: 'optimize-flow' },
    ],
  },
  {
    id: 'edit',
    label: 'Edit',
    submenu: [
      { id: 'undo', label: 'Undo', shortcut: 'Ctrl+Z', action: 'undo' },
      { id: 'redo', label: 'Redo', shortcut: 'Ctrl+Y', action: 'redo' },
      { id: 'sep1', label: '', separator: true },
      { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X', action: 'cut' },
      { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C', action: 'copy' },
      { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V', action: 'paste' },
      { id: 'delete', label: 'Delete', shortcut: 'Del', action: 'delete' },
      { id: 'sep2', label: '', separator: true },
      { id: 'select-all', label: 'Select All', shortcut: 'Ctrl+A', action: 'select-all' },
    ],
  },
  {
    id: 'view',
    label: 'View',
    submenu: [
      { id: 'toggle-browser', label: 'Toggle Browser', shortcut: 'Ctrl+B', action: 'toggle-browser' },
      { id: 'toggle-mixer', label: 'Toggle Mixer', shortcut: 'Ctrl+M', action: 'toggle-mixer' },
      { id: 'toggle-transport', label: 'Toggle Transport', shortcut: 'F1', action: 'toggle-transport' },
      { id: 'sep1', label: '', separator: true },
      { id: 'zoom-in', label: 'Zoom In', shortcut: 'Ctrl++', action: 'zoom-in' },
      { id: 'zoom-out', label: 'Zoom Out', shortcut: 'Ctrl+-', action: 'zoom-out' },
      { id: 'zoom-fit', label: 'Zoom to Fit', shortcut: 'Ctrl+0', action: 'zoom-fit' },
      { id: 'sep2', label: '', separator: true },
      { id: 'fullscreen', label: 'Fullscreen', shortcut: 'F11', action: 'fullscreen' },
    ],
  },
  {
    id: 'track',
    label: 'Track',
    submenu: [
      { id: 'add-audio', label: 'Add Audio Track', shortcut: 'Ctrl+T', action: 'add-audio-track' },
      { id: 'add-midi', label: 'Add MIDI Track', shortcut: 'Ctrl+Shift+T', action: 'add-midi-track' },
      { id: 'add-instrument', label: 'Add Instrument Track', shortcut: 'Ctrl+Alt+T', action: 'add-instrument-track' },
      { id: 'sep1', label: '', separator: true },
      { id: 'duplicate', label: 'Duplicate Track', shortcut: 'Ctrl+D', action: 'duplicate-track' },
      { id: 'delete-track', label: 'Delete Track', shortcut: 'Ctrl+Del', action: 'delete-track' },
      { id: 'sep2', label: '', separator: true },
      { id: 'solo', label: 'Solo Track', shortcut: 'S', action: 'solo-track' },
      { id: 'mute', label: 'Mute Track', shortcut: 'M', action: 'mute-track' },
      { id: 'record', label: 'Arm for Recording', shortcut: 'R', action: 'arm-track' },
    ],
  },
  {
    id: 'transport',
    label: 'Transport',
    submenu: [
      { id: 'play', label: 'Play', shortcut: 'Space', action: 'transport-play' },
      { id: 'stop', label: 'Stop', shortcut: 'Enter', action: 'transport-stop' },
      { id: 'record', label: 'Record', shortcut: 'Ctrl+R', action: 'transport-record' },
      { id: 'sep1', label: '', separator: true },
      { id: 'rewind', label: 'Rewind', shortcut: 'Home', action: 'transport-rewind' },
      { id: 'fast-forward', label: 'Fast Forward', shortcut: 'End', action: 'transport-fast-forward' },
      { id: 'sep2', label: '', separator: true },
      { id: 'loop', label: 'Toggle Loop', shortcut: 'L', action: 'transport-loop' },
      { id: 'metronome', label: 'Toggle Metronome', shortcut: 'C', action: 'transport-metronome' },
    ],
  },
  {
    id: 'help',
    label: 'Help',
    submenu: [
      { id: 'shortcuts', label: 'Keyboard Shortcuts', shortcut: 'F1', action: 'show-shortcuts' },
      { id: 'documentation', label: 'Documentation', action: 'show-documentation' },
      { id: 'sep1', label: '', separator: true },
      { id: 'about', label: 'About DAW', action: 'show-about' },
    ],
  },
];

const MenuBar: React.FC<MenuBarProps> = ({
  onMenuAction,
  onWorkspacePresetChange,
  currentPreset,
  className,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Handle menu item click
  const handleMenuItemClick = (item: MenuItem) => {
    if (item.action) {
      onMenuAction(item.action);
      setActiveMenu(null);
    }
  };

  // Handle menu open/close
  const handleMenuToggle = (menuId: string) => {
    setActiveMenu(activeMenu === menuId ? null : menuId);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveMenu(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Render menu item
  const renderMenuItem = (item: MenuItem, depth = 0) => {
    if (item.separator) {
      return (
        <hr
          key={item.id}
          className="h-px bg-daw-surface-tertiary my-1 border-0"
        />
      );
    }

    const hasSubmenu = item.submenu && item.submenu.length > 0;
    const isHovered = hoveredItem === item.id;

    return (
      <div key={item.id} className="relative">
        <button
          className={cn(
            'flex items-center justify-between px-3 py-2 text-sm cursor-pointer w-full text-left',
            'hover:bg-daw-surface-tertiary transition-colors duration-150',
            isHovered && 'bg-daw-surface-tertiary'
          )}
          onClick={() => handleMenuItemClick(item)}
          onMouseEnter={() => setHoveredItem(item.id)}
          onMouseLeave={() => setHoveredItem(null)}
          role="menuitem"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleMenuItemClick(item);
            }
          }}
        >
          <span className="text-daw-text-primary">{item.label}</span>
          
          <div className="flex items-center space-x-2">
            {item.shortcut && (
              <span className="text-xs text-daw-text-tertiary font-mono">
                {item.shortcut}
              </span>
            )}
            {hasSubmenu && (
              <svg
                className="w-3 h-3 text-daw-text-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            )}
          </div>
        </button>

        {/* Submenu */}
        {hasSubmenu && isHovered && (
          <div
            className={cn(
              'absolute left-full top-0 ml-1 min-w-48 py-1',
              'bg-daw-surface-primary border border-daw-surface-tertiary rounded-md shadow-lg',
              'z-50'
            )}
            style={{ marginLeft: depth > 0 ? '4px' : '0px' }}
          >
            {item.submenu?.map(subItem => renderMenuItem(subItem, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const menuBarClasses = cn(
    'flex items-center h-8 bg-daw-surface-secondary border-b border-daw-surface-tertiary',
    'text-sm text-daw-text-primary select-none',
    className
  );

  return (
    <div ref={menuRef} className={menuBarClasses} role="menubar">
      {/* Menu Items */}
      <div className="flex gap-x-1">
        {menuStructure.map(menu => (
          <div key={menu.id} className="relative">
            <button
              className={cn(
                'px-4 py-1 hover:bg-daw-surface-tertiary transition-colors duration-150',
                activeMenu === menu.id && 'bg-daw-surface-tertiary'
              )}
              onClick={() => handleMenuToggle(menu.id)}
              role="menuitem"
              aria-haspopup="true"
              aria-expanded={activeMenu === menu.id}
            >
              {menu.label}
            </button>

            {/* Dropdown Menu */}
            {activeMenu === menu.id && menu.submenu && (
              <div
                className={cn(
                  'absolute top-full left-0 mt-1 min-w-48 py-1',
                  'bg-daw-surface-primary border border-daw-surface-tertiary rounded-md shadow-lg',
                  'z-50'
                )}
                role="menu"
              >
                {menu.submenu.map(item => renderMenuItem(item))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right Side Controls */}
      <div className="ml-auto flex items-center space-x-4 px-3">
        {/* Project Name */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-daw-text-secondary">Project:</span>
          <span className="text-xs text-daw-text-primary font-medium">Untitled Project</span>
        </div>

        {/* Mode Indicator */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-daw-text-secondary">Mode:</span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-xs text-daw-text-primary font-medium">Local</span>
          </div>
        </div>

        {/* Workspace Preset Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-daw-text-secondary">Workspace:</span>
          <select
            value={currentPreset}
            onChange={(e) => onWorkspacePresetChange(e.target.value)}
            className={cn(
              'bg-daw-surface-primary border border-daw-surface-tertiary rounded px-2 py-1',
              'text-xs text-daw-text-primary focus:outline-none focus:ring-1 focus:ring-daw-accent-primary'
            )}
          >
            <option value="default">Default</option>
            <option value="mixing">Mixing</option>
            <option value="recording">Recording</option>
            <option value="editing">Editing</option>
            <option value="mastering">Mastering</option>
          </select>
        </div>

        {/* User Profile */}
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-daw-accent-primary rounded-full flex items-center justify-center">
            <span className="text-xs text-white font-medium">U</span>
          </div>
          <span className="text-xs text-daw-text-secondary">User</span>
        </div>
      </div>
    </div>
  );
};

export default MenuBar;