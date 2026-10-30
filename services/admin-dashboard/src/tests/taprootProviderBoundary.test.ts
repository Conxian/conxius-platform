import { describe, expect, it } from "vitest";
import { TaprootAssetsEngine, TaprootAssetsModel } from "../lib/support/taprootAssets";

describe("Taproot Assets qualified provider boundary", () => {
  it("cannot fabricate mint, transfer, burn or tombstone receipts", () => {
    const engine = new TaprootAssetsEngine();
    const before = engine.listAssets();
    const params = { name: "Research", type: "normal" as const, supply: 10n, genesisOutpoint: "local:0" };
    for (const operation of [
      () => engine.mintAsset(params),
      () => engine.transferAsset({ assetId: "local", amount: 1n, senderPubkey: "x", recipientScript: "x" }),
      () => engine.burnAsset("local", 1n),
      () => engine.tombstoneAsset("local"),
    ]) {
      expect(operation).toThrow("Taproot Assets provider unavailable");
      expect(engine.listAssets()).toEqual(before);
      expect(engine.getAsset("local")).toBeUndefined();
    }
  });

  it("rejects arbitrary proof strings and even exact local model roots", () => {
    const engine = new TaprootAssetsEngine();
    const model = new TaprootAssetsModel();
    const asset = model.mintAsset({ name: "Research", type: "normal", supply: 10n, genesisOutpoint: "local:0" });
    for (const proof of ["", "x", "0".repeat(64), "z".repeat(64), asset.rootHash]) {
      expect(engine.verifyProof(asset.assetId, proof)).toBe(false);
      expect(model.verifyProof(asset.assetId, proof)).toBe(false);
    }
  });

  it("makes local model records and transfer receipts explicitly simulated", () => {
    const model = new TaprootAssetsModel();
    const asset = model.mintAsset({ name: "Research", type: "normal", supply: 10n, genesisOutpoint: "local:0" });
    expect(model.simulationOnly).toBe(true);
    expect(asset.simulationOnly).toBe(true);
    expect(model.transferAsset({ assetId: asset.assetId, amount: 1n, senderPubkey: "x", recipientScript: "x" }).status)
      .toBe("simulated");
    expect(new TaprootAssetsEngine().listAssets()).toEqual([]);
  });
});
