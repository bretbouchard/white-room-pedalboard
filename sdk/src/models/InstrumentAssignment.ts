/**
 * Instrument Assignment Model
 *
 * Manages instrument assignments for tracks in a song/timeline.
 * Supports both MIDI instruments and virtual instruments.
 */

/**
 * Represents the type/category of instrument
 */
export enum InstrumentType {
  Piano = 'piano',
  Organ = 'organ',
  Guitar = 'guitar',
  Bass = 'bass',
  Strings = 'strings',
  Brass = 'brass',
  Woodwinds = 'woodwinds',
  Percussion = 'percussion',
  Synth = 'synth',
  Drums = 'drums',
  Other = 'other'
}

/**
 * Icon names for each instrument type (for UI display)
 */
export const INSTRUMENT_ICONS: Record<InstrumentType, string> = {
  [InstrumentType.Piano]: 'piano',
  [InstrumentType.Organ]: 'organ',
  [InstrumentType.Guitar]: 'guitar',
  [InstrumentType.Bass]: 'bass',
  [InstrumentType.Strings]: 'strings',
  [InstrumentType.Brass]: 'brass',
  [InstrumentType.Woodwinds]: 'woodwinds',
  [InstrumentType.Percussion]: 'percussion',
  [InstrumentType.Synth]: 'synth',
  [InstrumentType.Drums]: 'drums',
  [InstrumentType.Other]: 'music'
}

/**
 * Display names for each instrument type
 */
export const INSTRUMENT_DISPLAY_NAMES: Record<InstrumentType, string> = {
  [InstrumentType.Piano]: 'Piano',
  [InstrumentType.Organ]: 'Organ',
  [InstrumentType.Guitar]: 'Guitar',
  [InstrumentType.Bass]: 'Bass',
  [InstrumentType.Strings]: 'Strings',
  [InstrumentType.Brass]: 'Brass',
  [InstrumentType.Woodwinds]: 'Woodwinds',
  [InstrumentType.Percussion]: 'Percussion',
  [InstrumentType.Synth]: 'Synth',
  [InstrumentType.Drums]: 'Drums',
  [InstrumentType.Other]: 'Other'
}

/**
 * Default colors for each instrument type (hex format)
 */
export const INSTRUMENT_COLORS: Record<InstrumentType, string> = {
  [InstrumentType.Piano]: '#3B82F6',    // Blue
  [InstrumentType.Organ]: '#8B5CF6',    // Purple
  [InstrumentType.Guitar]: '#F59E0B',   // Amber
  [InstrumentType.Bass]: '#EF4444',     // Red
  [InstrumentType.Strings]: '#10B981',  // Green
  [InstrumentType.Brass]: '#F97316',    // Orange
  [InstrumentType.Woodwinds]: '#06B6D4', // Cyan
  [InstrumentType.Percussion]: '#EC4899', // Pink
  [InstrumentType.Synth]: '#6366F1',    // Indigo
  [InstrumentType.Drums]: '#64748B',    // Slate
  [InstrumentType.Other]: '#78716C'     // Stone
}

/**
 * Represents an assigned instrument in a song
 */
export interface InstrumentAssignment {
  id: string
  name: string
  type: InstrumentType
  channel: number // MIDI channel (1-16)
  patch: number // MIDI program change (0-127)
  bankMSB?: number // Bank select MSB (0-127)
  bankLSB?: number // Bank select LSB (0-127)

  // Audio plugin for virtual instruments
  plugin?: {
    id: string
    name: string
    manufacturer: string
    parameters: Record<string, number>
  }

  // Metadata
  color: string
  icon: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Validation error types
 */
export enum InstrumentValidationError {
  INVALID_CHANNEL = 'invalid_channel',
  INVALID_PATCH = 'invalid_patch',
  INVALID_BANK = 'invalid_bank',
  CHANNEL_CONFLICT = 'channel_conflict',
  MISSING_REQUIRED_FIELD = 'missing_required_field',
  INVALID_PLUGIN = 'invalid_plugin'
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: Array<{
    field: string
    message: string
    type: InstrumentValidationError
  }>
}

/**
 * Manages instrument assignments for a song
 */
export class InstrumentAssignmentManager {
  private assignments: Map<string, InstrumentAssignment>

