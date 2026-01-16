/**
 * Schema Validation Edge Cases Tests
 *
 * Tests for edge cases, boundary conditions, and error handling
 * in schema validation for plugin parameters and state.
 */

import {
  SchemaValidator,
  ParameterSchema,
  ValidationResult,
  ValidationError
} from '@schillinger/sdk';

describe('Schema Validation Edge Cases', () => {
  describe('Parameter Type Edge Cases', () => {
    test('should validate boolean parameters', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'boolean',
        id: 'test_bool',
        name: 'Test Boolean'
      };

      expect(validator.validate(true, schema).valid).toBe(true);
      expect(validator.validate(false, schema).valid).toBe(true);
      expect(validator.validate('true', schema).valid).toBe(false);
      expect(validator.validate(1, schema).valid).toBe(false);
    });

    test('should validate integer parameters at boundaries', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'integer',
        id: 'test_int',
        name: 'Test Integer',
        min: 0,
        max: 100
      };

      expect(validator.validate(0, schema).valid).toBe(true);
      expect(validator.validate(100, schema).valid).toBe(true);
      expect(validator.validate(-1, schema).valid).toBe(false);
      expect(validator.validate(101, schema).valid).toBe(false);
    });

    test('should validate floating point parameters at boundaries', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'float',
        id: 'test_float',
        name: 'Test Float',
        min: 0.0,
        max: 1.0
      };

      expect(validator.validate(0.0, schema).valid).toBe(true);
      expect(validator.validate(1.0, schema).valid).toBe(true);
      expect(validator.validate(-0.0001, schema).valid).toBe(false);
      expect(validator.validate(1.0001, schema).valid).toBe(false);
    });

    test('should handle very small and very large numbers', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'float',
        id: 'test_extreme',
        name: 'Test Extreme',
        min: Number.MIN_VALUE,
        max: Number.MAX_VALUE
      };

      expect(validator.validate(Number.MIN_VALUE, schema).valid).toBe(true);
      expect(validator.validate(Number.MAX_VALUE, schema).valid).toBe(true);
    });
  });

  describe('String Parameter Edge Cases', () => {
    test('should validate string length constraints', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'string',
        id: 'test_string',
        name: 'Test String',
        minLength: 1,
        maxLength: 10
      };

      expect(validator.validate('a', schema).valid).toBe(true);
      expect(validator.validate('abcdefghij', schema).valid).toBe(true);
      expect(validator.validate('', schema).valid).toBe(false);
      expect(validator.validate('abcdefghijk', schema).valid).toBe(false);
    });

    test('should validate string patterns', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'string',
        id: 'test_pattern',
        name: 'Test Pattern',
        pattern: '^[a-z]+$'
      };

      expect(validator.validate('abc', schema).valid).toBe(true);
      expect(validator.validate('ABC', schema).valid).toBe(false);
      expect(validator.validate('abc123', schema).valid).toBe(false);
    });

    test('should validate enum strings', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'string',
        id: 'test_enum',
        name: 'Test Enum',
        enum: ['option1', 'option2', 'option3']
      };

      expect(validator.validate('option1', schema).valid).toBe(true);
      expect(validator.validate('option4', schema).valid).toBe(false);
    });
  });

  describe('Array Parameter Edge Cases', () => {
    test('should validate empty arrays', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'array',
        id: 'test_array',
        name: 'Test Array',
        itemType: 'float'
      };

      expect(validator.validate([], schema).valid).toBe(true);
    });

    test('should validate array length constraints', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'array',
        id: 'test_array_length',
        name: 'Test Array Length',
        itemType: 'float',
        minItems: 1,
        maxItems: 10
      };

      expect(validator.validate([1.0], schema).valid).toBe(true);
      expect(validator.validate([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0], schema).valid).toBe(true);
      expect(validator.validate([], schema).valid).toBe(false);
      expect(validator.validate([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], schema).valid).toBe(false);
    });

    test('should validate nested arrays', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'array',
        id: 'test_nested',
        name: 'Test Nested',
        itemType: 'array',
        itemSchema: {
          type: 'array',
          itemType: 'float'
        }
      };

      expect(validator.validate([[1.0, 2.0], [3.0, 4.0]], schema).valid).toBe(true);
    });
  });

  describe('Object Parameter Edge Cases', () => {
    test('should validate empty objects', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'object',
        id: 'test_object',
        name: 'Test Object',
        properties: {}
      };

      expect(validator.validate({}, schema).valid).toBe(true);
    });

    test('should validate nested objects', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'object',
        id: 'test_nested_object',
        name: 'Test Nested Object',
        properties: {
          level1: {
            type: 'object',
            properties: {
              level2: {
                type: 'float'
              }
            }
          }
        }
      };

      expect(validator.validate({ level1: { level2: 1.0 } }, schema).valid).toBe(true);
    });

    test('should validate required properties', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'object',
        id: 'test_required',
        name: 'Test Required',
        properties: {
          requiredProp: { type: 'float' },
          optionalProp: { type: 'float' }
        },
        required: ['requiredProp']
      };

      expect(validator.validate({ requiredProp: 1.0 }, schema).valid).toBe(true);
      expect(validator.validate({ optionalProp: 1.0 }, schema).valid).toBe(false);
    });
  });

  describe('Error Messages', () => {
    test('should provide clear error messages', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'integer',
        id: 'test_error',
        name: 'Test Error',
        min: 0,
        max: 100
      };

      const result: ValidationResult = validator.validate(150, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('max');
    });

    test('should aggregate multiple errors', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'object',
        id: 'test_multiple_errors',
        name: 'Test Multiple Errors',
        properties: {
          prop1: { type: 'integer', min: 0 },
          prop2: { type: 'string', minLength: 5 }
        },
        required: ['prop1', 'prop2']
      };

      const result: ValidationResult = validator.validate({
        prop1: -1,
        prop2: 'abc'
      }, schema);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Schema Validation Edge Cases', () => {
    test('should validate circular references', () => {
      const validator = new SchemaValidator();
      const schema: ParameterSchema = {
        type: 'object',
        id: 'test_circular',
        name: 'Test Circular',
        properties: {
          self: {
            type: 'object',
            properties: {},
            recursive: true
          }
        }
      };

      expect(validator.validate({ self: { self: {} } }, schema).valid).toBe(true);
    });

    test('should handle deeply nested schemas', () => {
      const validator = new SchemaValidator();
      let schema: ParameterSchema = {
        type: 'object',
        id: 'test_deep',
        name: 'Test Deep',
        properties: {}
      };

      // Create 100 levels of nesting
      for (let i = 0; i < 100; i++) {
        schema.properties!['level' + i] = {
          type: 'object',
          properties: {},
          recursive: true
        };
      }

      const value: any = {};
      let current = value;
      for (let i = 0; i < 100; i++) {
        current['level' + i] = {};
        current = current['level' + i];
      }

      expect(validator.validate(value, schema).valid).toBe(true);
    });
  });
});
