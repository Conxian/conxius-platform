import { describe, it, expect, beforeEach } from "vitest";
import { OpVaultEngine, VaultConfig } from "../lib/support/opVault";

describe("OP_VAULT BIP-345 Engine (G-54)", () => {
  let engine: OpVaultEngine;

  const validConfig: VaultConfig = {
    vaultId: "vault-101",
    depositAmountSat: 100_000_000,
    recoveryScriptPubKey: "76a914000000000000000000000000000000000000000088ac",
    targetScriptPubKey: "76a914111111111111111111111111111111111111111188ac",
    unvaultDelayBlocks: 144,
    createdAtBlock: 800_000,
  };

  beforeEach(() => {
    engine = new OpVaultEngine();
  });

  it("should create a vault in the locked state", () => {
    const status = engine.createVault(validConfig);
    expect(status.vaultId).toBe("vault-101");
    expect(status.state).toBe("locked");
    expect(status.depositAmountSat).toBe(100_000_000);
    expect(status.unvaultDelayBlocks).toBe(144);

    const fetched = engine.getVaultStatus("vault-101");
    expect(fetched).toBeDefined();
    expect(fetched?.state).toBe("locked");
  });

  it("should fail-closed on invalid parameters during vault creation", () => {
    expect(() =>
      engine.createVault({ ...validConfig, vaultId: "" })
    ).toThrow("Invalid vaultId");

    expect(() =>
      engine.createVault({ ...validConfig, depositAmountSat: 0 })
    ).toThrow("Deposit amount must be greater than zero");

    expect(() =>
      engine.createVault({ ...validConfig, unvaultDelayBlocks: -10 })
    ).toThrow("Unvault delay blocks must be greater than zero");
  });

  it("should transition from locked to unvaulting when unvault is triggered", () => {
    engine.createVault(validConfig);
    const unvaulted = engine.triggerUnvault("vault-101", 800_100);

    expect(unvaulted.state).toBe("unvaulting");
    expect(unvaulted.unvaultStartedAtBlock).toBe(800_100);
    expect(unvaulted.unvaultMaturesAtBlock).toBe(800_244);
  });

  it("should reject withdrawal if timelock has not matured", () => {
    engine.createVault(validConfig);
    engine.triggerUnvault("vault-101", 800_100);

    // Matures at 800_244, attempt withdrawal at block 800_200
    expect(() =>
      engine.completeWithdrawal("vault-101", 800_200, "tx-withdraw-001")
    ).toThrow("Timelock not matured: 44 blocks remaining");
  });

  it("should complete withdrawal after timelock maturity", () => {
    engine.createVault(validConfig);
    engine.triggerUnvault("vault-101", 800_100);

    // Withdrawal at or after maturity block 800_244
    const withdrawn = engine.completeWithdrawal(
      "vault-101",
      800_245,
      "tx-withdraw-001"
    );

    expect(withdrawn.state).toBe("withdrawn");
    expect(withdrawn.withdrawalTxId).toBe("tx-withdraw-001");
  });

  it("should trigger emergency recovery from locked or unvaulting state", () => {
    engine.createVault(validConfig);
    const recovered = engine.triggerRecovery("vault-101", "tx-recovery-999");

    expect(recovered.state).toBe("recovered");
    expect(recovered.recoveryTxId).toBe("tx-recovery-999");

    // Attempting recovery again should fail because state is already terminal
    expect(() =>
      engine.triggerRecovery("vault-101", "tx-recovery-1000")
    ).toThrow("Cannot trigger recovery: vault is in terminal recovered state");
  });
});
