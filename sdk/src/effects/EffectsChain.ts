/**
 * Effects Chain System
 *
 * Manages insert effects and send/return effects for mixing console
 */

import { InsertSlot, Send } from '../models/MixingConsole'

/**
 * Effect type definitions
 */
export type EffectType =
  | 'compressor'
  | 'limiter'
  | 'eq'
  | 'reverb'
  | 'delay'
  | 'chorus'
  | 'phaser'
  | 'flanger'
  | 'distortion'
  | 'filter'
  | 'gate'
  | 'deesser'

/**
 * Effect parameter definition
 */
export interface EffectParameter {
  name: string
  minValue: number
  maxValue: number
  defaultValue: number
  type: 'linear' | 'logarithmic'
}

/**
 * Effect preset
 */
export interface EffectPreset {
  name: string
  parameters: Record<string, number>
}

/**
 * Effect definition
 */
export interface EffectDefinition {
  type: EffectType
  name: string
  description: string
  parameters: Map<string, EffectParameter>
  presets: EffectPreset[]
}

/**
 * Effects chain manager
 */
export class EffectsChain {
  private inserts: Map<string, InsertSlot[]>
  private sends: Map<string, Send[]>
  private effectDefinitions: Map<EffectType, EffectDefinition>

  constructor() {
    this.inserts = new Map()
    this.sends = new Map()
    this.effectDefinitions = new Map()
    this.initializeEffectDefinitions()
  }

