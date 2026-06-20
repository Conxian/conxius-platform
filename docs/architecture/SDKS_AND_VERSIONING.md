# SDK Ownership & Version Policy (CON-1178)

This document defines the ownership and versioning policies for the Conxian SDK ecosystem.

## 1. Goal
Ensure consistency and boundary clarity across the various SDKs used in the Conxian stack.

## 2. Core SDK Families

| SDK Family | Role | Ownership | Target Version |
| :--- | :--- | :--- | :--- |
| **Stacks JS** | L2 Interaction | lib-conxian-core | v7.4.x |
| **Clarinet SDK** | Contract Testing | conxius-orbit | v2.x |
| **Bitcoin/Signer** | Low-level Signing | conxius-enclave-sdk | Native/Wasm |
| **Conxian BFF** | Frontend Coordination | admin-dashboard | Internal |

## 3. Ownership Boundaries

- **lib-conxian-core**: The canonical source of truth for protocol-level primitives, cryptographic functions, and cross-platform (Wasm) logic.
- **conxius-enclave-sdk**: Owns hardware-backed signing abstractions (StrongBox, HSM).
- **conxian-gateway**: Owns the integration contract for settlement and orchestration.
- **conxian_ui / conxius-wallet**: SDK consumers that adhere to the shared-core baseline.

## 4. Versioning Policy

- **Semantic Versioning**: All SDKs must follow SemVer (vX.Y.Z).
- **Alignment**: Major SDK upgrades must be coordinated across the platform to prevent logic drift.
- **Wasm-First**: Core logic should be compiled to Wasm to ensure bit-for-bit parity between Node.js, Browser, and Rust environments.

---
*Maintained by Jules (Sovereign Engineering Agent)*

## 4. Phase 7 SDK Strategy: Wasm-First & Multi-Chain (CON-1178)
- **Universal SDK (`lib-conxian-core`)**:
  - Primary source of truth for protocol logic, signing templates, and verification.
  - Targets: Rust (Gateway), Wasm (Wallet/UI), and C-bindings (Mobile Enclave).
- **UTXO Adapter Libraries**:
  - `elements-miniscript`: For Liquid/Confidential assets.
  - `rsk-native-sdk`: For RSK sidechain interactions.
  - `babylon-staking-lib`: For remote Bitcoin staking flows.
- **Verification Toolchains**:
  - `coq-clarity`: Formal verification for Stacks smart contracts.
  - `bitvm-verify`: Prover/Verifier logic for trustless Bitcoin bridging.

---
*Updated by Jules (Sovereign Engineering Agent) - June 20, 2026*