  constructor() {
    this.assignments = new Map()
  }

  /**
   * Assign instrument to track
   * @param trackId - Track identifier
   * @param instrument - Instrument assignment
   * @throws Error if validation fails
   */
  assignInstrument(trackId: string, instrument: InstrumentAssignment): void {
    const validation = this.validateAssignment(instrument)

    if (!validation.valid) {
      const errorMessages = validation.errors.map(e => e.message).join('; ')
      throw new Error(`Invalid instrument assignment: ${errorMessages}`)
    }

    // Check for channel conflicts
    const conflict = this.findChannelConflict(instrument.channel, trackId)
    if (conflict) {
      throw new Error(
        `Channel conflict: Channel ${instrument.channel} is already assigned to track ${conflict}`
      )
    }

    // Set timestamps
    const now = new Date().toISOString()
    const existing = this.assignments.get(trackId)

    this.assignments.set(trackId, {
      ...instrument,
      createdAt: existing?.createdAt || now,
      updatedAt: now
    })
  }

  /**
   * Get instrument for track
   * @param trackId - Track identifier
   * @returns Instrument assignment or undefined
   */
  getInstrument(trackId: string): InstrumentAssignment | undefined {
    return this.assignments.get(trackId)
  }

  /**
   * Remove assignment
   * @param trackId - Track identifier
   */
  removeAssignment(trackId: string): void {
    this.assignments.delete(trackId)
  }

  /**
   * Get all assignments
   * @returns Array of all instrument assignments
   */
  getAllAssignments(): InstrumentAssignment[] {
    return Array.from(this.assignments.values())
  }

  /**
   * Get all track IDs with assignments
   * @returns Array of track IDs
   */
  getAssignedTrackIds(): string[] {
    return Array.from(this.assignments.keys())
  }

  /**
   * Clear all assignments
   */
  clearAll(): void {
    this.assignments.clear()
  }

  /**
   * Validate assignment
   * @param instrument - Instrument assignment to validate
   * @returns Validation result
   */
  validateAssignment(instrument: InstrumentAssignment): ValidationResult {
    const errors: Array<{
      field: string
      message: string
      type: InstrumentValidationError
    }> = []

    // Check required fields
    if (!instrument.id || instrument.id.trim() === '') {
      errors.push({
        field: 'id',
        message: 'Instrument ID is required',
        type: InstrumentValidationError.MISSING_REQUIRED_FIELD
      })
    }

    if (!instrument.name || instrument.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Instrument name is required',
        type: InstrumentValidationError.MISSING_REQUIRED_FIELD
      })
    }

    if (!instrument.type) {
      errors.push({
        field: 'type',
        message: 'Instrument type is required',
        type: InstrumentValidationError.MISSING_REQUIRED_FIELD
      })
    }

    // Validate MIDI channel (1-16)
    if (instrument.channel < 1 || instrument.channel > 16) {
      errors.push({
        field: 'channel',
        message: 'MIDI channel must be between 1 and 16',
        type: InstrumentValidationError.INVALID_CHANNEL
      })
    }

    // Validate MIDI program change (0-127)
    if (instrument.patch < 0 || instrument.patch > 127) {
      errors.push({
        field: 'patch',
        message: 'MIDI patch must be between 0 and 127',
        type: InstrumentValidationError.INVALID_PATCH
      })
    }

    // Validate bank select (0-127)
    if (instrument.bankMSB !== undefined && (instrument.bankMSB < 0 || instrument.bankMSB > 127)) {
      errors.push({
        field: 'bankMSB',
        message: 'Bank MSB must be between 0 and 127',
        type: InstrumentValidationError.INVALID_BANK
      })
    }

