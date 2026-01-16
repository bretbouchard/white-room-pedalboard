/**
 * MixerAutomation Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MixerAutomation, AutomationPoint, AutomationCurve } from '../../src/effects/MixerAutomation'

describe('MixerAutomation', () => {
  let automation: MixerAutomation

  beforeEach(() => {
    automation = new MixerAutomation()
  })

  describe('Initialization', () => {
    it('should create empty automation', () => {
      expect(automation.getAllTracks()).toHaveLength(0)
      expect(automation.getIsRecording()).toBe(false)
      expect(automation.getIsPlaying()).toBe(false)
    })
  })

  describe('Recording', () => {
    it('should start recording', () => {
      automation.startRecording()
      expect(automation.getIsRecording()).toBe(true)
    })

    it('should stop recording', () => {
      automation.startRecording()
      automation.stopRecording()
      expect(automation.getIsRecording()).toBe(false)
    })

    it('should record automation points', () => {
      automation.armTrack('channel_1.volume')
      automation.startRecording()

      automation.recordPoint('channel_1.volume', 0.5)
      automation.recordPoint('channel_1.volume', 0.7)

      automation.stopRecording()

      const curve = automation.getCurve('channel_1.volume')
      expect(curve?.points).toHaveLength(2)
      expect(curve?.points[0].value).toBe(0.5)
      expect(curve?.points[1].value).toBe(0.7)
    })

    it('should not record to unarmed tracks', () => {
      automation.startRecording()

      automation.recordPoint('channel_1.volume', 0.5)

      automation.stopRecording()

      const curve = automation.getCurve('channel_1.volume')
      expect(curve).toBeUndefined()
    })

    it('should arm track for recording', () => {
      automation.armTrack('channel_1.volume')

      expect(automation.getArmedTracks()).toContain('channel_1.volume')
    })

    it('should disarm track', () => {
      automation.armTrack('channel_1.volume')
      automation.disarmTrack('channel_1.volume')

      expect(automation.getArmedTracks()).not.toContain('channel_1.volume')
    })
  })

  describe('Playback', () => {
    beforeEach(() => {
      automation.setCurve('channel_1.volume', {
        parameterId: 'channel_1.volume',
        points: [
          { time: 0.0, value: 0.0, curve: 'linear' },
          { time: 1.0, value: 1.0, curve: 'linear' }
        ]
      })
    })

    it('should start playback', () => {
      automation.startPlayback()
      expect(automation.getIsPlaying()).toBe(true)
    })

    it('should stop playback', () => {
      automation.startPlayback()
      automation.stopPlayback()
      expect(automation.getIsPlaying()).toBe(false)
    })

    it('should return value at time during playback', () => {
      automation.startPlayback()

      // Use the same time reference as the playback start
      const now = Date.now() / 1000
      const value = automation.getValueAtTime('channel_1.volume', now + 0.5)

      // Should interpolate between 0.0 at time 0.0 and 1.0 at time 1.0
      expect(value).toBeGreaterThanOrEqual(0.0)
      expect(value).toBeLessThanOrEqual(1.0)
    })

    it('should return null when not playing', () => {
      const value = automation.getValueAtTime('channel_1.volume', 0.5)
      expect(value).toBeNull()
    })

    it('should return null for non-existent track', () => {
      automation.startPlayback()
      const value = automation.getValueAtTime('unknown', 0.5)
      expect(value).toBeNull()
    })

    it('should interpolate between points', () => {
      automation.startPlayback()

      const now = Date.now() / 1000
      const value0 = automation.getValueAtTime('channel_1.volume', now + 0.0)
      const value05 = automation.getValueAtTime('channel_1.volume', now + 0.5)
      const value1 = automation.getValueAtTime('channel_1.volume', now + 1.0)

      expect(value0).toBeCloseTo(0.0, 5)
      expect(value05).toBeCloseTo(0.5, 5)
      expect(value1).toBeCloseTo(1.0, 5)
    })

    it('should clamp to curve boundaries', () => {
      automation.startPlayback()

      const now = Date.now() / 1000
      const valueBefore = automation.getValueAtTime('channel_1.volume', now - 0.5)
      const valueAfter = automation.getValueAtTime('channel_1.volume', now + 1.5)

      expect(valueBefore).toBe(0.0)
      expect(valueAfter).toBe(1.0)
    })
  })

  describe('Track Management', () => {
    it('should get track by parameter ID', () => {
      automation.setCurve('channel_1.volume', {
        parameterId: 'channel_1.volume',
        points: []
      })

      const track = automation.getTrack('channel_1.volume')

      expect(track).toBeDefined()
      expect(track?.parameterId).toBe('channel_1.volume')
    })

    it('should get all tracks', () => {
      automation.setCurve('channel_1.volume', {
        parameterId: 'channel_1.volume',
        points: []
      })

      automation.setCurve('channel_1.pan', {
        parameterId: 'channel_1.pan',
        points: []
      })

      const tracks = automation.getAllTracks()

      expect(tracks).toHaveLength(2)
    })

    it('should remove track', () => {
      automation.setCurve('channel_1.volume', {
        parameterId: 'channel_1.volume',
        points: []
      })

      automation.removeTrack('channel_1.volume')

      expect(automation.getTrack('channel_1.volume')).toBeUndefined()
    })

    it('should clear all tracks', () => {
      automation.setCurve('channel_1.volume', {
        parameterId: 'channel_1.volume',
        points: []
      })

      automation.clearAll()

      expect(automation.getAllTracks()).toHaveLength(0)
    })
  })

  describe('Editing', () => {
    it('should add point to curve', () => {
      automation.addPoint('channel_1.volume', {
        time: 0.0,
        value: 0.5,
        curve: 'linear'
      })

      const curve = automation.getCurve('channel_1.volume')
      expect(curve?.points).toHaveLength(1)
    })

    it('should remove point from curve', () => {
      automation.addPoint('channel_1.volume', {
        time: 0.0,
        value: 0.5,
        curve: 'linear'
      })

      automation.removePoint('channel_1.volume', 0.0)

      const curve = automation.getCurve('channel_1.volume')
      expect(curve?.points).toHaveLength(0)
    })

    it('should update point in curve', () => {
      automation.addPoint('channel_1.volume', {
        time: 0.0,
        value: 0.5,
        curve: 'linear'
      })

      automation.updatePoint('channel_1.volume', 0.0, 0.8)

      const curve = automation.getCurve('channel_1.volume')
      expect(curve?.points[0].value).toBe(0.8)
    })
  })

  describe('Interpolation', () => {
    it('should interpolate linearly', () => {
      automation.setCurve('test', {
        parameterId: 'test',
        points: [
          { time: 0.0, value: 0.0, curve: 'linear' },
          { time: 1.0, value: 1.0, curve: 'linear' }
        ]
      })

      automation.startPlayback()

      const now = Date.now() / 1000
      const value = automation.getValueAtTime('test', now + 0.5)
      expect(value).toBeCloseTo(0.5, 5)
    })

    it('should interpolate exponentially', () => {
      automation.setCurve('test', {
        parameterId: 'test',
        points: [
          { time: 0.0, value: 1.0, curve: 'exponential' },
          { time: 1.0, value: 10.0, curve: 'exponential' }
        ]
      })

      automation.startPlayback()

      const now = Date.now() / 1000
      const value = automation.getValueAtTime('test', now + 0.5)
      expect(value).toBeCloseTo(Math.sqrt(10), 1) // sqrt(10) ≈ 3.16
    })

    it('should handle single point curve', () => {
      automation.setCurve('test', {
        parameterId: 'test',
        points: [
          { time: 0.0, value: 0.5, curve: 'linear' }
        ]
      })

      automation.startPlayback()

      const now = Date.now() / 1000
      const value = automation.getValueAtTime('test', now + 100.0)
      expect(value).toBe(0.5)
    })
  })

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      automation.setCurve('channel_1.volume', {
        parameterId: 'channel_1.volume',
        points: [
          { time: 0.0, value: 0.0, curve: 'linear' },
          { time: 1.0, value: 1.0, curve: 'linear' }
        ]
      })

      const json = automation.toJSON()

      expect(json).toHaveProperty('tracks')
      expect(json).toHaveProperty('isRecording')
      expect(json).toHaveProperty('isPlaying')
    })

    it('should deserialize from JSON', () => {
      automation.setCurve('channel_1.volume', {
        parameterId: 'channel_1.volume',
        points: [
          { time: 0.0, value: 0.0, curve: 'linear' },
          { time: 1.0, value: 1.0, curve: 'linear' }
        ]
      })

      const json = automation.toJSON()
      const restored = MixerAutomation.fromJSON(json)

      const curve = restored.getCurve('channel_1.volume')
      expect(curve?.points).toHaveLength(2)
    })
  })
})
