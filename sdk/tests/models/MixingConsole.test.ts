/**
 * MixingConsole Model Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MixingConsole, ChannelStrip } from '../../src/models/MixingConsole'

describe('MixingConsole', () => {
  let console: MixingConsole

  beforeEach(() => {
    console = new MixingConsole()
  })

  describe('Initialization', () => {
    it('should create empty console with master bus', () => {
      expect(console.getAllChannels()).toHaveLength(1)
      expect(console.getMasterBus()).toBeDefined()
      expect(console.getMasterBus()?.type).toBe('master')
    })

    it('should initialize with empty channels', () => {
      expect(console.getMixChannels()).toHaveLength(0)
    })
  })

  describe('Channel Management', () => {
    it('should add channel to console', () => {
      const channel: ChannelStrip = {
        id: '1',
        name: 'Kick',
        type: 'audio',
        volume: 0.8,
        pan: 0.0,
        isMuted: false,
        isSolo: false,
        levelL: -60,
        levelR: -60,
        peakL: -60,
        peakR: -60,
        inserts: [],
        sends: [],
        outputBus: 'master'
      }

      console.addChannel(channel)

      expect(console.getMixChannels()).toHaveLength(1)
      expect(console.getChannel('1')).toEqual(channel)
    })

    it('should remove channel from console', () => {
      const channel: ChannelStrip = {
        id: '1',
        name: 'Kick',
        type: 'audio',
        volume: 0.8,
        pan: 0.0,
        isMuted: false,
        isSolo: false,
        levelL: -60,
        levelR: -60,
        peakL: -60,
        peakR: -60,
        inserts: [],
        sends: [],
        outputBus: 'master'
      }

      console.addChannel(channel)
      console.removeChannel('1')

      expect(console.getMixChannels()).toHaveLength(0)
      expect(console.getChannel('1')).toBeUndefined()
    })

    it('should return all channels including master', () => {
      const channel1: ChannelStrip = {
        id: '1',
        name: 'Kick',
        type: 'audio',
        volume: 0.8,
        pan: 0.0,
        isMuted: false,
        isSolo: false,
        levelL: -60,
        levelR: -60,
        peakL: -60,
        peakR: -60,
        inserts: [],
        sends: [],
        outputBus: 'master'
      }

      console.addChannel(channel1)

      const allChannels = console.getAllChannels()
      expect(allChannels).toHaveLength(2) // 1 mix + 1 master
    })
  })

  describe('Level Controls', () => {
    beforeEach(() => {
      const channel: ChannelStrip = {
        id: '1',
        name: 'Kick',
        type: 'audio',
        volume: 0.8,
        pan: 0.0,
        isMuted: false,
        isSolo: false,
        levelL: -60,
        levelR: -60,
        peakL: -60,
        peakR: -60,
        inserts: [],
        sends: [],
        outputBus: 'master'
      }

      console.addChannel(channel)
    })

    it('should set channel volume', () => {
      console.setVolume('1', 0.5)
      expect(console.getChannel('1')?.volume).toBe(0.5)
    })

    it('should clamp volume to valid range', () => {
      console.setVolume('1', 1.5)
      expect(console.getChannel('1')?.volume).toBe(1.0)

      console.setVolume('1', -0.5)
      expect(console.getChannel('1')?.volume).toBe(0.0)
    })

    it('should set channel pan', () => {
      console.setPan('1', 0.5)
      expect(console.getChannel('1')?.pan).toBe(0.5)
    })

    it('should clamp pan to valid range', () => {
      console.setPan('1', 1.5)
      expect(console.getChannel('1')?.pan).toBe(1.0)

      console.setPan('1', -1.5)
      expect(console.getChannel('1')?.pan).toBe(-1.0)
    })

    it('should set channel mute', () => {
      console.setMute('1', true)
      expect(console.getChannel('1')?.isMuted).toBe(true)
    })

    it('should set channel solo', () => {
      console.setSolo('1', true)
      expect(console.getChannel('1')?.isSolo).toBe(true)
    })

    it('should mute other channels when solo is active', () => {
      const channel2: ChannelStrip = {
        id: '2',
        name: 'Snare',
        type: 'audio',
        volume: 0.8,
        pan: 0.0,
        isMuted: false,
        isSolo: false,
        levelL: -60,
        levelR: -60,
        peakL: -60,
        peakR: -60,
        inserts: [],
        sends: [],
        outputBus: 'master'
      }

      console.addChannel(channel2)

      console.setSolo('1', true)

      expect(console.getChannel('1')?.isSolo).toBe(true)
      expect(console.getChannel('1')?.isMuted).toBe(false)
      expect(console.getChannel('2')?.isMuted).toBe(true)
    })

    it('should unmute all channels when solo is disabled', () => {
      const channel2: ChannelStrip = {
        id: '2',
        name: 'Snare',
        type: 'audio',
        volume: 0.8,
        pan: 0.0,
        isMuted: false,
        isSolo: false,
        levelL: -60,
        levelR: -60,
        peakL: -60,
        peakR: -60,
        inserts: [],
        sends: [],
        outputBus: 'master'
      }

      console.addChannel(channel2)

      console.setSolo('1', true)
      console.setSolo('1', false)

      expect(console.getChannel('1')?.isSolo).toBe(false)
      expect(console.getChannel('1')?.isMuted).toBe(false)
      expect(console.getChannel('2')?.isMuted).toBe(false)
    })
  })

  describe('Effects', () => {
    beforeEach(() => {
      const channel: ChannelStrip = {
        id: '1',
        name: 'Kick',
        type: 'audio',
        volume: 0.8,
        pan: 0.0,
        isMuted: false,
        isSolo: false,
        levelL: -60,
        levelR: -60,
        peakL: -60,
        peakR: -60,
        inserts: [],
        sends: [],
        outputBus: 'master'
      }

      console.addChannel(channel)
    })

    it('should add insert to channel', () => {
      console.addInsert('1', {
        id: 'insert1',
        enabled: true,
        effect: 'compressor',
        parameters: { threshold: -20, ratio: 4 }
      })

      expect(console.getChannel('1')?.inserts).toHaveLength(1)
    })

    it('should remove insert from channel', () => {
      console.addInsert('1', {
        id: 'insert1',
        enabled: true,
        effect: 'compressor',
        parameters: {}
      })

      console.removeInsert('1', 'insert1')

      expect(console.getChannel('1')?.inserts).toHaveLength(0)
    })

    it('should toggle insert bypass', () => {
      console.addInsert('1', {
        id: 'insert1',
        enabled: true,
        effect: 'compressor',
        parameters: {}
      })

      console.toggleInsert('1', 'insert1')

      expect(console.getChannel('1')?.inserts[0].enabled).toBe(false)
    })

    it('should add send to channel', () => {
      console.addSend('1', {
        id: 'send1',
        bus: 'reverb',
        amount: 0.5,
        prePost: 'post'
      })

      expect(console.getChannel('1')?.sends).toHaveLength(1)
    })

    it('should remove send from channel', () => {
      console.addSend('1', {
        id: 'send1',
        bus: 'reverb',
        amount: 0.5,
        prePost: 'post'
      })

      console.removeSend('1', 'send1')

      expect(console.getChannel('1')?.sends).toHaveLength(0)
    })

    it('should set send amount', () => {
      console.addSend('1', {
        id: 'send1',
        bus: 'reverb',
        amount: 0.5,
        prePost: 'post'
      })

      console.setSendAmount('1', 'send1', 0.8)

      expect(console.getChannel('1')?.sends[0].amount).toBe(0.8)
    })
  })

  describe('Routing', () => {
    it('should set output bus for channel', () => {
      const channel: ChannelStrip = {
        id: '1',
        name: 'Kick',
        type: 'audio',
        volume: 0.8,
        pan: 0.0,
        isMuted: false,
        isSolo: false,
        levelL: -60,
        levelR: -60,
        peakL: -60,
        peakR: -60,
        inserts: [],
        sends: [],
        outputBus: 'master'
      }

      console.addChannel(channel)
      console.setOutputBus('1', 'drum_bus')

      expect(console.getChannel('1')?.outputBus).toBe('drum_bus')
    })

    it('should not allow output bus change on master', () => {
      console.setOutputBus('master', 'some_bus')

      expect(console.getMasterBus()?.outputBus).toBe('')
    })
  })

  describe('Metering', () => {
    it('should update channel levels', () => {
      const channel: ChannelStrip = {
        id: '1',
        name: 'Kick',
        type: 'audio',
        volume: 0.8,
        pan: 0.0,
        isMuted: false,
        isSolo: false,
        levelL: -60,
        levelR: -60,
        peakL: -60,
        peakR: -60,
        inserts: [],
        sends: [],
        outputBus: 'master'
      }

      console.addChannel(channel)

      const levels = new Map([
        ['1', { levelL: -10, levelR: -12, peakL: -8, peakR: -10, rmsL: -15, rmsR: -17 }]
      ])

      console.updateLevels(levels)

      expect(console.getChannel('1')?.levelL).toBe(-10)
      expect(console.getChannel('1')?.levelR).toBe(-12)
    })

    it('should get all meter data', () => {
      const channel: ChannelStrip = {
        id: '1',
        name: 'Kick',
        type: 'audio',
        volume: 0.8,
        pan: 0.0,
        isMuted: false,
        isSolo: false,
        levelL: -10,
        levelR: -12,
        peakL: -8,
        peakR: -10,
        inserts: [],
        sends: [],
        outputBus: 'master'
      }

      console.addChannel(channel)

      const meterData = console.getAllMeterData()

      expect(meterData.has('1')).toBe(true)
      expect(meterData.has('master')).toBe(true)
    })
  })

  describe('Serialization', () => {
    it('should serialize to JSON', () => {
      const channel: ChannelStrip = {
        id: '1',
        name: 'Kick',
        type: 'audio',
        volume: 0.8,
        pan: 0.0,
        isMuted: false,
        isSolo: false,
        levelL: -60,
        levelR: -60,
        peakL: -60,
        peakR: -60,
        inserts: [],
        sends: [],
        outputBus: 'master'
      }

      console.addChannel(channel)

      const json = console.toJSON()

      expect(json).toHaveProperty('channels')
      expect(json).toHaveProperty('masterBus')
      expect(json).toHaveProperty('automation')
    })

    it('should deserialize from JSON', () => {
      const channel: ChannelStrip = {
        id: '1',
        name: 'Kick',
        type: 'audio',
        volume: 0.8,
        pan: 0.0,
        isMuted: false,
        isSolo: false,
        levelL: -60,
        levelR: -60,
        peakL: -60,
        peakR: -60,
        inserts: [],
        sends: [],
        outputBus: 'master'
      }

      console.addChannel(channel)

      const json = console.toJSON()
      const restored = MixingConsole.fromJSON(json)

      expect(restored.getMixChannels()).toHaveLength(1)
      expect(restored.getChannel('1')?.name).toBe('Kick')
    })
  })
})
