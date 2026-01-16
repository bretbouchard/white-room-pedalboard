import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioStore } from './audioStore';

describe('audioStore track defaults', () => {
  beforeEach(() => {
    const state = useAudioStore.getState();
    useAudioStore.setState({
      mixer: {
        ...state.mixer,
        tracks: {},
        selectedTrackId: null,
        soloedTracks: [],
      },
    });
    useAudioStore.persist?.clearStorage?.();
  });

  it('assigns default height when adding a track', () => {
    const trackId = useAudioStore.getState().addTrack('audio');
    const track = useAudioStore.getState().mixer.tracks[trackId];
    expect(track.height).toBe(80);
  });
});
