/**
 * White Room SDK - Error Handling Tests
 *
 * Comprehensive tests for error handling, recovery, and management.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  // Error classes
  WhiteRoomError,
  TheoryError,
  ValidationError,
  RealizationError,
  AudioError,
  FFIError,
  ConfigurationError,
  PerformanceError,

  // Enums
  ErrorSeverity,
  ErrorCategory,
  ErrorCodes,

  // Factory functions
  createInvalidGeneratorPeriodError,
  createInsufficientGeneratorsError,
  createInvalidVoiceCountError,
  createRealizationFailedError,
  createPlaybackFailedError,
  createFFITimeoutError,
  createInvalidConfigError,
  createSlowRealizationError,

  // Validation utilities
  assert,
  assertInRange,
  assertDefined,
  assertMinLength,

  // Recovery strategies
  RetryStrategy,
  FallbackStrategy,
  DefaultStrategy,
  SanitizationStrategy,
  LoggingStrategy,
  ErrorRecoveryManager,
  defaultRecoveryManager,

  // Error handler
  ErrorHandler,
  defaultErrorHandler,
  withErrorHandling,
} from "../src/errors/index";

// =============================================================================
// ERROR CLASS TESTS
// =============================================================================

describe("WhiteRoomError", () => {
  it("should create error with all properties", () => {
    const error = new WhiteRoomError(
      "TEST_001",
      "Test error message",
      ErrorSeverity.ERROR,
      ErrorCategory.THEORY,
      { key: "value" },
      new Error("Cause")
    );

    expect(error.code).toBe("TEST_001");
    expect(error.message).toBe("Test error message");
    expect(error.severity).toBe(ErrorSeverity.ERROR);
    expect(error.category).toBe(ErrorCategory.THEORY);
    expect(error.context).toEqual({ key: "value" });
    expect(error.cause).toBeDefined();
    expect(error.name).toBe("WhiteRoomError");
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it("should generate error details", () => {
    const error = new WhiteRoomError("TEST_001", "Test message");
    const details = error.getDetails();

    expect(details).toContain("[ERROR] TEST_001: Test message");
    expect(details).toContain("Category:"); // Check for Category prefix
    expect(details).toContain("Time:");
  });

  it("should convert to JSON", () => {
    const error = new WhiteRoomError(
      "TEST_001",
      "Test message",
      ErrorSeverity.ERROR,
      ErrorCategory.THEORY
    );
    const json = error.toJSON();

    expect(json.code).toBe("TEST_001");
    expect(json.message).toBe("Test message");
    expect(json.severity).toBe("error");
    expect(json.category).toBe("theory");
    expect(json.timestamp).toBeDefined();
    expect(json.stack).toBeDefined();
  });
});

describe("TheoryError", () => {
  it("should create theory error", () => {
    const error = new TheoryError("THEORY_001", "Theory failed");

    expect(error).toBeInstanceOf(WhiteRoomError);
    expect(error.category).toBe(ErrorCategory.THEORY);
    expect(error.code).toBe("THEORY_001");
  });
});

describe("ValidationError", () => {
  it("should create validation error", () => {
    const error = new ValidationError("VAL_001", "Validation failed");

    expect(error).toBeInstanceOf(WhiteRoomError);
    expect(error.category).toBe(ErrorCategory.VALIDATION);
    expect(error.code).toBe("VAL_001");
  });
});

describe("RealizationError", () => {
  it("should create realization error", () => {
    const error = new RealizationError("REAL_001", "Realization failed");

    expect(error).toBeInstanceOf(WhiteRoomError);
    expect(error.category).toBe(ErrorCategory.REALIZATION);
    expect(error.code).toBe("REAL_001");
  });
});

describe("AudioError", () => {
  it("should create audio error", () => {
    const error = new AudioError("AUDIO_001", "Audio failed");

    expect(error).toBeInstanceOf(WhiteRoomError);
    expect(error.category).toBe(ErrorCategory.AUDIO);
    expect(error.code).toBe("AUDIO_001");
  });
});

describe("FFIError", () => {
  it("should create FFI error", () => {
    const error = new FFIError("FFI_001", "FFI failed");

    expect(error).toBeInstanceOf(WhiteRoomError);
    expect(error.category).toBe(ErrorCategory.FFI);
    expect(error.code).toBe("FFI_001");
  });
});

describe("ConfigurationError", () => {
  it("should create configuration error", () => {
    const error = new ConfigurationError("CFG_001", "Config failed");

    expect(error).toBeInstanceOf(WhiteRoomError);
    expect(error.category).toBe(ErrorCategory.CONFIGURATION);
    expect(error.code).toBe("CFG_001");
  });
});

describe("PerformanceError", () => {
  it("should create performance error", () => {
    const error = new PerformanceError("PERF_001", "Performance issue");

    expect(error).toBeInstanceOf(WhiteRoomError);
    expect(error.category).toBe(ErrorCategory.PERFORMANCE);
    expect(error.severity).toBe(ErrorSeverity.WARNING);
    expect(error.code).toBe("PERF_001");
  });
});

// =============================================================================
// ERROR FACTORY TESTS
// =============================================================================

describe("Error Factory Functions", () => {
  describe("createInvalidGeneratorPeriodError", () => {
    it("should create error with context", () => {
      const error = createInvalidGeneratorPeriodError(20, [1, 16]);

      expect(error.code).toBe(ErrorCodes.INVALID_GENERATOR_PERIOD);
      expect(error.context).toEqual({ period: 20, validRange: [1, 16] });
    });
  });

  describe("createInsufficientGeneratorsError", () => {
    it("should create error with context", () => {
      const error = createInsufficientGeneratorsError(1, 2);

      expect(error.code).toBe(ErrorCodes.INSUFFICIENT_GENERATORS);
      expect(error.context).toEqual({ actual: 1, required: 2 });
    });
  });

  describe("createInvalidVoiceCountError", () => {
    it("should create error with context", () => {
      const error = createInvalidVoiceCountError(150, [1, 100]);

      expect(error.code).toBe(ErrorCodes.INVALID_VOICE_COUNT);
      expect(error.context).toEqual({ count: 150, validRange: [1, 100] });
    });
  });

  describe("createRealizationFailedError", () => {
    it("should create error with context", () => {
      const error = createRealizationFailedError("sys-123", "Invalid parameters");

      expect(error.code).toBe(ErrorCodes.REALIZATION_FAILED);
      expect(error.context).toEqual({ systemId: "sys-123", reason: "Invalid parameters" });
    });
  });

  describe("createPlaybackFailedError", () => {
    it("should create error with context", () => {
      const error = createPlaybackFailedError("Device not ready");

      expect(error.code).toBe(ErrorCodes.PLAYBACK_FAILED);
      expect(error.context).toEqual({ reason: "Device not ready" });
    });
  });

  describe("createFFITimeoutError", () => {
    it("should create error with context", () => {
      const error = createFFITimeoutError("realize", 5000);

      expect(error.code).toBe(ErrorCodes.FFI_TIMEOUT);
      expect(error.context).toEqual({ operation: "realize", timeoutMs: 5000 });
    });
  });

  describe("createInvalidConfigError", () => {
    it("should create error with context", () => {
      const error = createInvalidConfigError("ensemble", "Missing voice count");

      expect(error.code).toBe(ErrorCodes.INVALID_CONFIG);
      expect(error.context).toEqual({ section: "ensemble", reason: "Missing voice count" });
    });
  });

  describe("createSlowRealizationError", () => {
    it("should create error with context", () => {
      const error = createSlowRealizationError(15000, 10000);

      expect(error.code).toBe(ErrorCodes.SLOW_REALIZATION);
      expect(error.context).toEqual({ durationMs: 15000, thresholdMs: 10000 });
    });
  });
});

// =============================================================================
// VALIDATION UTILITY TESTS
// =============================================================================

describe("assert", () => {
  it("should not throw when condition is true", () => {
    expect(() => assert(true, "TEST_001", "Should not throw")).not.toThrow();
  });

  it("should throw when condition is false", () => {
    expect(() => assert(false, "TEST_001", "Should throw")).toThrow(WhiteRoomError);
  });
});

describe("assertInRange", () => {
  it("should not throw when value is in range", () => {
    expect(() => assertInRange(5, 1, 10, "TEST_001", "test")).not.toThrow();
  });

  it("should throw when value is below range", () => {
    expect(() => assertInRange(0, 1, 10, "TEST_001", "test")).toThrow(WhiteRoomError);
  });

  it("should throw when value is above range", () => {
    expect(() => assertInRange(11, 1, 10, "TEST_001", "test")).toThrow(WhiteRoomError);
  });
});

describe("assertDefined", () => {
  it("should not throw when value is defined", () => {
    expect(() => assertDefined("value", "TEST_001", "test")).not.toThrow();
  });

  it("should throw when value is null", () => {
    expect(() => assertDefined(null, "TEST_001", "test")).toThrow(WhiteRoomError);
  });

  it("should throw when value is undefined", () => {
    expect(() => assertDefined(undefined, "TEST_001", "test")).toThrow(WhiteRoomError);
  });

  it("should narrow type correctly", () => {
    const value: string | null = "test";
    assertDefined(value, "TEST_001", "test");
    // TypeScript should know value is string here
    expect(value.toUpperCase()).toBe("TEST");
  });
});

describe("assertMinLength", () => {
  it("should not throw when array has sufficient length", () => {
    expect(() => assertMinLength([1, 2, 3], 3, "TEST_001", "test")).not.toThrow();
  });

  it("should throw when array is too short", () => {
    expect(() => assertMinLength([1, 2], 3, "TEST_001", "test")).toThrow(WhiteRoomError);
  });
});

// =============================================================================
// RECOVERY STRATEGY TESTS
// =============================================================================

describe("RetryStrategy", () => {
  it("should recover from transient errors", async () => {
    const strategy = new RetryStrategy(3, 10);
    const error = new PerformanceError("PERF_001", "Slow operation");

    expect(strategy.canRecover(error)).toBe(true);

    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts < 3) {
        throw error;
      }
      return "success";
    };

    const result = await strategy.recover(error, operation);
    expect(result.recovered).toBe(true);
    expect(attempts).toBe(3);
  });

  it("should fail after max attempts", async () => {
    const strategy = new RetryStrategy(2, 10);
    const error = new PerformanceError("PERF_001", "Slow operation");

    const operation = async () => {
      throw error;
    };

    const result = await strategy.recover(error, operation);
    expect(result.recovered).toBe(false);
  });
});

describe("FallbackStrategy", () => {
  it("should provide fallback value", () => {
    const strategy = new FallbackStrategy("default");
    const error = new ValidationError("VAL_001", "Validation failed");

    expect(strategy.canRecover(error)).toBe(true);

    const result = strategy.recover(error);
    expect(result.recovered).toBe(true);
    expect(strategy.getFallback()).toBe("default");
  });

  it("should use custom condition", () => {
    const strategy = new FallbackStrategy("fallback", (error) => {
      return error.code === "VAL_001";
    });

    const error1 = new ValidationError("VAL_001", "Test");
    const error2 = new ValidationError("VAL_002", "Test");

    expect(strategy.canRecover(error1)).toBe(true);
    expect(strategy.canRecover(error2)).toBe(false);
  });
});

describe("DefaultStrategy", () => {
  it("should use registered defaults", () => {
    const strategy = new DefaultStrategy({
      VAL_003: 50,
      THEORY_001: 4,
    });

    const error = new ValidationError("VAL_003", "Invalid count");

    expect(strategy.canRecover(error)).toBe(true);
    expect(strategy.getDefault("VAL_003")).toBe(50);
  });
});

describe("SanitizationStrategy", () => {
  it("should sanitize voice count", () => {
    const strategy = new SanitizationStrategy();
    const error = new ValidationError("VAL_003", "Invalid count");

    expect(strategy.canRecover(error)).toBe(true);

    const result = strategy.recover(error);
    expect(result.recovered).toBe(true);
  });
});

describe("LoggingStrategy", () => {
  it("should log error and recover based on severity", () => {
    const strategy = new LoggingStrategy();
    const warning = new PerformanceError("PERF_001", "Warning");
    // Create a critical error by setting severity explicitly
    const critical = new AudioError("AUDIO_001", "Critical");
    // Override severity to CRITICAL for test
    (critical as any).severity = ErrorSeverity.CRITICAL;

    const warningResult = strategy.recover(warning);
    expect(warningResult.recovered).toBe(true);

    const criticalResult = strategy.recover(critical);
    expect(criticalResult.recovered).toBe(false);
  });
});

// =============================================================================
// ERROR RECOVERY MANAGER TESTS
// =============================================================================

describe("ErrorRecoveryManager", () => {
  it("should try strategies in order", async () => {
    const manager = new ErrorRecoveryManager([
      new FallbackStrategy("fallback"),
      new RetryStrategy(1, 10),
    ]);

    const error = new ValidationError("VAL_001", "Test");
    const result = await manager.recover(error);

    expect(result.action).toBeDefined();
  });

  it("should execute operation with recovery", async () => {
    const manager = new ErrorRecoveryManager();

    let attempts = 0;
    const operation = async () => {
      attempts++;
      if (attempts === 1) {
        throw new PerformanceError("PERF_001", "First attempt fails");
      }
      return "success";
    };

    const result = await manager.execute(operation);

    expect(result).toBe("success");
    expect(attempts).toBe(2);
  });
});

// =============================================================================
// ERROR HANDLER TESTS
// =============================================================================

describe("ErrorHandler", () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    handler = new ErrorHandler({
      enableLogging: true,
      enableRecovery: true,
      enableStatistics: true,
    });
  });

  it("should handle error successfully", async () => {
    const error = new ValidationError("VAL_001", "Test error");

    // Should not throw because logging recovers it
    await handler.handle(error);
  });

  it("should execute operation with error handling", async () => {
    let executed = false;

    const result = await handler.execute(() => {
      executed = true;
      return "success";
    });

    expect(executed).toBe(true);
    expect(result).toBe("success");
  });

  it("should handle errors in operation", async () => {
    let errorHandled = false;

    const result = await handler.execute(
      () => {
        throw new ValidationError("VAL_001", "Test error");
      },
      {
        onError: (error) => {
          errorHandled = true;
          expect(error.code).toBe("VAL_001");
        },
        rethrow: false,
      }
    );

    expect(errorHandled).toBe(true);
  });

  it("should track statistics", async () => {
    await handler.handle(new ValidationError("VAL_001", "Error 1"));
    await handler.handle(new ValidationError("VAL_002", "Error 2"));
    await handler.handle(new TheoryError("THEORY_001", "Error 3"));

    const stats = handler.getStatistics();

    expect(stats.totalErrors).toBe(3);
    expect(stats.errorsByCategory[ErrorCategory.VALIDATION]).toBe(2);
    expect(stats.errorsByCategory[ErrorCategory.THEORY]).toBe(1);
  });

  it("should maintain error log", async () => {
    const error1 = new ValidationError("VAL_001", "Error 1");
    const error2 = new ValidationError("VAL_002", "Error 2");

    await handler.handle(error1);
    await handler.handle(error2);

    const log = handler.getErrorLog();
    expect(log).toHaveLength(2);
    expect(log[0].error).toBe(error1);
    expect(log[1].error).toBe(error2);
  });

  it("should get recent errors", async () => {
    for (let i = 0; i < 15; i++) {
      await handler.handle(new ValidationError(`VAL_${i}`, `Error ${i}`));
    }

    const recent = handler.getRecentErrors(5);
    expect(recent).toHaveLength(5);
  });

  it("should clear log", async () => {
    await handler.handle(new ValidationError("VAL_001", "Error"));
    handler.clearLog();

    const log = handler.getErrorLog();
    expect(log).toHaveLength(0);
  });

  it("should track error counts", async () => {
    const error = new ValidationError("VAL_001", "Test");

    await handler.handle(error);
    await handler.handle(error);
    await handler.handle(error);

    const count = handler.getErrorCount(ErrorCategory.VALIDATION, "VAL_001");
    expect(count).toBe(3);
  });
});

// =============================================================================
// CONVENIENCE FUNCTION TESTS
// =============================================================================

describe("withErrorHandling", () => {
  it("should handle errors with default handler", async () => {
    let errorCaught = false;

    const result = await withErrorHandling(
      () => {
        throw new ValidationError("VAL_001", "Test error");
      },
      {
        onError: (error) => {
          errorCaught = true;
        },
        rethrow: false,
      }
    );

    expect(errorCaught).toBe(true);
  });
});

describe("defaultErrorHandler", () => {
  it("should be available globally", () => {
    expect(defaultErrorHandler).toBeInstanceOf(ErrorHandler);
  });

  it("should have default configuration", () => {
    expect(defaultErrorHandler).toBeDefined();
  });
});
