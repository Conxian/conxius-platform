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
- [x] **Render Deployment Remediation**: Analysis complete. srv-d7b0el3uibrs73b2qjg0 requires removal of the trailing colon in the --listen binding (fix: pnpm start -- -p $PORT --hostname 0.0.0.0). srv-d8fmr7v40ujc73b7ba8g requires correcting Npm to npm in the build command.
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
| **G-02** | FDC3 Native Resolver | [FDC3_INTEROPERABILITY.md](./architecture/FDC3_INTEROPERABILITY.md) | `admin-dashboard/src/lib/fdc3` |
| **G-03** | Usage Validation | [usage-validation-instrumentation-v1.spec.md](../openspec/specs/usage-validation-instrumentation-v1.spec.md) | `admin-dashboard/src/lib/sidl/usageValidation.ts` |
| **G-04** | Wasm Wallet-BFF | [FULL_STACK_BITCOIN_RESEARCH.md#15](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#15) | `lib-conxian-core` (Wasm) |
| **G-05** | MFE Federation | [SOVEREIGN_REPR_2026.md#3](./architecture/SOVEREIGN_REPR_2026.md#3) | Webpack Module Federation |

---
*Updated by Jules (Sovereign Engineering Agent) - June 2026*

## 5. Implementation Status (June 2026 Update)
- **G-02 (FDC3 Native Resolver)**: 🟢 **Implemented (Console Scaffold)**. Standardized mapping in `resolver.ts`.
- **G-03 (Usage Validation)**: 🟢 **Implemented (Instrumentation)**. Score-based triage in `usageValidation.ts`.
- **G-01 (BitVM2 Floor)**: 🟡 **Research Complete**. Implementation pending in `lib-conxian-core`.
- **G-04 (Wasm-First Wallet)**: 🟡 **Design Complete**. USI integration documented in `PHASE_7_PROPOSAL_UNIVERSAL_SETTLEMENT.md`.

| **G-06** | DLC Native Finance | [FULL_STACK_BITCOIN_RESEARCH.md#26](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#26) | `lib-conxian-core/dlc` |
| **G-07** | Nostr Wallet Connect (NWC) | [FULL_STACK_BITCOIN_RESEARCH.md#27](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#27) | `admin-dashboard/src/lib/support/nwc.ts` |
| **G-08** | ZK-Rollup T1 Adapters (Citrea/Strata) | [FULL_STACK_BITCOIN_RESEARCH.md#28](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#28) | `conxian-nexus/adapters` |
| **G-09** | BIP-322 Signed Intents | [FULL_STACK_BITCOIN_RESEARCH.md#29](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#29) | `lib-conxian-core` (Wasm) |
| **G-10** | MuSig2 Aggregation | [FULL_STACK_BITCOIN_RESEARCH.md#31](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#31) | `lib-conxian-core` (MuSig2) |
