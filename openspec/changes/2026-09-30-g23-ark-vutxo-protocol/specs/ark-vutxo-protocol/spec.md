# Spec: Ark V-UTXO Protocol Engine

**Capability ID:** `ark-vutxo-protocol`

## Requirements

### Requirement 1: State Machine Invariants
The engine MUST maintain V-UTXOs in one of the valid states: `boarded`, `available`, `locked`, `spent`, `forfeited`, `unboarded`, `expired`, `tombstoned`. Unrecognized state transitions MUST fail closed.

### Requirement 2: Capacity Bounding
The engine MUST limit active V-UTXOs to a maximum capacity of 1,000 entries. Requests to board or create V-UTXOs exceeding this capacity MUST be rejected with a `CapacityExceededError`.

### Requirement 3: Forfeit Transaction Registration
The engine MUST register pre-signed forfeit transactions for each V-UTXO. If a double-spend attempt or invalid unilateral exit is detected, the ASP MUST be able to claim the forfeit transaction and transition the V-UTXO to `forfeited`.

### Requirement 4: Unboarding Paths
1. **Collaborative Unboarding**: Instant settlement from V-UTXO back to L1 via ASP co-signing. Transitions state to `unboarded`.
2. **Unilateral Unboarding**: Exit via L1 after relative timelock expiration. Requires validating exit timelocks.

### Requirement 5: Expiration & Tombstoning
V-UTXOs past their TTL MUST transition to `expired`. Expired or disputed V-UTXOs can be tombstoned to prevent further operations.
