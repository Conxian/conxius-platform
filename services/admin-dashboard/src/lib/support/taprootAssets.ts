/**
 * Taproot Assets local research model and unavailable provider boundary (G-41)
 *
 * This module does not implement issuance, SMST verification or transactions.
 * The model only simulates local state; the engine requires a qualified provider.
 */

import { createLogger } from "./logger";
import { generateId } from "./idgen";
import { createHash } from "crypto";

const logger = createLogger("taproot-assets");

export const MAX_TAPROOT_ASSETS_CAPACITY = 1000;

export type TaprootAssetType = "normal" | "collectible";

export type TaprootAssetState =
  | "minted"
  | "transferring"
  | "transferred"
  | "burned"
  | "tombstoned";

export interface TaprootAsset {
  readonly simulationOnly: true;
  assetId: string;
  name: string;
  type: TaprootAssetType;
  supply: bigint;
  genesisOutpoint: string;
  groupKey?: string;
  rootHash: string;
  state: TaprootAssetState;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface TaprootTransferPayload {
  assetId: string;
  amount: bigint;
  senderPubkey: string;
  recipientScript: string;
  proofSmstHash?: string;
}

export interface TaprootAssetTransferResult {
  transferId: string;
  assetId: string;
  amount: bigint;
  senderPubkey: string;
  recipientScript: string;
  newRootHash: string;
  status: "simulated";
  timestampIso: string;
}

/** In-memory research only. No signing, broadcast, ownership or finality evidence. */
export class TaprootAssetsModel {
  readonly simulationOnly = true as const;
  private assets: Map<string, TaprootAsset> = new Map();

  /**
   * Calculates a local model identifier, not a protocol asset ID.
   */
  public static calculateAssetId(
    genesisOutpoint: string,
    name: string,
    type: TaprootAssetType
  ): string {
    return createHash("sha256")
      .update(`${genesisOutpoint}:${name}:${type}`)
      .digest("hex");
  }

  /**
   * Mint a new Taproot Asset.
   */
  public mintAsset(params: {
    name: string;
    type: TaprootAssetType;
    supply: bigint;
    genesisOutpoint: string;
    groupKey?: string;
  }): TaprootAsset {
    if (!params.name || params.name.trim().length === 0) {
      logger.error("[G-41] Asset creation failed: missing or empty asset name");
      throw new Error("Invalid asset name");
    }

    if (params.supply <= 0n) {
      logger.error(
        `[G-41] Asset creation failed for ${params.name}: non-positive supply (${params.supply})`
      );
      throw new Error("Supply must be greater than zero");
    }

    if (!params.genesisOutpoint || !params.genesisOutpoint.includes(":")) {
      logger.error(
        `[G-41] Asset creation failed for ${params.name}: invalid genesis outpoint`
      );
      throw new Error("Invalid genesis outpoint format");
    }

    if (this.assets.size >= MAX_TAPROOT_ASSETS_CAPACITY) {
      logger.error(
        `[G-41] Engine capacity exceeded: maximum ${MAX_TAPROOT_ASSETS_CAPACITY} assets supported`
      );
      throw new Error("Capacity limit exceeded");
    }

    const assetId = TaprootAssetsModel.calculateAssetId(
      params.genesisOutpoint,
      params.name,
      params.type
    );

    if (this.assets.has(assetId)) {
      logger.error(`[G-41] Asset already exists with ID: ${assetId}`);
      throw new Error(`Asset already exists: ${assetId}`);
    }

    const rootHash = createHash("sha256")
      .update(`${assetId}:${params.supply.toString()}`)
      .digest("hex");

    const now = new Date().toISOString();
    const asset: TaprootAsset = {
      simulationOnly: true,
      assetId,
      name: params.name,
      type: params.type,
      supply: params.supply,
      genesisOutpoint: params.genesisOutpoint,
      groupKey: params.groupKey,
      rootHash,
      state: "minted",
      createdAtIso: now,
      updatedAtIso: now,
    };

    this.assets.set(assetId, asset);
    logger.info(`[G-41] Taproot Asset mint simulated: ${assetId} (${params.name})`);
    return asset;
  }

  /**
   * Retrieves an asset by ID.
   */
  public getAsset(assetId: string): TaprootAsset | undefined {
    return this.assets.get(assetId);
  }

  /**
   * List all registered assets.
   */
  public listAssets(): TaprootAsset[] {
    return Array.from(this.assets.values());
  }

