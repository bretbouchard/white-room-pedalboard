/**
 * PerformanceContextIR - Runtime Constraints
 *
 * Captures runtime constraints without leaking platform logic into generators.
 *
 * Responsibility:
 * - Realtime vs offline mode
 * - Latency budget
 * - Lookahead window
 * - Device capabilities
 * - Safety mode
 *
 * Rules:
 * - Context affects scheduling only
 * - Must not mutate IR
 * - SceneIR may override context
 *
 * What this enables:
 * - Apple TV
 * - JUCE headless
 * - Offline export
 * - Identical musical intent across platforms
 *
 * v1.0 - Initial release
 */

/**
 * PerformanceContext identifier
 */
export type PerformanceContextId = string;

/**
 * CPU capability class
 */
export type CPIClass = "low" | "medium" | "high";

/**
 * Device capabilities
 */
export interface DeviceCapabilities {
  /**
   * CPU capability class
   */
  cpuClass: CPIClass;

  /**
   * Supports SIMD optimizations
   */
  supportsSIMD?: boolean;
}

/**
 * Safety mode
 */
export type SafetyMode = "strict" | "relaxed";

/**
 * PerformanceContextIR v1.0 - Runtime Constraints
 */
export interface PerformanceContextIR_v1 {
  /**
   * Version identifier for serialization
   */
  version: "1.0";

  /**
   * Context identifier
   */
  id: PerformanceContextId;

  /**
   * Realtime mode
   */
  realtime: boolean;

  /**
   * Latency budget in milliseconds
   */
  latencyBudgetMs: number;

  /**
   * Lookahead window in milliseconds
   */
  lookaheadMs: number;

  /**
   * Device capabilities
   */
  deviceCapabilities: DeviceCapabilities;

  /**
   * Safety mode
   */
  safetyMode: SafetyMode;
}
