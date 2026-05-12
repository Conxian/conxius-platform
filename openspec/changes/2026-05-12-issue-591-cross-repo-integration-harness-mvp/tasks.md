# Tasks: Issue #591 Cross-Repo Integration Harness MVP (Phase 7)

## Deliverables
- [x] Add dedicated CI workflow: `.github/workflows/cross-repo-integration-mvp.yml`.
- [x] Add script-driven harness: `scripts/ci/run-cross-repo-harness-mvp.sh`.
- [x] Reuse existing assertions for x402 payment-header and local-first transitions.
- [x] Add runbook: `docs/runbooks/CROSS_REPO_INTEGRATION_HARNESS_MVP.md`.
- [x] Update Phase 7 tracking in `GAPS.md`.

## Acceptance criteria (testable)
- [x] **AC-1 (readiness contract):** harness fails unless Gateway `/api/v1/health` returns HTTP 200.
- [x] **AC-2 (Nexus path contract):** harness validates `/api/v1/nexus/state`; when absent in this repo checkout, harness validates `/api/v1/status` as nearest implemented equivalent and fails if that fallback contract fails.
- [x] **AC-3 (PSBT-like transmission checks):** harness executes existing x402/payment-header tests that validate 402 challenge + payment header propagation behavior.
- [x] **AC-4 (local-first transition checks):** harness executes existing persistence/lifecycle tests asserting deterministic local-first state transitions.
- [x] **AC-5 (CI hygiene):** workflow always uploads harness artifacts and always tears down compose services.
