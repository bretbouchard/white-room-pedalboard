/**
 * Schillinger SDK 2.1 - JSON Schema Validator
 *
 * Runtime JSON schema validation using AJV (Another JSON Schema Validator).
 * Provides type-safe validation for all SDK entities with clear error messages.
 */

import Ajv, { ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "fs";
import { join } from "path";

// Import JSON schemas
import schemaSchillingerSong from "../schemas/SchillingerSong_v1.schema.json";
import schemaSongModel from "../schemas/SongModel_v1.schema.json";
import schemaPerformanceState from "../schemas/PerformanceState_v1.schema.json";

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

export interface ValidationResult<T = unknown> {
  valid: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  instancePath: string;
  schemaPath: string;
  keyword: string;
  params?: Record<string, unknown>;
  message: string;
}

// =============================================================================
// SCHEMA VALIDATOR CLASS
// =============================================================================

export class SchemaValidator {
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction> = new Map();

  constructor() {
    // Initialize AJV with all formats
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      validateFormats: true,
    });
    addFormats(this.ajv);

    // Load schemas
    this.loadSchemas();
  }

  /**
   * Load all JSON schemas and compile validators
   */
  private loadSchemas(): void {
    // Add schemas to AJV
    this.ajv.addSchema(schemaSchillingerSong, "SchillingerSong_v1");
    this.ajv.addSchema(schemaSongModel, "SongModel_v1");
    this.ajv.addSchema(schemaPerformanceState, "PerformanceState_v1");

    // Compile validators for common entities
    this.compileValidator("SchillingerSong_v1", schemaSchillingerSong);
    this.compileValidator("SongModel_v1", schemaSongModel);
    this.compileValidator("PerformanceState_v1", schemaPerformanceState);
  }

  /**
   * Compile a validator for a specific schema
   */
  private compileValidator(
    name: string,
    schema: Record<string, unknown>,
  ): void {
    const validate = this.ajv.compile(schema);
    this.validators.set(name, validate);
  }

  /**
   * Validate a SchillingerSong_v1 object
   */
  validateSchillingerSong(data: unknown): ValidationResult {
    return this.validate("SchillingerSong_v1", data);
  }

  /**
   * Validate a SongModel_v1 object
   */
  validateSongModel(data: unknown): ValidationResult {
    return this.validate("SongModel_v1", data);
  }

  /**
   * Validate a PerformanceState_v1 object
   */
  validatePerformanceState(data: unknown): ValidationResult {
    return this.validate("PerformanceState_v1", data);
  }

  /**
   * Generic validation method
   */
  validate<T = unknown>(
    schemaName: string,
    data: unknown,
  ): ValidationResult<T> {
    const validate = this.validators.get(schemaName);

    if (!validate) {
      return {
        valid: false,
        errors: [
          {
            instancePath: "",
            schemaPath: "",
            keyword: "schema-not-found",
            message: `Schema '${schemaName}' not found`,
          },
        ],
      };
    }

    const valid = validate(data);

    if (valid) {
      return {
        valid: true,
        data: data as T,
      };
    }

    return {
      valid: false,
      errors: this.formatErrors(validate.errors),
    };
  }

  /**
   * Format AJV errors into more readable format
   */
  private formatErrors(
    errors: unknown[] | null | undefined,
  ): ValidationError[] {
    if (!errors || errors.length === 0) {
      return [];
    }

    return errors.map((err) => {
      const error = err as Record<string, unknown>;
      return {
        instancePath: (error.instancePath as string) || "",
        schemaPath: (error.schemaPath as string) || "",
        keyword: (error.keyword as string) || "",
        params: error.params as Record<string, unknown>,
        message: this.errorMessage(error),
      };
    });
  }

  /**
   * Generate human-readable error message
   */
  private errorMessage(error: Record<string, unknown>): string {
    const { instancePath, keyword, params } = error;
    const path = instancePath ? `At ${instancePath as string}: ` : "";

    switch (keyword as string) {
      case "type":
        return `${path}Expected type ${(params as Record<string, unknown>)?.type}`;
      case "enum":
        return `${path}Must be one of: ${(params as Record<string, unknown>)?.allowedValues}`;
      case "minimum":
        return `${path}Must be >= ${(params as Record<string, unknown>)?.minimum}`;
      case "maximum":
        return `${path}Must be <= ${(params as Record<string, unknown>)?.maximum}`;
      case "required":
        return `${path}Missing required property: ${(params as Record<string, unknown>)?.missingProperty}`;
      case "pattern":
        return `${path}Must match pattern: ${(params as Record<string, unknown>)?.pattern}`;
      case "format":
        return `${path}Must match format: ${(params as Record<string, unknown>)?.format}`;
      case "minLength":
        return `${path}Must be at least ${(params as Record<string, unknown>)?.limit} characters`;
      case "maxLength":
        return `${path}Must be at most ${(params as Record<string, unknown>)?.limit} characters`;
      default:
        return `${path}Validation failed: ${keyword}`;
    }
  }

  /**
   * Get list of available schema names
   */
  getAvailableSchemas(): string[] {
    return Array.from(this.validators.keys());
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let validatorInstance: SchemaValidator | null = null;

export function getValidator(): SchemaValidator {
  if (!validatorInstance) {
    validatorInstance = new SchemaValidator();
  }
  return validatorInstance;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Validate a SchillingerSong object
 */
export function validateSchillingerSong(data: unknown): ValidationResult {
  return getValidator().validateSchillingerSong(data);
}

/**
 * Validate a SongModel object
 */
export function validateSongModel(data: unknown): ValidationResult {
  return getValidator().validateSongModel(data);
}

/**
 * Validate a PerformanceState object
 */
export function validatePerformanceState(data: unknown): ValidationResult {
  return getValidator().validatePerformanceState(data);
}

/**
 * Check if data is valid (throws if invalid)
 */
export function assertValid<T = unknown>(schemaName: string, data: unknown): T {
  const validator = getValidator();
  const result = validator.validate<T>(schemaName, data);

  if (!result.valid) {
    const errorMessages = result.errors?.map((e) => e.message).join("\n");
    throw new Error(`Schema validation failed:\n${errorMessages}`);
  }

  return result.data!;
}
