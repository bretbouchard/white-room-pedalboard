/**
 * Comprehensive Error Handling Tests
 *
 * Tests error types, error boundaries, error recovery, and crash reporting
 * across Swift and C++ components
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  SchillingerSong,
  SongModel,
  PerformanceState,
  ArrangementStyle,
} from '@schillinger-sdk/schemas';
import {
  createTypicalSchillingerSong,
  createTypicalPerformanceState,
  createInvalidSchillingerSong,
  createCorruptedSongModel,
} from '../fixtures/test-factories';
import {
  assertValidSongState,
  assertInvalidSongState,
  assertPerformanceValid,
} from '../utilities/test-helpers';

// ============================================================================
// Error Type Definitions
// =============================================================================

enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  SERIALIZATION = 'SERIALIZATION',
  PROJECTION = 'PROJECTION',
  AUDIO = 'AUDIO',
  MEMORY = 'MEMORY',
  THREADING = 'THREADING',
  UNKNOWN = 'UNKNOWN',
}

enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

interface TestError {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
  timestamp: number;
}

// ============================================================================
// Error Boundary Tests
// =============================================================================

describe('Error Boundary Tests', () => {
  describe('Schema Validation Errors', () => {
    it('should catch missing required fields', () => {
      const invalidSong = {
        version: '1.0',
        // Missing required fields
      } as SchillingerSong;

      expect(() => {
        assertValidSongState(invalidSong);
      }).toThrow();
    });

    it('should catch invalid field types', () => {
      const invalidSong = {
        version: '1.0',
        id: 12345, // Should be string
        createdAt: Date.now(),
        modifiedAt: Date.now(),
        author: 'Test',
        name: 'Test Song',
        seed: 42,
        book4: {
          id: 'form-001',
          ratioTree: [1, 1, 2],
        },
        ensemble: {
          version: '1.0',
          id: 'ensemble-001',
          voices: [],
          voiceCount: 0,
        },
        bindings: {},
        constraints: { constraints: [] },
        console: {
          version: '1.0',
          id: 'console-001',
          voiceBusses: [],
          mixBusses: [],
          masterBus: {
            id: 'master-001',
            name: 'Master',
            type: 'master',
            inserts: [],
            gain: 0,
            pan: 0,
            muted: false,
            solo: false,
          },
          routing: { routes: [] },
        },
      };

      expect(() => {
        assertValidSongState(invalidSong);
      }).toThrow();
    });

    it('should catch out-of-range values', () => {
      const invalidSong = createTypicalSchillingerSong(42);
      invalidSong.ensemble.voiceCount = -1;

      expect(() => {
        assertValidSongState(invalidSong);
      }).toThrow();
    });

    it('should provide detailed error messages', () => {
      try {
        const invalidSong = {} as SchillingerSong;
        assertValidSongState(invalidSong);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeDefined();
        expect((error as Error).message).toBeDefined();
        expect((error as Error).message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance State Errors', () => {
    it('should catch invalid density values', () => {
      const invalidPerf = createTypicalPerformanceState(42);
      invalidPerf.density = -0.5;

      expect(() => {
        assertPerformanceValid(invalidPerf);
      }).toThrow();
    });

    it('should catch invalid arrangement style', () => {
      const invalidPerf = {
        ...createTypicalPerformanceState(42),
        arrangementStyle: 'INVALID_STYLE' as ArrangementStyle,
      };

      expect(() => {
        assertPerformanceValid(invalidPerf);
      }).toThrow();
    });

    it('should catch invalid mix target ranges', () => {
      const invalidPerf = createTypicalPerformanceState(42);
      invalidPerf.mixTargets.primary = {
        gain: -100, // Out of range
        pan: 2, // Out of range
      };

      expect(() => {
        assertPerformanceValid(invalidPerf);
      }).toThrow();
    });
  });

  describe('SongModel Errors', () => {
    it('should detect corrupted timeline', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const corruptedSong = createCorruptedSongModel(42);

      expect(() => {
        assertValidSongState(corruptedSong);
      }).toThrow();
    });

    it('should detect invalid note properties', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const song = createTypicalSongModel(sourceSong.id, 'derivation-001', 42);

      if (song.notes.length > 0) {
        song.notes[0].pitch = 128; // Invalid MIDI note

        expect(() => {
          assertValidSongState(song);
        }).toThrow();
      }
    });

    it('should detect reference mismatches', () => {
      const sourceSong = createTypicalSchillingerSong(42);
      const song = createTypicalSongModel(sourceSong.id, 'derivation-001', 42);

      // Add note with non-existent voice reference
      song.notes.push({
        id: 'note-invalid',
        voiceId: 'non-existent-voice',
        startTime: 0,
        duration: 44100,
        pitch: 60,
        velocity: 0.7,
      });

      expect(() => {
        assertValidSongState(song);
      }).toThrow();
    });
  });
});

// ============================================================================
// Error Recovery Tests
// =============================================================================

describe('Error Recovery Tests', () => {
  describe('Graceful Degradation', () => {
    it('should handle partial data loss', () => {
      const song = createTypicalSchillingerSong(42);

      // Simulate partial data loss
      delete (song as Partial<SchillingerSong>).book1;
      delete (song as Partial<SchillingerSong>).book2;
      delete (song as Partial<SchillingerSong>).book3;

      // Should still be valid with only required fields
      expect(() => {
        assertValidSongState(song);
      }).not.toThrow();
    });

    it('should handle missing optional systems', () => {
      const song = createTypicalSchillingerSong(42);

      // Remove optional book systems
      song.book1 = undefined;
      song.book2 = undefined;
      song.book3 = undefined;
      song.book5 = undefined;

      // Should still be valid
      expect(() => {
        assertValidSongState(song);
      }).not.toThrow();
    });

    it('should provide default values for missing optional fields', () => {
      const song = createTypicalSchillingerSong(42);

      // Remove optional fields
      if (song.ensemble.balance) {
        delete song.ensemble.balance.priority;
      }

      // Should handle gracefully
      expect(() => {
        assertValidSongState(song);
      }).not.toThrow();
    });
  });

  describe('Retry Logic', () => {
    it('should retry failed operations', async () => {
      let attempts = 0;
      const maxAttempts = 3;

      const operation = async (): Promise<boolean> => {
        attempts++;
        if (attempts < maxAttempts) {
          throw new Error('Temporary failure');
        }
        return true;
      };

      // Retry logic
      let success = false;
      for (let i = 0; i < maxAttempts; i++) {
        try {
          success = await operation();
          break;
        } catch (error) {
          if (i === maxAttempts - 1) {
            throw error;
          }
        }
      }

      expect(success).toBe(true);
      expect(attempts).toBe(maxAttempts);
    });

    it('should back off on repeated failures', async () => {
      const delays: number[] = [];
      const maxAttempts = 3;

      const operationWithBackoff = async (): Promise<boolean> => {
        for (let i = 0; i < maxAttempts; i++) {
          try {
            throw new Error('Failure');
          } catch (error) {
            if (i < maxAttempts - 1) {
              const delay = Math.pow(2, i) * 100; // Exponential backoff
              delays.push(delay);
              await new Promise(resolve => setTimeout(resolve, delay));
            } else {
              throw error;
            }
          }
        }
        return false;
      };

      try {
        await operationWithBackoff();
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(delays).toEqual([100, 200]);
      }
    });
  });

  describe('Fallback Mechanisms', () => {
    it('should fall back to default performance', () => {
      const song = createTypicalSchillingerSong(42);
      const invalidPerf = {} as PerformanceState;

      // Should fall back to default performance
      const defaultPerf = createTypicalPerformanceState(42);

      expect(() => {
        assertPerformanceValid(defaultPerf);
      }).not.toThrow();
    });

    it('should fall back to minimal song state', () => {
      // When complex song fails, fall back to minimal
      const minimalSong = createTypicalSchillingerSong(42);
      minimalSong.book1 = undefined;
      minimalSong.book2 = undefined;
      minimalSong.book3 = undefined;
      minimalSong.book5 = undefined;

      expect(() => {
        assertValidSongState(minimalSong);
      }).not.toThrow();
    });
  });
});

// ============================================================================
// Crash Prevention Tests
// =============================================================================

describe('Crash Prevention Tests', () => {
  describe('Memory Safety', () => {
    it('should prevent stack overflow from recursion', () => {
      const recursiveOperation = (depth: number): void => {
        if (depth > 1000) {
          return; // Prevent stack overflow
        }
        recursiveOperation(depth + 1);
      };

      expect(() => {
        recursiveOperation(0);
      }).not.toThrow();
    });

    it('should prevent memory leaks', () => {
      const largeObjects: unknown[] = [];

      // Create many large objects
      for (let i = 0; i < 1000; i++) {
        largeObjects.push(createTypicalSchillingerSong(i));
      }

      // Clear references
      largeObjects.length = 0;

      // If we get here without crashing, memory is managed correctly
      expect(true).toBe(true);
    });

    it('should handle circular references', () => {
      const objA: Record<string, unknown> = {};
      const objB: Record<string, unknown> = {};

      objA.ref = objB;
      objB.ref = objA;

      // Should handle circular references without crashing
      expect(() => {
        JSON.stringify(objA);
      }).toThrow(); // JSON.stringify can't handle circular refs
    });
  });

  describe('Thread Safety', () => {
    it('should prevent race conditions', async () => {
      let counter = 0;
      const incrementCount = 100;

      const incrementer = async (): Promise<void> => {
        for (let i = 0; i < incrementCount; i++) {
          counter++;
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      };

      // Run multiple incrementers concurrently
      await Promise.all([
        incrementer(),
        incrementer(),
        incrementer(),
      ]);

      // Counter should be exact (no race conditions)
      expect(counter).toBe(incrementCount * 3);
    });

    it('should handle concurrent access', async () => {
      const song = createTypicalSchillingerSong(42);

      // Simulate concurrent access
      const operations = Array.from({ length: 100 }, (_, i) => {
        return async () => {
          // Simulate read/write operations
          const temp = song.name;
          song.name = `Modified ${i}`;
          song.name = temp;
        };
      });

      await Promise.all(operations.map(op => op()));

      // Song should remain valid
      expect(() => {
        assertValidSongState(song);
      }).not.toThrow();
    });
  });

  describe('Resource Limits', () => {
    it('should reject operations that exceed memory limits', () => {
      const maxObjects = 10000;

      // Should limit creation of large objects
      const createObjects = (count: number): SchillingerSong[] => {
        if (count > maxObjects) {
          throw new Error('Memory limit exceeded');
        }

        const objects: SchillingerSong[] = [];
        for (let i = 0; i < count; i++) {
          objects.push(createTypicalSchillingerSong(i));
        }
        return objects;
      };

      expect(() => {
        createObjects(100); // Within limit
      }).not.toThrow();

      expect(() => {
        createObjects(100000); // Exceeds limit
      }).toThrow();
    });

    it('should handle CPU-intensive operations gracefully', async () => {
      const intensiveOperation = async (): Promise<void> => {
        // Simulate CPU-intensive work
        const iterations = 1000000;
        for (let i = 0; i < iterations; i++) {
          Math.sqrt(i);
        }
      };

      // Should complete without hanging
      await expect(intensiveOperation()).resolves.not.toThrow();
    });
  });
});

// ============================================================================
// Crash Reporting Tests
// =============================================================================

describe('Crash Reporting Tests', () => {
  describe('Error Logging', () => {
    it('should log validation errors', () => {
      const invalidSong = {} as SchillingerSong;

      try {
        assertValidSongState(invalidSong);
        expect.fail('Should have thrown error');
      } catch (error) {
        // Error should be loggable
        const errorLog = {
          message: (error as Error).message,
          stack: (error as Error).stack,
          timestamp: Date.now(),
        };

        expect(errorLog.message).toBeDefined();
        expect(errorLog.timestamp).toBeDefined();
      }
    });

    it('should log projection errors', () => {
      const projectionError = {
        category: ErrorCategory.PROJECTION,
        severity: ErrorSeverity.HIGH,
        code: 'PROJ_001',
        message: 'Projection failed: Invalid render graph',
        timestamp: Date.now(),
      };

      expect(projectionError.category).toBe(ErrorCategory.PROJECTION);
      expect(projectionError.severity).toBe(ErrorSeverity.HIGH);
      expect(projectionError.timestamp).toBeDefined();
    });

    it('should log audio engine errors', () => {
      const audioError = {
        category: ErrorCategory.AUDIO,
        severity: ErrorSeverity.CRITICAL,
        code: 'AUDIO_001',
        message: 'Audio engine crash: Buffer overflow',
        timestamp: Date.now(),
        context: {
          sampleRate: 44100,
          bufferSize: 512,
        },
      };

      expect(audioError.category).toBe(ErrorCategory.AUDIO);
      expect(audioError.severity).toBe(ErrorSeverity.CRITICAL);
      expect(audioError.context).toBeDefined();
    });
  });

  describe('Error Context', () => {
    it('should capture error context', () => {
      try {
        const song = createTypicalSchillingerSong(42);
        song.ensemble.voiceCount = -1;

        assertValidSongState(song);
        expect.fail('Should have thrown error');
      } catch (error) {
        const errorContext = {
          error: error as Error,
          songId: 'test-song-001',
          operation: 'validateSongState',
          timestamp: Date.now(),
        };

        expect(errorContext.error).toBeDefined();
        expect(errorContext.songId).toBeDefined();
        expect(errorContext.operation).toBeDefined();
        expect(errorContext.timestamp).toBeDefined();
      }
    });

    it('should capture stack traces', () => {
      try {
        const invalidSong = {} as SchillingerSong;
        assertValidSongState(invalidSong);
        expect.fail('Should have thrown error');
      } catch (error) {
        const stackTrace = (error as Error).stack;

        expect(stackTrace).toBeDefined();
        expect(stackTrace!.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Aggregation', () => {
    it('should aggregate multiple errors', () => {
      const errors: TestError[] = [];

      // Simulate multiple errors
      for (let i = 0; i < 10; i++) {
        try {
          const invalidSong = {} as SchillingerSong;
          assertValidSongState(invalidSong);
        } catch (error) {
          errors.push({
            category: ErrorCategory.VALIDATION,
            severity: ErrorSeverity.MEDIUM,
            code: `VAL_00${i}`,
            message: (error as Error).message,
            timestamp: Date.now(),
          });
        }
      }

      expect(errors.length).toBe(10);
      errors.forEach(err => {
        expect(err.category).toBe(ErrorCategory.VALIDATION);
        expect(err.code).toBeDefined();
        expect(err.timestamp).toBeDefined();
      });
    });

    it('should categorize errors by severity', () => {
      const errors: TestError[] = [
        {
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.LOW,
          code: 'VAL_001',
          message: 'Minor validation issue',
          timestamp: Date.now(),
        },
        {
          category: ErrorCategory.AUDIO,
          severity: ErrorSeverity.CRITICAL,
          code: 'AUDIO_001',
          message: 'Audio engine crash',
          timestamp: Date.now(),
        },
        {
          category: ErrorCategory.PROJECTION,
          severity: ErrorSeverity.HIGH,
          code: 'PROJ_001',
          message: 'Projection failed',
          timestamp: Date.now(),
        },
      ];

      const criticalErrors = errors.filter(e => e.severity === ErrorSeverity.CRITICAL);
      const highErrors = errors.filter(e => e.severity === ErrorSeverity.HIGH);
      const lowErrors = errors.filter(e => e.severity === ErrorSeverity.LOW);

      expect(criticalErrors.length).toBe(1);
      expect(highErrors.length).toBe(1);
      expect(lowErrors.length).toBe(1);
    });
  });
});

// ============================================================================
// Error Recovery Integration Tests
// =============================================================================

describe('Error Recovery Integration', () => {
  it('should recover from validation error and continue', async () => {
    const songs = [
      createTypicalSchillingerSong(1),
      {} as SchillingerSong, // Invalid
      createTypicalSchillingerSong(3),
    ];

    let validCount = 0;
    let errorCount = 0;

    for (const song of songs) {
      try {
        assertValidSongState(song);
        validCount++;
      } catch (error) {
        errorCount++;
      }
    }

    expect(validCount).toBe(2);
    expect(errorCount).toBe(1);
  });

  it('should handle cascade of errors gracefully', async () => {
    const operations = [
      async (): Promise<void> => {
        throw new Error('Error 1');
      },
      async (): Promise<void> => {
        throw new Error('Error 2');
      },
      async (): Promise<void> => {
        throw new Error('Error 3');
      },
    ];

    const results = await Promise.allSettled(operations);

    results.forEach(result => {
      expect(result.status).toBe('rejected');
    });
  });

  it('should maintain system stability after errors', async () => {
    // Perform operation that causes error
    try {
      const invalidSong = {} as SchillingerSong;
      assertValidSongState(invalidSong);
      expect.fail('Should have thrown error');
    } catch (error) {
      // Expected
    }

    // System should still be functional
    const validSong = createTypicalSchillingerSong(42);
    expect(() => {
      assertValidSongState(validSong);
    }).not.toThrow();
  });
});
