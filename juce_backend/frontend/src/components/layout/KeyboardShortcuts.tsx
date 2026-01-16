import React, { useState } from 'react';
import { cn } from '@/utils';

export interface KeyboardShortcutsProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  className?: string;
}

interface ShortcutCategory {
  name: string;
  shortcuts: ShortcutItem[];
}

interface ShortcutItem {
  keys: string;
  description: string;
  context?: string;
}

const shortcutCategories: ShortcutCategory[] = [
  {
    name: 'General',
    shortcuts: [
      { keys: 'Ctrl+N', description: 'New Project' },
      { keys: 'Ctrl+O', description: 'Open Project' },
      { keys: 'Ctrl+S', description: 'Save Project' },
      { keys: 'Ctrl+Z', description: 'Undo' },
      { keys: 'Ctrl+Y', description: 'Redo' },
      { keys: 'Ctrl+C', description: 'Copy' },
      { keys: 'Ctrl+V', description: 'Paste' },
      { keys: 'Ctrl+X', description: 'Cut' },
      { keys: 'Del', description: 'Delete' },
    ],
  },
  {
    name: 'Transport',
    shortcuts: [
      { keys: 'Space', description: 'Play/Pause' },
      { keys: 'Enter', description: 'Stop' },
      { keys: 'Ctrl+R', description: 'Record' },
      { keys: 'Home', description: 'Go to Beginning' },
      { keys: 'End', description: 'Go to End' },
      { keys: 'L', description: 'Toggle Loop' },
      { keys: 'C', description: 'Toggle Metronome' },
    ],
  },
  {
    name: 'View',
    shortcuts: [
      { keys: 'Ctrl+B', description: 'Toggle Browser Panel' },
      { keys: 'Ctrl+M', description: 'Toggle Mixer Panel' },
      { keys: 'F1', description: 'Toggle Transport Panel' },
      { keys: 'Ctrl++', description: 'Zoom In' },
      { keys: 'Ctrl+-', description: 'Zoom Out' },
      { keys: 'Ctrl+0', description: 'Zoom to Fit' },
      { keys: 'F11', description: 'Toggle Fullscreen' },
      { keys: 'Tab', description: 'Focus Track View' },
    ],
  },
  {
    name: 'Tracks',
    shortcuts: [
      { keys: 'Ctrl+T', description: 'Add Audio Track' },
      { keys: 'Ctrl+Shift+T', description: 'Add MIDI Track' },
      { keys: 'Ctrl+Alt+T', description: 'Add Instrument Track' },
      { keys: 'Ctrl+D', description: 'Duplicate Track' },
      { keys: 'Ctrl+Del', description: 'Delete Track' },
      { keys: 'S', description: 'Solo Track', context: 'Track selected' },
      { keys: 'M', description: 'Mute Track', context: 'Track selected' },
      { keys: 'R', description: 'Arm for Recording', context: 'Track selected' },
    ],
  },
  {
    name: 'Editing',
    shortcuts: [
      { keys: 'Ctrl+A', description: 'Select All' },
      { keys: 'Shift+Click', description: 'Extend Selection' },
      { keys: 'Alt+Click', description: 'Add to Selection' },
      { keys: 'Ctrl+Shift+D', description: 'Duplicate Selection' },
      { keys: 'F', description: 'Fade In/Out' },
      { keys: 'Ctrl+F', description: 'Crossfade' },
      { keys: 'G', description: 'Toggle Snap to Grid' },
    ],
  },
  {
    name: 'Mixer',
    shortcuts: [
      { keys: '↑/↓', description: 'Adjust Fader', context: 'Fader focused' },
      { keys: 'Shift+↑/↓', description: 'Fine Adjust Fader', context: 'Fader focused' },
      { keys: '←/→', description: 'Adjust Pan', context: 'Pan control focused' },
      { keys: 'Shift+←/→', description: 'Fine Adjust Pan', context: 'Pan control focused' },
      { keys: '0', description: 'Reset to Default', context: 'Control focused' },
    ],
  },
];

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
  enabled,
  onToggle,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter shortcuts based on search term
  const filteredCategories = shortcutCategories.map(category => ({
    ...category,
    shortcuts: category.shortcuts.filter(shortcut =>
      shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shortcut.keys.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(category => category.shortcuts.length > 0);

  // Handle keyboard shortcut for opening help
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'F1' && !event.ctrlKey && !event.altKey && !event.shiftKey) {
        event.preventDefault();
        setIsOpen(true);
      } else if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Render shortcut key
  const renderShortcutKey = (keys: string) => {
    return keys.split('+').map((key, index, array) => (
      <React.Fragment key={key}>
        <kbd className="px-2 py-1 text-xs bg-daw-surface-tertiary border border-daw-surface-tertiary rounded">
          {key}
        </kbd>
        {index < array.length - 1 && <span className="mx-1 text-daw-text-tertiary">+</span>}
      </React.Fragment>
    ));
  };

  return (
    <div className={cn('relative', className)}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 p-3 bg-daw-surface-secondary border border-daw-surface-tertiary rounded-full',
          'hover:bg-daw-surface-tertiary transition-colors duration-150 shadow-lg',
          'focus:outline-none focus:ring-2 focus:ring-daw-accent-primary',
          !enabled && 'opacity-50'
        )}
        title="Keyboard Shortcuts (F1)"
        aria-label="Show keyboard shortcuts"
      >
        <svg
          className="w-5 h-5 text-daw-text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 9l4-4 4 4m0 6l-4 4-4-4"
          />
        </svg>
      </button>

      {/* Shortcuts Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-daw-surface-primary border border-daw-surface-tertiary rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-daw-surface-tertiary">
              <div>
                <h2 className="text-xl font-semibold text-daw-text-primary">
                  Keyboard Shortcuts
                </h2>
                <p className="text-sm text-daw-text-secondary mt-1">
                  Press F1 to open this dialog anytime
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Enable/Disable Toggle */}
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => onToggle(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      'relative w-10 h-6 rounded-full transition-colors duration-200',
                      enabled ? 'bg-daw-accent-primary' : 'bg-daw-surface-tertiary'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200',
                        enabled ? 'translate-x-5' : 'translate-x-1'
                      )}
                    />
                  </div>
                  <span className="text-sm text-daw-text-secondary">
                    {enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>

                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-daw-surface-tertiary rounded transition-colors duration-150"
                  aria-label="Close shortcuts dialog"
                >
                  <svg
                    className="w-5 h-5 text-daw-text-secondary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="p-6 border-b border-daw-surface-tertiary">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search shortcuts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(
                      'w-full px-3 py-2 bg-daw-surface-secondary border border-daw-surface-tertiary rounded',
                      'text-daw-text-primary placeholder-daw-text-tertiary',
                      'focus:outline-none focus:ring-1 focus:ring-daw-accent-primary'
                    )}
                  />
                </div>
                <select
                  value={selectedCategory || ''}
                  onChange={(e) => setSelectedCategory(e.target.value || null)}
                  className={cn(
                    'px-3 py-2 bg-daw-surface-secondary border border-daw-surface-tertiary rounded',
                    'text-daw-text-primary focus:outline-none focus:ring-1 focus:ring-daw-accent-primary'
                  )}
                >
                  <option value="">All Categories</option>
                  {shortcutCategories.map(category => (
                    <option key={category.name} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Shortcuts Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCategories
                  .filter(category => !selectedCategory || category.name === selectedCategory)
                  .map(category => (
                    <div key={category.name} className="space-y-3">
                      <h3 className="text-lg font-semibold text-daw-accent-primary">
                        {category.name}
                      </h3>
                      <div className="space-y-2">
                        {category.shortcuts.map((shortcut) => (
                          <div
                            key={`${shortcut.keys}-${shortcut.description}`}
                            className="flex items-center justify-between p-3 bg-daw-surface-secondary rounded"
                          >
                            <div className="flex-1">
                              <div className="text-sm text-daw-text-primary">
                                {shortcut.description}
                              </div>
                              {shortcut.context && (
                                <div className="text-xs text-daw-text-tertiary mt-1">
                                  {shortcut.context}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-1 ml-4">
                              {renderShortcutKey(shortcut.keys)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>

              {filteredCategories.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-daw-text-tertiary text-lg mb-2">
                    No shortcuts found
                  </div>
                  <div className="text-daw-text-secondary text-sm">
                    Try adjusting your search terms or category filter
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyboardShortcuts;