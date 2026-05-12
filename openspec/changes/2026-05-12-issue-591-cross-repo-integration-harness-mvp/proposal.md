# OpenSpec Proposal: Issue #591 Cross-Repo Integration Harness MVP (Phase 7)

Refs #591

**Date**: 2026-05-12  
**Status**: Implemented (MVP / Phase 7)  
**Scope**: Add a script-driven CI harness path that validates cross-repo happy-path contracts for Gateway readiness, Nexus state path coverage, x402 payment-header transmission checks, and local-first transition assertions.

## Problem statement
Phase 7 introduces BFF/Nexus/local-first architecture objectives, but this repository lacked a dedicated CI harness lane proving those contracts together in one reproducible path.

Without a focused integration lane, regressions in cross-repo dependencies (submodule state, endpoint compatibility, and payment-header semantics) can ship undetected.

## Proposed MVP scope

### 1) Dedicated CI workflow lane
Add a standalone workflow that:
- checks out with recursive submodules,
- boots dependency services with Docker Compose,
- executes a script-driven harness,
- uploads logs/artifacts and always tears down.

### 2) Script-driven contract checks
Add `scripts/ci/run-cross-repo-harness-mvp.sh` to run verifiable checks for:
- Gateway readiness via `/api/v1/health`,
- Nexus state path validation (`/api/v1/nexus/state`) with explicit fallback to nearest implemented equivalent (`/api/v1/status`) when the Nexus route is absent,
- x402/payment-header flow validation using existing test assertions,
- local-first state transition assertions using existing persistence/lifecycle tests.

### 3) Operational documentation
Add a concise runbook documenting local/CI execution, contract expectations, and pass/fail semantics.

### 4) Phase tracking update
Record this harness lane in `GAPS.md` under Phase 7 progress so maintainers can track implemented groundwork.

## Out of scope (MVP guardrails)
- Full cross-repo end-to-end coverage of every Phase 7 subsystem.
- New protocol mocks or synthetic fixtures beyond existing tests.
- Any PR automation or deployment gating policy changes beyond adding the workflow lane.

## Acceptance criteria mapping
| Issue #591 intent | MVP implementation commitment |
| --- | --- |
| Cross-repo CI path for BFF/Nexus/Wasm-era topology | Dedicated workflow executes harness against submodule-aware checkout with compose dependency bootstrapping |
| Verify PSBT-like transmission flow | Existing x402/payment-header tests are executed as CI contract checks |
| Verify local-first state transitions | Existing persistence/lifecycle tests assert transition behavior and audit trail state |
| Happy-path Nexus state coverage | `/api/v1/nexus/state` is checked, with explicit fallback contract to nearest implemented endpoint in this repo |
