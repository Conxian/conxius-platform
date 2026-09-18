import { createLogger } from "./logger";

const logger = createLogger("OP_VAULT");

/**
 * G-54: Bitcoin Covenants OP_VAULT (BIP-345) Engine & State Machine
 *
 * Implements a fail-closed, bounded vault state machine for managing
 * multi-stage Bitcoin vaults with recovery paths and spend delays.
 */

export type VaultState = "locked" | "unvaulting" | "recovered" | "withdrawn";

export interface VaultConfig {
  vaultId: string;
  depositAmountSat: number;
  recoveryScriptPubKey: string;
  targetScriptPubKey: string;
  unvaultDelayBlocks: number;
  createdAtBlock: number;
}

export interface VaultStatus {
  vaultId: string;
  state: VaultState;
  depositAmountSat: number;
  unvaultStartedAtBlock?: number;
  unvaultDelayBlocks: number;
  unvaultMaturesAtBlock?: number;
  recoveryTxId?: string;
  withdrawalTxId?: string;
  lastUpdatedAtIso: string;
}

export class OpVaultEngine {
  private vaults: Map<string, VaultStatus> = new Map();
  private vaultConfigs: Map<string, VaultConfig> = new Map();
  private maxCapacity = 1000;

  /**
   * Initializes a new OP_VAULT instance in the 'locked' state.
   */
  public createVault(config: VaultConfig): VaultStatus {
    if (!config.vaultId || config.vaultId.trim().length === 0) {
      logger.error("[G-54] Vault creation failed: invalid vaultId");
      throw new Error("Invalid vaultId");
    }

    if (config.depositAmountSat <= 0) {
      logger.error(`[G-54] Vault creation failed for ${config.vaultId}: non-positive deposit amount`);
      throw new Error("Deposit amount must be greater than zero");
    }

    if (config.unvaultDelayBlocks <= 0) {
      logger.error(`[G-54] Vault creation failed for ${config.vaultId}: invalid unvaultDelayBlocks`);
      throw new Error("Unvault delay blocks must be greater than zero");
    }

    if (this.vaults.size >= this.maxCapacity) {
      logger.error(`[G-54] Vault capacity exceeded limit of ${this.maxCapacity}`);
      throw new Error("OP_VAULT capacity limit reached");
    }

    if (this.vaults.has(config.vaultId)) {
      logger.error(`[G-54] Vault ${config.vaultId} already exists`);
      throw new Error(`Vault ${config.vaultId} already exists`);
    }

    const status: VaultStatus = {
      vaultId: config.vaultId,
      state: "locked",
      depositAmountSat: config.depositAmountSat,
      unvaultDelayBlocks: config.unvaultDelayBlocks,
      lastUpdatedAtIso: new Date().toISOString(),
    };

    this.vaultConfigs.set(config.vaultId, { ...config });
    this.vaults.set(config.vaultId, status);

    logger.info(`[G-54] Vault ${config.vaultId} initialized in locked state with ${config.depositAmountSat} sats`);
    return { ...status };
  }

  /**
   * Triggers the unvaulting process (OP_UNVAULT opcode trigger).
   */
  public triggerUnvault(vaultId: string, currentBlockHeight: number): VaultStatus {
    const status = this.vaults.get(vaultId);
    if (!status) {
      logger.error(`[G-54] Unvault failed: vault ${vaultId} not found`);
      throw new Error(`Vault ${vaultId} not found`);
    }

    if (status.state !== "locked") {
      logger.error(`[G-54] Unvault failed for ${vaultId}: vault is in ${status.state} state`);
      throw new Error(`Cannot unvault: vault is in ${status.state} state`);
    }

    status.state = "unvaulting";
    status.unvaultStartedAtBlock = currentBlockHeight;
    status.unvaultMaturesAtBlock = currentBlockHeight + status.unvaultDelayBlocks;
    status.lastUpdatedAtIso = new Date().toISOString();

    this.vaults.set(vaultId, status);
    logger.info(`[G-54] Vault ${vaultId} unvaulting initiated at block ${currentBlockHeight}. Matures at ${status.unvaultMaturesAtBlock}`);
    return { ...status };
  }

  /**
   * Executes emergency recovery (OP_VAULT_RECOVER opcode trigger).
   * Can be invoked from 'locked' or 'unvaulting' states.
   */
  public triggerRecovery(vaultId: string, recoveryTxId: string): VaultStatus {
    const status = this.vaults.get(vaultId);
    if (!status) {
      logger.error(`[G-54] Recovery failed: vault ${vaultId} not found`);
      throw new Error(`Vault ${vaultId} not found`);
    }

    if (status.state === "recovered" || status.state === "withdrawn") {
      logger.error(`[G-54] Recovery failed for ${vaultId}: vault is already terminal (${status.state})`);
      throw new Error(`Cannot trigger recovery: vault is in terminal ${status.state} state`);
    }

    if (!recoveryTxId || recoveryTxId.trim().length === 0) {
      logger.error(`[G-54] Recovery failed for ${vaultId}: invalid recoveryTxId`);
      throw new Error("Invalid recoveryTxId");
    }

    status.state = "recovered";
    status.recoveryTxId = recoveryTxId;
    status.lastUpdatedAtIso = new Date().toISOString();

    this.vaults.set(vaultId, status);
    logger.info(`[G-54] Emergency recovery executed for vault ${vaultId} via tx ${recoveryTxId}`);
    return { ...status };
  }

  /**
   * Completes withdrawal after the unvaulting timelock has matured.
   */
  public completeWithdrawal(vaultId: string, currentBlockHeight: number, withdrawalTxId: string): VaultStatus {
    const status = this.vaults.get(vaultId);
    if (!status) {
      logger.error(`[G-54] Withdrawal failed: vault ${vaultId} not found`);
      throw new Error(`Vault ${vaultId} not found`);
    }

    if (status.state !== "unvaulting") {
      logger.error(`[G-54] Withdrawal failed for ${vaultId}: vault is in ${status.state} state`);
      throw new Error(`Cannot complete withdrawal: vault is in ${status.state} state`);
    }

    if (status.unvaultMaturesAtBlock === undefined || currentBlockHeight < status.unvaultMaturesAtBlock) {
      const remaining = (status.unvaultMaturesAtBlock ?? 0) - currentBlockHeight;
      logger.error(`[G-54] Withdrawal rejected for ${vaultId}: timelock not matured. ${remaining} blocks remaining.`);
      throw new Error(`Timelock not matured: ${remaining} blocks remaining`);
    }

    if (!withdrawalTxId || withdrawalTxId.trim().length === 0) {
      logger.error(`[G-54] Withdrawal failed for ${vaultId}: invalid withdrawalTxId`);
      throw new Error("Invalid withdrawalTxId");
    }

    status.state = "withdrawn";
    status.withdrawalTxId = withdrawalTxId;
    status.lastUpdatedAtIso = new Date().toISOString();

    this.vaults.set(vaultId, status);
    logger.info(`[G-54] Withdrawal completed for vault ${vaultId} via tx ${withdrawalTxId}`);
    return { ...status };
  }

  /**
   * Retrieves current status for a vault.
   */
  public getVaultStatus(vaultId: string): VaultStatus | undefined {
    const status = this.vaults.get(vaultId);
    return status ? { ...status } : undefined;
  }
}

export const opVaultEngine = new OpVaultEngine();
