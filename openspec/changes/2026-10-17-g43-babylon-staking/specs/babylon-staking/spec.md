# Spec: Babylon Bitcoin Staking Protocol Engine (G-43)

## ADDED Requirements

### Requirement: Staking Delegation Creation
The Babylon Staking Engine MUST accept valid staking delegation requests with positive BTC amounts (in satoshis), valid staker/finality-provider public keys, and unbonding timelock parameters.
- Requests with non-positive amounts or missing keys MUST fail-closed.
- The total active delegation count MUST NOT exceed `MAX_BABYLON_STAKING_CAPACITY` (1,000 delegations).

#### Scenario: Valid delegation creation
- **WHEN** a staker submits a delegation request with 10,000,000 sats and valid keys
- **THEN** the delegation is initialized in `pending` state with a unique ID.

#### Scenario: Capacity exceeded delegation creation
- **WHEN** active delegations reach 1,000 and a new delegation request is submitted
- **THEN** the request is rejected with a capacity limit error.

### Requirement: Delegation State Machine Invariants
The engine MUST maintain strict state transitions across `pending`, `active`, `unbonding`, `withdrawn`, `slashed`, and `tombstoned`.

#### Scenario: Transition to active state
- **WHEN** confirmation proof is provided for a `pending` delegation
- **THEN** the delegation transitions to `active` state and begins accruing yield.

#### Scenario: Transition to unbonding state
- **WHEN** an unbonding request is submitted for an `active` delegation
- **THEN** the delegation transitions to `unbonding` state with target maturity block set.

### Requirement: Timelock Maturity & Slashing Verification
Unbonding requests MUST require block height maturity before withdrawal, and slashing requests MUST require cryptographic evidence.

#### Scenario: Premature withdrawal rejection
- **WHEN** withdrawal is requested before current block reaches target maturity block
- **THEN** the withdrawal is rejected and state remains `unbonding`.

#### Scenario: Valid slashing execution
- **WHEN** valid slashing attestation proof is submitted for a delegation
- **THEN** the delegation transitions to `slashed` state.
