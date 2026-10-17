# Proposal: G-43 Babylon Bitcoin Staking Protocol Engine

## Summary
Implement a fail-closed Babylon Bitcoin Staking Protocol Engine (`G-43`) in `services/admin-dashboard/src/lib/support/babylon.ts` to provide non-custodial Bitcoin staking orchestration, delegation state machine enforcement, unbonding timelock verification, slashing attestation handling, and strict capacity bounds.

## Motivation
Babylon Bitcoin Staking allows corporate treasury BTC to generate native yield by staking to secure PoS systems without bridge or counterparty trust. Implementing a fail-closed orchestration engine in the institutional dashboard enables yield generation while enforcing strict security bounds, timelock compliance, and capacity constraints.

## Scope
- Implement `BabylonStakingEngine` in `services/admin-dashboard/src/lib/support/babylon.ts`.
- Support delegation lifecycle: `pending` -> `active` -> `unbonding` -> `withdrawn`, plus `slashed` and `tombstoned` terminal states.
- Enforce `MAX_BABYLON_STAKING_CAPACITY = 1000` active delegations.
- Enforce unbonding timelock maturity checks and slashing evidence verification.
- Provide comprehensive unit tests in `services/admin-dashboard/src/tests/babylon.test.ts`.
