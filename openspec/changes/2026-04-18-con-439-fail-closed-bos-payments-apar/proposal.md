# CON-439: Fail-Closed BOS Payment + AP/AR Execution Flow

## Goal

Define a deterministic, fail-closed execution specification for BOS payments and AP/AR settlement so production systems cannot silently degrade into fail-open behavior.

## Problem

Current docs do not provide a single normative contract for:

- canonical BOS/AP-AR execution objects,
- immutable hash-bound approvals,
- strict tool schema and replay handling,
- deterministic/non-deterministic execution boundaries,
- T+0 settlement and reconciliation controls.

This leaves implementation space for inconsistent behaviors under retries, external rail instability, or compliance outages.

## Scope

This change introduces a normative specification and design for fail-closed BOS payment + AP/AR execution with:

1. Canonical objects (`PaymentIntent`, `SettlementContext`, `RailPlan`, `CustodyPlan`, `ApprovalBundle`, `LiquidityReservation`, `ExecutionEnvelope`, `SettlementReceipt`).
2. Domain-separated canonical hash bindings.
3. Deterministic state machine with terminal `POLICY_REJECTED`, `SETTLED`, and `FAILED_CLOSED`.
4. Deterministic vs non-deterministic boundary.
5. Strict tool contract rules (`request_envelope_hash`, schema strictness, idempotency, replay conflict policy).
6. Mandatory sandboxing for tools touching credential, wallet, signer, payout, or config surfaces.
7. Custody/signer immutability after approvals begin.
8. Deterministic rail selection, liquidity reservation requirements, and T+0 bounded execution window with compliance fail-closed semantics.
9. Exception/retry constraints that cannot bypass controls.
10. Append-only reconciliation constraints.

## Out of scope

- Rail-by-rail finality matrix and per-rail SLA appendix.
- UI copy and workflow screen changes.
- Operational runbook details for incident response.

## Deliverables

- `openspec/changes/2026-04-18-con-439-fail-closed-bos-payments-apar/design.md`
- `openspec/changes/2026-04-18-con-439-fail-closed-bos-payments-apar/tasks.md`
- `openspec/specs/fail-closed-bos-payments-apar.spec.md`
