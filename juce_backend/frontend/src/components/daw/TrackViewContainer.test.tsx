import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import TrackViewContainer, { DEFAULT_TRACK_HEIGHT } from './TrackViewContainer';
import { useAudioStore } from '@/stores/audioStore';

type LastTracks = Array<{
  id: string;
  height: number;
  audioRegions: unknown[];
  midiRegions: unknown[];
}>;

let lastTracks: LastTracks | undefined;

vi.mock('./TrackView', () => {
  const MockTrackView = ({ tracks }: { tracks: LastTracks }) => {
    lastTracks = tracks;
    return null;
  };

  return {
    __esModule: true,
    default: MockTrackView,
  };
});

vi.mock('./SelectionTools', () => ({
  __esModule: true,
  default: () => null,
}));

describe('TrackViewContainer', () => {
  beforeEach(() => {
    lastTracks = undefined;
    const state = useAudioStore.getState();
    useAudioStore.setState({
      mixer: {
        ...state.mixer,
        tracks: {
          bad: {
            id: 'bad',
            name: 'Legacy Track',
            type: 'audio',
            muted: false,
            solo: false,
            volume: 0.5,
            pan: 0,
            color: '#fff',
            plugins: [],
            armed: false,
            height: undefined as unknown as number,
            audioRegions: undefined as unknown as [],
            midiRegions: undefined as unknown as [],
            eq: { highGain: 0, midGain: 0, lowGain: 0 },
            compression: { threshold: -18, ratio: 3, attack: 20, release: 100 },
            reverb: { sendLevel: 0, decayTime: 1.5 },
          },
        },
        selectedTrackId: 'bad',
      },
    });
  });

  it('normalises legacy track data before rendering', () => {
    render(<TrackViewContainer />);

    expect(lastTracks).toBeDefined();
    expect(lastTracks?.[0].height).toBe(DEFAULT_TRACK_HEIGHT);
    expect(lastTracks?.[0].audioRegions).toEqual([]);
    expect(lastTracks?.[0].midiRegions).toEqual([]);
  });
});
