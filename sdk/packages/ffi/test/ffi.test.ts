/**
 * White Room FFI Tests
 *
 * Test basic FFI connectivity and functionality.
 */

import { describe, it, expect } from "vitest";
import { getFFI, ping, serializeJSON, deserializeJSON } from "../src/index";

describe("NAPI FFI", () => {
  describe("ping-pong test", () => {
    it("should return 'pong' without message", () => {
      const result = ping();
      expect(result).toBe("pong");
    });

    it("should return 'pong: <message>' with message", () => {
      const result = ping("hello");
      expect(result).toBe("pong: hello");
    });

    it("should work with direct binding access", () => {
      const ffi = getFFI();
      expect(ffi.ping()).toBe("pong");
      expect(ffi.ping("test")).toBe("pong: test");
    });
  });

  describe("error handling", () => {
    it("should throw error from C++", () => {
      const ffi = getFFI();

      expect(() => {
        ffi.testError();
      }).toThrow("This is a test error from C++");
    });

    it("should handle invalid arguments gracefully", () => {
      const ffi = getFFI();

      // ping should handle non-string arguments
      expect(() => {
        ffi.ping(123 as any);
      }).toThrow();
    });
  });

  describe("JSON serialization", () => {
    const testObject = {
      name: "test",
      value: 42,
      nested: {
        array: [1, 2, 3],
        boolean: true,
      },
    };

    it("should serialize object to JSON", () => {
      const json = serializeJSON(testObject);
      expect(typeof json).toBe("string");

      const parsed = JSON.parse(json);
      expect(parsed).toEqual(testObject);
    });

    it("should deserialize JSON to object", () => {
      const json = JSON.stringify(testObject);
      const obj = deserializeJSON(json);

      expect(obj).toEqual(testObject);
    });

    it("should handle round-trip serialization", () => {
      const json = serializeJSON(testObject);
      const result = deserializeJSON(json);

      expect(result).toEqual(testObject);
    });

    it("should handle null and undefined", () => {
      expect(serializeJSON(null)).toBe("null");
      expect(serializeJSON(undefined)).toBe(undefined);
    });

    it("should handle arrays", () => {
      const arr = [1, 2, 3, "four", { five: 5 }];
      const json = serializeJSON(arr);
      const result = deserializeJSON(json);

      expect(result).toEqual(arr);
    });
  });

  describe("binding availability", () => {
    it("should export all expected functions", () => {
      const ffi = getFFI();

      expect(typeof ffi.ping).toBe("function");
      expect(typeof ffi.testError).toBe("function");
      expect(typeof ffi.serializeJSON).toBe("function");
      expect(typeof ffi.deserializeJSON).toBe("function");
    });
  });
});
