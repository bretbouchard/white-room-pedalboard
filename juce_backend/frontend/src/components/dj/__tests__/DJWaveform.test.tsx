// @vitest-environment jsdom
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the utils module so `cn` is available in the test environment. This
// must run before importing the component under test.
vi.mock('@/utils', () => ({
  cn: (...inputs: unknown[]) => (inputs as unknown[]).flat().filter(Boolean).join(' '),
}));

import DJWaveform from '../DJWaveform';
import { makeCanvasMock } from '../../../../test/utils/canvasMock';

describe('DJWaveform', () => {
  let canvasInstaller: { install: () => void; uninstall: () => void } | null = null;
  beforeEach(() => {
    vi.clearAllMocks();
    const api = makeCanvasMock();
    api.install();
    canvasInstaller = api;
  });

  afterEach(() => {
    cleanup();
  if (canvasInstaller) canvasInstaller.uninstall();
    vi.clearAllMocks();
    canvasInstaller = null;
  });
  const mockWaveformData = {
    peaks: new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5]),
    length: 5,
    sampleRate: 44100,
  };

  const mockBeatInfo = {
    bpm: 120,
    confidence: 0.9,
    beatPositions: [0, 0.5, 1.0, 1.5, 2.0],
    downbeats: [0, 2.0],
    timeSignature: [4, 4] as [number, number],
  };

  const mockCuePoints = [
    {
      id: 'cue1',
      time: 1.0,
      label: 'Cue 1',
      color: '#ff0000',
      hotCueNumber: 1,
    },
  ];

  const defaultProps = {
    waveformData: mockWaveformData,
    beatInfo: mockBeatInfo,
    cuePoints: mockCuePoints,
    activeLoop: null,
    currentPosition: 0.5,
    duration: 180,
    onSeek: vi.fn(),
    onAddCuePoint: vi.fn(),
    onSetLoop: vi.fn(),
  };

  it('renders waveform component', () => {
    render(<DJWaveform {...defaultProps} />);

    expect(screen.getAllByText('BPM: 120.0').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Confidence: 90%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Key: 4/4').length).toBeGreaterThan(0);
  });

  it('shows no waveform message when data is null', () => {
    render(<DJWaveform {...defaultProps} waveformData={null} />);

    expect(screen.getAllByText('No waveform data').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Load a track to see waveform').length).toBeGreaterThan(0);
  });

  it('displays current position', () => {
    render(<DJWaveform {...defaultProps} currentPosition={65.5} />);
    
    expect(screen.getAllByText('1:05.5').length).toBeGreaterThan(0);
  });

  it('shows zoom level', () => {
    render(<DJWaveform {...defaultProps} zoomLevel={2.5} />);

    expect(screen.getAllByText('Zoom: 2.5x').length).toBeGreaterThan(0);
  });

  it('displays control instructions', () => {
    render(<DJWaveform {...defaultProps} />);

    expect(screen.getAllByText('Click to seek • Alt+Click to add cue point • Shift+Drag to set loop').length).toBeGreaterThan(0);
  });

  it('shows legend when features are enabled', () => {
    render(
      <DJWaveform
        {...defaultProps}
        showBeatGrid={true}
        showCuePoints={true}
        showLoop={true}
      />
    );

    expect(screen.getAllByText('Playhead').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Beats').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cue Points').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Loop').length).toBeGreaterThan(0);
  });
});