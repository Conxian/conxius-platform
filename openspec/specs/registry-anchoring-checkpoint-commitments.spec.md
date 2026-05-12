# Specification: Registry Anchoring Interface for Checkpoint Commitments

## 1. Overview

This specification defines the normative contract for publishing on-chain checkpoint commitments from Gateway through a registry anchoring abstraction.

Gateway implementations MUST support deterministic publication across multiple anchoring targets while preserving replay safety and auditability.

## 2. Normative terms

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are to be interpreted as normative requirements.

## 3. Anchoring interface contract

Gateway MUST expose an internal anchoring interface with the following core entities:

- `AnchoringRequest`
- `AnchoringTarget`
- `AnchoringPublication`
- `AnchoringReceipt`
- `AnchoringError`
- `AnchoringPublisher` trait (adapter contract)

The API layer MUST invoke this interface for `/api/v1/state/commit` and MUST NOT contain target-specific publication logic.

## 4. Targeting model

`AnchoringTarget` MUST support:

- `tableland`
- `on_chain`
- `both`

When `both` is selected, adapters MUST execute in deterministic order and produce one aggregated receipt.

If target is omitted in API requests, default target MUST be `tableland`.

## 5. Idempotency and replay safety

### 5.1 Key derivation

If caller does not provide an idempotency key, Gateway MUST derive one deterministically as:

`state_commit:{target}:{normalized_state_root}`

### 5.2 Request fingerprint

Gateway MUST compute a deterministic request fingerprint from normalized request content, at minimum:

- `state_root`
- `target`
- metadata (stable sorted key ordering)

### 5.3 Replay rules

- Same idempotency key + same fingerprint MUST return the prior receipt and mark `idempotent_replay=true`.
- Same idempotency key + different fingerprint MUST fail with conflict semantics.
- Replay conflict MUST prevent any publication side effects.

## 6. Retry behavior

Gateway MUST apply bounded retry semantics per adapter:

- default `max_retry_attempts` = `3`
- retries are allowed only for retryable adapter failures
- non-retryable adapter failures MUST fail immediately
- if retry budget is exhausted, Gateway MUST return a retry-exhausted error

## 7. Error taxonomy and API mapping

Gateway MUST classify anchoring errors into at least:

- validation errors,
- idempotency conflicts,
- adapter failures (retryable/non-retryable),
- retry exhausted failures.

`/api/v1/state/commit` MUST map these classes to deterministic HTTP responses:

- validation -> `400`
- idempotency conflict -> `409`
- retryable / retry-exhausted adapter failure -> `503`
- non-retryable adapter failure -> `502`

## 8. Receipt and metadata requirements

`AnchoringReceipt` MUST include:

- unique `receipt_id`
- `state_root`
- `target`
- `idempotency_key`
- `idempotent_replay`
- `status`
- `published_at`
- `total_attempts`
- `publications[]` containing per-adapter evidence
- `audit_metadata` including deterministic replay/audit attributes

Each `AnchoringPublication` MUST include:

- adapter identifier,
- publication reference (e.g., tx hash / row tx id),
- status,
- persistence class,
- attempt count,
- adapter metadata fields needed for downstream verification.

## 9. Backward compatibility

For Tableland publication, response payloads SHOULD include compatibility fields used by existing consumers:

- `table_name`
- `transaction_hash`
- `persistence`

Adding enriched metadata MUST NOT remove default Tableland behavior for requests that only provide `state_root`.
