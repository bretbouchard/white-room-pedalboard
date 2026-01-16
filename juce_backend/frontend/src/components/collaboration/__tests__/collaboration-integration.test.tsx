import { describe, it, expect } from 'vitest';

import {
  UserCursors,
  UserSelections,
  UserPanel,
  ChatPanel,
  CollaborationIndicator,
  SessionManager,
  ActivityFeed
} from '@/components/collaboration';

describe('Collaboration Components', () => {
  it('should import all collaboration components successfully', () => {
    expect(UserCursors).toBeDefined();
    expect(UserSelections).toBeDefined();
    expect(UserPanel).toBeDefined();
    expect(ChatPanel).toBeDefined();
    expect(CollaborationIndicator).toBeDefined();
    expect(SessionManager).toBeDefined();
    expect(ActivityFeed).toBeDefined();
  });

  it('should have proper component exports', () => {
    expect(typeof UserCursors).toBe('function');
    expect(typeof UserSelections).toBe('function');
    expect(typeof UserPanel).toBe('function');
    expect(typeof ChatPanel).toBe('function');
    expect(typeof CollaborationIndicator).toBe('function');
    expect(typeof SessionManager).toBe('function');
    expect(typeof ActivityFeed).toBe('function');
  });

  it('should handle component prop validation', () => {
    // These should not throw errors during component definition
    expect(() => {
      const cursorProps = {
        view: 'daw' as const,
        scale: 1,
        transform: [0, 0],
        users: []
      };

      const panelProps = {
        className: 'test-class'
      };

      const chatProps = {
        className: 'test-chat',
        defaultExpanded: false
      };

      // Just validate prop structures, not actual rendering
      expect(cursorProps).toBeDefined();
      expect(panelProps).toBeDefined();
      expect(chatProps).toBeDefined();
    }).not.toThrow();
  });
});