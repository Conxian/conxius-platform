/**
 * ctUSD Stablecoin Logic (G-22)
 *
 * Type definitions for ctUSD — a DLC-based Bitcoin-collateralized stablecoin
 * pegged to USD. ctUSD uses Discreet Log Contracts (DLCs) for private,
 * trustless collateralization with oracle-attested price feeds.
 *
 * The actual Clarity contract lives in the Conxian/Conxian repo. This module
 * defines the TypeScript types consumed by the admin dashboard, SFO, and
 * treasury analytics for ctUSD monitoring, minting, and redemption tracking.
 *
 * @see docs/architecture/FULL_STACK_BITCOIN_RESEARCH.md#26 — DLC Maturity
 */

export type CtusdCollateralType = "btc-dlc" | "sbtc";

export type CtusdVaultStatus = "open" | "liquidated" | "closed" | "pending-oracle";

export type CtusdOracleFeed = {
  oracleId: string;
  oracleName: string;
  threshold: number;
  lastPriceCents: number;
  lastAttestationAtIso: string;
  isActive: boolean;
};

export type CtusdVault = {
  vaultId: string;
  ownerAddress: string;
  collateralType: CtusdCollateralType;
  collateralSats: number;
  mintedCtusd: number;
  minCollateralRatioBps: number;
  currentRatioBps: number;
  status: CtusdVaultStatus;
  createdAtIso: string;
  updatedAtIso: string;
};

export type CtusdProtocolState = {
  totalCollateralSats: number;
  totalMintedCtusd: number;
  globalRatioBps: number;
  activeVaults: number;
  oracleFeeds: CtusdOracleFeed[];
  dlcExpiryBlocks: number;
  liquidationPenaltyBps: number;
  stabilityFeeBps: number;
  updatedAtIso: string;
};

export type DlcContractState = {
  contractId: string;
  vaultId: string;
  lockedSats: number;
  oracleId: string;
  outcomes: DlcOutcome[];
  maturityBlockHeight: number;
  attested: boolean;
  attestedAtIso: string | null;
};

export type DlcOutcome = {
  outcomeId: number;
  description: string;
  payoutSats: number;
};

export type MintRequest = {
  vaultId: string;
  amountCtusd: number;
  depositSats: number;
};

export type BurnRequest = {
  vaultId: string;
  amountCtusd: number;
  withdrawSats: number;
};

export type LiquidationEvent = {
  vaultId: string;
  liquidatedAtIso: string;
  collateralLostSats: number;
  ctusdBurned: number;
  penaltySats: number;
  oraclePriceCents: number;
  trigger: "undercollateralized" | "oracle-timeout" | "governance";
};

export type CtusdTreasurySnapshot = {
  protocolState: CtusdProtocolState;
  recentLiquidations: LiquidationEvent[];
  stabilityFeeRevenueSats: number;
  liquidationRevenueSats: number;
  snapshotAtIso: string;
};
