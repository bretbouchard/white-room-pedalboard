/**
 * UUID Utilities
 *
 * Provides UUID generation and validation utilities.
 * Uses the uuid library for cross-platform consistency.
 */

import { v4 as uuidv4, validate as uuidValidate } from "uuid";

/**
 * Generate a new UUID v4
 *
 * Uses the uuid library for RFC 4122 v4 UUID generation.
 * Guaranteed to be cryptographically random and unique.
 *
 * @returns New UUID v4 string
 *
 * @example
 * ```typescript
 * const id = generateUUID();
 * console.log(id); // "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Validate a UUID string
 *
 * Checks if a string is a valid UUID v4.
 *
 * @param id - String to validate
 * @returns True if valid UUID, false otherwise
 *
 * @example
 * ```typescript
 * isValidUUID('550e8400-e29b-41d4-a716-446655440000'); // true
 * isValidUUID('not-a-uuid'); // false
 * ```
 */
export function isValidUUID(id: string): boolean {
  return uuidValidate(id);
}

/**
 * Assert that a value is a valid UUID
 *
 * Throws an error if the value is not a valid UUID.
 *
 * @param id - Value to check
 * @param name - Optional name for error message
 * @throws Error if id is not a valid UUID
 *
 * @example
 * ```typescript
 * assertUUID('550e8400-e29b-41d4-a716-446655440000', 'songId');
 * // OK
 *
 * assertUUID('invalid', 'songId');
 * // Throws: Error: Invalid songId: not a valid UUID
 * ```
 */
export function assertUUID(id: string, name?: string): void {
  if (!isValidUUID(id)) {
    const prefix = name ? `Invalid ${name}` : "Invalid UUID";
    throw new Error(`${prefix}: "${id}" is not a valid UUID v4`);
  }
}

/**
 * Generate multiple UUIDs at once
 *
 * Useful for batch initialization.
 *
 * @param count - Number of UUIDs to generate
 * @returns Array of UUID strings
 *
 * @example
 * ```typescript
 * const ids = generateUUIDs(5);
 * console.log(ids); // [uuid1, uuid2, uuid3, uuid4, uuid5]
 * ```
 */
export function generateUUIDs(count: number): string[] {
  if (count < 0) {
    throw new Error(`Cannot generate ${count} UUIDs (must be non-negative)`);
  }

  if (count === 0) {
    return [];
  }

  const uuids: string[] = [];
  for (let i = 0; i < count; i++) {
    uuids.push(generateUUID());
  }

  return uuids;
}

/**
 * Check if multiple values are valid UUIDs
 *
 * Returns true only if all values are valid UUIDs.
 *
 * @param ids - Array of strings to check
 * @returns True if all are valid UUIDs, false otherwise
 *
 * @example
 * ```typescript
 * areAllValidUUIDs(['uuid1', 'uuid2']); // true
 * areAllValidUUIDs(['uuid1', 'invalid']); // false
 * ```
 */
export function areAllValidUUIDs(ids: string[]): boolean {
  return ids.every(isValidUUID);
}

/**
 * Filter out invalid UUIDs from an array
 *
 * @param ids - Array of strings to filter
 * @returns Array containing only valid UUIDs
 *
 * @example
 * ```typescript
 * const mixed = ['valid-uuid', 'invalid', 'another-valid-uuid'];
 * const validOnly = filterValidUUIDs(mixed);
 * // ['valid-uuid', 'another-valid-uuid']
 * ```
 */
export function filterValidUUIDs(ids: string[]): string[] {
  return ids.filter(isValidUUID);
}

/**
 * UUID v4 placeholder for testing
 *
 * Returns a deterministic UUID for use in tests.
 * Format: 00000000-0000-4000-8000-000000000000
 *
 * @returns Test UUID placeholder
 */
export function testUUID(): string {
  return "00000000-0000-4000-8000-000000000000";
}

/**
 * Nil UUID (all zeros)
 *
 * Special UUID value defined in RFC 4122.
 * Format: 00000000-0000-0000-0000-000000000000
 *
 * @returns Nil UUID
 */
export function nilUUID(): string {
  return "00000000-0000-0000-0000-000000000000";
}

/**
 * Check if a UUID is the nil UUID
 *
 * @param id - UUID to check
 * @returns True if nil UUID, false otherwise
 */
export function isNilUUID(id: string): boolean {
  return id === nilUUID();
}