  /**
   * Initialize built-in effect definitions
   */
  private initializeEffectDefinitions(): void {
    // Compressor
    this.effectDefinitions.set('compressor', {
      type: 'compressor',
      name: 'Compressor',
      description: 'Dynamic range compressor',
      parameters: new Map([
        ['threshold', { name: 'Threshold', minValue: -60, maxValue: 0, defaultValue: -20, type: 'linear' }],
        ['ratio', { name: 'Ratio', minValue: 1, maxValue: 20, defaultValue: 4, type: 'linear' }],
        ['attack', { name: 'Attack', minValue: 0.1, maxValue: 100, defaultValue: 5, type: 'logarithmic' }],
        ['release', { name: 'Release', minValue: 10, maxValue: 1000, defaultValue: 100, type: 'logarithmic' }],
        ['makeup', { name: 'Makeup Gain', minValue: 0, maxValue: 24, defaultValue: 0, type: 'linear' }]
      ]),
      presets: [
        { name: 'Light', parameters: { threshold: -20, ratio: 2, attack: 10, release: 100, makeup: 0 } },
        { name: 'Medium', parameters: { threshold: -15, ratio: 4, attack: 5, release: 100, makeup: 3 } },
        { name: 'Heavy', parameters: { threshold: -10, ratio: 10, attack: 2, release: 50, makeup: 6 } }
      ]
    })

    // EQ
    this.effectDefinitions.set('eq', {
      type: 'eq',
      name: 'Parametric EQ',
      description: 'Parametric equalizer',
      parameters: new Map([
        ['lowFreq', { name: 'Low Freq', minValue: 20, maxValue: 500, defaultValue: 100, type: 'logarithmic' }],
        ['lowGain', { name: 'Low Gain', minValue: -15, maxValue: 15, defaultValue: 0, type: 'linear' }],
        ['lowQ', { name: 'Low Q', minValue: 0.1, maxValue: 10, defaultValue: 1, type: 'logarithmic' }],
        ['midFreq', { name: 'Mid Freq', minValue: 200, maxValue: 8000, defaultValue: 1000, type: 'logarithmic' }],
        ['midGain', { name: 'Mid Gain', minValue: -15, maxValue: 15, defaultValue: 0, type: 'linear' }],
        ['midQ', { name: 'Mid Q', minValue: 0.1, maxValue: 10, defaultValue: 1, type: 'logarithmic' }],
        ['highFreq', { name: 'High Freq', minValue: 2000, maxValue: 20000, defaultValue: 5000, type: 'logarithmic' }],
        ['highGain', { name: 'High Gain', minValue: -15, maxValue: 15, defaultValue: 0, type: 'linear' }],
        ['highQ', { name: 'High Q', minValue: 0.1, maxValue: 10, defaultValue: 1, type: 'logarithmic' }]
      ]),
      presets: [
        { name: 'Flat', parameters: { lowFreq: 100, lowGain: 0, lowQ: 1, midFreq: 1000, midGain: 0, midQ: 1, highFreq: 5000, highGain: 0, highQ: 1 } },
        { name: 'Bass Boost', parameters: { lowFreq: 80, lowGain: 6, lowQ: 1, midFreq: 1000, midGain: 0, midQ: 1, highFreq: 5000, highGain: 0, highQ: 1 } },
        { name: 'Presence', parameters: { lowFreq: 100, lowGain: 0, lowQ: 1, midFreq: 2000, midGain: 3, midQ: 2, highFreq: 8000, highGain: 4, highQ: 1 } }
      ]
    })

    // Reverb
    this.effectDefinitions.set('reverb', {
      type: 'reverb',
      name: 'Reverb',
      description: 'Hall/room reverb',
      parameters: new Map([
        ['roomSize', { name: 'Room Size', minValue: 0, maxValue: 1, defaultValue: 0.5, type: 'linear' }],
        ['damping', { name: 'Damping', minValue: 0, maxValue: 1, defaultValue: 0.5, type: 'linear' }],
        ['wetLevel', { name: 'Wet Level', minValue: 0, maxValue: 1, defaultValue: 0.3, type: 'linear' }],
        ['dryLevel', { name: 'Dry Level', minValue: 0, maxValue: 1, defaultValue: 0.7, type: 'linear' }],
        ['width', { name: 'Width', minValue: 0, maxValue: 1, defaultValue: 1, type: 'linear' }]
      ]),
      presets: [
        { name: 'Room', parameters: { roomSize: 0.3, damping: 0.5, wetLevel: 0.2, dryLevel: 0.8, width: 0.5 } },
        { name: 'Hall', parameters: { roomSize: 0.7, damping: 0.4, wetLevel: 0.4, dryLevel: 0.6, width: 1 } },
        { name: 'Plate', parameters: { roomSize: 0.5, damping: 0.3, wetLevel: 0.5, dryLevel: 0.5, width: 0.8 } }
      ]
    })

    // Delay
    this.effectDefinitions.set('delay', {
      type: 'delay',
      name: 'Delay',
      description: 'Stereo delay',
      parameters: new Map([
        ['time', { name: 'Time', minValue: 0, maxValue: 2000, defaultValue: 500, type: 'linear' }],
        ['feedback', { name: 'Feedback', minValue: 0, maxValue: 0.95, defaultValue: 0.4, type: 'linear' }],
        ['mix', { name: 'Mix', minValue: 0, maxValue: 1, defaultValue: 0.3, type: 'linear' }],
        ['sync', { name: 'Sync', minValue: 0, maxValue: 1, defaultValue: 0, type: 'linear' }]
      ]),
      presets: [
        { name: 'Slap', parameters: { time: 100, feedback: 0.1, mix: 0.2, sync: 0 } },
        { name: 'Echo', parameters: { time: 500, feedback: 0.4, mix: 0.3, sync: 0 } },
        { name: 'Ambient', parameters: { time: 800, feedback: 0.6, mix: 0.4, sync: 0 } }
      ]
    })
  }

  // ========== Insert Effects ==========

  /**
   * Add insert effect to channel
   */
  addInsert(channelId: string, insert: InsertSlot): void {
    if (!this.inserts.has(channelId)) {
      this.inserts.set(channelId, [])
    }
    this.inserts.get(channelId)!.push(insert)
  }

  /**
   * Remove insert effect from channel
   */
  removeInsert(channelId: string, insertId: string): void {
    const channelInserts = this.inserts.get(channelId)
    if (channelInserts) {
      this.inserts.set(
        channelId,
        channelInserts.filter(insert => insert.id !== insertId)
      )
    }
  }

