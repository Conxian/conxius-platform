# Specification: Fail-Closed BOS Payments + AP/AR Execution

## 1. Overview

This specification defines the normative fail-closed control model for BOS payment and AP/AR execution.

Implementations MUST produce deterministic control decisions, MUST hash-bind all critical planning artifacts, and MUST transition to terminal fail states when controls cannot be proven.

## 2. Normative terms

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are to be interpreted as normative requirements.

## 3. Canonical objects

### 3.1 `PaymentIntent`

`PaymentIntent` is the authoritative business request and MUST include at least:

- `payment_intent_id`
- `apar_mode` (`AP` or `AR`)
- `payer_account_id`
- `payee_account_id`
- `asset`
- `amount`
- `purpose_code`
- `policy_profile_id`
- `requested_at`
- `client_reference` (optional)

`PaymentIntent` fields participating in policy, custody, rail selection, or reconciliation MUST be immutable after `INTENT_ACCEPTED`.

### 3.2 `SettlementContext`

`SettlementContext` captures deterministic policy/compliance/planning inputs and MUST include:

- `settlement_context_id`
- `payment_intent_id`
- `policy_snapshot_id`
- `compliance_snapshot_id`
- `pricing_snapshot_id`
- `execution_timezone` (MUST be `UTC`)
- `approval_deadline_utc`
- `execution_deadline_utc`
- `created_at`

### 3.3 `RailPlan`

`RailPlan` defines deterministic rail selection and MUST include:

- `rail_plan_id`
- `payment_intent_id`
- `candidate_rails` (ordered)
- `selected_rail`
- `selection_policy_version`
- `selection_inputs_hash`
- `planned_fees`
- `planned_finality_target`, containing:
  - `rail_family` (`ON_CHAIN` | `ISO_20022` | `PAPSS`)
  - `evidence_signals_required` (ordered, non-empty)
  - `finality_timeout_utc` (MUST be `<= execution_deadline_utc`)
  - `max_settlement_latency_seconds` (positive integer)

`selected_rail` MUST be reproducible from `selection_inputs_hash` and policy version.

`planned_finality_target` MUST be reproducible from the same deterministic inputs and MUST map to the selected rail's row in the finality matrix defined in Section 10.1.

### 3.4 `CustodyPlan`

`CustodyPlan` defines source-of-funds and signing controls and MUST include:

- `custody_plan_id`
- `payment_intent_id`
- `source_wallet_id`
- `signer_set_id`
- `signer_threshold`
- `payout_destination_id`
- `custody_policy_hash`
- `signer_policy_hash`

### 3.5 `ApprovalBundle`

`ApprovalBundle` records authorization evidence and MUST include:

- `approval_bundle_id`
- `payment_intent_id`
- `required_approvers`
- `granted_approvals`
- `approval_policy_hash`
- `finalized_at` (present only when threshold is met)

### 3.6 `LiquidityReservation`

`LiquidityReservation` captures pre-execution liquidity lock and MUST include:

- `liquidity_reservation_id`
- `payment_intent_id`
- `provider_id`
- `asset`
- `reserved_amount`
- `fee_amount`
- `policy_buffer_amount`
- `reserved_until_utc`
- `reservation_proof_hash`

### 3.7 `ExecutionEnvelope`

`ExecutionEnvelope` is the immutable execution contract and MUST include:

- `execution_envelope_id`
- `payment_intent_id`
- `settlement_context_hash`
- `rail_plan_hash`
- `custody_plan_hash`
- `approval_bundle_hash`
- `liquidity_reservation_hash`
- `execution_deadline_utc`
- `nonce`
- `issued_at`

`ExecutionEnvelope` MUST be finalized before any non-deterministic rail submission.

### 3.8 `SettlementReceipt`

`SettlementReceipt` is the verifiable post-execution record and MUST include:

- `settlement_receipt_id`
- `execution_envelope_hash`
- `rail_reference_id`
- `settled_amount`
- `settled_at`
- `finality_reference`
- `status` (`SETTLED` only for final success)
- `reconciliation_entry_id`

`finality_reference` MUST contain rail-specific deterministic proof fields:

