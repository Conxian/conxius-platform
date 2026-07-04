# ctUSD: DLC-Based Bitcoin-Collateralized Stablecoin

**Status**: Proposal  
**Gap**: G-22 (ctUSD Stablecoin Logic, score 24/30)  
**Date**: 2026-07-04

## Summary

ctUSD is a USD-pegged stablecoin collateralized by Bitcoin via Discreet Log
Contracts (DLCs). It provides the missing stable quote asset for Stacks DeFi,
enabling sBTC pairs, lending markets, and yield strategies without relying on
fiat-backed or custodial stablecoins.

## Motivation

Stacks DeFi lacks a native stablecoin. Without one:
- sBTC pairs have no stable quote asset
- Lending markets cannot offer USD-denominated loans
- Yield strategies are limited to single-asset vaults
- Users must bridge USDC/USDT from other chains (custodial risk)

ctUSD solves this by using Bitcoin-native DLCs for trust-minimized
collateralization. DLCs allow private, oracle-attested price feeds without the
oracle knowing the contract details — a unique Bitcoin capability that no EVM
L2 can replicate.

## Design

### Collateralization Model

```
User locks BTC in DLC → Oracle attests BTC/USD price →
  ctUSD minted at ≥150% collateralization ratio →
    If ratio drops below 130%: liquidation via DLC outcome
```

### Architecture

| Component | Repository | Language |
|-----------|-----------|----------|
| **ctUSD Clarity contract** | `Conxian/Conxian` | Clarity |
| **DLC oracle adapter** | `conxian-nexus` | Python |
| **Stablecoin monitoring** | `conxius-platform` (this repo) | TypeScript |
| **SFO treasury integration** | `conxius-platform` | TypeScript |

### Key Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Minimum collateral ratio | 150% | Safe above historical BTC volatility |
| Liquidation threshold | 130% | 20% buffer before undercollateralization |
| Liquidation penalty | 13% | Incentivizes self-liquidation |
| Stability fee (APR) | 2.50% | Competitive with MakerDAO DAI |
| DLC expiry window | 144 blocks (~24h) | Sufficient for oracle attestation |
| Oracle threshold | 3-of-5 | Byzantine fault tolerance |

### Oracle Feeds

Five independent oracles attest BTC/USD price at each DLC maturity:
1. Conxian Oracle (first-party)
2. Stacks Oracle (on-chain)
3. DLC.Link (third-party)
4. Chainlink (via Stacks bridge)
5. Community Oracle (governance-elected)

### Revenue Model

Revenue flows to the Conxian treasury:
- **Stability fees** (2.50% APR on minted ctUSD) → Operational Rewards
- **Liquidation penalties** (13% of collateral) → Treasury Reserve
- **DLC funding fees** → split between oracle operators and protocol

## Implementation Plan

### Phase 1: Types & Design (this proposal)
- [x] `lib/usi/stablecoin.ts` — TypeScript type definitions
- [ ] `openspec/specs/ctusd-dlc-stablecoin.spec.md` — formal specification
- [ ] Clarity contract design review with Stacks Foundation

### Phase 2: Clarity Contract (`Conxian/Conxian`)
- [ ] `ctusd-core.clar` — vault management, mint/burn, collateral ratios
- [ ] `ctusd-oracle.clar` — oracle feed aggregation (3-of-5 threshold)
- [ ] `ctusd-dlc.clar` — DLC contract lifecycle (fund → attest → settle)
- [ ] `ctusd-liquidator.clar` — permissionless liquidation auctions

### Phase 3: Nexus Integration (`conxian-nexus`)
- [ ] `adapters/ctusd.py` — DLC oracle feed adapter
- [ ] Oracle attestation verification pipeline
- [ ] Liquidation event monitoring

### Phase 4: Dashboard & Treasury
- [ ] `/ctusd` page — vault overview, mint/burn UI, liquidation history
- [ ] SFO integration — ctUSD stability fee revenue tracking
- [ ] Treasury yield dashboard — ctUSD as a protocol revenue source

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Oracle collusion | 3-of-5 threshold with diverse oracle operators |
| DLC counterparty risk | Time-locked refund path if oracle fails to attest |
| BTC flash crash | 150% minimum ratio + 24h DLC expiry window |
| Smart contract bugs | Clarity decidability + Immunefi bug bounty |
| Regulatory (stablecoin) | ctUSD is overcollateralized, not algorithmic |

## Dependencies

- **Stacks Nakamoto** (live) — fast blocks, Bitcoin finality
- **sBTC** (live, $545M TVL) — sBTC as alternative collateral type
- **DLC implementation** (rust-dlc, pdlc) — libraries for DLC contract execution
- **Oracle network** — requires 5 independent oracle operators

## References

- [FULL_STACK_BITCOIN_RESEARCH.md#26](../../docs/architecture/FULL_STACK_BITCOIN_RESEARCH.md) — DLC Maturity
- [SCORING_MATRIX.md](../../docs/SCORING_MATRIX.md) — G-22 scoring (24/30)
- [GAPS.md](../../docs/GAPS.md) — G-22 gap definition
- RFC: Discreet Log Contracts (https://github.com/discreetlogcontracts/dlcspecs)