  /**
   * Toggle insert bypass
   */
  bypassInsert(channelId: string, insertId: string): void {
    const channelInserts = this.inserts.get(channelId)
    if (channelInserts) {
      const insert = channelInserts.find(i => i.id === insertId)
      if (insert) {
        insert.enabled = !insert.enabled
      }
    }
  }

  /**
   * Update insert parameter
   */
  setInsertParameter(channelId: string, insertId: string, parameter: string, value: number): void {
    const channelInserts = this.inserts.get(channelId)
    if (channelInserts) {
      const insert = channelInserts.find(i => i.id === insertId)
      if (insert) {
        insert.parameters[parameter] = value
      }
    }
  }

  /**
   * Get all inserts for a channel
   */
  getInserts(channelId: string): InsertSlot[] {
    return this.inserts.get(channelId) || []
  }

  // ========== Send Effects ==========

  /**
   * Add send effect to channel
   */
  addSend(channelId: string, send: Send): void {
    if (!this.sends.has(channelId)) {
      this.sends.set(channelId, [])
    }
    this.sends.get(channelId)!.push(send)
  }

  /**
   * Remove send effect from channel
   */
  removeSend(channelId: string, sendId: string): void {
    const channelSends = this.sends.get(channelId)
    if (channelSends) {
      this.sends.set(
        channelId,
        channelSends.filter(send => send.id !== sendId)
      )
    }
  }

  /**
   * Set send amount
   */
  setSendAmount(channelId: string, sendId: string, amount: number): void {
    const channelSends = this.sends.get(channelId)
    if (channelSends) {
      const send = channelSends.find(s => s.id === sendId)
      if (send) {
        send.amount = Math.max(0, Math.min(1, amount))
      }
    }
  }

  /**
   * Toggle pre/post fader
   */
  setSendPrePost(channelId: string, sendId: string, prePost: 'pre' | 'post'): void {
    const channelSends = this.sends.get(channelId)
    if (channelSends) {
      const send = channelSends.find(s => s.id === sendId)
      if (send) {
        send.prePost = prePost
      }
    }
  }

  /**
   * Get all sends for a channel
   */
  getSends(channelId: string): Send[] {
    return this.sends.get(channelId) || []
  }

  // ========== Effect Definitions ==========

  /**
   * Get effect definition
   */
  getEffectDefinition(effectType: EffectType): EffectDefinition | undefined {
    return this.effectDefinitions.get(effectType)
  }

  /**
   * Get all available effect types
   */
  getAvailableEffectTypes(): EffectType[] {
    return Array.from(this.effectDefinitions.keys())
  }

  /**
   * Apply preset to insert
   */
  applyPreset(channelId: string, insertId: string, presetName: string): void {
    const channelInserts = this.inserts.get(channelId)
    if (channelInserts) {
      const insert = channelInserts.find(i => i.id === insertId)
      if (insert && insert.effect) {
        const effectDef = this.effectDefinitions.get(insert.effect as EffectType)
        if (effectDef) {
          const preset = effectDef.presets.find(p => p.name === presetName)
          if (preset) {
            insert.parameters = { ...preset.parameters }
          }
        }
      }
    }
  }

  /**
   * Get presets for effect type
   */
  getPresets(effectType: EffectType): EffectPreset[] {
    const effectDef = this.effectDefinitions.get(effectType)
    return effectDef?.presets || []
  }

  // ========== Serialization ==========

  /**
   * Serialize to JSON
   */
  toJSON(): object {
    return {
      inserts: Array.from(this.inserts.entries()),
      sends: Array.from(this.sends.entries())
    }
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(json: any): EffectsChain {
    const chain = new EffectsChain()

    if (json.inserts) {
      json.inserts.forEach(([channelId, inserts]: [string, InsertSlot[]]) => {
        chain.inserts.set(channelId, inserts)
      })
    }

    if (json.sends) {
      json.sends.forEach(([channelId, sends]: [string, Send[]]) => {
        chain.sends.set(channelId, sends)
      })
    }

    return chain
  }
}
