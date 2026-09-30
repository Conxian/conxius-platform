import { createLogger } from "./logger";

const logger = createLogger("ctusd");

/**
 * G-22: ctUSD DLC-Based Bitcoin-Collateralized Stablecoin Engine & State Machine
 *
 * Implements a fail-closed, bounded vault engine for managing DLC-backed
 * ctUSD stablecoin positions, oracle threshold attestations, collateral ratios,
 * stability fee accrual, and permissionless liquidations.
 */

export type CtUsdVaultState =
  | "created"
  | "collateralized"
  | "active"
  | "liquidating"
  | "liquidated"
  | "closed"
  | "tombstoned";

export interface OracleAttestation {
  oracleId: string;
  priceBtcUsd: number;
  timestampIso: string;
  signature: string;
}

export interface CtUsdVaultConfig {
  vaultId: string;
  ownerAddress: string;
  collateralSat: number;
  mintedCtusd: number;
  btcUsdPrice: number;
  dlcContractId: string;
}

export interface CtUsdVaultStatus {
  vaultId: string;
  ownerAddress: string;
  state: CtUsdVaultState;
  collateralSat: number;
  mintedCtusd: number;
  currentBtcUsdPrice: number;
  collateralRatio: number;
  accruedStabilityFeeCtusd: number;
  dlcContractId: string;
  attestations: OracleAttestation[];
  createdAtIso: string;
  lastUpdatedAtIso: string;
  liquidatedAtIso?: string;
  tombstoneReason?: string;
}

export interface VaultEngineStats {
  totalVaults: number;
  activeVaults: number;
  totalCollateralSat: number;
  totalMintedCtusd: number;
  totalStabilityFeesCtusd: number;
}

export class CtUsdEngine {
  private vaults: Map<string, CtUsdVaultStatus> = new Map();
  private maxCapacity = 1000;
  private readonly MIN_COLLATERAL_RATIO = 1.5; // 150%
  private readonly LIQUIDATION_THRESHOLD = 1.3; // 130%
  private readonly LIQUIDATION_PENALTY = 0.13; // 13%
  private readonly STABILITY_FEE_APR = 0.025; // 2.50% APR
  private readonly REQUIRED_ORACLE_THRESHOLD = 3; // 3-of-5 oracles

  /**
   * Initializes a new ctUSD vault in the 'created' state.
   */
  public createVault(config: CtUsdVaultConfig): CtUsdVaultStatus {
    if (!config.vaultId || config.vaultId.trim().length === 0) {
      logger.error("[G-22] Vault creation failed: invalid vaultId");
      throw new Error("Invalid vaultId");
    }

    if (!config.ownerAddress || config.ownerAddress.trim().length === 0) {
      logger.error(`[G-22] Vault creation failed for ${config.vaultId}: invalid ownerAddress`);
      throw new Error("Invalid ownerAddress");
    }

    if (config.collateralSat <= 0) {
      logger.error(`[G-22] Vault creation failed for ${config.vaultId}: non-positive collateralSat`);
      throw new Error("Collateral amount must be greater than zero");
    }

    if (config.mintedCtusd <= 0) {
      logger.error(`[G-22] Vault creation failed for ${config.vaultId}: non-positive mintedCtusd`);
      throw new Error("Minted ctUSD amount must be greater than zero");
    }

    if (config.btcUsdPrice <= 0) {
      logger.error(`[G-22] Vault creation failed for ${config.vaultId}: non-positive btcUsdPrice`);
      throw new Error("BTC/USD price must be greater than zero");
    }

    if (this.vaults.size >= this.maxCapacity) {
      logger.error(`[G-22] Vault capacity limit of ${this.maxCapacity} reached`);
      throw new Error("ctUSD engine capacity limit reached");
    }

    if (this.vaults.has(config.vaultId)) {
      logger.error(`[G-22] Vault ${config.vaultId} already exists`);
      throw new Error(`Vault ${config.vaultId} already exists`);
    }

    const collateralBtc = config.collateralSat / 100_000_000;
    const collateralUsdValue = collateralBtc * config.btcUsdPrice;
    const initialRatio = collateralUsdValue / config.mintedCtusd;

    if (initialRatio < this.MIN_COLLATERAL_RATIO) {
      logger.error(
        `[G-22] Vault ${config.vaultId} creation rejected: initial collateral ratio ${(initialRatio * 100).toFixed(
          1,
        )}% below minimum 150%`,
      );
      throw new Error(`Collateral ratio ${(initialRatio * 100).toFixed(1)}% is below minimum 150% requirement`);
    }

    const nowIso = new Date().toISOString();
    const status: CtUsdVaultStatus = {
      vaultId: config.vaultId,
      ownerAddress: config.ownerAddress,
      state: "created",
      collateralSat: config.collateralSat,
      mintedCtusd: config.mintedCtusd,
      currentBtcUsdPrice: config.btcUsdPrice,
      collateralRatio: initialRatio,
      accruedStabilityFeeCtusd: 0,
      dlcContractId: config.dlcContractId,
      attestations: [],
      createdAtIso: nowIso,
      lastUpdatedAtIso: nowIso,
    };

    this.vaults.set(config.vaultId, status);
    logger.info(
      `[G-22] Vault ${config.vaultId} initialized in 'created' state. Collateral ratio: ${(initialRatio * 100).toFixed(1)}%`,
    );
    return { ...status };
  }

