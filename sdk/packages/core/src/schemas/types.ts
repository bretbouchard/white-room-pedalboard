/**
 * Schema Type Utilities
 *
 * Helper functions for generating and working with JSON Schemas
 * from TypeScript types.
 */

/**
 * JSON Schema format
 */
export interface JSONSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
  properties?: Record<string, JSONSchema>;
  additionalProperties?: boolean | JSONSchema;
  required?: string[];
  items?: JSONSchema;
  enum?: unknown[];
  const?: unknown;
  format?: string;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  oneOf?: JSONSchema[];
  not?: JSONSchema;
  $ref?: string;
  definitions?: Record<string, JSONSchema>;
}

/**
 * Create a basic object schema
 *
 * @param properties - Schema properties
 * @param required - Required property names
 * @returns Object schema
 */
export function objectSchema(
  properties: Record<string, JSONSchema>,
  required?: string[]
): JSONSchema {
  return {
    type: "object",
    properties,
    ...(required && required.length > 0 ? { required } : {}),
  };
}

/**
 * Create an array schema
 *
 * @param items - Schema for array items
 * @param minItems - Minimum item count
 * @param maxItems - Maximum item count
 * @returns Array schema
 */
export function arraySchema(items: JSONSchema, minItems?: number, maxItems?: number): JSONSchema {
  const schema: JSONSchema = {
    type: "array",
    items,
  };

  if (minItems !== undefined) {
    schema.minItems = minItems;
  }

  if (maxItems !== undefined) {
    schema.maxItems = maxItems;
  }

  return schema;
}

/**
 * Create a string schema
 *
 * @param format - Optional format (email, uuid, etc.)
 * @param minLength - Minimum length
 * @param maxLength - Maximum length
 * @param pattern - Regex pattern
 * @returns String schema
 */
export function stringSchema(
  format?: string,
  minLength?: number,
  maxLength?: number,
  pattern?: string
): JSONSchema {
  const schema: JSONSchema = {
    type: "string",
    ...(format && { format }),
  };

  if (minLength !== undefined) {
    schema.minLength = minLength;
  }

  if (maxLength !== undefined) {
    schema.maxLength = maxLength;
  }

  if (pattern !== undefined) {
    schema.pattern = pattern;
  }

  return schema;
}

/**
 * Create a number schema
 *
 * @param minimum - Minimum value
 * @param maximum - Maximum value
 * @param multipleOf - Must be multiple of this value
 * @returns Number schema
 */
export function numberSchema(minimum?: number, maximum?: number, multipleOf?: number): JSONSchema {
  const schema: JSONSchema = {
    type: "number",
  };

  if (minimum !== undefined) {
    schema.minimum = minimum;
  }

  if (maximum !== undefined) {
    schema.maximum = maximum;
  }

  if (multipleOf !== undefined) {
    schema.multipleOf = multipleOf;
  }

  return schema;
}

/**
 * Create an integer schema
 *
 * @param minimum - Minimum value
 * @param maximum - Maximum value
 * @param multipleOf - Must be multiple of this value
 * @returns Integer schema
 */
export function integerSchema(minimum?: number, maximum?: number, multipleOf?: number): JSONSchema {
  return {
    ...numberSchema(minimum, maximum, multipleOf),
    type: "integer",
  };
}

/**
 * Create a UUID string schema
 *
 * @returns UUID schema
 */
export function uuidSchema(): JSONSchema {
  return stringSchema("uuid");
}

/**
 * Create an enum schema
 *
 * @param values - Enum values
 * @returns Enum schema
 */
export function enumSchema<T extends string>(values: T[]): JSONSchema {
  return {
    type: "string",
    enum: values,
  };
}

/**
 * Combine schemas with anyOf (at least one must match)
 *
 * @param schemas - Schemas to combine
 * @returns Combined schema
 */
export function anyOfSchema(...schemas: JSONSchema[]): JSONSchema {
  return {
    anyOf: schemas,
  };
}

/**
 * Combine schemas with allOf (all must match)
 *
 * @param schemas - Schemas to combine
 * @returns Combined schema
 */
export function allOfSchema(...schemas: JSONSchema[]): JSONSchema {
  return {
    allOf: schemas,
  };
}

/**
 * Combine schemas with oneOf (exactly one must match)
 *
 * @param schemas - Schemas to combine
 * @returns Combined schema
 */
export function oneOfSchema(...schemas: JSONSchema[]): JSONSchema {
  return {
    oneOf: schemas,
  };
}