- For `ON_CHAIN`: `chain_id`, `tx_id`, `inclusion_block_height`, `inclusion_block_hash`, `confirmations_observed`.
- For `ISO_20022`: `pacs002_message_id`, `uetr`, `instr_id`, `transaction_status_code`, `settlement_time_utc`.
- For `PAPSS`: `papss_settlement_reference`, `papss_cycle_id`, `papss_status_code`, `settlement_time_utc`.

The engine MUST NOT emit `status=SETTLED` unless all required proof fields for the selected rail are present and validated.

## 4. Canonical hash bindings

All canonical hashes MUST use RFC 8785 JSON canonicalization (JCS), UTF-8 encoding, and SHA-256 with domain separation:

- `settlement_context_hash = SHA256("conxian.settlement-context.v1|" + JCS(SettlementContext))`
- `rail_plan_hash = SHA256("conxian.rail-plan.v1|" + JCS(RailPlan))`
- `custody_plan_hash = SHA256("conxian.custody-plan.v1|" + JCS(CustodyPlan))`
- `execution_envelope_hash = SHA256("conxian.execution-envelope.v1|" + JCS(ExecutionEnvelope))`

Hash verification failures MUST transition execution to `FAILED_CLOSED`.

## 5. Deterministic state machine

The engine MUST implement deterministic transitions with terminal states:

- `POLICY_REJECTED`
- `SETTLED`
- `FAILED_CLOSED`

Required non-terminal states:

- `INTENT_ACCEPTED`
- `CONTEXT_COMPUTED`
- `APPROVAL_PENDING`
- `APPROVED`
- `RAIL_PLANNED`
- `LIQUIDITY_RESERVED`
- `EXECUTION_IN_FLIGHT`

### 5.1 Mandatory fail-closed triggers

The engine MUST transition to `FAILED_CLOSED` when any of the following occurs:

1. Canonical hash mismatch for any bound artifact.
2. Unknown field found in strict tool envelope or nested schema.
3. Replay conflict (`idempotency_scope` + `idempotency_key` reused with different `request_envelope_hash`).
4. Sandbox attestation missing for sensitive tools.
5. Custody/signer boundary mutation attempt after approvals begin.
6. Liquidity reservation missing/insufficient/expired before settlement finality.
7. Compliance dependency unavailable, stale, or contradictory at required checkpoints.
8. T+0 execution deadline breach.
9. Unverifiable or inconsistent settlement receipt.

## 6. Deterministic vs non-deterministic boundary

The deterministic phase MUST include intent normalization, policy/compliance decisions, rail selection, custody planning, approvals validation, liquidity reservation checks, and envelope issuance.

The non-deterministic phase MUST begin only after a valid `ExecutionEnvelope` is sealed. Network calls, external rail acknowledgements, and callback processing are non-deterministic and MUST NOT modify deterministic artifacts.

## 7. Strict tool contracts

### 7.1 Request envelope

Tools affecting execution MUST accept a strict envelope containing at minimum:

- `schema_version`
- `request_id`
- `idempotency_scope`
- `idempotency_key`
- `request_envelope_hash`
- `execution_envelope` or `execution_envelope_hash`

### 7.2 Schema strictness

Tool input schemas MUST reject unknown fields at all nesting levels. Unknown fields MUST produce a deterministic error and MUST transition flow to `FAILED_CLOSED`.

### 7.3 Idempotency and replay conflict

- The idempotency cache key MUST be `(idempotency_scope, idempotency_key)`.
- A replay with identical `request_envelope_hash` MUST return the prior result without re-executing side effects.
- A replay with differing hash under the same key MUST be treated as conflict and MUST fail closed.

### 7.4 `request_envelope_hash`

`request_envelope_hash` MUST be computed as:

- `SHA256("conxian.request-envelope.v1|" + JCS(RequestEnvelopeWithoutRequestEnvelopeHash))`

Tools MUST recompute and compare this hash before performing any side effect.

## 8. Sandboxed execution for sensitive tools

Any tool touching credentials, wallet material, signer controls, payout routing, or configuration that can alter execution outcomes MUST run in an attested sandbox.

The sandbox MUST provide all of the following:

- isolated runtime identity,
- restricted filesystem write scope,
- controlled outbound network policy,
- redaction-safe logging for secrets and signing material.

If sandbox guarantees cannot be proven at runtime, execution MUST fail closed.

## 9. Custody/signer boundary immutability

