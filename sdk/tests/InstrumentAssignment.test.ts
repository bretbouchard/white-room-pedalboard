/**
 * Instrument Assignment Tests
 *
 * Comprehensive tests for InstrumentAssignment model and manager
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  InstrumentAssignment,
  InstrumentAssignmentManager,
  InstrumentType,
  InstrumentValidationError,
  INSTRUMENT_COLORS,
  INSTRUMENT_DISPLAY_NAMES,
  INSTRUMENT_ICONS
} from '../src/models/InstrumentAssignment'

describe('InstrumentAssignment', () => {
  describe('InstrumentType Enum', () => {
    it('should have all instrument types defined', () => {
      expect(Object.keys(InstrumentType).length).toBe(11)
    })

    it('should have display names for all types', () => {
      Object.values(InstrumentType).forEach(type => {
        expect(INSTRUMENT_DISPLAY_NAMES[type]).toBeDefined()
        expect(typeof INSTRUMENT_DISPLAY_NAMES[type]).toBe('string')
      })
    })

    it('should have icons for all types', () => {
      Object.values(InstrumentType).forEach(type => {
        expect(INSTRUMENT_ICONS[type]).toBeDefined()
        expect(typeof INSTRUMENT_ICONS[type]).toBe('string')
      })
    })

    it('should have colors for all types', () => {
      Object.values(InstrumentType).forEach(type => {
        expect(INSTRUMENT_COLORS[type]).toBeDefined()
        expect(INSTRUMENT_COLORS[type]).toMatch(/^#[0-9A-F]{6}$/i)
      })
    })
  })

  describe('InstrumentAssignmentManager', () => {
    let manager: InstrumentAssignmentManager

    beforeEach(() => {
      manager = new InstrumentAssignmentManager()
    })

    describe('Assignment Operations', () => {
      it('should assign instrument to track', () => {
        const instrument: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        manager.assignInstrument('track-1', instrument)

        const retrieved = manager.getInstrument('track-1')
        expect(retrieved).toBeDefined()
        expect(retrieved?.id).toBe(instrument.id)
        expect(retrieved?.name).toBe(instrument.name)
        expect(retrieved?.type).toBe(instrument.type)
        expect(retrieved?.channel).toBe(instrument.channel)
        expect(retrieved?.patch).toBe(instrument.patch)
        expect(retrieved?.color).toBe(instrument.color)
        expect(retrieved?.icon).toBe(instrument.icon)
        expect(retrieved?.createdAt).toBeDefined()
        expect(retrieved?.updatedAt).toBeDefined()
        expect(manager.count).toBe(1)
      })

      it('should get instrument for track', () => {
        const instrument: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        manager.assignInstrument('track-1', instrument)

        const retrieved = manager.getInstrument('track-1')
        expect(retrieved).toBeDefined()
        expect(retrieved?.id).toBe('inst-1')
        expect(retrieved?.name).toBe('Grand Piano')
      })

      it('should return undefined for non-existent track', () => {
        expect(manager.getInstrument('non-existent')).toBeUndefined()
      })

      it('should remove assignment', () => {
        const instrument: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        manager.assignInstrument('track-1', instrument)
        expect(manager.count).toBe(1)

        manager.removeAssignment('track-1')
        expect(manager.count).toBe(0)
        expect(manager.getInstrument('track-1')).toBeUndefined()
      })

      it('should get all assignments', () => {
        const instrument1: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        const instrument2: InstrumentAssignment = {
          id: 'inst-2',
          name: 'Acoustic Bass',
          type: InstrumentType.Bass,
          channel: 2,
          patch: 32,
          color: INSTRUMENT_COLORS[InstrumentType.Bass],
          icon: INSTRUMENT_ICONS[InstrumentType.Bass]
        }

        manager.assignInstrument('track-1', instrument1)
        manager.assignInstrument('track-2', instrument2)

        const all = manager.getAllAssignments()
        expect(all.length).toBe(2)
        expect(all[0].id).toBe(instrument1.id)
        expect(all[1].id).toBe(instrument2.id)
      })

      it('should get assigned track IDs', () => {
        const instrument1: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        const instrument2: InstrumentAssignment = {
          id: 'inst-2',
          name: 'Acoustic Bass',
          type: InstrumentType.Bass,
          channel: 2,
          patch: 32,
          color: INSTRUMENT_COLORS[InstrumentType.Bass],
          icon: INSTRUMENT_ICONS[InstrumentType.Bass]
        }

        manager.assignInstrument('track-1', instrument1)
        manager.assignInstrument('track-2', instrument2)

        const trackIds = manager.getAssignedTrackIds()
        expect(trackIds).toContain('track-1')
        expect(trackIds).toContain('track-2')
      })

      it('should clear all assignments', () => {
        const instrument1: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        const instrument2: InstrumentAssignment = {
          id: 'inst-2',
          name: 'Acoustic Bass',
          type: InstrumentType.Bass,
          channel: 2,
          patch: 32,
          color: INSTRUMENT_COLORS[InstrumentType.Bass],
          icon: INSTRUMENT_ICONS[InstrumentType.Bass]
        }

        manager.assignInstrument('track-1', instrument1)
        manager.assignInstrument('track-2', instrument2)

        expect(manager.count).toBe(2)

        manager.clearAll()

        expect(manager.count).toBe(0)
        expect(manager.getAssignedTrackIds()).toEqual([])
      })
    })

    describe('Validation', () => {
      it('should validate correct instrument', () => {
        const instrument: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        const result = manager.validateAssignment(instrument)
        expect(result.valid).toBe(true)
        expect(result.errors).toEqual([])
      })

      it('should reject invalid MIDI channel', () => {
        const instrument: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 0, // Invalid: must be 1-16
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        const result = manager.validateAssignment(instrument)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.type === InstrumentValidationError.INVALID_CHANNEL)).toBe(true)
      })

      it('should reject invalid patch', () => {
        const instrument: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 128, // Invalid: must be 0-127
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        const result = manager.validateAssignment(instrument)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.type === InstrumentValidationError.INVALID_PATCH)).toBe(true)
      })

      it('should reject invalid bank MSB', () => {
        const instrument: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          bankMSB: 128, // Invalid: must be 0-127
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        const result = manager.validateAssignment(instrument)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.type === InstrumentValidationError.INVALID_BANK)).toBe(true)
      })

      it('should reject missing required fields', () => {
        const instrument: InstrumentAssignment = {
          id: '', // Invalid: empty string
          name: '', // Invalid: empty string
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        const result = manager.validateAssignment(instrument)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.type === InstrumentValidationError.MISSING_REQUIRED_FIELD)).toBe(true)
      })

      it('should reject invalid plugin configuration', () => {
        const instrument: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          plugin: {
            id: '', // Invalid: empty string
            name: '', // Invalid: empty string
            manufacturer: '', // Invalid: empty string
            parameters: {} // Invalid: not an object
          },
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        const result = manager.validateAssignment(instrument)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.type === InstrumentValidationError.INVALID_PLUGIN)).toBe(true)
      })
    })

    describe('Channel Conflict Detection', () => {
      it('should throw error when assigning to used channel', () => {
        const instrument1: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        const instrument2: InstrumentAssignment = {
          id: 'inst-2',
          name: 'Acoustic Bass',
          type: InstrumentType.Bass,
          channel: 1, // Same channel as instrument1
          patch: 32,
          color: INSTRUMENT_COLORS[InstrumentType.Bass],
          icon: INSTRUMENT_ICONS[InstrumentType.Bass]
        }

        manager.assignInstrument('track-1', instrument1)

        expect(() => {
          manager.assignInstrument('track-2', instrument2)
        }).toThrow('Channel conflict')
      })

      it('should allow reassigning same track to different channel', () => {
        const instrument1: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        const instrument2: InstrumentAssignment = {
          id: 'inst-2',
          name: 'Electric Piano',
          type: InstrumentType.Piano,
          channel: 2, // Different channel
          patch: 4,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        manager.assignInstrument('track-1', instrument1)
        manager.assignInstrument('track-1', instrument2)

        expect(manager.getInstrument('track-1')?.channel).toBe(2)
      })
    })

    describe('Available Channels', () => {
      it('should return all channels when none assigned', () => {
        const available = manager.getAvailableChannels()
        expect(available).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
      })

      it('should exclude assigned channels', () => {
        const instrument: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        manager.assignInstrument('track-1', instrument)

        const available = manager.getAvailableChannels()
        expect(available).not.toContain(1)
        expect(available.length).toBe(15)
      })
    })

    describe('Filtering by Type', () => {
      it('should get instruments by type', () => {
        const piano1: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        const piano2: InstrumentAssignment = {
          id: 'inst-2',
          name: 'Electric Piano',
          type: InstrumentType.Piano,
          channel: 2,
          patch: 4,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        const bass: InstrumentAssignment = {
          id: 'inst-3',
          name: 'Acoustic Bass',
          type: InstrumentType.Bass,
          channel: 3,
          patch: 32,
          color: INSTRUMENT_COLORS[InstrumentType.Bass],
          icon: INSTRUMENT_ICONS[InstrumentType.Bass]
        }

        manager.assignInstrument('track-1', piano1)
        manager.assignInstrument('track-2', piano2)
        manager.assignInstrument('track-3', bass)

        const pianos = manager.getInstrumentsByType(InstrumentType.Piano)
        expect(pianos.length).toBe(2)
        expect(pianos[0].id).toBe(piano1.id)
        expect(pianos[1].id).toBe(piano2.id)

        const basses = manager.getInstrumentsByType(InstrumentType.Bass)
        expect(basses.length).toBe(1)
        expect(basses[0].id).toBe(bass.id)
      })
    })

    describe('Serialization', () => {
      it('should serialize to JSON', () => {
        const instrument: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        manager.assignInstrument('track-1', instrument)

        const json = manager.toJSON()
        expect(json).toHaveProperty('assignments')
        expect(Array.isArray(json.assignments)).toBe(true)
        expect(json.assignments.length).toBe(1)
      })

      it('should deserialize from JSON', () => {
        const json = {
          assignments: [
            [
              'track-1',
              {
                id: 'inst-1',
                name: 'Grand Piano',
                type: 'piano',
                channel: 1,
                patch: 0,
                color: '#3B82F6',
                icon: 'piano'
              }
            ]
          ]
        }

        const restored = InstrumentAssignmentManager.fromJSON(json)

        expect(restored.count).toBe(1)
        const instrument = restored.getInstrument('track-1')
        expect(instrument).toBeDefined()
        expect(instrument?.name).toBe('Grand Piano')
      })
    })

    describe('Cloning', () => {
      it('should create independent clone', () => {
        const instrument: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        manager.assignInstrument('track-1', instrument)

        const clone = manager.clone()

        expect(clone.count).toBe(manager.count)
        expect(clone.getInstrument('track-1')?.id).toBe(instrument.id)

        // Modify original
        manager.removeAssignment('track-1')

        // Clone should be unaffected
        expect(clone.count).toBe(1)
        expect(manager.count).toBe(0)
      })
    })

    describe('Has Assignment', () => {
      it('should return true for assigned track', () => {
        const instrument: InstrumentAssignment = {
          id: 'inst-1',
          name: 'Grand Piano',
          type: InstrumentType.Piano,
          channel: 1,
          patch: 0,
          color: INSTRUMENT_COLORS[InstrumentType.Piano],
          icon: INSTRUMENT_ICONS[InstrumentType.Piano]
        }

        manager.assignInstrument('track-1', instrument)

        expect(manager.hasAssignment('track-1')).toBe(true)
        expect(manager.hasAssignment('track-2')).toBe(false)
      })
    })
  })
})
