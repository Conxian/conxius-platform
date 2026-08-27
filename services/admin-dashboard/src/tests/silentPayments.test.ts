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

  it("should throw an error for invalid public key hex", () => {
    expect(() => engine.generateAddress("invalid-key", validSpendKey)).toThrow("Invalid public key format");
  });

  it("should register scan keys and match transaction outputs", () => {
    const registered = engine.registerScanKey(validScanKey);
    expect(registered).toBe(true);

    const txid = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
    const matched = engine.scanOutput(txid, 0, "021111111111111111111111111111111111111111111111111111111111111111", 50000, validScanKey);

    expect(matched).not.toBeNull();
    expect(matched?.txid).toBe(txid);
    expect(matched?.amountSats).toBe(50000);

    const outputs = engine.getMatchedOutputs(validScanKey);
    expect(outputs.length).toBe(1);
    expect(outputs[0].id).toBe(matched?.id);
  });

  it("should return null when scanning against an unregistered key", () => {
    const matched = engine.scanOutput("txid", 0, "pubkey", 1000, "029999999999999999999999999999999999999999999999999999999999999999");
    expect(matched).toBeNull();
  });
});
