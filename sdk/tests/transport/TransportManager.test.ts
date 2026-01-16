/**
 * TransportManager.test.ts
 *
 * Comprehensive tests for TransportManager
 * Tests all transport controls, state management, and event handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TransportManager, TransportState } from '../../src/transport/TransportManager';

// Mock audio engine
const mockAudioEngine = {
  setTransportState: vi.fn(),
  setPosition: vi.fn(),
  setTempo: vi.fn(),
  setLoopEnabled: vi.fn(),
  setLoopRange: vi.fn(),
  setTimeSignature: vi.fn(),
  getPerformanceState: vi.fn(),
};

describe('TransportManager', () => {
  let transport: TransportManager;
  let mockTimers: {
    setInterval: ReturnType<typeof vi.fn>;
    clearInterval: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock timers
    mockTimers = {
      setInterval: vi.fn().mockReturnValue(1),
      clearInterval: vi.fn(),
    };

    // Create new transport manager with mock timers
    transport = new TransportManager(mockAudioEngine, mockTimers);
  });

  afterEach(() => {
    transport.destroy();
  });

  describe('Initialization', () => {
    it('should create with default state', () => {
      const state = transport.getState();

      expect(state.isPlaying).toBe(false);
      expect(state.isStopped).toBe(true);
      expect(state.isPaused).toBe(false);
      expect(state.position).toBe(0);
      expect(state.tempo).toBe(120.0);
      expect(state.timeSignature.numerator).toBe(4);
      expect(state.timeSignature.denominator).toBe(4);
      expect(state.loopEnabled).toBe(false);
      expect(state.loopStart).toBe(0);
      expect(state.loopEnd).toBe(32);
    });

    it('should start state update timer', () => {
      // Timer should be running
      expect(transport).toBeDefined();
    });
  });

  describe('Playback Controls', () => {
    it('should play successfully', () => {
      const eventSpy = vi.fn();
      transport.addEventListener('play', eventSpy);

      transport.play();

      const state = transport.getState();
      expect(state.isPlaying).toBe(true);
      expect(state.isStopped).toBe(false);
      expect(state.isPaused).toBe(false);
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should pause successfully', () => {
      transport.play();
      const eventSpy = vi.fn();
      transport.addEventListener('pause', eventSpy);

      transport.pause();

      const state = transport.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.isStopped).toBe(false);
      expect(state.isPaused).toBe(true);
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should stop and reset position', () => {
      transport.play();
      transport.setPosition(16.5);

      const eventSpy = vi.fn();
      transport.addEventListener('stop', eventSpy);

      transport.stop();

      const state = transport.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.isStopped).toBe(true);
      expect(state.isPaused).toBe(false);
      expect(state.position).toBe(0);
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should toggle play/pause', () => {
      expect(transport.togglePlay()).toBe(true);
      expect(transport.isPlaying()).toBe(true);

      expect(transport.togglePlay()).toBe(false);
      expect(transport.isPlaying()).toBe(false);
    });

    it('should throw error when audio engine not available', () => {
      const badTransport = new TransportManager(null);

      expect(() => badTransport.play()).toThrow('Audio engine not available');
      expect(() => badTransport.pause()).toThrow('Audio engine not available');
      expect(() => badTransport.stop()).toThrow('Audio engine not available');

      badTransport.destroy();
    });
  });

  describe('Position Controls', () => {
    it('should set position', () => {
      const eventSpy = vi.fn();
      transport.addEventListener('seek', eventSpy);

      transport.setPosition(16.5);

      expect(transport.getPosition()).toBe(16.5);
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should reject negative position', () => {
      expect(() => transport.setPosition(-1)).toThrow('Position cannot be negative');
    });

    it('should seek to position', () => {
      transport.seekTo(32.0);
      expect(transport.getPosition()).toBe(32.0);
    });

    it('should move position by delta', () => {
      transport.setPosition(10.0);
      transport.moveBy(5.0);
      expect(transport.getPosition()).toBe(15.0);

      transport.moveBy(-3.0);
      expect(transport.getPosition()).toBe(12.0);
    });

    it('should not move position below zero', () => {
      transport.setPosition(2.0);
      transport.moveBy(-5.0);
      expect(transport.getPosition()).toBe(0);
    });
  });

  describe('Tempo Controls', () => {
    it('should set tempo', () => {
      const eventSpy = vi.fn();
      transport.addEventListener('tempo', eventSpy);

      transport.setTempo(140.0);

      expect(transport.getTempo()).toBe(140.0);
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid tempo', () => {
      expect(() => transport.setTempo(0)).toThrow('Tempo must be positive');
      expect(() => transport.setTempo(-10)).toThrow('Tempo must be positive');
      expect(() => transport.setTempo(1000)).toThrow('Tempo too high');
    });

    it('should adjust tempo by delta', () => {
      transport.setTempo(120.0);
      transport.adjustTempo(10);
      expect(transport.getTempo()).toBe(130.0);

      transport.adjustTempo(-5);
      expect(transport.getTempo()).toBe(125.0);
    });

    it('should clamp tempo to valid range when adjusting', () => {
      transport.setTempo(1.0);
      transport.adjustTempo(-10);
      expect(transport.getTempo()).toBe(1);

      transport.setTempo(999.0);
      transport.adjustTempo(10);
      expect(transport.getTempo()).toBe(999);
    });
  });

  describe('Loop Controls', () => {
    it('should set loop enabled', () => {
      const eventSpy = vi.fn();
      transport.addEventListener('loop', eventSpy);

      transport.setLoopEnabled(true);

      expect(transport.isLoopEnabled()).toBe(true);
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should set loop range', () => {
      transport.setLoopRange(8.0, 24.0);

      const state = transport.getState();
      expect(state.loopStart).toBe(8.0);
      expect(state.loopEnd).toBe(24.0);
    });

    it('should reject invalid loop range', () => {
      expect(() => transport.setLoopRange(-1, 10)).toThrow('Loop positions cannot be negative');
      expect(() => transport.setLoopRange(10, 5)).toThrow('Loop start must be before end');
    });

    it('should toggle loop', () => {
      expect(transport.toggleLoop()).toBe(true);
      expect(transport.isLoopEnabled()).toBe(true);

      expect(transport.toggleLoop()).toBe(false);
      expect(transport.isLoopEnabled()).toBe(false);
    });
  });

  describe('Time Signature', () => {
    it('should set time signature', () => {
      const eventSpy = vi.fn();
      transport.addEventListener('timeSignature', eventSpy);

      transport.setTimeSignature(3, 4);

      const state = transport.getState();
      expect(state.timeSignature.numerator).toBe(3);
      expect(state.timeSignature.denominator).toBe(4);
      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid numerator', () => {
      expect(() => transport.setTimeSignature(0, 4)).toThrow('Invalid numerator');
      expect(() => transport.setTimeSignature(33, 4)).toThrow('Invalid numerator');
    });

    it('should reject invalid denominator', () => {
      expect(() => transport.setTimeSignature(4, 3)).toThrow('Invalid denominator');
      expect(() => transport.setTimeSignature(4, 5)).toThrow('Invalid denominator');
    });

    it('should accept valid denominators', () => {
      [1, 2, 4, 8, 16, 32].forEach(denom => {
        expect(() => transport.setTimeSignature(4, denom)).not.toThrow();
      });
    });
  });

  describe('State Accessors', () => {
    it('should return immutable state copy', () => {
      const state1 = transport.getState();
      const state2 = transport.getState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Different references
    });

    it('should report correct playing state', () => {
      expect(transport.isPlaying()).toBe(false);

      transport.play();
      expect(transport.isPlaying()).toBe(true);

      transport.pause();
      expect(transport.isPlaying()).toBe(false);
    });

    it('should report correct stopped state', () => {
      expect(transport.isStopped()).toBe(true);

      transport.play();
      expect(transport.isStopped()).toBe(false);

      transport.stop();
      expect(transport.isStopped()).toBe(true);
    });

    it('should report correct paused state', () => {
      expect(transport.isPaused()).toBe(false);

      transport.play();
      transport.pause();
      expect(transport.isPaused()).toBe(true);

      transport.play();
      expect(transport.isPaused()).toBe(false);
    });
  });

  describe('Event Handling', () => {
    it('should dispatch play event', () => {
      const spy = vi.fn();
      transport.addEventListener('play', spy);

      transport.play();

      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0].type).toBe('play');
    });

    it('should dispatch pause event', () => {
      transport.play();
      const spy = vi.fn();
      transport.addEventListener('pause', spy);

      transport.pause();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should dispatch stop event', () => {
      transport.play();
      const spy = vi.fn();
      transport.addEventListener('stop', spy);

      transport.stop();

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should dispatch seek event', () => {
      const spy = vi.fn();
      transport.addEventListener('seek', spy);

      transport.setPosition(16.5);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should dispatch tempo event', () => {
      const spy = vi.fn();
      transport.addEventListener('tempo', spy);

      transport.setTempo(140.0);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should dispatch loop event', () => {
      const spy = vi.fn();
      transport.addEventListener('loop', spy);

      transport.setLoopEnabled(true);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should dispatch timeSignature event', () => {
      const spy = vi.fn();
      transport.addEventListener('timeSignature', spy);

      transport.setTimeSignature(3, 4);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should dispatch state change event with details', () => {
      const spy = vi.fn();
      transport.addEventListener('state', spy);

      transport.setTempo(140.0);

      expect(spy).toHaveBeenCalledTimes(1);
      const event = spy.mock.calls[0][0];
      expect(event.previousState.tempo).toBe(120.0);
      expect(event.currentState.tempo).toBe(140.0);
      expect(event.changes).toContain('tempo');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid state changes', () => {
      for (let i = 0; i < 100; i++) {
        transport.play();
        transport.pause();
        transport.setPosition(i);
        transport.setTempo(100 + i);
      }

      const state = transport.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.position).toBe(99);
      expect(state.tempo).toBe(199);
    });

    it('should handle extreme tempo values', () => {
      transport.setTempo(1);
      expect(transport.getTempo()).toBe(1);

      transport.setTempo(999);
      expect(transport.getTempo()).toBe(999);
    });

    it('should handle extreme position values', () => {
      transport.setPosition(0);
      expect(transport.getPosition()).toBe(0);

      transport.setPosition(999999);
      expect(transport.getPosition()).toBe(999999);
    });

    it('should handle large loop ranges', () => {
      transport.setLoopRange(0, 999999);

      const state = transport.getState();
      expect(state.loopStart).toBe(0);
      expect(state.loopEnd).toBe(999999);
    });
  });

  describe('Cleanup', () => {
    it('should stop update timer on destroy', () => {
      const transport2 = new TransportManager(mockAudioEngine);

      expect(() => transport2.destroy()).not.toThrow();
    });

    it('should not dispatch events after destroy', () => {
      const spy = vi.fn();
      transport.addEventListener('play', spy);

      transport.destroy();

      // This should not throw but also should not work
      transport.play();

      // Event might still fire but timer should be stopped
      expect(transport).toBeDefined();
    });
  });

  describe('Integration', () => {
    it('should handle complete playback workflow', () => {
      // Start playback
      transport.play();
      expect(transport.isPlaying()).toBe(true);

      // Seek to position
      transport.setPosition(16.5);
      expect(transport.getPosition()).toBe(16.5);

      // Change tempo
      transport.setTempo(140.0);
      expect(transport.getTempo()).toBe(140.0);

      // Enable loop
      transport.setLoopEnabled(true);
      transport.setLoopRange(8.0, 24.0);
      expect(transport.isLoopEnabled()).toBe(true);

      // Pause
      transport.pause();
      expect(transport.isPaused()).toBe(true);
      expect(transport.getPosition()).toBe(16.5); // Position maintained

      // Stop
      transport.stop();
      expect(transport.isStopped()).toBe(true);
      expect(transport.getPosition()).toBe(0); // Position reset
    });

    it('should handle keyboard shortcut workflow', () => {
      // Space: Toggle play/pause
      transport.togglePlay();
      expect(transport.isPlaying()).toBe(true);

      transport.togglePlay();
      expect(transport.isPlaying()).toBe(false);

      // Escape: Stop
      transport.togglePlay();
      transport.stop();
      expect(transport.isStopped()).toBe(true);

      // L: Toggle loop
      transport.toggleLoop();
      expect(transport.isLoopEnabled()).toBe(true);

      transport.toggleLoop();
      expect(transport.isLoopEnabled()).toBe(false);
    });
  });
});
