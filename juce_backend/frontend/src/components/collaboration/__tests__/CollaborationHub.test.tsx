import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CollaborationHub } from '../CollaborationHub';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useIsMobile } from '@/hooks/useIsMobile';

// Mock the hooks
vi.mock('@/stores/collaborationStore');
vi.mock('@/hooks/useIsMobile');

// Mock collaboration components
vi.mock('../UserPanel', () => ({
  UserPanel: ({ className }: { className?: string }) => (
    <div data-testid="user-panel" className={className}>User Panel</div>
  ),
}));

vi.mock('../ChatPanel', () => ({
  default: ({ className }: { className?: string }) => (
    <div data-testid="chat-panel" className={className}>Chat Panel</div>
  ),
}));

vi.mock('../ActivityFeed', () => ({
  default: ({ className }: { className?: string }) => (
    <div data-testid="activity-feed" className={className}>Activity Feed</div>
  ),
}));

vi.mock('../SessionRecorder', () => ({
  default: ({ className }: { className?: string }) => (
    <div data-testid="session-recorder" className={className}>Session Recorder</div>
  ),
}));

vi.mock('../PerformanceMonitor', () => ({
  default: ({ className }: { className?: string }) => (
    <div data-testid="performance-monitor" className={className}>Performance Monitor</div>
  ),
}));

vi.mock('../ConflictResolution', () => ({
  default: ({ className }: { className?: string }) => (
    <div data-testid="conflict-resolution" className={className}>Conflict Resolution</div>
  ),
}));

vi.mock('../SessionSecurity', () => ({
  default: ({ className }: { className?: string }) => (
    <div data-testid="session-security" className={className}>Session Security</div>
  ),
}));

const mockCollaborationStore = {
  currentSession: {
    id: 'test-session-1',
    name: 'Test Session',
    ownerId: 'user-1',
    createdAt: Date.now(),
    isActive: true,
    users: [],
    settings: {
      maxUsers: 10,
      requireApproval: false,
      allowAnonymous: false,
      autoSave: true,
      chatEnabled: true,
    },
  },
  showUsers: true,
  showChat: true,
  showActivity: true,
};

describe('CollaborationHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useCollaborationStore as any).mockReturnValue(mockCollaborationStore);
    (useIsMobile as any).mockReturnValue(false);
  });

  it('renders correctly when session is active', () => {
    render(<CollaborationHub />);

    expect(screen.getByText('Collaboration')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
  });

  it('does not render when no session is active', () => {
    (useCollaborationStore as any).mockReturnValue({
      ...mockCollaborationStore,
      currentSession: null,
    });

    const { container } = render(<CollaborationHub />);
    expect(container.firstChild).toBeNull();
  });

  it('shows correct active tab content', () => {
    render(<CollaborationHub />);

    // Users tab should be active by default
    expect(screen.getByTestId('user-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-panel')).not.toBeInTheDocument();
  });

  it('switches tabs correctly', async () => {
    render(<CollaborationHub />);

    // Click on Chat tab
    fireEvent.click(screen.getByText('Chat'));

    await waitFor(() => {
      expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('user-panel')).not.toBeInTheDocument();
    });
  });

  it('renders mobile layout correctly', () => {
    (useIsMobile as any).mockReturnValue(true);

    render(<CollaborationHub />);

    expect(screen.getByText('Collaboration')).toBeInTheDocument();
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('expands and collapses correctly', () => {
    render(<CollaborationHub />);

    const expandButton = screen.getByRole('button', { name: /minimize/i });
    expect(screen.getByText('Users')).toBeInTheDocument();

    // Collapse
    fireEvent.click(expandButton);
    expect(screen.queryByText('Users')).not.toBeInTheDocument();

    // Expand again
    fireEvent.click(expandButton);
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('shows all available tabs', () => {
    render(<CollaborationHub />);

    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Activity')).toBeInTheDocument();
    expect(screen.getByText('Record')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('Conflicts')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    const { container } = render(<CollaborationHub className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});