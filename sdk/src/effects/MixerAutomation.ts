/**
 * Mixer Automation System
 *
 * Record and playback automation for mixing parameters
 */

import { AutomationPoint, AutomationCurve } from '../models/MixingConsole'

/**
 * Automation event
 */
export interface AutomationEvent {
  id: string
  time: number // Time in seconds
  parameterId: string // e.g., 'channel_1.volume'
  value: number
}

/**
 * Automation track (collection of curves for a parameter)
 */
export interface AutomationTrack {
  parameterId: string
  curve: AutomationCurve
  isArmed: boolean // Ready to record
  isWriteEnabled: boolean // Actually recording
}

/**
 * Mixer automation manager
 */
export class MixerAutomation {
  private tracks: Map<string, AutomationTrack>
  private isRecording: boolean = false
  private isPlaying: boolean = false
  private recordingStartTime: number = 0
  private playbackStartTime: number = 0
  private recordingTracks: Set<string> = new Set()

  constructor() {
    this.tracks = new Map()
  }

  // ========== Recording ==========

  /**
   * Start recording automation
   */
  startRecording(): void {
    this.isRecording = true
    this.recordingStartTime = Date.now() / 1000
    this.recordingTracks.clear()

    // Mark all armed tracks as recording
    this.tracks.forEach((track) => {
      if (track.isArmed) {
        track.isWriteEnabled = true
        this.recordingTracks.add(track.parameterId)
      }
    })
  }

  /**
   * Stop recording automation
   */
  stopRecording(): void {
    this.isRecording = false

    // Disable write on all tracks
    this.tracks.forEach((track) => {
      track.isWriteEnabled = false
    })

    this.recordingTracks.clear()
  }

  /**
   * Record automation point
   */
  recordPoint(parameterId: string, value: number): void {
    if (!this.isRecording) return

    const track = this.tracks.get(parameterId)
    if (!track || !track.isWriteEnabled) return

    const time = Date.now() / 1000 - this.recordingStartTime

    // Add point to curve
    track.curve.points.push({
      time,
      value,
      curve: 'linear'
    })

    // Sort points by time
    track.curve.points.sort((a, b) => a.time - b.time)
  }

  /**
   * Arm track for recording
   */
  armTrack(parameterId: string): void {
    let track = this.tracks.get(parameterId)

    if (!track) {
      track = {
        parameterId,
        curve: {
          parameterId,
          points: []
        },
        isArmed: false,
        isWriteEnabled: false
      }
      this.tracks.set(parameterId, track)
    }

    track.isArmed = true
  }

  /**
   * Disarm track
   */
  disarmTrack(parameterId: string): void {
    const track = this.tracks.get(parameterId)
    if (track) {
      track.isArmed = false
      track.isWriteEnabled = false
    }
  }

  // ========== Playback ==========

  /**
   * Start automation playback
   */
  startPlayback(): void {
    this.isPlaying = true
    this.playbackStartTime = Date.now() / 1000
  }

  /**
   * Stop automation playback
   */
  stopPlayback(): void {
    this.isPlaying = false
  }

  /**
   * Get automated value at current time
   */
  getValueAtTime(parameterId: string, currentTime: number): number | null {
    if (!this.isPlaying) return null

    const track = this.tracks.get(parameterId)
    if (!track || track.curve.points.length === 0) return null

    const time = currentTime - this.playbackStartTime
    return this.interpolateValue(track.curve, time)
  }

  /**
   * Interpolate value at time from curve
   */
  private interpolateValue(curve: AutomationCurve, time: number): number {
    const points = curve.points

    if (points.length === 0) return 0
    if (points.length === 1) return points[0].value
    if (time <= points[0].time) return points[0].value
    if (time >= points[points.length - 1].time) return points[points.length - 1].value

    // Find surrounding points
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]

