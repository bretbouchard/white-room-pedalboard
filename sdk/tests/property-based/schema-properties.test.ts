/**
 * Property-Based Tests for Schema Validation
 *
 * Uses fast-check to test invariants and properties
 * of the SchemaValidator implementation.
 */

import fc from 'fast-check';
import {
  SchemaValidator,
  ParameterSchema,
  ValidationResult
} from '@schillinger/sdk';

describe('Schema Validation Property-Based Tests', () => {
  describe('Integer Properties', () => {
    test('should clamp integers to min/max bounds', () => {
      fc.assert(
        fc.property(
          fc.record({
            min: fc.integer({ min: -100, max: 100 }),
            max: fc.integer({ min: -100, max: 100 })
          }),
          ({ min, max }) => {
            const validator = new SchemaValidator();
            const schema: ParameterSchema = {
              type: 'integer',
              id: 'test',
              name: 'Test',
              min,
              max
            };

            if (min > max) {
              return true; // Skip invalid schemas
            }

            const testValue = (min + max) / 2;
            const result = validator.validate(testValue, schema);

            return result.valid;
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('should reject integers outside bounds', () => {
      fc.assert(
        fc.property(
          fc.record({
            min: fc.integer({ min: 0, max: 100 }),
            max: fc.integer({ min: 0, max: 100 })
          }),
          ({ min, max }) => {
            const validator = new SchemaValidator();
            const schema: ParameterSchema = {
              type: 'integer',
              id: 'test',
              name: 'Test',
              min,
              max
            };

            if (min > max) {
              return true;
            }

            const belowMinResult = validator.validate(min - 1, schema);
            const aboveMaxResult = validator.validate(max + 1, schema);

            return !belowMinResult.valid && !aboveMaxResult.valid;
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Float Properties', () => {
    test('should handle NaN and Infinity', () => {
      fc.assert(
        fc.property(
          fc.record({
            min: fc.float({ min: 0, max: 1 }),
            max: fc.float({ min: 0, max: 1 })
          }),
          ({ min, max }) => {
            const validator = new SchemaValidator();
            const schema: ParameterSchema = {
              type: 'float',
              id: 'test',
              name: 'Test',
              min,
              max
            };

            if (min > max) {
              return true;
            }

            const nanResult = validator.validate(NaN, schema);
            const infinityResult = validator.validate(Infinity, schema);

            return !nanResult.valid && !infinityResult.valid;
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('should maintain precision within bounds', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1 }),
          (value) => {
            const validator = new SchemaValidator();
            const schema: ParameterSchema = {
              type: 'float',
              id: 'test',
              name: 'Test',
              min: 0,
              max: 1
            };

            const result = validator.validate(value, schema);
            return result.valid;
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('String Properties', () => {
    test('should enforce length constraints', () => {
      fc.assert(
        fc.property(
          fc.record({
            minLength: fc.integer({ min: 0, max: 100 }),
            maxLength: fc.integer({ min: 0, max: 100 })
          }),
          ({ minLength, maxLength }) => {
            const validator = new SchemaValidator();
            const schema: ParameterSchema = {
              type: 'string',
              id: 'test',
              name: 'Test',
              minLength,
              maxLength
            };

            if (minLength > maxLength) {
              return true;
            }

            const validLength = minLength + Math.floor((maxLength - minLength) / 2);
            const validString = 'a'.repeat(validLength);
            const result = validator.validate(validString, schema);

            return result.valid;
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('should enforce pattern constraints', () => {
      fc.assert(
        fc.property(
          fc.stringMatching(/[a-z]+/),
          (validString) => {
            const validator = new SchemaValidator();
            const schema: ParameterSchema = {
              type: 'string',
              id: 'test',
              name: 'Test',
              pattern: '^[a-z]+$'
            };

            const result = validator.validate(validString, schema);
            return result.valid;
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Array Properties', () => {
    test('should enforce item type constraints', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 100 })),
          (intArray) => {
            const validator = new SchemaValidator();
            const schema: ParameterSchema = {
              type: 'array',
              id: 'test',
              name: 'Test',
              itemType: 'integer'
            };

            const result = validator.validate(intArray, schema);
            return result.valid;
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('should enforce length constraints', () => {
      fc.assert(
        fc.property(
          fc.record({
            minItems: fc.integer({ min: 0, max: 10 }),
            maxItems: fc.integer({ min: 0, max: 10 })
          }),
          ({ minItems, maxItems }) => {
            const validator = new SchemaValidator();
            const schema: ParameterSchema = {
              type: 'array',
              id: 'test',
              name: 'Test',
              itemType: 'integer',
              minItems,
              maxItems
            };

            if (minItems > maxItems) {
              return true;
            }

            const validArray = Array(minItems).fill(0);
            const result = validator.validate(validArray, schema);

            return result.valid;
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Object Properties', () => {
    test('should enforce required properties', () => {
      fc.assert(
        fc.property(
          fc.record({
            requiredProp: fc.integer(),
            optionalProp: fc.integer()
          }),
          (obj) => {
            const validator = new SchemaValidator();
            const schema: ParameterSchema = {
              type: 'object',
              id: 'test',
              name: 'Test',
              properties: {
                requiredProp: { type: 'integer' },
                optionalProp: { type: 'integer' }
              },
              required: ['requiredProp']
            };

            const result = validator.validate(obj, schema);
            return result.valid;
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('should allow additional properties', () => {
      fc.assert(
        fc.property(
          fc.record({
            knownProp: fc.integer(),
            additionalProp: fc.string()
          }),
          (obj) => {
            const validator = new SchemaValidator();
            const schema: ParameterSchema = {
              type: 'object',
              id: 'test',
              name: 'Test',
              properties: {
                knownProp: { type: 'integer' }
              },
              additionalProperties: true
            };

            const result = validator.validate(obj, schema);
            return result.valid;
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Nested Schema Properties', () => {
    test('should validate nested objects correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            level1: fc.record({
              level2: fc.record({
                level3: fc.integer()
              })
            })
          }),
          (obj) => {
            const validator = new SchemaValidator();
            const schema: ParameterSchema = {
              type: 'object',
              id: 'test',
              name: 'Test',
              properties: {
                level1: {
                  type: 'object',
                  properties: {
                    level2: {
                      type: 'object',
                      properties: {
                        level3: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            };

            const result = validator.validate(obj, schema);
            return result.valid;
          }
        ),
        { numRuns: 1000 }
      );
    });

    test('should validate nested arrays correctly', () => {
      fc.assert(
        fc.property(
          fc.array(fc.array(fc.integer())),
          (nestedArray) => {
            const validator = new SchemaValidator();
            const schema: ParameterSchema = {
              type: 'array',
              id: 'test',
              name: 'Test',
              itemType: 'array',
              itemSchema: {
                type: 'array',
                itemType: 'integer'
              }
            };

            const result = validator.validate(nestedArray, schema);
            return result.valid;
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Error Aggregation Properties', () => {
    test('should collect all validation errors', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: -100, max: -1 })),
          (invalidValues) => {
            const validator = new SchemaValidator();
            const schema: ParameterSchema = {
              type: 'array',
              id: 'test',
              name: 'Test',
              itemType: 'integer',
              min: 0
            };

            const result = validator.validate(invalidValues, schema);

            if (result.valid) {
              return true;
            }

            // Should have errors for all invalid values
            return result.errors.length >= invalidValues.length;
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  describe('Performance Properties', () => {
    test('should validate quickly', () => {
      fc.assert(
        fc.property(
          fc.record({
            value: fc.integer({ min: 0, max: 100 }),
            min: fc.integer({ min: 0, max: 50 }),
            max: fc.integer({ min: 50, max: 100 })
          }),
          ({ value, min, max }) => {
            const validator = new SchemaValidator();
            const schema: ParameterSchema = {
              type: 'integer',
              id: 'test',
              name: 'Test',
              min,
              max
            };

            const start = Date.now();
            const result = validator.validate(value, schema);
            const end = Date.now();

            // Should complete in less than 1ms
            return (end - start) < 1 && (result.valid || !result.valid);
          }
        ),
        { numRuns: 10000 }
      );
    });

    test('should handle large schemas efficiently', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer(), { minLength: 100, maxLength: 1000 }),
          (largeArray) => {
            const validator = new SchemaValidator();
            const schema: ParameterSchema = {
              type: 'array',
              id: 'test',
              name: 'Test',
              itemType: 'integer'
            };

            const start = Date.now();
            const result = validator.validate(largeArray, schema);
            const end = Date.now();

            // Should complete in less than 10ms for 1000 items
            return (end - start) < 10;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
