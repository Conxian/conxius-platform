# Technical Debt Inventory & Burn-Down Plan

Per [#1104](../../issues/1103) — systematic debt reduction across conxius-platform.
Last updated: 2026-07-22.

## Debt Classification

| Risk Class | Description | Max Tolerance |
|-----------|-------------|---------------|
| **Correctness** | Bugs, type unsafety, undefined behavior | Zero tolerance on critical paths |
| **Security** | Auth bypass, secret exposure, injection | Zero tolerance |
| **Release** | Blocks release pipeline or verification | Zero tolerance |
| **Test** | Flaky tests, missing coverage on critical paths | Remediate within 1 sprint |
| **Operational** | Stale config, drift, manual-only recovery | Documented workaround acceptable |
| **Dev-Efficiency** | Code duplication, any types, console.log | Burn down continuously |

## Debt Inventory

### Type Safety (Dev-Efficiency → Fixed this session)

| ID | Item | Risk Class | Status |
|----|------|-----------|--------|
| D-01 | ~30 `:any` types across pages and API routes | Dev-Efficiency | ✅ Fixed — all `:any` → `unknown` or `Record<string, unknown>` |
| D-02 | `err.message` on `unknown` type in catch blocks | Correctness | ✅ Fixed — all use `err instanceof Error ? err.message : String(err)` |
| D-03 | `useState<any>()` in 2 pages | Dev-Efficiency | ✅ Fixed — typed as `Record<string, unknown> \| null` |

### Logging Hygiene (Dev-Efficiency → In Progress)

| ID | Item | Risk Class | Status |
|----|------|-----------|--------|
| D-04 | 15+ `console.log`/`console.error` in library code | Dev-Efficiency | 🏗️ Created `lib/support/logger.ts`. Migrated citrea, ark, bitvm, bitvm3, bitvmx, event-bus. Remaining: bip322, solver, imap-worker, observability |
| D-05 | `console.error` scattered across 15+ page files | Dev-Efficiency | ⬜ Page-level `console.error` in catch blocks is acceptable (client-side debugging). Defer migration. |

### Determinism (Correctness → Fixed this session)

| ID | Item | Risk Class | Status |
|----|------|-----------|--------|
| D-06 | `Math.random()` in SFO stub (x2) — pulse-bos-stub.tsx | Correctness | ✅ Fixed — replaced with deterministic per-unit allocation data |
| D-07 | `Math.random()` in SFO canonical (x2) — SovereignFinancialOffice.tsx | Correctness | ✅ Fixed — same deterministic data |
| D-08 | `Math.random()` in citrea, ark, bitvmx adapter IDs | Correctness | ✅ Fixed — replaced with `generateId()` using `crypto.randomUUID()` |
| D-09 | `Math.random()` in imap-worker ticket tokens | Correctness | ✅ Fixed — replaced with `generateTicketToken()` |
| D-10 | `Math.random()` in event-bus simulateAdapterDelivery | Correctness | ⬜ POC simulation — acceptable. Replace when real adapter integration lands. |

### Code Duplication (Dev-Efficiency → Partially Addressed)

| ID | Item | Risk Class | Status |
|----|------|-----------|--------|
| D-11 | Duplicate type definitions between API routes and pages (RewardAllocation, RewardSourcesData, MonthlyPayoutPoint, etc.) | Dev-Efficiency | ⬜ Types defined in both route.ts and page.tsx for ~6 API endpoints. Extract to shared lib types when stabilizing API surface. |
| D-12 | `NexusState`, `ErpTreasuryAsset`, `ErpEmployee`, `ErpDashboardData` only defined inline in overview page | Dev-Efficiency | ⬜ Move to `lib/sidl/types.ts` when types stabilize. |

### Dead/Stale Artifacts (Operational)

| ID | Item | Risk Class | Status |
|----|------|-----------|--------|
| D-13 | `reusable-rust-ci.yml` — no Rust code in this repo | Operational | ✅ Removed 2026-07 (no callers, no Rust code) |
| D-14 | `CONXIUS_CICD_BASELINE.md` — referenced but not maintained | Operational | ⬜ Document exists and is referenced by workflows. Review for staleness. |
| D-15 | `services/admin-pulse-bos/` — no tests, no linting, `noEmit: true` | Operational | ⬜ Source-consumed package. Acceptable for current architecture. |

### Test Coverage (Test)

| ID | Item | Risk Class | Status |
|----|------|-----------|--------|
| D-16 | No test file for new `frost.ts` (182 lines) | Test | ⬜ Add when FROST coordination is integrated with Gateway |
| D-17 | No test file for new `stablecoin.ts` (98 lines) | Test | ⬜ Types-only module. Add when ctUSD API routes exist. |
| D-18 | No test file for new `babylon.py` (149 lines) | Test | ⬜ Add when Babylon API integration is live. |
| D-19 | No test file for `logger.ts` or `idgen.ts` | Test | ⬜ Utility modules. Low priority — test when consumed by critical paths. |

### Cryptographic readiness (Security / Correctness)

| ID | Item | Risk Class | Status |
|----|------|-----------|--------|
| D-20 | BitVM2/BitVM3/ZKCP production verifier, payment-observer, and key-release backends are not available in this repository | Security / Correctness | 🛡️ **Quarantined by issue #1187** — adapter-owned authority, pre-parse canonical string attestations, versioned BitVM2 hard retention/reservation policy, bounded BitVM3 terminal retention plus finite-window tombstones, same-proof/per-intent replay protection, versioned ZKCP intent binding, bounded retention/pagination, immutable evidence revalidation, and unavailable defaults fail closed. ZKCP now requires an external versioned durable key-release lookup/idempotency contract with deterministic immutable bindings; durable Gateway/Core/Nexus identity/backend implementation and independent acceptance remain pending |
| D-21 | Historical BitVM2/ZKCP helper behavior could present simulation as authoritative success | Security / Correctness | ✅ **Remediated in #1187 follow-up** — proof-length checks, unconditional/contradictory success, unavailable or placeholder backend authority, duplicate/format-only aggregation, mutable lifecycle snapshots, hostile/proxy attestation graphs, unbounded BitVM2/BitVM3/ZKCP retention/listing, raw identifier logging, caller-only payment hashes, synthetic keys, post-release clock failures, and process-local-only key-release exactly-once claims are rejected or removed |

## Burn-Down Priority

### Sprint N (this session) — ✅ Complete
- [x] D-01: Eliminate all `:any` types (30 occurrences)
- [x] D-02: Fix `err.message` on `unknown` (20 files)
- [x] D-06, D-07: Replace SFO `Math.random()` stubs with deterministic data
- [x] D-08, D-09: Replace adapter `Math.random()` IDs with crypto.randomUUID()
- [x] Create structured logger (`lib/support/logger.ts`)
- [x] Create deterministic ID generator (`lib/support/idgen.ts`)

### Sprint N+1 — Recommended
- [ ] D-04: Migrate remaining lib console.log calls to logger (bip322, solver, imap-worker, observability)
- [ ] D-11: Extract shared type definitions (RewardAllocation, etc.) to lib modules
- [ ] D-15: Add basic test scaffolding for admin-pulse-bos
- [ ] D-10: Replace event-bus Math.random() with real adapter delivery

### Sprint N+2 — Recommended
- [ ] D-12: Move inline types (NexusState, ErpDashboardData) to lib/sidl/types.ts
- [ ] D-16, D-17, D-18: Add tests for new modules once integrated
- [ ] D-14: Audit CONXIUS_CICD_BASELINE.md for staleness

### Backlog
- [ ] D-19: Test logger and idgen utilities
- [ ] D-20: Integrate and independently accept Gateway/Core/Nexus verifier, payment-observer, key-release, and durable proof/intent identity-retention backends, including the external key-release exactly-once and lookup contract
- [ ] Full cross-repo debt inventory (gateway, nexus, wallet, orbit, enclave-sdk, conxian_ui, conxian-labs-site)
- [ ] D-05: Consider structured error reporting for client-side pages

## Metrics

| Metric | Before | After |
|--------|--------|-------|
| `:any` types in source | 30+ | **0** (except `types.ts` payload field) |
| `Math.random()` in prod code | 8 | **1** (POC simulation in event-bus) |
| `console.log` in lib code | 25+ | **~16 remaining** (imap-worker + unscaffolded adapters) |
| `err.message` type-safe | 8 files broken | **20 files fixed** |
| Structured logger | ❌ | ✅ `lib/support/logger.ts` |
| Deterministic ID gen | ❌ | ✅ `lib/support/idgen.ts` |

---

*Maintained per #1104 burn-down policy. Update after each debt-reduction session.*