      if (time >= p1.time && time <= p2.time) {
        // Interpolate based on curve type
        const t = (time - p1.time) / (p2.time - p1.time)

        switch (p2.curve || p1.curve || 'linear') {
          case 'linear':
            return p1.value + (p2.value - p1.value) * t

          case 'exponential':
            return p1.value * Math.pow(p2.value / p1.value, t)

          case 'logarithmic':
            // Approximate logarithmic interpolation
            const logP1 = Math.log(Math.abs(p1.value) + 1e-6)
            const logP2 = Math.log(Math.abs(p2.value) + 1e-6)
            const logValue = logP1 + (logP2 - logP1) * t
            return Math.exp(logValue) * Math.sign(p1.value)

          default:
            return p1.value + (p2.value - p1.value) * t
        }
      }
    }

    return points[points.length - 1].value
  }

  // ========== Track Management ==========

  /**
   * Get automation track
   */
  getTrack(parameterId: string): AutomationTrack | undefined {
    return this.tracks.get(parameterId)
  }

  /**
   * Get all tracks
   */
  getAllTracks(): AutomationTrack[] {
    return Array.from(this.tracks.values())
  }

  /**
   * Get automation curve for parameter
   */
  getCurve(parameterId: string): AutomationCurve | undefined {
    return this.tracks.get(parameterId)?.curve
  }

  /**
   * Set automation curve
   */
  setCurve(parameterId: string, curve: AutomationCurve): void {
    let track = this.tracks.get(parameterId)

    if (!track) {
      track = {
        parameterId,
        curve,
        isArmed: false,
        isWriteEnabled: false
      }
      this.tracks.set(parameterId, track)
    } else {
      track.curve = curve
    }
  }

  /**
   * Remove automation track
   */
  removeTrack(parameterId: string): void {
    this.tracks.delete(parameterId)
  }

  /**
   * Clear all automation
   */
  clearAll(): void {
    this.tracks.clear()
    this.isRecording = false
    this.isPlaying = false
    this.recordingTracks.clear()
  }

  // ========== Editing ==========

  /**
   * Add automation point
   */
  addPoint(parameterId: string, point: AutomationPoint): void {
    let track = this.tracks.get(parameterId)

    if (!track) {
      track = {
        parameterId,
        curve: {
          parameterId,
          points: []
        },
        isArmed: false,
        isWriteEnabled: false
      }
      this.tracks.set(parameterId, track)
    }

    track.curve.points.push(point)

    // Sort by time
    track.curve.points.sort((a, b) => a.time - b.time)
  }

  /**
   * Remove automation point
   */
  removePoint(parameterId: string, time: number): void {
    const track = this.tracks.get(parameterId)
    if (!track) return

    track.curve.points = track.curve.points.filter(p => p.time !== time)
  }

  /**
   * Update automation point
   */
  updatePoint(parameterId: string, time: number, value: number, curve?: 'linear' | 'exponential' | 'logarithmic'): void {
    const track = this.tracks.get(parameterId)
    if (!track) return

    const point = track.curve.points.find(p => p.time === time)
    if (point) {
      point.value = value
      if (curve) point.curve = curve
    }
  }

  // ========== Automation Data ==========

  /**
   * Get all automation curves
   */
  getAllCurves(): AutomationCurve[] {
    return Array.from(this.tracks.values()).map(track => track.curve)
  }

  /**
   * Get automation data for export
   */
  toJSON(): object {
    return {
      tracks: Array.from(this.tracks.entries()),
      isRecording: this.isRecording,
      isPlaying: this.isPlaying
    }
  }

  /**
   * Load automation data from import
   */
  static fromJSON(json: any): MixerAutomation {
    const automation = new MixerAutomation()

    if (json.tracks) {
      json.tracks.forEach(([parameterId, track]: [string, AutomationTrack]) => {
        automation.tracks.set(parameterId, track)
      })
    }

    if (json.isRecording) {
      automation.isRecording = true
    }

    if (json.isPlaying) {
      automation.isPlaying = true
    }

    return automation
  }

  // ========== State ==========

  /**
   * Check if currently recording
   */
  getIsRecording(): boolean {
    return this.isRecording
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * Get recording tracks
   */
  getRecordingTracks(): string[] {
    return Array.from(this.recordingTracks)
  }

  /**
   * Get armed tracks
   */
  getArmedTracks(): string[] {
    return Array.from(this.tracks.values())
      .filter(track => track.isArmed)
      .map(track => track.parameterId)
  }
}
