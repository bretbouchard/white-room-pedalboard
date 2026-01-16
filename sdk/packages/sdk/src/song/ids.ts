/**
 * ID Generation Utilities
 *
 * Provides utility functions for generating IDs and timestamps.
 */

/**
 * Generate a unique ID
 *
 * @returns Unique ID string
 */
export function generateId(): string {
  return `id-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Get current timestamp
 *
 * @returns Current timestamp in milliseconds
 */
export function now(): number {
  return Date.now();
}
