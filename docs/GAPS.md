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
  - **Deterministic Blueprint**: AI-agent readable deployment metadata at .

### Conxian Gateway & Nexus (Phase 6 Core Alignment)
- **Status**: ✅ Production-Grade Orchestrator (v0.2.2-aligned).
- **Implemented & Audited**:
  - **Kwil Transactional State**: Full migration from Neon to Kwil as the backing store for Nexus Glass Node state.
  - **Sovereign AI Allocation**: Real-time compute weighting and status monitoring.
  - **Universal Bitcoin Identity (UBI)**: DID-linked sovereign identity management.
  - **ALEX Readiness (Method B)**: Direct contract-call transaction construction.

## 2. Identified Frictions & Roadmap (Phase 7)
- [x] **Render Deployment Remediation**: Analysis complete. srv-d7b0el3uibrs73b2qjg0 requires removal of the trailing colon in the --listen binding (fix: pnpm start -- -p  --hostname 0.0.0.0). srv-d8fmr7v40ujc73b7ba8g requires correcting Npm to npm in the build command.
- [/] **Declarative NixOS Migration**: In progress. provision-secrets.sh is being phased out in favor of sops-nix.
- [ ] **Local-First UI Execution**: Transition state transition logic to Wasm for client-side execution.
- [ ] **Micro-Frontend Federation**: Decompose UI into federated modules (DEX, BitVM, sBTC).

## 3. Tooling Integration
- **Supabase**: Financial intelligence and off-chain reporting.
- **Kwil**: Decentralized transactional state for Nexus.
- **Render**: Production hosting (Pending friction resolution).
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
| **G-05** | MFE Federation | [SOVEREIGN_REPR_2026.md#3](./architecture/SOVEREIGN_REPR_2026.md#3) | Webpack Module Federation |
| **G-06** | DLC Native Finance | [FULL_STACK_BITCOIN_RESEARCH.md#26](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#26) | `lib-conxian-core/dlc` |
| **G-07** | Nostr Wallet Connect (NWC) | [FULL_STACK_BITCOIN_RESEARCH.md#27](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#27) | 🟢 **Implemented (Transport)**. NIP-47 authorized via Admin BFF |
| **G-08** | ZK-Rollup T1 Adapters (Citrea/Strata) | [FULL_STACK_BITCOIN_RESEARCH.md#28](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#28) | `conxian-nexus/adapters` |
| **G-09** | BIP-322 Signed Intents | [FULL_STACK_BITCOIN_RESEARCH.md#29](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#29) | `lib-conxian-core` (Wasm) |
| **G-10** | MuSig2 Aggregation | [FULL_STACK_BITCOIN_RESEARCH.md#31](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#31) | `lib-conxian-core` (MuSig2) |
| **G-11** | Silent Payments (BIP-352) | [FULL_STACK_BITCOIN_RESEARCH.md#30](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#30) | `lib-conxian-core` (Silent) |
| **G-12** | BIP-353 DNS Payments | [FULL_STACK_BITCOIN_RESEARCH.md#32](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#32) | `lib-conxian-core` (DNSSEC) |
| **G-13** | Layer 3 DeFi Rollups | [FULL_STACK_BITCOIN_RESEARCH.md#33](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#33) | `conxian-nexus/l3` |
| **G-14** | FROST Threshold Signatures | [FULL_STACK_BITCOIN_RESEARCH.md#34](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#34) | `lib-conxian-core/frost` |
| **G-15** | OP_CAT Recursive Covenants | [FULL_STACK_BITCOIN_RESEARCH.md#35](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#35) | `lib-conxian-core/covenants` |
| **G-16** | Fedimint Community Liquidity | [FULL_STACK_BITCOIN_RESEARCH.md#36](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#36) | `conxian-nexus/fedimint` |

---
*Updated by Jules (Sovereign Engineering Agent) - June 2026*

## 5. Implementation Status (June 2026 Update)
- **G-02 (FDC3 Native Resolver)**: 🟢 **Implemented (Console Scaffold)**. Standardized mapping in `resolver.ts`.
- **G-03 (Usage Validation)**: 🟢 **Implemented (Instrumentation)**. Score-based triage in `usageValidation.ts`.
- **G-07 (NWC Transport)**: 🟢 **Implemented (Scaffold)**. NIP-47 authorized via `NWCTransport`.
- **G-12 (BIP-353 DNS)**: 🟢 **Implemented (Bridge Scaffold)**. Foundational bridge in `dns-payments.ts` and verified via tests.
- **G-09 (BIP-322 Intents)**: 🟢 **Implemented (Bridge Scaffold)**. Foundational bridge in `bip322.ts`.
- **G-01 (BitVM2 Floor)**: 🟡 **Research Complete**. Implementation pending in `lib-conxian-core`.
- **G-04 (Wasm-First Wallet)**: 🟡 **Design Complete**. USI integration documented in `PHASE_7_PROPOSAL_UNIVERSAL_SETTLEMENT.md`.

| **G-17** | Simplicity Verification | [FULL_STACK_BITCOIN_RESEARCH.md#37](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#37) | `lib-conxian-core/simplicity` |
| **G-18** | BIP-324 Transport | [FULL_STACK_BITCOIN_RESEARCH.md#38](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#38) | `conxian-nexus/transport` |
| **G-19** | Spider Network Routing | [FULL_STACK_BITCOIN_RESEARCH.md#39](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#39) | `conxian-nexus/spider` |
| **G-20** | BitVM3 Adaptive Proofs | [FULL_STACK_BITCOIN_RESEARCH.md#40](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#40) | `lib-conxian-core/bitvm3` |
| **G-21** | Sangria/Nova Proof Folding | [FULL_STACK_BITCOIN_RESEARCH.md#24](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#24) | `lib-conxian-core/sangria` |
| **G-22** | ctUSD Stablecoin Logic | [FULL_STACK_BITCOIN_RESEARCH.md#26](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#26) | `services/admin-dashboard/src/lib/usi/stablecoin.ts` |
| **G-23** | Ark V-UTXO Protocol | [FULL_STACK_BITCOIN_RESEARCH.md#25](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#25) | `lib-conxian-core/ark` |
| **G-41** | Taproot Assets | [FULL_STACK_BITCOIN_RESEARCH.md#41](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#41) | `conxian-nexus/adapters/taproot-assets` |
| **G-42** | PTLCs | [FULL_STACK_BITCOIN_RESEARCH.md#42](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#42) | `lib-conxian-core/ptlc` |
