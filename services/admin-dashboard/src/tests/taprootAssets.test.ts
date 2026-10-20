import { describe, it, expect, beforeEach } from "vitest";
import {
  TaprootAssetsModel,
  MAX_TAPROOT_ASSETS_CAPACITY,
} from "../lib/support/taprootAssets";

describe("Taproot Assets local research model (G-41)", () => {
  let engine: TaprootAssetsModel;

  beforeEach(() => {
    engine = new TaprootAssetsModel();
  });

  it("should calculate deterministic asset ID", () => {
    const id1 = TaprootAssetsModel.calculateAssetId(
      "txid123:0",
      "USD-Taro",
      "normal"
    );
    const id2 = TaprootAssetsModel.calculateAssetId(
      "txid123:0",
      "USD-Taro",
      "normal"
    );
    expect(id1).toBe(id2);
    expect(id1).toHaveLength(64);
  });

  it("should mint a new asset with valid parameters", () => {
    const asset = engine.mintAsset({
      name: "Sovereign BTC Credit",
      type: "normal",
      supply: 1000000n,
      genesisOutpoint: "a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef:0",
      groupKey: "03112233445566778899aabbccddeeff00112233445566778899aabbccddeeff00",
    });

    expect(asset.assetId).toBeDefined();
    expect(asset.state).toBe("minted");
    expect(asset.supply).toBe(1000000n);
    expect(asset.rootHash).toHaveLength(64);

    const retrieved = engine.getAsset(asset.assetId);
    expect(retrieved).toEqual(asset);
  });

  it("should fail-closed on invalid parameters during minting", () => {
    expect(() =>
      engine.mintAsset({
        name: "",
        type: "normal",
        supply: 100n,
        genesisOutpoint: "txid:0",
      })
    ).toThrow("Invalid asset name");

    expect(() =>
      engine.mintAsset({
        name: "TestAsset",
        type: "normal",
        supply: 0n,
        genesisOutpoint: "txid:0",
      })
    ).toThrow("Supply must be greater than zero");

    expect(() =>
      engine.mintAsset({
        name: "TestAsset",
        type: "normal",
        supply: 100n,
        genesisOutpoint: "invalid-outpoint-no-colon",
      })
    ).toThrow("Invalid genesis outpoint format");
  });

  it("should enforce capacity limits (MAX_TAPROOT_ASSETS_CAPACITY)", () => {
    for (let i = 0; i < MAX_TAPROOT_ASSETS_CAPACITY; i++) {
      engine.mintAsset({
        name: `Asset-${i}`,
        type: "normal",
        supply: 100n,
        genesisOutpoint: `txid-${i}:0`,
      });
    }

    expect(() =>
      engine.mintAsset({
        name: "OverflowAsset",
        type: "normal",
        supply: 100n,
        genesisOutpoint: "txid-overflow:0",
      })
    ).toThrow("Capacity limit exceeded");
  });

  it("should execute asset transfer and transition state", () => {
    const asset = engine.mintAsset({
      name: "Transferrable Token",
      type: "normal",
      supply: 5000n,
      genesisOutpoint: "genesis-txid:1",
    });

    const transferResult = engine.transferAsset({
      assetId: asset.assetId,
      amount: 1000n,
      senderPubkey: "021111111111111111111111111111111111111111111111111111111111111111",
      recipientScript: "51200000000000000000000000000000000000000000000000000000000000000000",
    });

    expect(transferResult.status).toBe("simulated");
    expect(transferResult.transferId).toContain("tapr-tx");

    const updatedAsset = engine.getAsset(asset.assetId);
    expect(updatedAsset?.state).toBe("transferred");
    expect(updatedAsset?.rootHash).toBe(transferResult.newRootHash);
  });

  it("should verify Sparse Merkle Tree (SMST) proofs", () => {
    const asset = engine.mintAsset({
      name: "Proof Asset",
      type: "collectible",
      supply: 1n,
      genesisOutpoint: "proof-txid:0",
    });

    expect(asset.simulationOnly).toBe(true);
    expect(engine.verifyProof(asset.assetId, asset.rootHash)).toBe(false);
    expect(engine.verifyProof(asset.assetId, "0000000000000000000000000000000000000000000000000000000000000000")).toBe(false);
    expect(engine.verifyProof(asset.assetId, "invalid-proof")).toBe(false);
  });

  it("should execute partial/full burn and support tombstoning", () => {
    const asset = engine.mintAsset({
      name: "Burnable Token",
      type: "normal",
      supply: 1000n,
      genesisOutpoint: "burn-txid:0",
    });

    engine.burnAsset(asset.assetId, 400n);
    let updated = engine.getAsset(asset.assetId);
    expect(updated?.supply).toBe(600n);

    engine.burnAsset(asset.assetId, 600n);
    updated = engine.getAsset(asset.assetId);
    expect(updated?.supply).toBe(0n);
    expect(updated?.state).toBe("burned");

    engine.tombstoneAsset(asset.assetId);
    updated = engine.getAsset(asset.assetId);
    expect(updated?.state).toBe("tombstoned");

    expect(() => engine.burnAsset(asset.assetId, 100n)).toThrow("Asset is tombstoned");
  });
});
