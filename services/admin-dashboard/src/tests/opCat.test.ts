import { describe, it, expect, beforeEach } from "vitest";
import {
  OpCatEngine,
  MAX_STACK_ELEMENT_SIZE_BYTES,
} from "../lib/support/opCat";

describe("OP_CAT BIP-347 Engine & Recursive Covenants (G-15)", () => {
  let engine: OpCatEngine;

  beforeEach(() => {
    engine = new OpCatEngine();
  });

  it("should successfully concatenate two valid hex elements within size bounds", () => {
    const elementA = "1234567890abcdef"; // 8 bytes
    const elementB = "fedcba0987654321"; // 8 bytes

    const result = engine.executeCat(elementA, elementB);

    expect(result.success).toBe(true);
    expect(result.resultHex).toBe("1234567890abcdeffedcba0987654321");
    expect(result.resultingSize).toBe(16);
  });

  it("should fail-closed when concatenated size exceeds 520 bytes limit", () => {
    const largeA = "00".repeat(300); // 300 bytes
    const largeB = "ff".repeat(221); // 221 bytes (300 + 221 = 521 bytes)

    const result = engine.executeCat(largeA, largeB);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Push size limit exceeded");
    expect(result.resultHex).toBeUndefined();
  });

  it("should initialize a recursive covenant with valid parameters", () => {
    const covenant = engine.createCovenant("cov-001", "a1b2c3d4e5f6", 10);

    expect(covenant.covenantId).toBe("cov-001");
    expect(covenant.depth).toBe(0);
    expect(covenant.maxDepth).toBe(10);
    expect(covenant.stateHash).toBe("a1b2c3d4e5f6");
    expect(covenant.isFinalized).toBe(false);
    expect(covenant.historyHashes).toEqual(["a1b2c3d4e5f6"]);
  });

  it("should transition recursive covenant state across recursion depths", () => {
    engine.createCovenant("cov-002", "hash-00", 5);

    const step1 = engine.transitionCovenant("cov-002", "hash-01");
    expect(step1.depth).toBe(1);
    expect(step1.stateHash).toBe("hash-01");

    const step2 = engine.transitionCovenant("cov-002", "hash-02");
    expect(step2.depth).toBe(2);
    expect(step2.stateHash).toBe("hash-02");
    expect(step2.historyHashes).toEqual(["hash-00", "hash-01", "hash-02"]);
  });

  it("should reject state transition when max recursion depth is reached", () => {
    engine.createCovenant("cov-003", "hash-00", 2);

    engine.transitionCovenant("cov-003", "hash-01");
    engine.transitionCovenant("cov-003", "hash-02");

    expect(() => {
      engine.transitionCovenant("cov-003", "hash-03");
    }).toThrow("Maximum recursion depth (2) reached");
  });

  it("should lock covenant state once finalized", () => {
    engine.createCovenant("cov-004", "hash-00", 5);
    engine.transitionCovenant("cov-004", "hash-01");

    const finalized = engine.finalizeCovenant("cov-004");
    expect(finalized.isFinalized).toBe(true);

    expect(() => {
      engine.transitionCovenant("cov-004", "hash-02");
    }).toThrow("Cannot transition finalized covenant");
  });
});
