import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import DJEffects from '../DJEffects';

// Mock the DJ store
vi.mock('@/stores/djStore', () => ({
  useDJStore: vi.fn((selector) => {
    const mockState = {
      deckA: {
        id: 'A',
        effects: [],
      },
      deckB: {
        id: 'B',
        effects: [],
      },
      addEffect: vi.fn(),
      removeEffect: vi.fn(),
      toggleEffect: vi.fn(),
      setEffectParameter: vi.fn(),
      setEffectWet: vi.fn(),
    };
    
    if (typeof selector === 'function') {
      return selector(mockState);
    }
    return mockState;
  }),
}));

describe('DJEffects', () => {
  it('renders DJ effects component', () => {
    render(<DJEffects deckId="A" />);
    
    expect(screen.getAllByText('Deck A Effects')[0]).toBeInTheDocument();
    expect(screen.getAllByText('0/4 slots')[0]).toBeInTheDocument();
  });

  it('shows empty effect slots', () => {
    render(<DJEffects deckId="A" maxEffects={2} />);
    
    expect(screen.getAllByText('Empty Slot 1')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Empty Slot 2')[0]).toBeInTheDocument();
  });

  it('shows performance pads when enabled', () => {
    render(<DJEffects deckId="A" showPerformancePads={true} />);
    
    expect(screen.getAllByText('Performance Pads')[0]).toBeInTheDocument();
    expect(screen.getAllByText('FILTER')[0]).toBeInTheDocument();
    expect(screen.getAllByText('ECHO')[0]).toBeInTheDocument();
    expect(screen.getAllByText('FLANGER')[0]).toBeInTheDocument();
    expect(screen.getAllByText('REVERB')[0]).toBeInTheDocument();
  });

  it('shows quick action buttons', () => {
    render(<DJEffects deckId="A" />);
    
    expect(screen.getAllByText('Toggle All')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Clear All')[0]).toBeInTheDocument();
    expect(screen.getAllByText('0 active')[0]).toBeInTheDocument();
  });

  it('shows effect selection dropdown', () => {
    render(<DJEffects deckId="A" />);
    
    const dropdowns = screen.getAllByText('Add Effect...');
    expect(dropdowns.length).toBeGreaterThan(0);
  });
});