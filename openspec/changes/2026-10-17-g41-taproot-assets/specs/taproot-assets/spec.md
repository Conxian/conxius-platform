# OpenSpec Specification: Taproot Assets Protocol Engine

## Requirements

### Requirement 1: Asset Minting & Initialization
The Taproot Assets engine MUST validate genesis parameters (asset ID, name, asset type, supply, genesis outpoint) and initialize assets in the `minted` state. Assets with non-positive supply or invalid names MUST be rejected.

### Requirement 2: Capacity Limits
The engine MUST enforce a maximum capacity limit of 1,000 active asset entries (`MAX_TAPROOT_ASSETS_CAPACITY = 1000`). Attempts to register additional assets beyond capacity MUST fail-closed with an explicit error.

### Requirement 3: State Invariants & Transfer Execution
Asset transfers MUST validate sender ownership, transfer amount, and destination script/outpoint. The asset status MUST transition from `minted` or `transferred` to `transferring`, then finalize to `transferred`.

### Requirement 4: Proof Verification & Burn Operations
The engine MUST support verifying Sparse Merkle Tree (SMST) membership/non-membership proofs. Burning assets MUST transition the state to `burned` or `tombstoned` and decrease active supply.
