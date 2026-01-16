import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import Crossfader from '../Crossfader';

// Mock the DJ store
vi.mock('@/stores/djStore', () => ({
  useDJStore: vi.fn(() => ({
    crossfader: {
      position: 0,
      curve: 'logarithmic',
      reverse: false,
    },
    setCrossfaderPosition: vi.fn(),
    setCrossfaderCurve: vi.fn(),
    toggleCrossfaderReverse: vi.fn(),
  })),
}));

// Simple component test for the crossfader
describe('Crossfader', () => {
  it('renders crossfader component', () => {
    render(<Crossfader />);
    
    expect(screen.getAllByText('CROSSFADER')[0]).toBeInTheDocument();
    expect(screen.getAllByText('A')[0]).toBeInTheDocument();
    expect(screen.getAllByText('B')[0]).toBeInTheDocument();
  });

  it('shows curve control when enabled', () => {
    render(<Crossfader showCurveControl={true} />);
    
    expect(screen.getAllByText('Curve')[0]).toBeInTheDocument();
  });

  it('shows reverse control when enabled', () => {
    render(<Crossfader showReverseControl={true} />);
    
    expect(screen.getAllByText('Reverse')[0]).toBeInTheDocument();
  });
});