/**
 * Type declarations for the native binding module
 */

export interface FFIBindings {
  ping(message?: string): string;
  testError(): never;
  serializeJSON(obj: unknown): string;
  deserializeJSON(json: string): unknown;
}

declare const bindings: FFIBindings;
export default bindings;
