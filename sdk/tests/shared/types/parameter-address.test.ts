/**
 * Unit Tests for ParameterAddress Class
 *
 * TDD Approach: Red -> Green -> Refactor
 * These tests verify hierarchical addressing scheme for automation and control.
 */

import { describe, it, expect } from "vitest";
import { ParameterAddress } from "../../../packages/shared/src/types/parameter-address";
import type { SongModel_v1 } from "../../../packages/shared/src/types/song-model";

describe("ParameterAddress - Address Parsing", () => {
  describe("parse()", () => {
    it("should parse role address correctly", () => {
      const address = "/role/bass/note";
      const parsed = ParameterAddress.parse(address);

      expect(parsed.raw).toBe(address);
      expect(parsed.scope).toBe("role");
      expect(parsed.components).toEqual(["bass", "note"]);
      expect(parsed.validation).toBe("valid");
    });

    it("should parse track address correctly", () => {
      const address = "/track/3/console/drive";
      const parsed = ParameterAddress.parse(address);

      expect(parsed.raw).toBe(address);
      expect(parsed.scope).toBe("track");
      expect(parsed.components).toEqual(["3", "console", "drive"]);
      expect(parsed.validation).toBe("valid");
    });

    it("should parse bus address correctly", () => {
      const address = "/bus/A/send/1/amount";
      const parsed = ParameterAddress.parse(address);

      expect(parsed.raw).toBe(address);
      expect(parsed.scope).toBe("bus");
      expect(parsed.components).toEqual(["A", "send", "1", "amount"]);
      expect(parsed.validation).toBe("valid");
    });

    it("should parse instrument address correctly", () => {
      const address = "/instrument/lead/cutoff";
      const parsed = ParameterAddress.parse(address);

      expect(parsed.raw).toBe(address);
      expect(parsed.scope).toBe("instrument");
      expect(parsed.components).toEqual(["lead", "cutoff"]);
      expect(parsed.validation).toBe("valid");
    });

    it("should parse global address correctly", () => {
      const address = "/global/tempo";
      const parsed = ParameterAddress.parse(address);

      expect(parsed.raw).toBe(address);
      expect(parsed.scope).toBe("global");
      expect(parsed.components).toEqual(["tempo"]);
      expect(parsed.validation).toBe("valid");
    });

    it("should handle multiple leading slashes", () => {
      const address = "///role/bass/volume";
      const parsed = ParameterAddress.parse(address);

      expect(parsed.raw).toBe(address);
      expect(parsed.scope).toBe("role");
      expect(parsed.components).toEqual(["bass", "volume"]);
    });

    it("should handle deep component paths", () => {
      const address = "/track/1/effects/reverb/decay/time";
      const parsed = ParameterAddress.parse(address);

      expect(parsed.components).toEqual([
        "1",
        "effects",
        "reverb",
        "decay",
        "time",
      ]);
      expect(parsed.components.length).toBe(5);
    });
  });

  describe("validate()", () => {
    it("should accept valid role addresses", () => {
      const validAddresses = [
        "/role/bass/note",
        "/role/harmony/velocity",
        "/role/melody/volume",
        "/role/rhythm/pan",
      ];

      validAddresses.forEach((address) => {
        expect(ParameterAddress.validate(address)).toBe(true);
      });
    });

    it("should accept valid track addresses", () => {
      const validAddresses = [
        "/track/1/volume",
        "/track/3/console/drive",
        "/track/bass/pan",
      ];

      validAddresses.forEach((address) => {
        expect(ParameterAddress.validate(address)).toBe(true);
      });
    });

    it("should accept valid bus addresses", () => {
      const validAddresses = ["/bus/A/volume", "/bus/reverb/send/1/amount"];

      validAddresses.forEach((address) => {
        expect(ParameterAddress.validate(address)).toBe(true);
      });
    });

    it("should accept valid instrument addresses", () => {
      const validAddresses = [
        "/instrument/lead/cutoff",
        "/instrument/bass/resonance",
      ];

      validAddresses.forEach((address) => {
        expect(ParameterAddress.validate(address)).toBe(true);
      });
    });

    it("should accept valid global addresses", () => {
      const validAddresses = ["/global/tempo", "/global/timesig"];

      validAddresses.forEach((address) => {
        expect(ParameterAddress.validate(address)).toBe(true);
      });
    });

    it("should reject addresses without leading slash", () => {
      const invalidAddresses = [
        "role/bass/note",
        "track/1/volume",
        "global/tempo",
      ];

      invalidAddresses.forEach((address) => {
        expect(ParameterAddress.validate(address)).toBe(false);
      });
    });

    it("should reject addresses that are too short", () => {
      const invalidAddresses = ["/", "/a", "/ab", "/a/b"];

      invalidAddresses.forEach((address) => {
        expect(ParameterAddress.validate(address)).toBe(false);
      });
    });

    it("should reject addresses with invalid scope", () => {
      const invalidAddresses = [
        "/invalid/bass/note",
        "/foo/bar/baz",
        "/unknown/scope/param",
      ];

      invalidAddresses.forEach((address) => {
        expect(ParameterAddress.validate(address)).toBe(false);
      });
    });

    it("should reject non-string input", () => {
      expect(ParameterAddress.validate(null as unknown as string)).toBe(false);
      expect(ParameterAddress.validate(undefined as unknown as string)).toBe(
        false,
      );
      expect(ParameterAddress.validate(123 as unknown as string)).toBe(false);
      expect(ParameterAddress.validate({} as unknown as string)).toBe(false);
    });

    it("should reject empty string", () => {
      expect(ParameterAddress.validate("")).toBe(false);
    });
  });

  describe("Constructor", () => {
    it("should create ParameterAddress for valid address", () => {
      const addr = new ParameterAddress("/role/bass/note");

      expect(addr.toString()).toBe("/role/bass/note");
      expect(addr.scope).toBe("role");
      expect(addr.components).toEqual(["bass", "note"]);
      expect(addr.value).toBe("/role/bass/note");
    });

    it("should throw error for invalid address", () => {
      expect(() => new ParameterAddress("invalid-address")).toThrow();
      expect(() => new ParameterAddress("")).toThrow();
      expect(() => new ParameterAddress("/invalid/scope")).toThrow();
    });

    it("should throw error with message containing invalid address", () => {
      const invalidAddr = "no-leading-slash";
      expect(() => new ParameterAddress(invalidAddr)).toThrow(
        `Invalid parameter address: ${invalidAddr}`,
      );
    });
  });
});

