import React, { createContext, useState, useEffect, useCallback } from 'react';

export interface AccessibilityContextType {
  // Focus management
  focusedElement: string | null;
  focusHistory: string[];
  setFocus: (elementId: string) => void;
  restoreFocus: () => void;
  
  // Keyboard navigation
  keyboardNavigationEnabled: boolean;
  setKeyboardNavigationEnabled: (enabled: boolean) => void;
  
  // Screen reader support
  announcements: string[];
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  
  // High contrast mode
  highContrastMode: boolean;
  setHighContrastMode: (enabled: boolean) => void;
  
  // Reduced motion
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;
  
  // Focus trap
  trapFocus: (containerId: string) => void;
  releaseFocusTrap: () => void;
  focusTrapped: string | null;
}

export const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [focusedElement, setFocusedElement] = useState<string | null>(null);
  const [focusHistory, setFocusHistory] = useState<string[]>([]);
  const [keyboardNavigationEnabled, setKeyboardNavigationEnabled] = useState(false);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [highContrastMode, setHighContrastMode] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [focusTrapped, setFocusTrapped] = useState<string | null>(null);

  // Detect keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        setKeyboardNavigationEnabled(true);
      }
    };

    const handleMouseDown = () => {
      setKeyboardNavigationEnabled(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  // Detect user preferences
  useEffect(() => {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply high contrast mode
  useEffect(() => {
    if (highContrastMode) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [highContrastMode]);

  // Apply reduced motion
  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [reducedMotion]);

  // Focus management
  const setFocus = useCallback((elementId: string) => {
    setFocusHistory(prev => [...prev.slice(-9), focusedElement].filter(Boolean) as string[]);
    setFocusedElement(elementId);
    
    // Actually focus the element
    const element = document.getElementById(elementId);
    if (element) {
      element.focus();
    }
  }, [focusedElement]);

  const restoreFocus = useCallback(() => {
    if (focusHistory.length > 0) {
      const previousFocus = focusHistory[focusHistory.length - 1];
      if (previousFocus) {
        setFocusedElement(previousFocus);
        setFocusHistory(prev => prev.slice(0, -1));
        
        const element = document.getElementById(previousFocus);
        if (element) {
          element.focus();
        }
      }
    }
  }, [focusHistory]);

  // Screen reader announcements
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements(prev => [...prev, message]);
    
    // Create live region for screen readers
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only';
    liveRegion.textContent = message;
    
    document.body.appendChild(liveRegion);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(liveRegion);
      setAnnouncements(prev => prev.filter(a => a !== message));
    }, 1000);
  }, []);

  const releaseFocusTrap = useCallback(() => {
    if (focusTrapped) {
      const container = document.getElementById(focusTrapped);
      const containerWithCleanup = container as HTMLElement & { _focusTrapCleanup?: () => void };
      if (container && containerWithCleanup._focusTrapCleanup) {
        containerWithCleanup._focusTrapCleanup();
        delete containerWithCleanup._focusTrapCleanup;
      }
      setFocusTrapped(null);
      restoreFocus();
    }
  }, [focusTrapped, restoreFocus]);

  // Focus trap management
  const trapFocus = useCallback((containerId: string) => {
    setFocusTrapped(containerId);
    
    const container = document.getElementById(containerId);
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
      
      if (event.key === 'Escape') {
        releaseFocusTrap();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement?.focus();

    // Store cleanup function
    (container as HTMLElement & { _focusTrapCleanup?: () => void })._focusTrapCleanup = () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [releaseFocusTrap]);

  // Global keyboard shortcuts for accessibility
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Skip main content (Alt+S)
      if (event.altKey && event.key === 's') {
        event.preventDefault();
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.focus();
          announce('Skipped to main content');
        }
      }
      
      // Toggle high contrast (Alt+H)
      if (event.altKey && event.key === 'h') {
        event.preventDefault();
        const newMode = !highContrastMode;
        setHighContrastMode(newMode);
        announce(newMode ? 'High contrast mode enabled' : 'High contrast mode disabled');
      }
      
      // Focus search (Alt+/)
      if (event.altKey && event.key === '/') {
        event.preventDefault();
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
          searchInput.focus();
          announce('Focused search input');
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [announce, highContrastMode]);

  const contextValue: AccessibilityContextType = React.useMemo(() => ({
    focusedElement,
    focusHistory,
    setFocus,
    restoreFocus,
    keyboardNavigationEnabled,
    setKeyboardNavigationEnabled,
    announcements,
    announce,
    highContrastMode,
    setHighContrastMode,
    reducedMotion,
    setReducedMotion,
    trapFocus,
    releaseFocusTrap,
    focusTrapped,
  }), [
    focusedElement,
    focusHistory,
    setFocus,
    restoreFocus,
    keyboardNavigationEnabled,
    setKeyboardNavigationEnabled,
    announcements,
    announce,
    highContrastMode,
    setHighContrastMode,
    reducedMotion,
    setReducedMotion,
    trapFocus,
    releaseFocusTrap,
    focusTrapped,
  ]);

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
      
      {/* Skip Links */}
      <div className="sr-only">
        <a
          href="#main-content"
          className="absolute top-0 left-0 bg-daw-accent-primary text-white p-2 transform -translate-y-full focus:translate-y-0 transition-transform"
        >
          Skip to main content
        </a>
        <a
          href="#navigation"
          className="absolute top-0 left-0 bg-daw-accent-primary text-white p-2 transform -translate-y-full focus:translate-y-0 transition-transform"
        >
          Skip to navigation
        </a>
      </div>
      
      {/* Keyboard Navigation Indicator */}
      {keyboardNavigationEnabled && (
        <style>
          {`
            .focus-visible:focus {
              outline: 2px solid var(--daw-accent-primary) !important;
              outline-offset: 2px !important;
            }
          `}
        </style>
      )}
      
      {/* High Contrast Styles */}
      {highContrastMode && (
        <style>
          {`
            .high-contrast {
              --daw-bg-primary: #000000;
              --daw-bg-secondary: #1a1a1a;
              --daw-surface-primary: #000000;
              --daw-surface-secondary: #333333;
              --daw-surface-tertiary: #666666;
              --daw-text-primary: #ffffff;
              --daw-text-secondary: #ffffff;
              --daw-accent-primary: #ffff00;
              --daw-accent-secondary: #00ffff;
            }
            
            .high-contrast * {
              border-color: #ffffff !important;
            }
            
            .high-contrast button:hover {
              background-color: #ffffff !important;
              color: #000000 !important;
            }
          `}
        </style>
      )}
      
      {/* Reduced Motion Styles */}
      {reducedMotion && (
        <style>
          {`
            .reduce-motion *,
            .reduce-motion *::before,
            .reduce-motion *::after {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          `}
        </style>
      )}
    </AccessibilityContext.Provider>
  );
};

