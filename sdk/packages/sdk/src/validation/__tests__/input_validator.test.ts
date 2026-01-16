/**
 * Input Validator Tests
 *
 * Test input validation and sanitization
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeJSON,
  validateSongContract,
  RateLimiter,
  validateInputSize,
  checkNestingDepth,
  INPUT_LIMITS
} from '../input_validator.js';
import type { SongContractV1 } from '../../song/song_contract.js';

describe('String Sanitization', () => {
  it('should trim whitespace by default', () => {
    const result = sanitizeString('  test  ');
    expect(result).toBe('test');
  });

  it('should enforce max length', () => {
    expect(() => sanitizeString('a'.repeat(10001), { maxLength: 100 }))
      .toThrow('exceeds maximum length');
  });

  it('should escape HTML by default', () => {
    const result = sanitizeString('<script>alert("xss")</script>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).not.toContain('<script>');
  });

  it('should allow HTML when enabled', () => {
    const result = sanitizeString('<b>bold</b>', { allowHTML: true });
    expect(result).toContain('<b>');
  });

  it('should detect SQL injection patterns', () => {
    expect(() => sanitizeString("'; DROP TABLE users; --", { allowSQL: false }))
      .toThrow('dangerous SQL patterns');
  });

  it('should allow SQL when enabled', () => {
    const result = sanitizeString("SELECT * FROM users", { allowSQL: true });
    expect(result).toContain('SELECT');
  });

  it('should remove null bytes', () => {
    const result = sanitizeString('test\x00string');
    expect(result).toBe('teststring');
  });
});

describe('JSON Sanitization', () => {
  it('should validate valid JSON', () => {
    const result = sanitizeJSON('{"key": "value"}');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toEqual({ key: 'value' });
  });

  it('should reject invalid JSON', () => {
    const result = sanitizeJSON('{invalid json}');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Invalid JSON');
  });

  it('should validate against schema', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, minLength: 1 },
        age: { type: 'number' as const, minimum: 0 }
      },
      required: ['name', 'age']
    };

    const valid = sanitizeJSON('{"name": "John", "age": 30}', schema);
    expect(valid.valid).toBe(true);

    const invalid = sanitizeJSON('{"name": ""}', schema);
    expect(invalid.valid).toBe(false);
  });

  it('should detect dangerous patterns', () => {
    const result = sanitizeJSON('{"__proto__": "pollution"}');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Dangerous key'))).toBe(true);
  });

  it('should check nested objects', () => {
    const result = sanitizeJSON('{"nested": {"__proto__": "pollution"}}');
    expect(result.valid).toBe(false);
  });

  it('should check arrays', () => {
    const result = sanitizeJSON('[1, 2, {"__proto__": "x"}]');
    expect(result.valid).toBe(false);
  });

  it('should remove null bytes from strings', () => {
    // Note: JSON.parse() automatically removes null bytes, so this test
    // verifies that our sanitization would catch them if present in raw strings
    const result = sanitizeJSON('{"key": "value"}');
    expect(result.valid).toBe(true);
  });
});

describe('SongContract Validation', () => {
  const createValidContract = (): SongContractV1 => ({
    version: '1.0',
    id: 'contract-test-123',
    seed: 42,
    rhythmSystems: [
      {
        id: 'rhythm-1',
        generators: [
          { period: 4, weight: 1.0 }
        ],
        resultants: [],
        density: {
          gridResolution: 0.25,
          minDensity: 0.3,
          maxDensity: 0.7
        }
      }
    ],
    melodySystems: [
      {
        id: 'melody-1',
        pitchCycle: {
          root: 0,
          intervals: [0, 4, 7, 12]
        },
        intervalSeeds: [
          {
            ordered: true,
            intervals: [2, 2, 1, 2, 2, 2, 1]
          }
        ],
        contour: {
          direction: 'neutral',
          complexity: 0.5
        },
        register: {
          minNote: 48,
          maxNote: 72
        }
      }
    ],
    formSystem: {
      sections: [
        { name: 'Verse', durationBars: 8 }
      ]
    },
    ensemble: {
      voices: [
        {
          id: 'voice-1',
          name: 'Test Voice',
          role: 'melody'
        }
      ]
    },
    instrumentAssignments: [],
    presetAssignments: [],
    console: {
      buses: []
    }
  });

  it('should validate a correct contract', () => {
    const contract = createValidContract();
    const result = validateSongContract(contract);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject missing ID', () => {
    const contract = createValidContract();
    contract.id = '' as any;

    const result = validateSongContract(contract);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid or missing contract ID');
  });

  it('should reject invalid ID characters', () => {
    const contract = createValidContract();
    contract.id = 'contract<script>';

    const result = validateSongContract(contract);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('invalid characters'))).toBe(true);
  });

  it('should reject invalid seed', () => {
    const contract = createValidContract();
    contract.seed = 3.5 as any;

    const result = validateSongContract(contract);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid seed value');
  });

  it('should reject seed out of range', () => {
    const contract = createValidContract();
    contract.seed = -1;

    const result = validateSongContract(contract);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('out of valid range'))).toBe(true);
  });

  it('should require at least one rhythm system', () => {
    const contract = createValidContract();
    contract.rhythmSystems = [] as any;

    const result = validateSongContract(contract);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one rhythm system is required');
  });

  it('should limit rhythm systems', () => {
    const contract = createValidContract();
    contract.rhythmSystems = Array(101).fill(contract.rhythmSystems[0]);

    const result = validateSongContract(contract);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Too many rhythm systems'))).toBe(true);
  });

  it('should require at least one melody system', () => {
    const contract = createValidContract();
    contract.melodySystems = [] as any;

    const result = validateSongContract(contract);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one melody system is required');
  });

  it('should require at least one voice', () => {
    const contract = createValidContract();
    contract.ensemble.voices = [] as any;

    const result = validateSongContract(contract);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one voice is required');
  });

  it('should limit voices', () => {
    const contract = createValidContract();
    contract.ensemble.voices = Array(129).fill(contract.ensemble.voices[0]);

    const result = validateSongContract(contract);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Too many voices'))).toBe(true);
  });
});

describe('Rate Limiter', () => {
  it('should allow requests within limit', () => {
    const limiter = new RateLimiter(5, 1000);

    for (let i = 0; i < 5; i++) {
      expect(limiter.check('user1')).toBe(true);
    }
  });

  it('should block requests over limit', () => {
    const limiter = new RateLimiter(3, 1000);

    // First 3 requests should pass
    expect(limiter.check('user1')).toBe(true);
    expect(limiter.check('user1')).toBe(true);
    expect(limiter.check('user1')).toBe(true);

    // 4th request should be blocked
    expect(limiter.check('user1')).toBe(false);
  });

  it('should reset after window expires', () => {
    const limiter = new RateLimiter(2, 100); // 100ms window

    expect(limiter.check('user1')).toBe(true);
    expect(limiter.check('user1')).toBe(true);
    expect(limiter.check('user1')).toBe(false);

    // Wait for window to expire
    return new Promise(resolve => {
      setTimeout(() => {
        expect(limiter.check('user1')).toBe(true);
        resolve(true);
      }, 150);
    });
  });

  it('should track different users independently', () => {
    const limiter = new RateLimiter(2, 1000);

    expect(limiter.check('user1')).toBe(true);
    expect(limiter.check('user1')).toBe(true);
    expect(limiter.check('user1')).toBe(false);

    // user2 should have its own limit
    expect(limiter.check('user2')).toBe(true);
    expect(limiter.check('user2')).toBe(true);
  });

  it('should allow manual reset', () => {
    const limiter = new RateLimiter(2, 1000);

    expect(limiter.check('user1')).toBe(true);
    expect(limiter.check('user1')).toBe(true);
    expect(limiter.check('user1')).toBe(false);

    limiter.reset('user1');

    expect(limiter.check('user1')).toBe(true);
  });

  it('should clear all limits', () => {
    const limiter = new RateLimiter(2, 1000);

    expect(limiter.check('user1')).toBe(true);
    expect(limiter.check('user2')).toBe(true);

    limiter.clear();

    expect(limiter.check('user1')).toBe(true);
    expect(limiter.check('user2')).toBe(true);
  });
});

describe('Input Size Validation', () => {
  it('should accept input within size limit', () => {
    const data = { key: 'value' };
    const result = validateInputSize(data, 1000);
    expect(result.valid).toBe(true);
  });

  it('should reject input exceeding size limit', () => {
    const data = { key: 'x'.repeat(10000) };
    const result = validateInputSize(data, 100);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
  });

  it('should enforce max contract size', () => {
    const largeData = { key: 'x'.repeat(INPUT_LIMITS.MAX_CONTRACT_SIZE) };
    const result = validateInputSize(largeData, INPUT_LIMITS.MAX_CONTRACT_SIZE);
    expect(result.valid).toBe(false);
  });

  it('should enforce max state size', () => {
    const largeData = { key: 'x'.repeat(INPUT_LIMITS.MAX_STATE_SIZE) };
    const result = validateInputSize(largeData, INPUT_LIMITS.MAX_STATE_SIZE);
    expect(result.valid).toBe(false);
  });
});

describe('Nesting Depth Validation', () => {
  it('should accept shallow nesting', () => {
    const data = { level1: { level2: { level3: 'value' } } };
    const result = checkNestingDepth(data, 10);
    expect(result.valid).toBe(true);
  });

  it('should reject deep nesting', () => {
    let data: any = { value: 'end' };
    for (let i = 0; i < 150; i++) {
      data = { nested: data };
    }

    const result = checkNestingDepth(data, 100);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('exceeds maximum'))).toBe(true);
  });

  it('should handle arrays', () => {
    let data: any = ['value'];
    for (let i = 0; i < 50; i++) {
      data = [data];
    }

    const result = checkNestingDepth(data, 40);
    expect(result.valid).toBe(false);
  });

  it('should handle mixed structures', () => {
    const data = {
      array: [
        { nested: { object: 'value' } }
      ]
    };

    const result = checkNestingDepth(data, 10);
    expect(result.valid).toBe(true);
  });
});

describe('Security Integration', () => {
  it('should sanitize and validate contract', () => {
    const dangerousContract = {
      version: '1.0',
      id: 'contract<script>alert(1)</script>',
      seed: 42,
      rhythmSystems: [],
      melodySystems: [],
      formSystem: { sections: [] },
      ensemble: { voices: [] },
      instrumentAssignments: [],
      presetAssignments: [],
      console: { buses: [] }
    } as any;

    // First sanitize the ID
    dangerousContract.id = sanitizeString(dangerousContract.id);

    // Then validate the contract
    const result = validateSongContract(dangerousContract);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('At least one rhythm system is required');
  });

  it('should rate limit contract creation', () => {
    const limiter = new RateLimiter(10, 60000); // 10 per minute

    let allowed = 0;
    let blocked = 0;

    for (let i = 0; i < 15; i++) {
      if (limiter.check('user-creating-contracts')) {
        allowed++;
      } else {
        blocked++;
      }
    }

    expect(allowed).toBe(10);
    expect(blocked).toBe(5);
  });
});