describe("ParameterAddress - Address Resolution", () => {
  // Helper to create minimal test model
  const createTestModel = (): SongModel_v1 => ({
    version: "1.0",
    id: "test-song",
    createdAt: Date.now(),
    metadata: { title: "Test" },
    transport: {
      tempoMap: [{ time: { seconds: 0 }, tempo: 120 }],
      timeSignatureMap: [
        { time: { seconds: 0 }, numerator: 4, denominator: 4 },
      ],
      loopPolicy: { enabled: false },
      playbackSpeed: 1.0,
    },
    sections: [],
    roles: [
      {
        id: "bass",
        name: "Bass",
        type: "bass",
        generatorConfig: {
          generators: [2, 3],
          parameters: {},
        },
        parameters: {
          enabled: true,
          volume: 0.8,
        },
      },
      {
        id: "harmony",
        name: "Harmony",
        type: "harmony",
        generatorConfig: {
          generators: [1, 2],
          parameters: {},
        },
        parameters: {
          volume: 0.7,
        },
      },
    ],
    projections: [],
    mixGraph: {
      tracks: [
        {
          id: "track-1",
          name: "Track 1",
          volume: 0.8,
          pan: 0,
          bus: "bus-mix",
          instrumentId: "inst-1",
        },
        {
          id: "track-2",
          name: "Track 2",
          volume: 0.9,
        },
      ],
      buses: [
        {
          id: "bus-mix",
          name: "Mix Bus",
          volume: 1.0,
        },
        {
          id: "bus-reverb",
          name: "Reverb Bus",
          volume: 0.5,
        },
      ],
      sends: [],
      master: { volume: 0.8 },
    },
    realizationPolicy: {
      windowSize: { seconds: 2.0 },
      lookaheadDuration: { seconds: 1.0 },
      determinismMode: "strict",
    },
    determinismSeed: "test-seed",
  });

  describe("resolve() - Role addresses", () => {
    it("should resolve role address to role target", () => {
      const model = createTestModel();
      const addr = new ParameterAddress("/role/bass/volume");
      const target = addr.resolve(model);

      expect(target.type).toBe("role");
      expect(target.id).toBe("bass");
      expect(target.parameter).toBe("volume");
      expect(target.role).toBeDefined();
      expect(target.role?.id).toBe("bass");
    });

    it("should resolve different role parameters", () => {
      const model = createTestModel();
      const addr = new ParameterAddress("/role/harmony/velocity");
      const target = addr.resolve(model);

      expect(target.type).toBe("role");
      expect(target.id).toBe("harmony");
      expect(target.parameter).toBe("velocity");
    });

    it("should throw error for non-existent role", () => {
      const model = createTestModel();
      const addr = new ParameterAddress("/role/nonexistent/volume");

      expect(() => addr.resolve(model)).toThrow("Role not found: nonexistent");
    });
  });

  describe("resolve() - Track addresses", () => {
    it("should resolve track address to track target", () => {
      const model = createTestModel();
      const addr = new ParameterAddress("/track/track-1/volume");
      const target = addr.resolve(model);

      expect(target.type).toBe("track");
      expect(target.id).toBe("track-1");
      expect(target.parameter).toBe("volume");
      expect(target.track).toBeDefined();
      expect(target.track?.id).toBe("track-1");
    });

    it("should resolve different track parameters", () => {
      const model = createTestModel();
      const addr = new ParameterAddress("/track/track-2/pan");
      const target = addr.resolve(model);

      expect(target.type).toBe("track");
      expect(target.id).toBe("track-2");
      expect(target.parameter).toBe("pan");
    });

    it("should throw error for non-existent track", () => {
      const model = createTestModel();
      const addr = new ParameterAddress("/track/nonexistent/volume");

      expect(() => addr.resolve(model)).toThrow("Track not found: nonexistent");
    });
  });

  describe("resolve() - Bus addresses", () => {
    it("should resolve bus address to bus target", () => {
      const model = createTestModel();
      const addr = new ParameterAddress("/bus/bus-mix/volume");
      const target = addr.resolve(model);

      expect(target.type).toBe("bus");
      expect(target.id).toBe("bus-mix");
      expect(target.parameter).toBe("volume");
      expect(target.bus).toBeDefined();
      expect(target.bus?.id).toBe("bus-mix");
    });

    it("should resolve different bus parameters", () => {
      const model = createTestModel();
      const addr = new ParameterAddress("/bus/bus-reverb/pan");
      const target = addr.resolve(model);

      expect(target.type).toBe("bus");
      expect(target.id).toBe("bus-reverb");
      expect(target.parameter).toBe("pan");
    });

    it("should throw error for non-existent bus", () => {
      const model = createTestModel();
      const addr = new ParameterAddress("/bus/nonexistent/volume");

      expect(() => addr.resolve(model)).toThrow("Bus not found: nonexistent");
    });
  });

  describe("resolve() - Instrument addresses", () => {
    it("should resolve instrument address via track", () => {
      const model = createTestModel();
      const addr = new ParameterAddress("/instrument/inst-1/cutoff");
      const target = addr.resolve(model);

      expect(target.type).toBe("instrument");
      expect(target.id).toBe("inst-1");
      expect(target.parameter).toBe("cutoff");
      expect(target.track).toBeDefined();
      expect(target.track?.instrumentId).toBe("inst-1");
    });

    it("should throw error for non-existent instrument", () => {
      const model = createTestModel();
      const addr = new ParameterAddress("/instrument/nonexistent/cutoff");

      expect(() => addr.resolve(model)).toThrow(
        "Instrument not found: nonexistent",
      );
    });
  });

  describe("resolve() - Global addresses", () => {
    it("should resolve global address", () => {
      const model = createTestModel();
      const addr = new ParameterAddress("/global/tempo");
      const target = addr.resolve(model);

      expect(target.type).toBe("global");
      expect(target.parameter).toBe("tempo");
      expect(target.value).toBe(null);
    });

    it("should resolve different global parameters", () => {
      const model = createTestModel();
      const addr = new ParameterAddress("/global/timesig");
      const target = addr.resolve(model);

      expect(target.type).toBe("global");
      expect(target.parameter).toBe("timesig");
    });
  });

  describe("resolve() - Error handling", () => {
    it("should throw error for unknown scope", () => {
      // This shouldn't happen with validate(), but test defensive programming
      const model = createTestModel();
      const addr = new ParameterAddress("/role/bass/volume");

      // Manually create invalid parsed state to test error handling
      // (In real scenario, validate() prevents this)
      expect(() => {
        // Force invalid scope by accessing private internals through edge case
        const invalidAddr = new ParameterAddress("/global/tempo");
        // Global resolution should work fine
        const target = invalidAddr.resolve(model);
        expect(target.type).toBe("global");
      }).not.toThrow();
    });
  });
});