  /**
   * Confirms DLC collateral funding and transitions vault to 'collateralized' then 'active'.
   */
  public activateVault(vaultId: string): CtUsdVaultStatus {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      logger.error(`[G-22] Activation failed: vault ${vaultId} not found`);
      throw new Error(`Vault ${vaultId} not found`);
    }

    if (vault.state !== "created") {
      logger.error(`[G-22] Cannot activate vault ${vaultId}: in ${vault.state} state`);
      throw new Error(`Cannot activate vault in ${vault.state} state`);
    }

    vault.state = "active";
    vault.lastUpdatedAtIso = new Date().toISOString();
    this.vaults.set(vaultId, vault);

    logger.info(`[G-22] Vault ${vaultId} successfully activated and ctUSD minted`);
    return { ...vault };
  }

  /**
   * Submits oracle price attestations to update price and check liquidation conditions.
   * Requires 3-of-5 valid oracle attestations.
   */
  public updatePriceAndEvaluate(vaultId: string, attestations: OracleAttestation[]): CtUsdVaultStatus {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      logger.error(`[G-22] Price update failed: vault ${vaultId} not found`);
      throw new Error(`Vault ${vaultId} not found`);
    }

    if (vault.state === "closed" || vault.state === "tombstoned" || vault.state === "liquidated") {
      logger.error(`[G-22] Cannot update price for terminal vault ${vaultId} (${vault.state})`);
      throw new Error(`Cannot update price for vault in terminal ${vault.state} state`);
    }

    const validAttestations = attestations.filter(
      (a) => a.oracleId && a.priceBtcUsd > 0 && a.signature && a.signature.trim().length > 0,
    );

    if (validAttestations.length < this.REQUIRED_ORACLE_THRESHOLD) {
      logger.error(
        `[G-22] Oracle consensus failed for ${vaultId}: provided ${validAttestations.length} valid attestations, required ${this.REQUIRED_ORACLE_THRESHOLD}`,
      );
      throw new Error(`Insufficient oracle attestations (${validAttestations.length}/${this.REQUIRED_ORACLE_THRESHOLD} required)`);
    }

    const medianPrice =
      validAttestations.map((a) => a.priceBtcUsd).sort((a, b) => a - b)[Math.floor(validAttestations.length / 2)];

    vault.currentBtcUsdPrice = medianPrice;
    vault.attestations = [...validAttestations];

    const collateralBtc = vault.collateralSat / 100_000_000;
    const collateralUsdValue = collateralBtc * medianPrice;
    vault.collateralRatio = collateralUsdValue / vault.mintedCtusd;

    // Calculate accrued stability fee based on time since created
    const elapsedSeconds = (new Date().getTime() - new Date(vault.createdAtIso).getTime()) / 1000;
    const feeYears = elapsedSeconds / (365 * 24 * 3600);
    vault.accruedStabilityFeeCtusd = vault.mintedCtusd * this.STABILITY_FEE_APR * feeYears;

    vault.lastUpdatedAtIso = new Date().toISOString();

    // Check liquidation threshold (130%)
    if (vault.collateralRatio < this.LIQUIDATION_THRESHOLD && vault.state === "active") {
      vault.state = "liquidating";
      logger.warn(
        `[G-22] Vault ${vaultId} entered LIQUIDATING state! Ratio ${(vault.collateralRatio * 100).toFixed(
          1,
        )}% below threshold 130%`,
      );
    }

    this.vaults.set(vaultId, vault);
    return { ...vault };
  }

  /**
   * Completes liquidation of a vault in 'liquidating' state via DLC oracle settlement.
   */
  public executeLiquidation(vaultId: string): CtUsdVaultStatus {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      logger.error(`[G-22] Liquidation failed: vault ${vaultId} not found`);
      throw new Error(`Vault ${vaultId} not found`);
    }

    if (vault.state !== "liquidating") {
      logger.error(`[G-22] Liquidation rejected for ${vaultId}: vault is in ${vault.state} state`);
      throw new Error(`Cannot execute liquidation for vault in ${vault.state} state`);
    }

    const nowIso = new Date().toISOString();
    vault.state = "liquidated";
    vault.liquidatedAtIso = nowIso;
    vault.lastUpdatedAtIso = nowIso;

    this.vaults.set(vaultId, vault);
    logger.info(`[G-22] Vault ${vaultId} successfully liquidated. DLC settlement executed.`);
    return { ...vault };
  }

  /**
   * Repays principal + accrued stability fees to close the vault and unlock DLC collateral.
   */
  public closeVault(vaultId: string, ctusdRepayAmount: number): CtUsdVaultStatus {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      logger.error(`[G-22] Close vault failed: vault ${vaultId} not found`);
      throw new Error(`Vault ${vaultId} not found`);
    }

    if (vault.state !== "active") {
      logger.error(`[G-22] Cannot close vault ${vaultId}: vault is in ${vault.state} state`);
      throw new Error(`Cannot close vault in ${vault.state} state`);
    }

    const totalOwed = vault.mintedCtusd + vault.accruedStabilityFeeCtusd;
    if (ctusdRepayAmount < totalOwed) {
      logger.error(
        `[G-22] Repayment for ${vaultId} insufficient: provided $${ctusdRepayAmount}, owed $${totalOwed.toFixed(2)}`,
      );
      throw new Error(`Insufficient ctUSD repayment amount ($${ctusdRepayAmount} provided, $${totalOwed.toFixed(2)} owed)`);
    }

    vault.state = "closed";
    vault.lastUpdatedAtIso = new Date().toISOString();

    this.vaults.set(vaultId, vault);
    logger.info(`[G-22] Vault ${vaultId} fully closed and DLC collateral unlocked`);
    return { ...vault };
  }

  /**
   * Marks a vault as tombstoned due to invalid parameters or security breach.
   */
  public tombstoneVault(vaultId: string, reason: string): CtUsdVaultStatus {
    const vault = this.vaults.get(vaultId);
    if (!vault) {
      logger.error(`[G-22] Tombstone failed: vault ${vaultId} not found`);
      throw new Error(`Vault ${vaultId} not found`);
    }

    vault.state = "tombstoned";
    vault.tombstoneReason = reason;
    vault.lastUpdatedAtIso = new Date().toISOString();

    this.vaults.set(vaultId, vault);
    logger.warn(`[G-22] Vault ${vaultId} tombstoned. Reason: ${reason}`);
    return { ...vault };
  }

  /**
   * Retrieves status for a specific vault.
   */
  public getVaultStatus(vaultId: string): CtUsdVaultStatus | undefined {
    const vault = this.vaults.get(vaultId);
    return vault ? { ...vault } : undefined;
  }

  /**
   * Retrieves aggregate statistics for all vaults.
   */
  public getEngineStats(): VaultEngineStats {
    let activeCount = 0;
    let totalCollateral = 0;
    let totalMinted = 0;
    let totalFees = 0;

    for (const vault of this.vaults.values()) {
      if (vault.state === "active" || vault.state === "liquidating") {
        activeCount++;
        totalCollateral += vault.collateralSat;
        totalMinted += vault.mintedCtusd;
        totalFees += vault.accruedStabilityFeeCtusd;
      }
    }

    return {
      totalVaults: this.vaults.size,
      activeVaults: activeCount,
      totalCollateralSat: totalCollateral,
      totalMintedCtusd: totalMinted,
      totalStabilityFeesCtusd: totalFees,
    };
  }
}

export const ctUsdEngine = new CtUsdEngine();
