import { describe, expect, it, beforeEach } from "vitest";
import { CtUsdEngine, type OracleAttestation } from "../lib/support/ctusd";

describe("ctUSD DLC-Based Bitcoin Collateralized Stablecoin Engine (G-22)", () => {
  let engine: CtUsdEngine;

  beforeEach(() => {
    engine = new CtUsdEngine();
  });

  it("should create a new vault with valid parameters and collateral ratio >= 150%", () => {
    // 1 BTC = $60,000. Collateral = 1 BTC (100,000,000 sat). Minting $30,000 ctUSD => ratio = 200%
    const status = engine.createVault({
      vaultId: "vault-001",
      ownerAddress: "SP1234567890BC",
      collateralSat: 100_000_000,
      mintedCtusd: 30_000,
      btcUsdPrice: 60_000,
      dlcContractId: "dlc-001",
    });

    expect(status.vaultId).toBe("vault-001");
    expect(status.state).toBe("created");
    expect(status.collateralRatio).toBe(2.0);
    expect(status.accruedStabilityFeeCtusd).toBe(0);
  });

  it("should reject vault creation if collateral ratio is below 150%", () => {
    // 1 BTC = $60,000. Collateral = 1 BTC. Minting $50,000 ctUSD => ratio = 120% (< 150%)
    expect(() =>
      engine.createVault({
        vaultId: "vault-undercollateralized",
        ownerAddress: "SP1234567890BC",
        collateralSat: 100_000_000,
        mintedCtusd: 50_000,
        btcUsdPrice: 60_000,
        dlcContractId: "dlc-under",
      }),
    ).toThrow("below minimum 150% requirement");
  });

  it("should activate vault and allow transitioning from created to active state", () => {
    engine.createVault({
      vaultId: "vault-002",
      ownerAddress: "SP1234567890BC",
      collateralSat: 100_000_000,
      mintedCtusd: 30_000,
      btcUsdPrice: 60_000,
      dlcContractId: "dlc-002",
    });

    const activated = engine.activateVault("vault-002");
    expect(activated.state).toBe("active");
  });

  it("should require 3-of-5 valid oracle attestations for price update and evaluate liquidation", () => {
    engine.createVault({
      vaultId: "vault-003",
      ownerAddress: "SP1234567890BC",
      collateralSat: 100_000_000,
      mintedCtusd: 30_000,
      btcUsdPrice: 60_000,
      dlcContractId: "dlc-003",
    });
    engine.activateVault("vault-003");

    // Less than 3 oracles should fail
    const insufficientOracles: OracleAttestation[] = [
      { oracleId: "oracle-1", priceBtcUsd: 35_000, timestampIso: new Date().toISOString(), signature: "sig1" },
      { oracleId: "oracle-2", priceBtcUsd: 36_000, timestampIso: new Date().toISOString(), signature: "sig2" },
    ];

    expect(() => engine.updatePriceAndEvaluate("vault-003", insufficientOracles)).toThrow(
      "Insufficient oracle attestations",
    );

    // 3 oracles attesting drop to $35,000 BTC price => collateral value = $35,000 => ratio = 35000 / 30000 = 116.7% (< 130%)
    const validOracles: OracleAttestation[] = [
      { oracleId: "oracle-1", priceBtcUsd: 35_000, timestampIso: new Date().toISOString(), signature: "sig1" },
      { oracleId: "oracle-2", priceBtcUsd: 35_000, timestampIso: new Date().toISOString(), signature: "sig2" },
      { oracleId: "oracle-3", priceBtcUsd: 35_000, timestampIso: new Date().toISOString(), signature: "sig3" },
    ];

    const updated = engine.updatePriceAndEvaluate("vault-003", validOracles);
    expect(updated.state).toBe("liquidating");
    expect(updated.collateralRatio).toBeLessThan(1.3);
  });

  it("should execute liquidation when vault is in liquidating state", () => {
    engine.createVault({
      vaultId: "vault-004",
      ownerAddress: "SP1234567890BC",
      collateralSat: 100_000_000,
      mintedCtusd: 30_000,
      btcUsdPrice: 60_000,
      dlcContractId: "dlc-004",
    });
    engine.activateVault("vault-004");

    const dropOracles: OracleAttestation[] = [
      { oracleId: "oracle-1", priceBtcUsd: 30_000, timestampIso: new Date().toISOString(), signature: "sig1" },
      { oracleId: "oracle-2", priceBtcUsd: 30_000, timestampIso: new Date().toISOString(), signature: "sig2" },
      { oracleId: "oracle-3", priceBtcUsd: 30_000, timestampIso: new Date().toISOString(), signature: "sig3" },
    ];
    engine.updatePriceAndEvaluate("vault-004", dropOracles);

    const liquidated = engine.executeLiquidation("vault-004");
    expect(liquidated.state).toBe("liquidated");
    expect(liquidated.liquidatedAtIso).toBeDefined();
  });

  it("should allow closing vault when principal + stability fee repayment is satisfied", () => {
    engine.createVault({
      vaultId: "vault-005",
      ownerAddress: "SP1234567890BC",
      collateralSat: 100_000_000,
      mintedCtusd: 30_000,
      btcUsdPrice: 60_000,
      dlcContractId: "dlc-005",
    });
    engine.activateVault("vault-005");

    // Attempt close with insufficient amount
    expect(() => engine.closeVault("vault-005", 20_000)).toThrow("Insufficient ctUSD repayment amount");

    // Close with full repayment
    const closed = engine.closeVault("vault-005", 30_500);
    expect(closed.state).toBe("closed");
  });

  it("should report accurate engine aggregate statistics", () => {
    engine.createVault({
      vaultId: "vault-stats-1",
      ownerAddress: "SP1",
      collateralSat: 100_000_000,
      mintedCtusd: 30_000,
      btcUsdPrice: 60_000,
      dlcContractId: "dlc-1",
    });
    engine.activateVault("vault-stats-1");

    const stats = engine.getEngineStats();
    expect(stats.totalVaults).toBe(1);
    expect(stats.activeVaults).toBe(1);
    expect(stats.totalCollateralSat).toBe(100_000_000);
    expect(stats.totalMintedCtusd).toBe(30_000);
  });
});
