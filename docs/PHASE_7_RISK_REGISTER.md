# Phase 7 Sovereign Redesign Risk Register & Mitigation Backlog

This document proactively manages delivery, dependency, security, and adoption risks specifically for the Phase 7 Sovereign Redesign (CON-1197).

## 1. Active Risk Register

| Risk ID | Risk Statement | Area | Probability | Impact | Rating | Owner | Mitigation Approach | Target Date |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-7-01** | BitVM2 verification floor complexity delays USI readiness | Architecture | High | High | **CRITICAL** | @botshelomokoka | Implement 364-tap orchestrator stub; research folding optimization. | 2026-07-31 |
| **R-7-02** | FDC3 bridge requires non-native Desktop Agent overhead | Interop | Medium | Medium | **MEDIUM** | @ui-lead | Leverage @finos/fdc3-agent-proxy; provide reference simulator. | 2026-07-15 |
| **R-7-03** | Local-first Wasm execution latency degrades UX | Performance | Medium | High | **HIGH** | @platform-lead | Optimize lib-conxian-core (Wasm); implement proof folding (Nova). | 2026-08-15 |
| **R-7-04** | Nostr relay fragmentation affects P&L delivery reliability | Infrastructure | High | Medium | **HIGH** | @ops-team | Implement multi-relay proxy in Wallet-BFF; use persistent storage. | 2026-07-31 |

## 2. Mitigation Backlog

- [ ] **[R-7-01]** Initiate BitVM2 Floor Manager in Settlement-Engine-BFF.
- [x] **[R-7-02]** Scaffolding for FDC3 Native Resolver Console (Done June 2026).
- [ ] **[R-7-03]** Benchmark Wasm-based PSBT assembly versus server-side.
- [x] **[R-7-04]** Define Nostr Kind 20626 P&L transport spec (Done June 2026).

## 3. Scoring Rubric

- **Critical**: Immediate action required; blocks Phase 7 launch-readiness.
- **High**: Significant impact; must be mitigated before pilot phase.
- **Medium**: Managed risk; tracked via monthly architecture reviews.

---
*Created via CON-1197 Sovereign Alignment track.*
