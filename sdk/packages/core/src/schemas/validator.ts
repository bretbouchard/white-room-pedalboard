/**
 * JSON Schema Validator
 *
 * Provides schema validation using Ajv (Another JSON Schema Validator).
 * Used for validating SchillingerSong_v1, SongModel_v1, and other core types.
 */

import Ajv, { ValidateFunction, Options } from "ajv";
import addFormats from "ajv-formats";

/**
 * Schema validation error with path and message
 */
export interface ValidationError {
  path: string;
  message: string;
  params?: Record<string, unknown>;
}

/**
 * Schema validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Schema validator configuration
 */
export interface ValidatorConfig {
  coerceTypes?: boolean;
  useDefaults?: boolean;
  removeAdditional?: boolean;
  allErrors?: boolean;
}

/**
 * Default validator configuration
 */
const DEFAULT_OPTIONS: Options = {
  allErrors: true,
  coerceTypes: false,
  removeAdditional: false,
  useDefaults: false,
  strict: true,
  strictSchema: true,
  validateFormats: true,
  addUsedSchema: true,
};

/**
 * Schema validator class
 *
 * Provides centralized schema validation for all SDK types.
 */
export class SchemaValidator {
  private ajv: Ajv;

  constructor(config?: ValidatorConfig) {
    const options: Options = {
      ...DEFAULT_OPTIONS,
      ...(config || {}),
    };

    this.ajv = new Ajv(options);
    addFormats(this.ajv);

    // Add custom keywords for our schema extensions
    const customKeywords = [
      "schemaVersion",
      "songId",
      "systemId",
      "derivationId",
      "voiceId",
      "roleId",
      "ruleId",
      "groupId",
      "constraintId",
      "bindingId",
      "metadata",
      // Book properties
      "bookI_rhythmSystems",
      "bookII_melodySystems",
      "bookIII_harmonySystems",
      "bookIV_formSystem",
      "bookV_orchestration",
      // Other properties
      "ensembleModel",
      "globals",
      "bindings",
      "constraints",
      "provenance",
    ];

    customKeywords.forEach((keyword) => {
      this.ajv.addKeyword({
        keyword,
        validate: () => true,
      });
    });
  }

  /**
   * Add a schema to the validator
   *
   * @param schema - JSON Schema definition
   * @param name - Optional schema name/ID
   */
  addSchema(schema: Record<string, unknown>, name?: string): void {
    if (name) {
      // Check if schema already exists to avoid duplicate error
      if (this.ajv.getSchema(name)) {
        return; // Schema already registered
      }
      this.ajv.addSchema(schema, name);
    } else {
      this.ajv.addSchema(schema);
    }
  }

  /**
   * Validate data against a schema
   *
   * @param schema - JSON Schema definition or schema name
   * @param data - Data to validate
   * @returns Validation result with errors if invalid
   */
  validate(schema: Record<string, unknown> | string, data: unknown): ValidationResult {
    const validateFn: ValidateFunction =
      typeof schema === "string" ? this.getSchema(schema) : this.ajv.compile(schema);

    const valid = validateFn(data);

    if (valid) {
      return { valid: true, errors: [] };
    }

    const errors: ValidationError[] = (validateFn.errors || []).map((err) => ({
      path: err.instancePath || err.schemaPath || "(root)",
      message: err.message || "Unknown validation error",
      params: err.params,
    }));

    return { valid: false, errors };
  }

  /**
   * Get a compiled schema by name
   *
   * @param name - Schema name
   * @returns Compiled validation function
   */
  private getSchema(name: string): ValidateFunction {
    const schema = this.ajv.getSchema(name);
    if (!schema) {
      throw new Error(`Schema "${name}" not found. Ensure it was added via addSchema().`);
    }
    return schema;
  }

  /**
   * Remove a schema from the validator
   *
   * @param name - Schema name to remove
   */
  removeSchema(name: string): void {
    this.ajv.removeSchema(name);
  }

  /**
   * Clear all schemas from the validator
   */
  clearSchemas(): void {
    this.ajv.removeSchema();
  }

  /**
   * Get all registered schema names
   *
   * @returns Array of schema names
   */
  getSchemaNames(): string[] {
    return Object.keys(this.ajv.schemas).filter(
      (k) => k !== undefined && k !== "" && !k.startsWith("http://json-schema.org/")
    ) as string[];
  }
}

/**
 * Default singleton validator instance
 */
let defaultValidator: SchemaValidator | null = null;

/**
 * Get or create the default validator instance
 *
 * @param config - Optional validator configuration
 * @returns Default schema validator
 */
export function getValidator(config?: ValidatorConfig): SchemaValidator {
  if (!defaultValidator) {
    defaultValidator = new SchemaValidator(config);
  }
  return defaultValidator;
}

/**
 * Validate data against a schema using the default validator
 *
 * @param schema - JSON Schema definition or schema name
 * @param data - Data to validate
 * @returns Validation result
 */
export function validate(
  schema: Record<string, unknown> | string,
  data: unknown
): ValidationResult {
  return getValidator().validate(schema, data);
}

/**
 * Add a schema to the default validator
 *
 * @param schema - JSON Schema definition
 * @param name - Optional schema name
 */
export function addSchema(schema: Record<string, unknown>, name?: string): void {
  getValidator().addSchema(schema, name);
}
