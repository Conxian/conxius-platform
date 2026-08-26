# Conxius Platform: Gap Analysis & Technical Debt (Phase 6 baseline, Phase 7 transition)

**Status:** Active operational gap register; scores and labels are not production-readiness evidence.

**Last reviewed:** 2026-08-26

**Platform gap remediation status:** Local platform gaps are tracked by the
[platform gap remediation OpenSpec](../openspec/changes/2026-08-26-platform-gap-remediation/proposal.md).
Organization-wide controls, external deployments, and cross-repository contracts
remain owner-coordinated until independently evidenced.

**Authority:** [`INFORMATION_HIERARCHY.md`](./INFORMATION_HIERARCHY.md) and the
canonical sources linked from each entry. Current documentation-alignment
change: [`2026-07-27-documentation-authority-and-operator-accuracy`](../openspec/changes/2026-07-27-documentation-authority-and-operator-accuracy/).

This document tracks the resolution of gaps and identifies new technical requirements.

### Readiness interpretation (2026-07-22)

Strategic alignment and TypeScript orchestration are not evidence of production
cryptographic readiness. The BitVM2, BitVM3, BitVMX, and ZKCP entries below
remain research/scaffolding lanes until an explicitly injected, independently
accepted Gateway/Core/Nexus backend is available. Issue [#1187](https://github.com/Conxian/conxius-platform/issues/1187)
quarantines the former length-only and unconditional success paths in this
repository; it does not implement a proof backend.

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
- **Status**: Historical Phase 6 alignment claims require owner reconciliation;
  current authority selection is deferred to issue #1167 and is not a
  production-readiness claim.
- **Implemented & Audited**:
  - **Kwil Transactional State**: Full migration from Neon to Kwil as the backing store for Nexus Glass Node state.
  - **Sovereign AI Allocation**: Real-time compute weighting and status monitoring.
  - **Universal Bitcoin Identity (UBI)**: DID-linked sovereign identity management.
  - **ALEX Readiness (Method B)**: Direct contract-call transaction construction.

## 2. Identified Frictions & Roadmap (Phase 7)
- [x] **Render Deployment Remediation**: Analysis complete. srv-d7b0el3uibrs73b2qjg0 requires removal of the trailing colon in the --listen binding. srv-d8fmr7v40ujc73b7ba8g requires correcting Npm to npm in the build command.
- [ ] **Declarative NixOS Migration**: Target/proposed. No supported NixOS node
  deployment is implemented in this repository; `provision-secrets.sh` remains
  the current local helper.
- [ ] **Local-First UI Execution**: Transition state transition logic to Wasm for client-side execution.
- [ ] **Micro-Frontend Federation**: Decompose UI into federated modules (DEX, BitVM, sBTC).

## 3. Tooling Integration
- **Supabase**: Financial intelligence and off-chain reporting.
- **Kwil**: Decentralized transactional state for Nexus.
- **Render**: External/target hosting reference; no supported Render deployment
  is supplied by this repository.
- **Nostr**: Decentralized P&L and operational telemetry.

---
*Maintained by Jules (Sovereign Engineering Agent)*

## 4. Gap-to-Research Mapping (Historical, non-authoritative)

The mappings below are retained for provenance only. They do not imply that protocol-specific implementations, DeFi capabilities, custody, pricing, treasury, yield, or execution are platform capabilities. Current platform authority is the provider-neutral upgrade contract in `docs/architecture/UPGRADE_ALIGNMENT_CONTRACT_2026.md`; unsupported items must remain `unavailable` until independently evidenced.


| Gap ID | Description | Research Reference | Implementation Path |
| :--- | :--- | :--- | :--- |
| **G-01** | BitVM2 Verification Floor | [FULL_STACK_BITCOIN_RESEARCH.md#21](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#21) | 🛡️ **Fail-closed platform boundary** in `services/admin-dashboard/src/lib/support/bitvm.ts`; versioned 1,024-floor retention cap, pre-dispatch reservations, terminal cleanup, and active-operation preservation are enforced; production `lib-conxian-core/bitvm` adapter pending |
| **G-02** | FDC3 Native Resolver | [FDC3_INTEROPERABILITY.md](./architecture/FDC3_INTEROPERABILITY.md) | 🟢 **Implemented**. Standardized mapping in `resolver.ts`. |
| **G-03** | Usage Validation | [usage-validation-instrumentation-v1.spec.md](../openspec/specs/usage-validation-instrumentation-v1.spec.md) | 🟢 **Implemented**. Score-based triage in `usageValidation.ts`. |
| **G-04** | Wasm Wallet-BFF | [FULL_STACK_BITCOIN_RESEARCH.md#15](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#15) | `lib-conxian-core` (Wasm) |
| **G-05** | Silent Payments (BIP-352) | [FULL_STACK_BITCOIN_RESEARCH.md#30](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#30) | 🏗️ **Active Scaffolding**. CON-1281 implemented in enclave-sdk. |
| **G-06** | DLC Native Finance | [FULL_STACK_BITCOIN_RESEARCH.md#26](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#26) | `lib-conxian-core/dlc` |
| **G-07** | Nostr Wallet Connect (NWC) | [FULL_STACK_BITCOIN_RESEARCH.md#27](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#27) | 🟢 **Implemented**. CON-1267 authorized via Admin BFF |
| **G-08** | ZK-Rollup T1 Adapters (Citrea/Strata) | [FULL_STACK_BITCOIN_RESEARCH.md#28](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#28) | `conxian-nexus/adapters` |
| **G-09** | BIP-322 Signed Intents | [FULL_STACK_BITCOIN_RESEARCH.md#29](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#29) | 🟢 **Implemented**. CON-1266 bridge active. |
| **G-10** | MuSig2 Aggregation | [FULL_STACK_BITCOIN_RESEARCH.md#31](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#31) | `lib-conxian-core/musig2` |
| **G-11** | BitVM2 Multi-Party Aggregation | [FULL_STACK_BITCOIN_RESEARCH.md#31](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#31) | 🛡️ **Fail-closed scaffolding**. Aggregation requires authorized unique signers, bounded detached versioned attestations, explicit backend evidence, and retention-safe cleanup that preserves in-flight challenges/signatures; default signature verification remains unavailable. |
| **G-12** | ERC-7683 Solver Selection | [FULL_STACK_BITCOIN_RESEARCH.md#32](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#32) | 🏗️ **Active Scaffolding**. CON-1307 initialized. |
| **G-13** | MFE Federation | [SOVEREIGN_REPR_2026.md#3](./architecture/SOVEREIGN_REPR_2026.md#3) | Webpack Module Federation |
| **G-14** | FROST Threshold Signatures | [FULL_STACK_BITCOIN_RESEARCH.md#34](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#34) | 🟢 **Active Scaffolding & Unit Verified**. Coordination types in `frost.ts` verified by `frost.test.ts`. Rust target: `lib-conxian-core/frost`. |
| **G-15** | OP_CAT Recursive Covenants | [FULL_STACK_BITCOIN_RESEARCH.md#35](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#35) | `lib-conxian-core/covenants` |
| **G-16** | Fedimint Community Liquidity | [FULL_STACK_BITCOIN_RESEARCH.md#36](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#36) | `conxian-nexus/fedimint` |
| **G-17** | BIP-353 DNS Payments | [FULL_STACK_BITCOIN_RESEARCH.md#32](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#32) | 🟢 **Implemented**. Foundational bridge active. |
| **G-18** | BIP-324 Transport | [FULL_STACK_BITCOIN_RESEARCH.md#38](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#38) | `conxian-nexus/transport` |
| **G-19** | Spider Network Routing | [FULL_STACK_BITCOIN_RESEARCH.md#39](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#39) | `conxian-nexus/spider` |
| **G-20** | BitVM3 Adaptive Proofs | [FULL_STACK_BITCOIN_RESEARCH.md#40](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#40) | 🛡️ **Fail-closed platform boundary** in `bitvm3.ts`; bounded same-proof FIFO replay/conflict protection, versioned terminal cap/TTL retention, and `conxian.bitvm3.tombstone.v1` conflict tombstones are implemented, while a durable Gateway/Core identity registry, recursive backend, and acceptance evidence remain pending |
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
| **G-50** | ZK Contingent Payments | [FULL_STACK_BITCOIN_RESEARCH.md#50](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#50) | 🛡️ **Fail-closed platform boundary** in `zkcp.ts`; versioned intent binding, bounded retention/pagination, immutable proof/payment evidence, and unavailable defaults are enforced. Production key release is fully quarantined: there is no releaser, obligation execution, registry lookup, decryption-key output, or finalized success. An independently authenticated, server-bound Gateway/Core atomic claim-or-get coordinator and durable registry remain future launch gates |
| **G-51** | BitVM2 Optimized Verifier | [FULL_STACK_BITCOIN_RESEARCH.md#51](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#51) | 🏗️ **Research/scaffolding lane**; no pairing or optimized verifier is implemented here |
| **G-52** | BRC-20 / Runes Integration | [FULL_STACK_BITCOIN_RESEARCH.md#52](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#52) | `conxian-nexus/adapters` |
| **G-53** | Lightning Async Payments | [FULL_STACK_BITCOIN_RESEARCH.md#53](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#53) | `lib-conxian-core/lightning` |
| **G-54** | OP_VAULT (BIP-345) | [FULL_STACK_BITCOIN_RESEARCH.md#54](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#54) | `lib-conxian-core/covenants` |
| **G-55** | Enterprise ERP Simulation & Programmable Mock Engines | [ENTERPRISE_ERP_SIMULATION_RESEARCH.md](./architecture/ENTERPRISE_ERP_SIMULATION_RESEARCH.md) | 🏗️ **Active Scaffolding**. CON-1320 initialized. |
| **G-56** | Founder-rights decision and evidence boundary | [Founder-rights observation report](./architecture/proposals/FOUNDER_RIGHTS_REVENUE_OBSERVATION_2026-07-22.md) | 🟡 **Observation contract implemented**. Protocol ratification and beneficiary decision remain unresolved. |
| **G-57** | Cross-repository revenue model drift | [Founder-rights observation report](./architecture/proposals/FOUNDER_RIGHTS_REVENUE_OBSERVATION_2026-07-22.md#contradictions-and-safe-interpretation) | 🟡 **Active gap**. Protocol, Gateway, core, and platform models require owner-level reconciliation; this platform change selects no rate. |
| **G-58** | Deployment evidence and live-interface verification | [Founder-rights observation report](./architecture/proposals/FOUNDER_RIGHTS_REVENUE_OBSERVATION_2026-07-22.md#verified-evidence-matrix) | 🟡 **Stage gate implemented**. No broadcast, confirmation, or live-interface deployment is asserted by this repository. |
| **G-59** | Gateway/Nexus read-only observation integration | [Founder-rights observation report](./architecture/proposals/FOUNDER_RIGHTS_REVENUE_OBSERVATION_2026-07-22.md#phase-plan) | ⚪ **Not implemented**. Requires a separate OpenSpec adapter using canonical protocol evidence. |
| **G-60** | Automated Knowledge Base Self-Evolution Pipeline | [SELF_EVOLVING_KB.md](./SELF_EVOLVING_KB.md) | 🏗️ **Active Implementation**. KB pattern scanner, store & test suite in . |
| **G-61** | OpenSpec Strict Schema Validation Guardrails | [SELF_EVOLVING_KB.md](./SELF_EVOLVING_KB.md#openspec-validation) | 🟢 **Implemented**. Strict OpenSpec v1.6.0 schema validation harness. |
| **G-62** | FROST Threshold DKG Session State Hardening | [FULL_STACK_BITCOIN_RESEARCH.md#34](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#34) | 🟢 **Unit Verified**. Round-2 commitment signing & threshold bounds in . |
| **G-63** | BitVM Fail-Closed Replay & Tombstone Verification | [FULL_STACK_BITCOIN_RESEARCH.md#21](./architecture/FULL_STACK_BITCOIN_RESEARCH.md#21) | 🛡️ **Fail-Closed Boundary**. Bounded retention, FIFO replay protection, and tombstones in . |

---
*Updated by Charlie (issue #1187 remediation) - 2026-07-22*

## 5. Implementation Status (June 2026 Update)
- **G-55 (Enterprise ERP Simulation)**: 🏗️ **Active Scaffolding**. Initialized via CON-1320.
- **G-44 (BitVMX)**: 🏗️ **Active Scaffolding**. Initialized via CON-1311.
- **G-02 (FDC3 Native Resolver)**: 🟢 **Implemented**.
- **G-03 (Usage Validation)**: 🟢 **Implemented**.
- **G-07 (NWC Transport)**: 🟢 **Implemented**.
- **G-09 (BIP-322 Intents)**: 🟢 **Implemented**.
- **G-17 (BIP-353 DNS)**: 🟢 **Implemented**.
- **G-01 (BitVM2 Floor)**: 🛡️ **Fail-closed boundary; versioned hard retention cap, pre-dispatch reservations, terminal cleanup, and backend-unavailable-by-default behavior are implemented**.
- **G-11 (BitVM2 Multi-Party)**: 🛡️ **Fail-closed scaffolding**. Authorized unique signers, bounded detached signature attestations, and active-operation-preserving cleanup are required; the default verifier is unavailable.
- **G-20 (BitVM3)**: 🛡️ **Fail-closed boundary; same-proof FIFO replay/conflict protection, bounded terminal retention, and finite-window identity tombstones are implemented; durable Gateway/Core registry and recursive backend remain pending**.
- **G-50 (ZKCP)**: 🛡️ **Fail-closed boundary; versioned intent binding, bounded retention/pagination, immutable proof/payment evidence, and unavailable defaults are implemented. Production key release is hard-disabled with zero adapter dispatch and no finalized/key output. Verifier/payment backends plus a future independently authenticated, server-bound Gateway/Core atomic claim-or-get coordinator and durable registry remain pending; dependency injection alone can never enable release**.
- **G-51 (Optimized verifier)**: 🏗️ **Research only; no pairing implementation in this repository**.
- **G-05 (Silent Payments)**: 🏗️ **Active Scaffolding**.
- **G-44 (BitVMX Computation)**: 🏗️ **Active Scaffolding**.

## 6. Phase 4 Observation Contract Update (2026-07-22)

- **G-56**: 🟢 **Observation contract implemented** in the Phase 4 candidate
  for #1168. The validator prevents source/proposal evidence from becoming
  active founder rights or payout authority; protocol governance remains open.
- **G-57**: 🟡 **Active unresolved drift** across protocol, Gateway, core, and
  platform economic descriptions. No fee or allocation was selected here.
- **G-58**: 🟢 **Fail-closed evidence gate implemented** for staged deployment,
  confirmation, and live-interface evidence. No deployment fact is asserted.
- **G-59**: ⚪ **Not implemented**. A Gateway/Nexus read-only adapter requires a
  separate change and canonical protocol evidence.
- **G-60 (KB Self-Evolution Automation)**: 🏗️ **Active Implementation**. Pattern scanner, knowledge store, update generator, and test suite in .
- **G-61 (OpenSpec Validation)**: 🟢 **Implemented**. Validation guardrails for OpenSpec change proposals.
- **G-62 (FROST Session Hardening)**: 🟢 **Unit Verified**. DKG round-2 commitments and threshold signature verification in .
- **G-63 (BitVM Tombstone Verification)**: 🛡️ **Fail-closed boundary**. Replay protection, hard retention caps, and tombstones in  and .
