/**
 * Request validation middleware for the API Gateway
 */

import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { ValidationError as _ValidationError } from "@schillinger-sdk/shared";

/**
 * Generic validation middleware factory
 */
export function validateSchema(
  schema: Joi.ObjectSchema,
  target: "body" | "query" | "params" = "body",
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const dataToValidate = req[target];
      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const details = error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
          value: detail.context?.value,
        }));

        throw new _ValidationError(
          "request data",
          dataToValidate,
          "valid request format",
          { details },
        );
      }

      // Replace the original data with the validated and sanitized data
      req[target] = value;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Common validation schemas
 */
export const schemas = {
  // Authentication schemas
  login: Joi.object({
    email: Joi.string().email().when("apiKey", {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    password: Joi.string().min(6).when("apiKey", {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    apiKey: Joi.string()
      .pattern(/^sk_[a-zA-Z0-9]{32,}$/)
      .optional(),
  }).xor("email", "apiKey"),

  // Rhythm pattern schemas
  rhythmPattern: Joi.object({
    durations: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .required(),
    // transport-agnostic: remove timeSignature/tempo from SDK rhythm
    swing: Joi.number().min(0).max(1).default(0),
    metadata: Joi.object().optional(),
  }),

  // Chord progression schemas
  chordProgression: Joi.object({
    chords: Joi.array().items(Joi.string().min(1)).min(1).required(),
    key: Joi.string()
      .valid(
        "C",
        "C#",
        "Db",
        "D",
        "D#",
        "Eb",
        "E",
        "F",
        "F#",
        "Gb",
        "G",
        "G#",
        "Ab",
        "A",
        "A#",
        "Bb",
        "B",
      )
      .required(),
    scale: Joi.string()
      .valid(
        "major",
        "minor",
        "dorian",
        "phrygian",
        "lydian",
        "mixolydian",
        "locrian",
        "harmonic_minor",
        "melodic_minor",
        "pentatonic_major",
        "pentatonic_minor",
        "blues",
        "chromatic",
      )
      .required(),
    metadata: Joi.object().optional(),
  }),

  // Melody line schemas
  melodyLine: Joi.object({
    notes: Joi.array()
      .items(Joi.number().integer().min(0).max(127))
      .min(1)
      .required(),
    durations: Joi.array()
      .items(Joi.number().integer().positive())
      .min(1)
      .required(),
    key: Joi.string()
      .valid(
        "C",
        "C#",
        "Db",
        "D",
        "D#",
        "Eb",
        "E",
        "F",
        "F#",
        "Gb",
        "G",
        "G#",
        "Ab",
        "A",
        "A#",
        "Bb",
        "B",
      )
      .required(),
    scale: Joi.string()
      .valid(
        "major",
        "minor",
        "dorian",
        "phrygian",
        "lydian",
        "mixolydian",
        "locrian",
        "harmonic_minor",
        "melodic_minor",
        "pentatonic_major",
        "pentatonic_minor",
        "blues",
        "chromatic",
      )
      .required(),
    metadata: Joi.object().optional(),
  }),

  // Composition schemas
  composition: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    sections: Joi.array()
      .items(
        Joi.object({
          type: Joi.string()
            .valid(
              "intro",
              "verse",
              "chorus",
              "bridge",
              "outro",
              "instrumental",
            )
            .required(),
          rhythm: Joi.object().required(), // Will be validated separately
          harmony: Joi.object().required(), // Will be validated separately
          melody: Joi.object().optional(), // Will be validated separately
          length: Joi.number().integer().positive().required(),
          position: Joi.number().integer().min(0).required(),
        }),
      )
      .min(1)
      .required(),
    key: Joi.string()
      .valid(
        "C",
        "C#",
        "Db",
        "D",
        "D#",
        "Eb",
        "E",
        "F",
        "F#",
        "Gb",
        "G",
        "G#",
        "Ab",
        "A",
        "A#",
        "Bb",
        "B",
      )
      .required(),
    scale: Joi.string()
      .valid(
        "major",
        "minor",
        "dorian",
        "phrygian",
        "lydian",
        "mixolydian",
        "locrian",
        "harmonic_minor",
        "melodic_minor",
        "pentatonic_major",
        "pentatonic_minor",
        "blues",
        "chromatic",
      )
      .required(),
    // transport-agnostic: remove transport fields from chord progression in SDK
    metadata: Joi.object().optional(),
  }),

  // Generator schemas for rhythm generation
  generators: Joi.object({
    a: Joi.number().integer().min(1).max(32).required(),
    b: Joi.number().integer().min(1).max(32).required(),
  }),

  // Variation schemas
  variation: Joi.object({
    type: Joi.string()
      .valid(
        "augmentation",
        "diminution",
        "retrograde",
        "rotation",
        "permutation",
        "fractioning",
      )
      .required(),
    parameters: Joi.object().optional(),
  }),

  // Pagination schemas
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().optional(),
    sortOrder: Joi.string().valid("asc", "desc").default("asc"),
  }),

  // Search schemas
  search: Joi.object({
    query: Joi.string().min(1).max(200).required(),
    filters: Joi.object().optional(),
    limit: Joi.number().integer().min(1).max(50).default(10),
  }),
};

/**
 * Pre-built validation middleware for common endpoints
 */
export const validationMiddleware = {
  validateLogin: validateSchema(schemas.login, "body"),
  validateRhythmPattern: validateSchema(schemas.rhythmPattern, "body"),
  validateChordProgression: validateSchema(schemas.chordProgression, "body"),
  validateMelodyLine: validateSchema(schemas.melodyLine, "body"),
  validateComposition: validateSchema(schemas.composition, "body"),
  validateGenerators: validateSchema(schemas.generators, "body"),
  validateVariation: validateSchema(schemas.variation, "body"),
  validatePagination: validateSchema(schemas.pagination, "query"),
  validateSearch: validateSchema(schemas.search, "query"),
};

/**
 * Validate array of items against a schema
 */
export function validateArray(
  itemSchema: Joi.Schema,
  minItems: number = 1,
  maxItems: number = 100,
) {
  const arraySchema = Joi.array().items(itemSchema).min(minItems).max(maxItems);
  return validateSchema(arraySchema as unknown as Joi.ObjectSchema, "body");
}

/**
 * Custom validation for complex nested objects
 */
export function validateNestedComposition(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    // First validate the main composition structure
    const { error: compositionError, value: composition } =
      schemas.composition.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });

    if (compositionError) {
      throw new _ValidationError(
        "composition",
        req.body,
        "valid composition format",
      );
    }

    // Then validate each section's nested objects
    for (let i = 0; i < composition.sections.length; i++) {
      const section = composition.sections[i];

      // Validate rhythm pattern
      const { error: rhythmError } = schemas.rhythmPattern.validate(
        section.rhythm,
      );
      if (rhythmError) {
        throw new _ValidationError(
          `sections[${i}].rhythm`,
          section.rhythm,
          "valid rhythm pattern",
        );
      }

      // Validate chord progression
      const { error: harmonyError } = schemas.chordProgression.validate(
        section.harmony,
      );
      if (harmonyError) {
        throw new _ValidationError(
          `sections[${i}].harmony`,
          section.harmony,
          "valid chord progression",
        );
      }

      // Validate melody if present
      if (section.melody) {
        const { error: melodyError } = schemas.melodyLine.validate(
          section.melody,
        );
        if (melodyError) {
          throw new _ValidationError(
            `sections[${i}].melody`,
            section.melody,
            "valid melody line",
          );
        }
      }
    }

    req.body = composition;
    next();
  } catch (err) {
    next(err);
  }
}