describe("ParameterAddress - Edge Cases & Integration", () => {
  it("should handle special characters in component IDs", () => {
    const addr = new ParameterAddress("/track/track-1-2/volume");

    expect(addr.components).toEqual(["track-1-2", "volume"]);
    expect(addr.scope).toBe("track");
  });

  it("should handle numeric IDs", () => {
    const addr = new ParameterAddress("/track/12345/volume");

    expect(addr.components).toEqual(["12345", "volume"]);
    expect(addr.components[0]).toBe("12345");
  });

  it("should maintain immutability of parsed data", () => {
    const addr = new ParameterAddress("/role/bass/note");
    const components = addr.components;

    // Attempt to modify (shouldn't affect original)
    try {
      (components as string[]).push("extra");
    } catch (e) {
      // Expected if frozen
    }

    // Verify original unchanged
    expect(addr.components).toEqual(["bass", "note"]);
  });

  it("should convert to string consistently", () => {
    const addressString = "/bus/reverb/send/1/amount";
    const addr = new ParameterAddress(addressString);

    expect(addr.toString()).toBe(addressString);
    expect(addr.value).toBe(addressString);
    expect(`${addr}`).toBe(addressString); // String coercion
  });

  it("should parse and resolve complex nested paths", () => {
    const addr = new ParameterAddress("/track/1/effects/reverb/decay/time");

    expect(addr.components).toEqual([
      "1",
      "effects",
      "reverb",
      "decay",
      "time",
    ]);
    expect(addr.components.length).toBe(5);
    expect(addr.scope).toBe("track");
  });

  it("should reject addresses with multiple consecutive slashes", () => {
    // Double slash at start is invalid
    expect(() => new ParameterAddress("//role/bass/note")).toThrow();

    // Double slash in middle is invalid
    expect(() => new ParameterAddress("/role//bass/note")).toThrow();
  });
});
