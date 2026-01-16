/**
 * Deterministic PRNG Tests
 */

import { describe, it, expect } from "vitest";
import {
  DeterministicPRNG,
  createSeededPRNG,
  stringToSeed,
  combineSeeds,
  isValidSeed,
  generateRandomSeed,
} from "../src/random/prng";

describe("DeterministicPRNG", () => {
  it("should create PRNG with seed", () => {
    const prng = new DeterministicPRNG(42);
    expect(prng.nextFloat()).toBeDefined();
  });

  it("should generate values in correct range", () => {
    const prng = new DeterministicPRNG(42);
    expect(prng.next()).toBeGreaterThanOrEqual(0);
    expect(prng.next()).toBeLessThan(0x100000000);
  });

  it("should be deterministic", () => {
    const seed = 12345;
    const prng1 = new DeterministicPRNG(seed);
    const prng2 = new DeterministicPRNG(seed);

    expect(prng1.next()).toBe(prng2.next());
    expect(prng1.next()).toBe(prng2.next());
    expect(prng1.next()).toBe(prng2.next());
  });

  it("should clone maintain state", () => {
    const prng = new DeterministicPRNG(42);
    prng.next();
    prng.next();

    const cloned = prng.clone();
    expect(prng.next()).toBe(cloned.next());
  });

  it("should generate integer in range", () => {
    const prng = new DeterministicPRNG(42);
    const value = prng.nextInt(10, 20);

    expect(value).toBeGreaterThanOrEqual(10);
    expect(value).toBeLessThanOrEqual(20);
  });

  it("should shuffle array", () => {
    const prng = new DeterministicPRNG(42);
    const array = [1, 2, 3, 4, 5];
    const original = [...array];

    const shuffled = prng.shuffle(array);

    expect(shuffled).toHaveLength(original.length);
    expect(shuffled.sort()).toEqual(original.sort());
  });

  it("should pick from array", () => {
    const prng = new DeterministicPRNG(42);
    const array = ["a", "b", "c"];

    const picked = prng.pick(array);
    expect(array).toContain(picked);
  });

  it("should get and set state", () => {
    const prng = new DeterministicPRNG(42);
    prng.next();
    prng.next();

    const state = prng.getState();
    const prng2 = new DeterministicPRNG(0);
    prng2.setState(state);

    expect(prng.next()).toBe(prng2.next());
  });

  it("should handle zero seed", () => {
    const prng = new DeterministicPRNG(0);
    expect(prng.nextFloat()).toBeDefined();
  });

  it("should generate many values", () => {
    const prng = new DeterministicPRNG(42);
    for (let i = 0; i < 10000; i++) {
      const value = prng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(0x100000000);
    }
  });
});

describe("createSeededPRNG", () => {
  it("should create PRNG with seed", () => {
    const prng = createSeededPRNG(42);
    expect(prng).toBeInstanceOf(DeterministicPRNG);
  });

  it("should be deterministic", () => {
    const seed = 777;
    const prng1 = createSeededPRNG(seed);
    const prng2 = createSeededPRNG(seed);

    expect(prng1.next()).toBe(prng2.next());
  });
});

describe("stringToSeed", () => {
  it("should convert string to numeric seed", () => {
    const seed = stringToSeed("test");
    expect(typeof seed).toBe("number");
  });

  it("should be deterministic", () => {
    const str = "deterministic";
    expect(stringToSeed(str)).toBe(stringToSeed(str));
  });

  it("should produce different seeds for different strings", () => {
    expect(stringToSeed("hello")).not.toBe(stringToSeed("world"));
  });
});

describe("combineSeeds", () => {
  it("should combine multiple seeds", () => {
    const combined = combineSeeds(1, 2, 3);
    expect(typeof combined).toBe("number");
  });

  it("should be deterministic", () => {
    expect(combineSeeds(10, 20, 30)).toBe(combineSeeds(10, 20, 30));
  });
});

describe("isValidSeed", () => {
  it("should accept valid seeds", () => {
    expect(isValidSeed(0)).toBe(true);
    expect(isValidSeed(42)).toBe(true);
    expect(isValidSeed(Number.MAX_SAFE_INTEGER)).toBe(true);
  });

  it("should reject invalid seeds", () => {
    expect(isValidSeed(-1)).toBe(false);
    expect(isValidSeed(1.5)).toBe(false);
    expect(isValidSeed(NaN)).toBe(false);
  });
});

describe("generateRandomSeed", () => {
  it("should generate valid seed", () => {
    const seed = generateRandomSeed();
    expect(isValidSeed(seed)).toBe(true);
  });

  it("should generate different seeds", () => {
    const seed1 = generateRandomSeed();
    const seed2 = generateRandomSeed();
    expect(seed1).not.toBe(seed2);
  });
});

describe("cross-platform consistency", () => {
  it("should maintain determinism", () => {
    const seed = 12345;
    const sequenceLength = 100;

    const prng1 = new DeterministicPRNG(seed);
    const prng2 = new DeterministicPRNG(seed);

    const sequence1 = prng1.nextArray(sequenceLength);
    const sequence2 = prng2.nextArray(sequenceLength);

    expect(sequence1).toEqual(sequence2);
  });

  it("should produce consistent results", () => {
    const seed = 42;
    const prng1 = new DeterministicPRNG(seed);
    const sequence1 = prng1.nextArray(10);

    const prng2 = new DeterministicPRNG(seed);
    const sequence2 = prng2.nextArray(10);

    expect(sequence1).toEqual(sequence2);
  });
});
