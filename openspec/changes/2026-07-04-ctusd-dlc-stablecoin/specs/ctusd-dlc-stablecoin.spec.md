# OpenSpec Specification: ctUSD DLC-Based Bitcoin Collateralized Stablecoin Engine (G-22)

**Version**: 1.0.0
**Status**: Active Specification
**Authority**: `GOVERNANCE.md` & `INFORMATION_HIERARCHY.md`
**Gap**: G-22 (ctUSD Stablecoin Logic & Sovereign Collateral Engine)

## 1. Scope & Objective

This specification establishes the fail-closed operational invariants, state machine, DLC oracle threshold verification, collateralization bounds, stability fee calculations, and liquidation mechanics for ctUSD — a Bitcoin-collateralized USD-pegged stablecoin managed by Discreet Log Contracts (DLCs) on the Conxius Platform.

## 2. Vault State Machine & Invariants

Each ctUSD vault transitions strictly through the following states:

- `created`: Vault parameters initialized, pending DLC funding.
- `collateralized`: BTC collateral locked in DLC and verified.
- `active`: ctUSD minted to user; vault active and accruing stability fees.
- `liquidating`: Collateral ratio < 130%; DLC liquidation triggered.
- `liquidated`: DLC oracle attested liquidation completed; 13% penalty retained by protocol treasury.
- `closed`: User repaid ctUSD principal + stability fees; DLC collateral unlocked.
- `tombstoned`: Fail-closed terminal state for invalidated or expired vaults.

### State Transition Matrix

| From | To | Trigger / Condition |
|------|----|--------------------|
| `created` | `collateralized` | DLC funding transaction confirmed with collateral ratio ≥ 150% |
| `collateralized` | `active` | ctUSD minting executed |
| `active` | `closed` | Full ctUSD principal + stability fee repayment |
| `active` | `liquidating` | BTC/USD price attestation drops collateral ratio < 130% |
| `liquidating` | `liquidated` | 3-of-5 oracle threshold attestation confirms liquidation outcome |
| Any non-terminal | `tombstoned` | Security violation, capacity breach, or invalid parameters |

## 3. Financial & Operational Risk Parameters

- **Minimum Collateral Ratio**: 150% (`1.50`). Vault creation or minting below this threshold is rejected.
- **Liquidation Threshold**: 130% (`1.30`). Ratios strictly less than 130% transition the vault to `liquidating`.
- **Liquidation Penalty**: 13% (`0.13`). Subtracted from remaining collateral during liquidation and allocated to protocol treasury reserve.
- **Stability Fee**: 2.50% APR (`0.025`). Computed continuously: `fee = (principal * rate * elapsedSeconds) / (365 * 86400)`.
- **Oracle Consensus Threshold**: 3-of-5 valid oracle attestations required for price update or DLC settlement.
- **Max Active Vault Capacity**: 1,000 vaults per engine instance. Reaching capacity triggers fail-closed rejection.

## 4. API & Authentication Control

- BFF routes (`/api/v1/ctusd/vaults`) MUST require valid admin authentication (`X-Admin-API-Key` or M2M JWT bearer token).
- Responses MUST include no-store cache controls and audit event logging via `createLogger("ctusd")`.
