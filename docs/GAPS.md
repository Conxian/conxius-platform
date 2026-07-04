# Conxius Platform: Gap Analysis & Technical Debt (Phase 6 baseline, Phase 7 transition)

This document tracks the resolution of gaps and identifies new technical requirements.

## 1. Service Gaps (Updated June 2026)
### Phase 7 Sovereign Redesign (Active Transition)
- **Status**: 🏗️ Active Scaffolding.
- **Implemented**:
  - **Multidimensional Platform Pulse**: Real-time telemetry for Treasury (BTC/sBTC), AI, and L2 Settlements.
  - **Unified Cross-Chain Balance API**: BFF endpoint for multi-layer liquidity visibility.
  - **Wallet-BFF PSBT Pipe**: Hardened PSBT coordination and attestation interface.
  - **UI-BFF Telemetry**: High-throughput cached telemetry for sovereign dashboards.
  - **Nostr P&L Telemetry**: Decentralized P&L reporting via Nostr Kind 20626.
  - **Hardened Security Audit**: Enhanced ZSE checks and automated secret scanning.
  - **Deterministic Blueprint**: AI-agent readable deployment metadata.

### Conxian Gateway & Nexus (Phase 6 Core Alignment)
- **Status**: ✅ Production-Grade Orchestrator (v0.2.2-aligned).
- **Implemented & Audited**:
  - **Kwil Transactional State**: Full migration from Neon to Kwil as the backing store for Nexus Glass Node state.
  - **Sovereign AI Allocation**: Real-time compute weighting and status monitoring.
  - **Universal Bitcoin Identity (UBI)**: DID-linked sovereign identity management.
  - **ALEX Readiness (Method B)**: Direct contract-call transaction construction.

## 2. Identified Frictions & Roadmap (Phase 7)
- [x] **Render Deployment Remediation**: Analysis complete. srv-d7b0el3uibrs73b2qjg0 requires removal of the trailing colon in the --listen binding. srv-d8fmr7v40ujc73b7ba8g requires correcting Npm to npm in the build command.
- [/] **Declarative NixOS Migration**: In progress. provision-secrets.sh is being phased out in favor of sops-nix.
- [ ] **Local-First UI Execution**: Transition state transition logic to Wasm for client-side execution.
- [ ] **Micro-Frontend Federation**: Decompose UI into federated modules (DEX, BitVM, sBTC).

## 3. Tooling Integration
- **Supabase**: Financial intelligence and off-chain reporting.
- **Kwil**: Decentralized transactional state for Nexus.
- **Render**: Production hosting.
- **Nostr**: Decentralized P&L and operational telemetry.

---
*Maintained by Jules (Sovereign Engineering Agent)*

## 4. Gap-to-Research Mapping (Phase 7 Alignment)

