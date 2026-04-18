# Design: CON-439 Fail-Closed BOS Payment + AP/AR Execution

## 1) Architecture intent

The execution engine MUST behave as a deterministic control plane that emits a hash-bound `ExecutionEnvelope` before any non-deterministic rail interaction. Every control decision (policy, custody, approval, liquidity) is anchored to canonical hashes. Any mismatch, missing evidence, or stale dependency transitions execution to `FAILED_CLOSED`.

## 2) Canonical object graph

`PaymentIntent` is the root business request. The deterministic planner derives:

- `SettlementContext`
- `RailPlan`
- `CustodyPlan`

Approvals are captured in `ApprovalBundle`. Liquidity lock evidence is captured in `LiquidityReservation`. The engine then issues one immutable `ExecutionEnvelope` that hash-binds all prior objects. A post-rail verified `SettlementReceipt` closes execution.

```text
PaymentIntent
  └─> SettlementContext
  └─> RailPlan
  └─> CustodyPlan
       └─> ApprovalBundle
             └─> LiquidityReservation
                   └─> ExecutionEnvelope
                         └─> SettlementReceipt
```

## 3) Canonical hashing strategy

All canonical hashes MUST be calculated over UTF-8 encoded RFC 8785 JSON canonicalization (JCS).

Domain-separated formulas:

- `settlement_context_hash = SHA256("conxian.settlement-context.v1|" + JCS(SettlementContext))`
- `rail_plan_hash = SHA256("conxian.rail-plan.v1|" + JCS(RailPlan))`
- `custody_plan_hash = SHA256("conxian.custody-plan.v1|" + JCS(CustodyPlan))`
- `execution_envelope_hash = SHA256("conxian.execution-envelope.v1|" + JCS(ExecutionEnvelope))`

Tool-level request hash:

- `request_envelope_hash = SHA256("conxian.request-envelope.v1|" + JCS(RequestEnvelopeWithoutRequestEnvelopeHash))`

If any recomputed hash differs from the provided hash, the operation MUST be rejected and the state machine MUST transition to `FAILED_CLOSED`.

## 4) Deterministic state machine

### Core states

- `INTENT_ACCEPTED`
- `CONTEXT_COMPUTED`
- `APPROVAL_PENDING`
- `APPROVED`
- `RAIL_PLANNED`
- `LIQUIDITY_RESERVED`
- `EXECUTION_IN_FLIGHT`
- `POLICY_REJECTED` (terminal)
- `SETTLED` (terminal)
- `FAILED_CLOSED` (terminal)

### Transition notes

- `CONTEXT_COMPUTED -> POLICY_REJECTED` for deterministic policy/compliance disallow outcomes.
- `APPROVAL_PENDING -> FAILED_CLOSED` for timeout, mutation attempts, hash mismatch, or schema violations.
- `RAIL_PLANNED -> FAILED_CLOSED` when no deterministic eligible rail or mandatory liquidity cannot be reserved.
- `EXECUTION_IN_FLIGHT -> FAILED_CLOSED` for replay conflict, execution deadline breach, sandbox attestation failure, compliance outage, unverifiable receipt, or irreversible external error.
- Only `SETTLED`, `POLICY_REJECTED`, or `FAILED_CLOSED` are terminal.

## 5) Deterministic boundary

The deterministic phase ends when `ExecutionEnvelope` is issued and hash-sealed. Non-deterministic effects (network I/O, rail confirmations, provider callbacks) MUST only occur after this boundary and MUST NOT mutate sealed deterministic inputs.

## 6) Strict tool contract model

Each critical tool invocation MUST use a strict `RequestEnvelope` with:

- schema version,
- idempotency scope + key,
- `request_envelope_hash`,
- `execution_envelope_hash` (directly or via `execution_envelope` payload).

Unknown fields MUST be rejected at every level (top-level and nested) to prevent hidden behavior channels.

Replay rules:

- Same `(idempotency_scope, idempotency_key, request_envelope_hash)` MUST return the prior result.
- Same `(idempotency_scope, idempotency_key)` with a different hash MUST raise replay conflict and transition to `FAILED_CLOSED`.

## 7) Sandbox + immutability boundaries

Any tool that touches credential material, signer configuration, wallet state, payout routing, or execution config MUST run inside an attested sandbox with restricted egress and ephemeral write scope.

After entering `APPROVAL_PENDING`, custody and signer boundaries become immutable. Changes to signer set, wallet source, payout destination, custody policy hash, or threshold policy MUST require a new `PaymentIntent`.

## 8) Liquidity, rail selection, and T+0 controls

Rail selection MUST be deterministic from policy-approved inputs and tie-broken deterministically. Liquidity reservation MUST be present before execution, cover principal + fees + policy buffer, and remain valid through the execution deadline.

Execution MUST complete in a T+0 bounded window (same UTC settlement day as approval finalization). Missing deadline evidence transitions to `FAILED_CLOSED`.

### 8.1 Rail-by-rail finality matrix

`RailPlan.planned_finality_target` MUST be derived deterministically and MUST map to the selected row below.

| Rail family | Deterministic finality evidence/signals (all required) | Timeout/SLA bound | Fail-closed behavior when finality is not provable |
| --- | --- | --- | --- |
| `ON_CHAIN` | 1) `rail_reference_id` is the submitted transaction hash; 2) inclusion proof includes canonical `block_height` and `block_hash`; 3) `confirmations_observed >= required_confirmations` from policy snapshot; 4) no conflicting spend/reorg evidence at verification point. | `finality_timeout_utc = min(execution_deadline_utc, rail_submitted_at + PT90M)` | MUST transition to `FAILED_CLOSED` with reason `FINALITY_TIMEOUT`, `FINALITY_SIGNAL_MISSING`, or `FINALITY_EVIDENCE_MISMATCH`; `SETTLED` is forbidden. |
| `ISO_20022` | 1) terminal `pacs.002` status `ACSC`; 2) `uetr`, `pacs002_message_id`, and `instr_id` match the issued envelope; 3) counterparty participant identity matches policy-approved route metadata. | `finality_timeout_utc = min(execution_deadline_utc, rail_submitted_at + PT30M)` | MUST transition to `FAILED_CLOSED` with reason `FINALITY_TIMEOUT`, `FINALITY_SIGNAL_MISSING`, or `FINALITY_EVIDENCE_MISMATCH`; `SETTLED` is forbidden. |
| `PAPSS` | 1) PAPSS settlement reference and cycle identifier present; 2) PAPSS terminal success code equals policy-configured `papss_final_success_code`; 3) PAPSS settlement timestamp is attested by the integration adapter. | `finality_timeout_utc = min(execution_deadline_utc, rail_submitted_at + PT45M)` | MUST transition to `FAILED_CLOSED` with reason `FINALITY_TIMEOUT`, `FINALITY_SIGNAL_MISSING`, or `FINALITY_EVIDENCE_MISMATCH`; `SETTLED` is forbidden. |

### 8.2 Finality enforcement notes

- `SETTLED` is only reachable if all required evidence signals from the selected rail row are present and internally consistent.
- Any evidence arriving after `finality_timeout_utc` is audit-only and MUST NOT reopen terminal state.
- Corridor-level policy MAY tighten these SLA bounds, but MUST NOT relax beyond the defaults in this matrix.

## 9) Reconciliation model

`SettlementReceipt` and reconciliation entries are append-only artifacts. Corrections MUST be represented as linked compensating entries that reference prior receipt hashes; in-place mutation is prohibited.
