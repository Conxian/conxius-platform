import { describe, it, expect, beforeEach } from "vitest";
import { SilentPaymentsEngine } from "../lib/support/silentPayments";

describe("SilentPaymentsEngine (G-05)", () => {
  let engine: SilentPaymentsEngine;
  const validScanKey = "020000000000000000000000000000000000000000000000000000000000000001";
  const validSpendKey = "030000000000000000000000000000000000000000000000000000000000000002";

  beforeEach(() => {
    engine = new SilentPaymentsEngine();
  });

  it("should generate mainnet and testnet silent payment addresses", () => {
    const mainnetAddr = engine.generateAddress(validScanKey, validSpendKey, false);
    expect(mainnetAddr.startsWith("sp1q")).toBe(true);
    expect(mainnetAddr.includes(validScanKey.toLowerCase())).toBe(true);
    expect(mainnetAddr.includes(validSpendKey.toLowerCase())).toBe(true);

    const testnetAddr = engine.generateAddress(validScanKey, validSpendKey, true);
    expect(testnetAddr.startsWith("tsp1q")).toBe(true);
  });

  it("should throw an error for invalid public key hex during address generation", () => {
    expect(() => engine.generateAddress("invalid-key", validSpendKey)).toThrow("Invalid public key format");
  });

  it("should validate and parse silent payment addresses", () => {
    const mainnetAddr = engine.generateAddress(validScanKey, validSpendKey, false);
    expect(engine.validateAddress(mainnetAddr)).toBe(true);

    const testnetAddr = engine.generateAddress(validScanKey, validSpendKey, true);
    expect(engine.validateAddress(testnetAddr)).toBe(true);

    expect(engine.validateAddress("invalid_address")).toBe(false);

    const parsed = engine.parseAddress(mainnetAddr);
    expect(parsed.hrp).toBe("sp");
    expect(parsed.scanPublicKey).toBe(validScanKey.toLowerCase());
    expect(parsed.spendPublicKey).toBe(validSpendKey.toLowerCase());

    expect(() => engine.parseAddress("sp1qinvalid")).toThrow("Invalid BIP-352 Silent Payment address");
  });

  it("should tweak spend keys deterministically", () => {
    const tweak = "0000000000000000000000000000000000000000000000000000000000000005";
    const tweaked = engine.tweakSpendKey(validSpendKey, tweak);
    expect(tweaked).toBe(validSpendKey.toLowerCase());

    expect(() => engine.tweakSpendKey("invalid", tweak)).toThrow("Invalid public key or tweak hex format");
  });

  it("should register and unregister scan keys", () => {
    expect(engine.registerScanKey(validScanKey)).toBe(true);
    expect(engine.unregisterScanKey(validScanKey)).toBe(true);
    expect(engine.unregisterScanKey(validScanKey)).toBe(false);
  });

  it("should scan outputs and clear matched output state", () => {
    engine.registerScanKey(validScanKey);
    const txid = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
    const matched = engine.scanOutput(txid, 0, "021111111111111111111111111111111111111111111111111111111111111111", 50000, validScanKey);

    expect(matched).not.toBeNull();
    expect(matched?.txid).toBe(txid);

    expect(engine.getMatchedOutputs(validScanKey).length).toBe(1);

    const clearedCount = engine.clearMatchedOutputs(validScanKey);
    expect(clearedCount).toBe(1);
    expect(engine.getMatchedOutputs(validScanKey).length).toBe(0);
  });

  it("should return null when scanning against an unregistered key", () => {
    const matched = engine.scanOutput("txid", 0, "pubkey", 1000, "029999999999999999999999999999999999999999999999999999999999999999");
    expect(matched).toBeNull();
  });
});
