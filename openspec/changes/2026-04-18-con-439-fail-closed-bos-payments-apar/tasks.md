# Tasks: CON-439 Fail-Closed BOS Payment + AP/AR Execution

## Baseline deliverables

- [x] Draft proposal for fail-closed BOS/AP-AR execution controls.
- [x] Specify canonical object model and hash-binding formulas.
- [x] Define deterministic state machine including terminal `POLICY_REJECTED`, `SETTLED`, `FAILED_CLOSED`.
- [x] Define deterministic vs non-deterministic boundary and tool contracts.
- [x] Define sandboxing, custody immutability, and compliance fail-closed behavior.
- [x] Define deterministic rail/liquidity/T+0 execution constraints.
- [x] Define retry/exception constraints and append-only reconciliation requirements.
- [x] Add discoverability link in repository navigation docs.

## Acceptance criteria (testable)

- [x] **AC-1 (matrix coverage):** `openspec/specs/fail-closed-bos-payments-apar.spec.md` SHALL define a rail-by-rail finality matrix with explicit rows for `ON_CHAIN`, `ISO_20022`, and `PAPSS`.
  - **Pass when:** each row includes deterministic evidence/signals, timeout/SLA bound, and fail-closed behavior.
  - **Fail when:** any required rail row or required column content is missing.
- [x] **AC-2 (deterministic finality target binding):** `RailPlan.planned_finality_target` SHALL include `rail_family`, `evidence_signals_required`, `finality_timeout_utc`, and `max_settlement_latency_seconds`.
  - **Pass when:** all fields are required and constrained to deterministic derivation from policy snapshot + selected rail.
  - **Fail when:** any field is optional/undefined or can be mutated by non-deterministic callbacks.
- [x] **AC-3 (receipt finality evidence):** `SettlementReceipt.finality_reference` SHALL enforce rail-specific proof fields.
  - **Pass when:** the spec defines mandatory fields for each rail family and forbids `SETTLED` without complete proof.
  - **Fail when:** generic evidence is allowed without rail-specific validation.
- [x] **AC-4 (timeout fail-closed):** execution SHALL transition to `FAILED_CLOSED` if finality is unproven by `finality_timeout_utc`.
  - **Pass when:** timeout behavior and fail-closed reason handling are normative (`MUST`/`SHALL`).
  - **Fail when:** timeout behavior is advisory (`SHOULD`) or permits fail-open fallback.
- [x] **AC-5 (terminal-state safety):** late or contradictory external finality callbacks SHALL be recorded for audit only and MUST NOT reopen terminal state.
  - **Pass when:** this behavior is explicitly normative in the spec/design.
  - **Fail when:** callbacks can mutate terminal records to `SETTLED` after fail-close.

## Open review checklist (high-risk controls + unresolved decisions)

- [ ] Confirm default SLA windows (`PT90M` on-chain, `PT30M` ISO 20022, `PT45M` PAPSS) are approved by Treasury/Ops/Compliance.
- [ ] Confirm ISO 20022 terminal status code (`ACSC`) is sufficient for all active corridors, or document corridor-specific overrides.
- [ ] Confirm authoritative source and change-control owner for `papss_final_success_code` configuration.
- [ ] Confirm on-chain `required_confirmations` source is policy snapshot (not mutable runtime state), with per-network defaults documented.
- [ ] Confirm fail-closed reason mapping (`FINALITY_TIMEOUT`, `FINALITY_SIGNAL_MISSING`, `FINALITY_EVIDENCE_MISMATCH`) is wired into alerts/telemetry requirements.
- [ ] Confirm evidence retention minimum for finality artifacts (receipts + proofs) is agreed with audit/compliance.
