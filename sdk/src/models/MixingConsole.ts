/**
 * Mixing Console Data Models
 *
 * Professional mixing console with channel strips, effects, and automation
 */

/**
 * Insert slot for channel strip effects (pre-fader)
 */
export interface InsertSlot {
  id: string
  enabled: boolean
  plugin?: string // Plugin ID if virtual instrument
  effect?: string // Effect type (e.g., 'compressor', 'eq', 'reverb')
  parameters: Record<string, number>
}

/**
 * Send effect (post-fader to bus)
 */
export interface Send {
  id: string
  bus: string // Target bus ID
  amount: number // 0-1 (send level)
  prePost: 'pre' | 'post' // Pre-fader or post-fader send
}

/**
 * Metering data for stereo channels
 */
export interface MeterData {
  levelL: number // Current level in dB (-60 to 0)
  levelR: number
  peakL: number // Peak hold level
  peakR: number
  rmsL: number // RMS level
  rmsR: number
}

/**
 * Channel strip - individual mixing channel
 */
export interface ChannelStrip {
  id: string
  name: string
  type: 'audio' | 'midi' | 'bus' | 'master'

  // Level controls
  volume: number // 0-1 (linear)
  pan: number // -1 to 1 (left to right)

  // Mute/Solo
  isMuted: boolean
  isSolo: boolean

  // Metering
  levelL: number // Current level (dB)
  levelR: number
  peakL: number
  peakR: number

  // Effects inserts (pre-fader)
  inserts: InsertSlot[]

  // Effects sends (post-fader)
  sends: Send[]

  // Routing
  outputBus: string // Where this channel routes to
}

/**
 * Automation point for parameter automation
 */
export interface AutomationPoint {
  time: number // Time in seconds
  value: number // Parameter value
  curve?: 'linear' | 'exponential' | 'logarithmic'
}

/**
 * Automation curve for a single parameter
 */
export interface AutomationCurve {
  parameterId: string // e.g., 'channel_1.volume'
  points: AutomationPoint[]
}

/**
 * Mixing console state and management
 */
export class MixingConsole {
  private channels: Map<string, ChannelStrip>
  private masterBus: ChannelStrip
  private automation: Map<string, AutomationCurve>
  private isPlayingAutomation: boolean = false

  constructor() {
    this.channels = new Map()
    this.automation = new Map()
    this.masterBus = this.createMasterBus()
  }

  /**
   * Create master bus channel
   */
  private createMasterBus(): ChannelStrip {
    return {
      id: 'master',
      name: 'Master',
      type: 'master',
      volume: 0.8,
      pan: 0,
      isMuted: false,
      isSolo: false,
      levelL: -60,
      levelR: -60,
      peakL: -60,
      peakR: -60,
      inserts: [],
      sends: [],
      outputBus: ''
    }
  }

  // ========== Channel Management ==========

  /**
   * Add a new channel to the console
   */
  addChannel(channel: ChannelStrip): void {
    this.channels.set(channel.id, channel)
  }

  /**
   * Remove a channel from the console
   */
  removeChannel(id: string): void {
    this.channels.delete(id)
  }

  /**
   * Get a specific channel by ID
   */
  getChannel(id: string): ChannelStrip | undefined {
    if (id === 'master') return this.masterBus
    return this.channels.get(id)
  }

  /**
   * Get all channels including master
   */
  getAllChannels(): ChannelStrip[] {
    return [
      ...Array.from(this.channels.values()),
      this.masterBus
    ]
  }

  /**
   * Get all non-master channels
   */
  getMixChannels(): ChannelStrip[] {
    return Array.from(this.channels.values())
  }

  /**
   * Get master bus
   */
  getMasterBus(): ChannelStrip {
    return this.masterBus
  }

  // ========== Level Controls ==========

  /**
   * Set channel volume
   */
  setVolume(id: string, volume: number): void {
    const channel = this.getChannel(id)
    if (channel) {
      channel.volume = Math.max(0, Math.min(1, volume))
      this.recordAutomation(`${id}.volume`, channel.volume)
    }
  }

  /**
   * Set channel pan
   */
  setPan(id: string, pan: number): void {
    const channel = this.getChannel(id)
    if (channel) {
      channel.pan = Math.max(-1, Math.min(1, pan))
      this.recordAutomation(`${id}.pan`, channel.pan)
    }
  }

  /**
   * Set channel mute state
   */
  setMute(id: string, muted: boolean): void {
    const channel = this.getChannel(id)
    if (channel) {
      // If soloing any channel, mute all non-soloed channels
      if (muted === false && this.hasSoloedChannels()) {
        return // Don't unmute if other channels are soloed
      }
      channel.isMuted = muted
      this.recordAutomation(`${id}.mute`, muted ? 1 : 0)
    }
  }

  /**
   * Set channel solo state
   */
  setSolo(id: string, solo: boolean): void {
    const channel = this.getChannel(id)
    if (channel && channel.type !== 'master') {
      channel.isSolo = solo

      // Mute all non-soloed channels if any channel is soloed
      if (solo) {
        this.channels.forEach((ch) => {
          if (ch.id !== id && ch.type !== 'master') {
            ch.isMuted = true
          }
        })
      } else if (!this.hasSoloedChannels()) {
        // Unmute all channels if no channels are soloed
        this.channels.forEach((ch) => {
          if (ch.type !== 'master') {
            ch.isMuted = false
          }
        })
      }

      this.recordAutomation(`${id}.solo`, solo ? 1 : 0)
    }
  }