    if (instrument.bankLSB !== undefined && (instrument.bankLSB < 0 || instrument.bankLSB > 127)) {
      errors.push({
        field: 'bankLSB',
        message: 'Bank LSB must be between 0 and 127',
        type: InstrumentValidationError.INVALID_BANK
      })
    }

    // Validate plugin if provided
    if (instrument.plugin) {
      if (!instrument.plugin.id || instrument.plugin.id.trim() === '') {
        errors.push({
          field: 'plugin.id',
          message: 'Plugin ID is required when plugin is specified',
          type: InstrumentValidationError.INVALID_PLUGIN
        })
      }

      if (!instrument.plugin.name || instrument.plugin.name.trim() === '') {
        errors.push({
          field: 'plugin.name',
          message: 'Plugin name is required when plugin is specified',
          type: InstrumentValidationError.INVALID_PLUGIN
        })
      }

      if (!instrument.plugin.manufacturer || instrument.plugin.manufacturer.trim() === '') {
        errors.push({
          field: 'plugin.manufacturer',
          message: 'Plugin manufacturer is required when plugin is specified',
          type: InstrumentValidationError.INVALID_PLUGIN
        })
      }

      if (!instrument.plugin.parameters || typeof instrument.plugin.parameters !== 'object') {
        errors.push({
          field: 'plugin.parameters',
          message: 'Plugin parameters must be an object',
          type: InstrumentValidationError.INVALID_PLUGIN
        })
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Find channel conflict
   * @param channel - MIDI channel to check
   * @param excludeTrackId - Track ID to exclude from check
   * @returns Conflicting track ID or undefined
   */
  private findChannelConflict(channel: number, excludeTrackId: string): string | undefined {
    for (const [trackId, instrument] of this.assignments.entries()) {
      if (trackId !== excludeTrackId && instrument.channel === channel) {
        return trackId
      }
    }
    return undefined
  }

  /**
   * Get available MIDI channels
   * @returns Array of available channel numbers
   */
  getAvailableChannels(): number[] {
    const usedChannels = new Set(
      Array.from(this.assignments.values()).map(i => i.channel)
    )

    const available: number[] = []
    for (let channel = 1; channel <= 16; channel++) {
      if (!usedChannels.has(channel)) {
        available.push(channel)
      }
    }

    return available
  }

  /**
   * Serialize to JSON
   * @returns JSON object
   */
  toJSON(): object {
    return {
      assignments: Array.from(this.assignments.entries())
    }
  }

  /**
   * Deserialize from JSON
   * @param json - JSON object
   * @returns InstrumentAssignmentManager instance
   */
  static fromJSON(json: any): InstrumentAssignmentManager {
    const manager = new InstrumentAssignmentManager()

    if (json.assignments && Array.isArray(json.assignments)) {
      for (const [trackId, instrument] of json.assignments) {
        manager.assignments.set(trackId, instrument as InstrumentAssignment)
      }
    }

    return manager
  }

  /**
   * Get assignment count
   * @returns Number of assignments
   */
  get count(): number {
    return this.assignments.size
  }

  /**
   * Check if track has assignment
   * @param trackId - Track identifier
   * @returns True if assigned
   */
  hasAssignment(trackId: string): boolean {
    return this.assignments.has(trackId)
  }

  /**
   * Get instruments by type
   * @param type - Instrument type
   * @returns Array of instruments of the specified type
   */
  getInstrumentsByType(type: InstrumentType): InstrumentAssignment[] {
    return this.getAllAssignments().filter(i => i.type === type)
  }

  /**
   * Clone the manager
   * @returns New instance with same assignments
   */
  clone(): InstrumentAssignmentManager {
    const cloned = new InstrumentAssignmentManager()
    for (const [trackId, instrument] of this.assignments.entries()) {
      cloned.assignments.set(trackId, { ...instrument })
    }
    return cloned
  }
}
