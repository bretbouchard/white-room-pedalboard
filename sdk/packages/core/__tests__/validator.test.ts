/**
 * Schema Validator Tests
 *
 * Tests for JSON Schema validation framework
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  SchemaValidator,
  validate,
  addSchema,
  objectSchema,
  stringSchema,
  numberSchema,
  uuidSchema,
  enumSchema,
  arraySchema,
  type JSONSchema,
} from "../src/schemas";

describe("SchemaValidator", () => {
  let validator: SchemaValidator;

  beforeEach(() => {
    validator = new SchemaValidator();
  });

  describe("basic validation", () => {
    it("should validate valid data against schema", () => {
      const schema: JSONSchema = objectSchema({
        name: stringSchema(),
        age: numberSchema(0, 150),
      });

      const result = validator.validate(schema, { name: "John", age: 30 });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return errors for invalid data", () => {
      const schema: JSONSchema = objectSchema(
        {
          name: stringSchema(),
          age: numberSchema(0, 150),
        },
        ["name", "age"]
      );

      const result = validator.validate(schema, { name: "John" });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].path).toBeTruthy();
      expect(result.errors[0].message).toBeTruthy();
    });

    it("should validate UUID strings", () => {
      const schema: JSONSchema = objectSchema({
        id: uuidSchema(),
      });

      const validResult = validator.validate(schema, {
        id: "550e8400-e29b-41d4-a716-446655440000",
      });

      expect(validResult.valid).toBe(true);

      const invalidResult = validator.validate(schema, {
        id: "not-a-uuid",
      });

      expect(invalidResult.valid).toBe(false);
    });

    it("should validate enum values", () => {
      const schema: JSONSchema = objectSchema({
        status: enumSchema(["active", "inactive", "pending"]),
      });

      const validResult = validator.validate(schema, { status: "active" });
      expect(validResult.valid).toBe(true);

      const invalidResult = validator.validate(schema, { status: "unknown" });
      expect(invalidResult.valid).toBe(false);
    });

    it("should validate arrays", () => {
      const schema: JSONSchema = objectSchema({
        items: arraySchema(numberSchema(), 1, 5),
      });

      const validResult = validator.validate(schema, { items: [1, 2, 3] });
      expect(validResult.valid).toBe(true);

      const tooFewResult = validator.validate(schema, { items: [] });
      expect(tooFewResult.valid).toBe(false);

      const tooManyResult = validator.validate(schema, { items: [1, 2, 3, 4, 5, 6] });
      expect(tooManyResult.valid).toBe(false);
    });
  });

  describe("schema management", () => {
    it("should add and retrieve schemas by name", () => {
      const schema: JSONSchema = objectSchema({
        name: stringSchema(),
      });

      validator.addSchema(schema, "person");

      const result = validator.validate("person", { name: "Alice" });

      expect(result.valid).toBe(true);
    });

    it("should list registered schema names", () => {
      const schema1: JSONSchema = objectSchema({ name: stringSchema() });
      const schema2: JSONSchema = objectSchema({ age: numberSchema() });

      validator.addSchema(schema1, "schema1");
      validator.addSchema(schema2, "schema2");

      const names = validator.getSchemaNames();

      expect(names).toContain("schema1");
      expect(names).toContain("schema2");
    });

    it("should remove schemas", () => {
      const schema: JSONSchema = objectSchema({ name: stringSchema() });

      validator.addSchema(schema, "temp");
      expect(validator.getSchemaNames()).toContain("temp");

      validator.removeSchema("temp");
      expect(validator.getSchemaNames()).not.toContain("temp");
    });

    it("should clear all schemas", () => {
      const schema: JSONSchema = objectSchema({ name: stringSchema() });

      validator.addSchema(schema, "temp1");
      validator.addSchema(schema, "temp2");

      expect(validator.getSchemaNames().length).toBeGreaterThan(0);

      validator.clearSchemas();
      expect(validator.getSchemaNames()).toHaveLength(0);
    });
  });

  describe("default validator", () => {
    it("should use default singleton validator", () => {
      const schema: JSONSchema = objectSchema({
        name: stringSchema(),
      });

      addSchema(schema, "test");

      const result = validate("test", { name: "Test" });

      expect(result.valid).toBe(true);
    });
  });

  describe("error formatting", () => {
    it("should provide detailed error information", () => {
      const schema: JSONSchema = objectSchema(
        {
          name: stringSchema(),
          age: numberSchema(0, 150),
          email: stringSchema("email"),
        },
        ["name", "age", "email"]
      );

      const result = validator.validate(schema, {
        name: "Bob",
        age: 200, // Invalid: exceeds maximum
        email: "not-an-email", // Invalid: not email format
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      // Check error structure
      result.errors.forEach((error) => {
        expect(error.path).toBeTruthy();
        expect(error.message).toBeTruthy();
      });
    });
  });
});
