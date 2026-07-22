# Phase 7 Sovereign Redesign Risk Register & Mitigation Backlog

This document proactively manages delivery, dependency, security, and adoption risks specifically for the Phase 7 Sovereign Redesign (CON-1197).

## 1. Active Risk Register

| Risk ID | Risk Statement | Area | Probability | Impact | Rating | Owner | Mitigation Approach | Target Date |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-7-01** | BitVM2 verification-floor complexity and missing backend delay USI readiness | Architecture | High | High | **CRITICAL** | @botshelomokoka | Keep the platform boundary fail-closed; treat tap counts as profile-specific; complete Gateway/Core/Nexus backend, proof, and acceptance work before enablement. | 2026-07-31 |
| **R-7-02** | FDC3 bridge requires non-native Desktop Agent overhead | Interop | Medium | Medium | **MEDIUM** | @ui-lead | Leverage @finos/fdc3-agent-proxy; provide reference simulator. | 2026-07-15 |
| **R-7-03** | Local-first Wasm execution latency degrades UX | Performance | Medium | High | **HIGH** | @platform-lead | Optimize lib-conxian-core (Wasm); implement proof folding (Nova). | 2026-08-15 |
| **R-7-04** | Nostr relay fragmentation affects P&L delivery reliability | Infrastructure | High | Medium | **HIGH** | @ops-team | Implement multi-relay proxy in Wallet-BFF; use persistent storage. | 2026-07-31 |
| **R-7-06** | Verifier scaffolding can be mistaken for cryptographic settlement authorization | Security / Correctness | High | Critical | **CRITICAL** | @platform-lead | Issue #1187 quarantines simulation and length-only/contradictory success, requires adapter-owned authoritative backend bindings, bounded detached attestation snapshots, versioned ZKCP intent terms and retention/list quotas, bounded pre-hash inputs and adapter errors, canonical versioned BitVM signatures, bounded BitVM3 recursion metadata, per-intent/per-proof FIFO/CAS replay protection, atomic unique-signer reservations, immutable evidence, bounded identifier logs, attested aggregation, and rejection of caller-only payment evidence. | Before Phase 7 launch |

## 2. Mitigation Backlog

- [ ] **[R-7-01]** Close BitVM2 verification-floor readiness (platform quarantine is implemented; cryptographic backend acceptance remains open).
- [x] **[R-7-02]** Scaffolding for FDC3 Native Resolver Console (Done June 2026).
- [x] **[R-7-03]** Benchmark Wasm-based PSBT assembly versus server-side (Pilot complete).
- [x] **[R-7-05]** BitVMX binary search state machine implemented (Scaffold complete June 2026).
- [x] **[R-7-04]** Define Nostr Kind 20626 P&L transport spec (Done June 2026).
- [x] **[R-7-06]** Add fail-closed verifier/payment contracts, bounded resource limits and attestation snapshots, async lifecycle/replay protection, ZKCP retention/pagination, atomic signer reservations, bounded identifier logging, and contamination guards (Issue #1187); backend enablement remains a separate gate.

## 3. Scoring Rubric

- **Critical**: Immediate action required; blocks Phase 7 launch-readiness.
- **High**: Significant impact; must be mitigated before pilot phase.
- **Medium**: Managed risk; tracked via monthly architecture reviews.

**Readiness note:** the research profile in
`docs/architecture/FULL_STACK_BITCOIN_RESEARCH.md` describes one 364-tap
BitVM2 layout. That count is profile-specific and must not be treated as a
universal protocol constant.

---
*Created via CON-1197 Sovereign Alignment track.*
| **R-7-05** | BitVMX binary search challenge depth increases latency | Performance | Medium | Medium | **MEDIUM** | @botshelomokoka | Research parallel challenge lookups and early-exit conditions. | 2026-08-15 |