| Gap ID | Description | Research Reference | Implementation Path |
| :--- | :--- | :--- | :--- |
| **G-01** | BitVM2 Verification Floor | [FULL_STACK_BITCOIN_RESEARCH.md#21](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#21) | `lib-conxian-core/bitvm` |
| **G-02** | FDC3 Native Resolver | [FDC3_INTEROPERABILITY.md](./architecture/FDC3_INTEROPERABILITY.md) | 🟢 **Implemented**. Standardized mapping in `resolver.ts`. |
| **G-03** | Usage Validation | [usage-validation-instrumentation-v1.spec.md](../openspec/specs/usage-validation-instrumentation-v1.spec.md) | 🟢 **Implemented**. Score-based triage in `usageValidation.ts`. |
| **G-04** | Wasm Wallet-BFF | [FULL_STACK_BITCOIN_RESEARCH.md#15](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#15) | `lib-conxian-core` (Wasm) |
| **G-05** | Silent Payments (BIP-352) | [FULL_STACK_BITCOIN_RESEARCH.md#30](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#30) | 🏗️ **Active Scaffolding**. CON-1281 implemented in enclave-sdk. |
| **G-06** | DLC Native Finance | [FULL_STACK_BITCOIN_RESEARCH.md#26](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#26) | `lib-conxian-core/dlc` |
| **G-07** | Nostr Wallet Connect (NWC) | [FULL_STACK_BITCOIN_RESEARCH.md#27](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#27) | 🟢 **Implemented**. CON-1267 authorized via Admin BFF |
| **G-08** | ZK-Rollup T1 Adapters (Citrea/Strata) | [FULL_STACK_BITCOIN_RESEARCH.md#28](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#28) | `conxian-nexus/adapters` |
| **G-09** | BIP-322 Signed Intents | [FULL_STACK_BITCOIN_RESEARCH.md#29](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#29) | 🟢 **Implemented**. CON-1266 bridge active. |
| **G-10** | MuSig2 Aggregation | [FULL_STACK_BITCOIN_RESEARCH.md#31](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#31) | `lib-conxian-core/musig2` |
| **G-11** | BitVM2 Multi-Party Aggregation | [FULL_STACK_BITCOIN_RESEARCH.md#31](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#31) | 🏗️ **Active Scaffolding**. CON-1306 initialized. |
| **G-12** | ERC-7683 Solver Selection | [FULL_STACK_BITCOIN_RESEARCH.md#32](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#32) | 🏗️ **Active Scaffolding**. CON-1307 initialized. |
| **G-13** | MFE Federation | [SOVEREIGN_REPR_2026.md#3](./architecture/SOVEREIGN_REPR_2026.md#3) | Webpack Module Federation |
| **G-14** | FROST Threshold Signatures | [FULL_STACK_BITCOIN_RESEARCH.md#34](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#34) | 🏗️ **Active Scaffolding**. TypeScript coordination types in `frost.ts`. Rust crypto target: `lib-conxian-core/frost`. |
| **G-15** | OP_CAT Recursive Covenants | [FULL_STACK_BITCOIN_RESEARCH.md#35](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#35) | `lib-conxian-core/covenants` |
| **G-16** | Fedimint Community Liquidity | [FULL_STACK_BITCOIN_RESEARCH.md#36](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#36) | `conxian-nexus/fedimint` |
| **G-17** | BIP-353 DNS Payments | [FULL_STACK_BITCOIN_RESEARCH.md#32](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#32) | 🟢 **Implemented**. Foundational bridge active. |
| **G-18** | BIP-324 Transport | [FULL_STACK_BITCOIN_RESEARCH.md#38](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#38) | `conxian-nexus/transport` |
| **G-19** | Spider Network Routing | [FULL_STACK_BITCOIN_RESEARCH.md#39](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#39) | `conxian-nexus/spider` |
| **G-20** | BitVM3 Adaptive Proofs | [FULL_STACK_BITCOIN_RESEARCH.md#40](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#40) | `lib-conxian-core/bitvm3` |
| **G-21** | Sangria/Nova Proof Folding | [FULL_STACK_BITCOIN_RESEARCH.md#24](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#24) | `lib-conxian-core/sangria` |
| **G-22** | ctUSD Stablecoin Logic | [FULL_STACK_BITCOIN_RESEARCH.md#26](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#26) | 🏗️ **Active Scaffolding**. TypeScript types in `lib/usi/stablecoin.ts`. OpenSpec proposal at `openspec/changes/2026-07-04-ctusd-dlc-stablecoin/`. |
| **G-23** | Ark V-UTXO Protocol | [FULL_STACK_BITCOIN_RESEARCH.md#25](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#25) | `lib-conxian-core/ark` |
| **G-41** | Taproot Assets | [FULL_STACK_BITCOIN_RESEARCH.md#41](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#41) | `conxian-nexus/adapters/taproot-assets` |
| **G-42** | PTLCs | [FULL_STACK_BITCOIN_RESEARCH.md#42](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#42) | `lib-conxian-core/ptlc` |
| **G-43** | Babylon Bitcoin Staking | [FULL_STACK_BITCOIN_RESEARCH.md#43](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#43) | 🏗️ **Active Scaffolding**. `BabylonAdapter` in `conxian-nexus/adapters/babylon.py`. Yield source in rewards API. |
| **G-44** | BitVMX Computation | [FULL_STACK_BITCOIN_RESEARCH.md#44](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#44) | 🏗️ **Active Research**. CON-1311 initialized. |
| **G-45** | BOLT-12 Offers | [FULL_STACK_BITCOIN_RESEARCH.md#45](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#45) | `lib-conxian-core/lightning` |
| **G-46** | RGB++ Protocol | [FULL_STACK_BITCOIN_RESEARCH.md#46](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#46) | `conxian-nexus/adapters/rgbpp` |
| **G-47** | BIP-119 (CTV) Vaults | [FULL_STACK_BITCOIN_RESEARCH.md#47](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#47) | `lib-conxian-core/covenants` |
| **G-48** | BIP-324 V2 Transport | [FULL_STACK_BITCOIN_RESEARCH.md#48](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#48) | `conxian-nexus/transport` |
| **G-49** | Decentralized USI Transport | [FULL_STACK_BITCOIN_RESEARCH.md#49](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#49) | `services/admin-dashboard/src/lib/support/event-bus.ts` |
| **G-50** | ZK Contingent Payments | [FULL_STACK_BITCOIN_RESEARCH.md#50](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#50) | `lib-conxian-core/zkcp` |
| **G-51** | BitVM2 Optimized Verifier | [FULL_STACK_BITCOIN_RESEARCH.md#51](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#51) | `lib-conxian-core/bitvm` |
| **G-52** | BRC-20 / Runes Integration | [FULL_STACK_BITCOIN_RESEARCH.md#52](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#52) | `conxian-nexus/adapters` |
| **G-53** | Lightning Async Payments | [FULL_STACK_BITCOIN_RESEARCH.md#53](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#53) | `lib-conxian-core/lightning` |
| **G-54** | OP_VAULT (BIP-345) | [FULL_STACK_BITCOIN_RESEARCH.md#54](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#54) | `lib-conxian-core/covenants` |

---
*Updated by Jules (Sovereign Engineering Agent) - June 2026*

## 5. Implementation Status (June 2026 Update)
- **G-44 (BitVMX)**: 🏗️ **Active Scaffolding**. Initialized via CON-1311.
- **G-02 (FDC3 Native Resolver)**: 🟢 **Implemented**.
- **G-03 (Usage Validation)**: 🟢 **Implemented**.
- **G-07 (NWC Transport)**: 🟢 **Implemented**.
- **G-09 (BIP-322 Intents)**: 🟢 **Implemented**.
- **G-17 (BIP-353 DNS)**: 🟢 **Implemented**.
- **G-01 (BitVM2 Floor)**: 🏗️ **Active Scaffolding**.
- **G-11 (BitVM2 Multi-Party)**: 🏗️ **Active Scaffolding**.
- **G-05 (Silent Payments)**: 🏗️ **Active Scaffolding**.
- **G-44 (BitVMX Computation)**: 🏗️ **Active Scaffolding**.