  /**
   * Check if any channels are soloed
   */
  private hasSoloedChannels(): boolean {
    return Array.from(this.channels.values()).some(ch => ch.isSolo)
  }

  // ========== Effects ==========

  /**
   * Add insert effect to channel
   */
  addInsert(channelId: string, insert: InsertSlot): void {
    const channel = this.getChannel(channelId)
    if (channel) {
      channel.inserts.push(insert)
    }
  }

  /**
   * Remove insert effect from channel
   */
  removeInsert(channelId: string, insertId: string): void {
    const channel = this.getChannel(channelId)
    if (channel) {
      channel.inserts = channel.inserts.filter(insert => insert.id !== insertId)
    }
  }

  /**
   * Toggle insert bypass
   */
  toggleInsert(channelId: string, insertId: string): void {
    const channel = this.getChannel(channelId)
    if (channel) {
      const insert = channel.inserts.find(i => i.id === insertId)
      if (insert) {
        insert.enabled = !insert.enabled
      }
    }
  }

  /**
   * Add send effect to channel
   */
  addSend(channelId: string, send: Send): void {
    const channel = this.getChannel(channelId)
    if (channel) {
      channel.sends.push(send)
    }
  }

  /**
   * Remove send effect from channel
   */
  removeSend(channelId: string, sendId: string): void {
    const channel = this.getChannel(channelId)
    if (channel) {
      channel.sends = channel.sends.filter(send => send.id !== sendId)
    }
  }

  /**
   * Set send amount
   */
  setSendAmount(channelId: string, sendId: string, amount: number): void {
    const channel = this.getChannel(channelId)
    if (channel) {
      const send = channel.sends.find(s => s.id === sendId)
      if (send && amount >= 0 && amount <= 1) {
        send.amount = amount
        this.recordAutomation(`${channelId}.send.${sendId}`, amount)
      }
    }
  }

  // ========== Routing ==========

  /**
   * Set channel output bus
   */
  setOutputBus(id: string, bus: string): void {
    const channel = this.getChannel(id)
    if (channel && channel.type !== 'master') {
      channel.outputBus = bus
    }
  }

  // ========== Metering ==========

  /**
   * Update channel levels from audio backend
   */
  updateLevels(levels: Map<string, MeterData>): void {
    levels.forEach((levelData, channelId) => {
      const channel = this.getChannel(channelId)
      if (channel) {
        channel.levelL = levelData.levelL
        channel.levelR = levelData.levelR
        channel.peakL = levelData.peakL
        channel.peakR = levelData.peakR
      }
    })
  }

  /**
   * Get meter data for all channels
   */
  getAllMeterData(): Map<string, MeterData> {
    const meterData = new Map<string, MeterData>()

    this.channels.forEach((channel, id) => {
      meterData.set(id, {
        levelL: channel.levelL,
        levelR: channel.levelR,
        peakL: channel.peakL,
        peakR: channel.peakR,
        rmsL: -60, // TODO: Calculate from audio backend
        rmsR: -60
      })
    })

    // Add master
    meterData.set('master', {
      levelL: this.masterBus.levelL,
      levelR: this.masterBus.levelR,
      peakL: this.masterBus.peakL,
      peakR: this.masterBus.peakR,
      rmsL: -60,
      rmsR: -60
    })

    return meterData
  }

  // ========== Automation ==========

  /**
   * Record automation point
   */
  private recordAutomation(parameterId: string, value: number): void {
    if (!this.isPlayingAutomation) {
      let curve = this.automation.get(parameterId)
      if (!curve) {
        curve = {
          parameterId,
          points: []
        }
        this.automation.set(parameterId, curve)
      }

      curve.points.push({
        time: Date.now() / 1000, // Convert to seconds
        value,
        curve: 'linear'
      })
    }
  }

  /**
   * Get automation data for all parameters
   */
  getAutomationData(): AutomationCurve[] {
    return Array.from(this.automation.values())
  }

  /**
   * Get automation for specific parameter
   */
  getParameterAutomation(parameterId: string): AutomationCurve | undefined {
    return this.automation.get(parameterId)
  }

  /**
   * Clear all automation data
   */
  clearAutomation(): void {
    this.automation.clear()
  }

  // ========== Serialization ==========

  /**
   * Serialize console to JSON
   */
  toJSON(): object {
    return {
      channels: Array.from(this.channels.entries()),
      masterBus: this.masterBus,
      automation: Array.from(this.automation.entries())
    }
  }

  /**
   * Deserialize console from JSON
   */
  static fromJSON(json: any): MixingConsole {
    const console = new MixingConsole()

    // Restore channels
    if (json.channels) {
      json.channels.forEach(([id, channel]: [string, ChannelStrip]) => {
        console.channels.set(id, channel)
      })
    }

    // Restore master bus
    if (json.masterBus) {
      console.masterBus = json.masterBus
    }

    // Restore automation
    if (json.automation) {
      json.automation.forEach(([id, curve]: [string, AutomationCurve]) => {
        console.automation.set(id, curve)
      })
    }

    return console
  }
}
