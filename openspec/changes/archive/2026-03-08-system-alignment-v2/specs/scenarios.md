# Scenarios: System Alignment V2

## Scenario 1: Cross-Chain Atomic Swap (Global Liquidity Mesh)
- **Actor**: User
- **Action**: Initiates a swap from sBTC (Stacks) to L-BTC (Liquid).
- **System**:
  1. Gateway orchestrates HTLC creation on both chains.
  2. Mesh telemetry tracks the swap status.
  3. Nexus verifies the finality on Stacks.
  4. UI reflects real-time progress using standardized StatusIndicators.

## Scenario 2: Compliance Proof Generation (MVCR)
- **Actor**: Institutional User
- **Action**: Requests an MVCR for the last fiscal quarter.
- **System**:
  1. Gateway queries the Compliance module.
  2. Nexus provides hardware-attested audit trails from the enclave.
  3. A mathematically verifiable report is generated and cryptographically signed.