  /**
   * Execute an asset transfer.
   */
  public transferAsset(payload: TaprootTransferPayload): TaprootAssetTransferResult {
    const asset = this.assets.get(payload.assetId);

    if (!asset) {
      logger.error(`[G-41] Transfer failed: asset ${payload.assetId} not found`);
      throw new Error(`Asset not found: ${payload.assetId}`);
    }

    if (asset.state === "burned" || asset.state === "tombstoned") {
      logger.error(`[G-41] Transfer failed: asset ${payload.assetId} is terminal (${asset.state})`);
      throw new Error(`Cannot transfer asset in terminal state: ${asset.state}`);
    }

    if (payload.amount <= 0n || payload.amount > asset.supply) {
      logger.error(
        `[G-41] Transfer failed: invalid amount ${payload.amount} for asset ${payload.assetId} with supply ${asset.supply}`
      );
      throw new Error("Invalid transfer amount");
    }

    if (!payload.recipientScript || payload.recipientScript.trim().length === 0) {
      logger.error(`[G-41] Transfer failed: recipientScript is empty`);
      throw new Error("Invalid recipientScript");
    }

    asset.state = "transferring";
    asset.updatedAtIso = new Date().toISOString();

    const transferId = generateId("tapr-tx");
    const newRootHash = createHash("sha256")
      .update(`${asset.rootHash}:${transferId}:${payload.recipientScript}`)
      .digest("hex");

    asset.rootHash = newRootHash;
    asset.state = "transferred";
    asset.updatedAtIso = new Date().toISOString();

    logger.info(`[G-41] Taproot Asset ${payload.assetId} transfer simulated (local ID: ${transferId})`);

    return {
      transferId,
      assetId: payload.assetId,
      amount: payload.amount,
      senderPubkey: payload.senderPubkey,
      recipientScript: payload.recipientScript,
      newRootHash,
      status: "simulated",
      timestampIso: asset.updatedAtIso,
    };
  }

  /**
   * Verifies Sparse Merkle Tree (SMST) commitment proof.
   */
  public verifyProof(assetId: string, proofSmstHash: string): boolean {
    // Neither local root equality nor hash shape is a protocol proof.
    // The research model has no verifier and must never assert verification.
    void assetId;
    void proofSmstHash;
    return false;
  }

  /**
   * Burn asset tokens and transition state.
   */
  public burnAsset(assetId: string, burnAmount: bigint): TaprootAsset {
    const asset = this.assets.get(assetId);

    if (!asset) {
      logger.error(`[G-41] Burn failed: asset ${assetId} not found`);
      throw new Error(`Asset not found: ${assetId}`);
    }

    if (asset.state === "tombstoned") {
      logger.error(`[G-41] Burn failed: asset ${assetId} is tombstoned`);
      throw new Error("Asset is tombstoned");
    }

    if (burnAmount <= 0n || burnAmount > asset.supply) {
      logger.error(`[G-41] Burn failed: invalid burn amount ${burnAmount}`);
      throw new Error("Invalid burn amount");
    }

    asset.supply -= burnAmount;
    const now = new Date().toISOString();
    asset.updatedAtIso = now;

    if (asset.supply === 0n) {
      asset.state = "burned";
      logger.info(`[G-41] Asset ${assetId} completely burned and set to burned state`);
    } else {
      logger.info(`[G-41] Partial burn executed for ${assetId}. Remaining supply: ${asset.supply}`);
    }

    return asset;
  }

  /**
   * Tombstone terminal asset.
   */
  public tombstoneAsset(assetId: string): TaprootAsset {
    const asset = this.assets.get(assetId);

    if (!asset) {
      logger.error(`[G-41] Tombstone failed: asset ${assetId} not found`);
      throw new Error(`Asset not found: ${assetId}`);
    }

    asset.state = "tombstoned";
    asset.updatedAtIso = new Date().toISOString();
    logger.warn(`[G-41] Asset ${assetId} has been tombstoned`);
    return asset;
  }
}

/** Compatibility API: unavailable until an independently qualified provider exists. */
export class TaprootAssetsEngine {
  static calculateAssetId = TaprootAssetsModel.calculateAssetId;

  private unavailable(): never {
    throw new Error("Taproot Assets provider unavailable: qualified protocol provider required");
  }

  mintAsset(_params: Parameters<TaprootAssetsModel["mintAsset"]>[0]): TaprootAsset {
    return this.unavailable();
  }

  transferAsset(_payload: TaprootTransferPayload): TaprootAssetTransferResult {
    return this.unavailable();
  }

  burnAsset(_assetId: string, _amount: bigint): TaprootAsset {
    return this.unavailable();
  }

  tombstoneAsset(_assetId: string): TaprootAsset {
    return this.unavailable();
  }

  verifyProof(_assetId: string, _proofSmstHash: string): boolean {
    return false;
  }

  getAsset(_assetId: string): TaprootAsset | undefined {
    return undefined;
  }

  listAssets(): TaprootAsset[] {
    return [];
  }
}