Once state enters `APPROVAL_PENDING`, the following fields MUST be immutable:

- `source_wallet_id`
- `signer_set_id`
- `signer_threshold`
- `payout_destination_id`
- `custody_policy_hash`
- `signer_policy_hash`

Requested mutations MUST be rejected. To change these values, the caller MUST create a new `PaymentIntent`.

## 10. Rail selection, liquidity reservation, and T+0 controls

- Rail selection MUST be deterministic from canonical inputs and policy snapshots.
- Ties in rail ranking MUST be resolved deterministically (e.g., stable lexical rail ID ordering).
- Liquidity reservation MUST be confirmed before entering `EXECUTION_IN_FLIGHT`.
- Reserved liquidity MUST cover amount + fees + policy buffer and remain valid through execution deadline.
- Execution deadline MUST be bounded to T+0 (same UTC settlement day as approval finalization).
- If compliance status cannot be refreshed or verified at required checkpoints, execution MUST fail closed.

### 10.1 Rail-by-rail finality matrix

| Rail family | Deterministic finality evidence/signals (all required) | Timeout/SLA bound | Required behavior when finality is not provable |
| --- | --- | --- | --- |
| `ON_CHAIN` | 1) `rail_reference_id` equals submitted `tx_id`; 2) inclusion proof provides canonical block height/hash; 3) `confirmations_observed >= required_confirmations` from policy snapshot; 4) no conflicting spend/reorg evidence at verification. | `finality_timeout_utc = min(execution_deadline_utc, rail_submitted_at + PT90M)` | MUST transition to `FAILED_CLOSED` with reason `FINALITY_TIMEOUT`, `FINALITY_SIGNAL_MISSING`, or `FINALITY_EVIDENCE_MISMATCH`; `SETTLED` is forbidden. |
| `ISO_20022` | 1) terminal `pacs.002` status `ACSC`; 2) `uetr`, `pacs002_message_id`, and `instr_id` match issued envelope identifiers; 3) counterparty participant identity matches policy-approved route metadata. | `finality_timeout_utc = min(execution_deadline_utc, rail_submitted_at + PT30M)` | MUST transition to `FAILED_CLOSED` with reason `FINALITY_TIMEOUT`, `FINALITY_SIGNAL_MISSING`, or `FINALITY_EVIDENCE_MISMATCH`; `SETTLED` is forbidden. |
| `PAPSS` | 1) PAPSS settlement reference and cycle identifier present; 2) terminal success code equals policy-configured `papss_final_success_code`; 3) PAPSS settlement timestamp is attested by the PAPSS adapter. | `finality_timeout_utc = min(execution_deadline_utc, rail_submitted_at + PT45M)` | MUST transition to `FAILED_CLOSED` with reason `FINALITY_TIMEOUT`, `FINALITY_SIGNAL_MISSING`, or `FINALITY_EVIDENCE_MISMATCH`; `SETTLED` is forbidden. |

### 10.2 Finality enforcement

1. The engine MUST evaluate finality only against the selected rail row in Section 10.1.
2. If complete finality evidence is not verified by `finality_timeout_utc`, the engine MUST transition to `FAILED_CLOSED`.
3. Contradictory or mismatched evidence MUST transition execution to `FAILED_CLOSED`.
4. Evidence arriving after terminal failure MUST be stored as audit/reconciliation data and MUST NOT reopen terminal state.
5. Corridor-level policy MAY tighten per-rail SLA bounds but MUST NOT relax beyond the defaults in Section 10.1.

## 11. Exception and retry rules

Exception handling and retries MUST NOT bypass approvals, policy checks, custody controls, liquidity checks, or hash verification.

Allowed retries MUST be limited to transient classes (transport timeout, retriable upstream errors) and MUST preserve:

- identical `request_envelope_hash`,
- identical `execution_envelope_hash`,
- execution within T+0 deadline.

Any retry requiring mutable control inputs MUST be rejected and treated as a new intent.

## 12. Reconciliation append-only constraints

Reconciliation records MUST be append-only.

- `SettlementReceipt` entries MUST NOT be updated in place.
- Corrections MUST be represented as compensating entries that reference prior `settlement_receipt_id` and `execution_envelope_hash`.
- Audit views SHOULD provide a full chain from `PaymentIntent` to compensating entries without data loss.
