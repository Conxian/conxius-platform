# Design: Registry Anchoring Interface for On-Chain Checkpoint Commitments

## 1) Architecture intent

Gateway MUST treat checkpoint commitment publication as a target-agnostic anchoring operation with pluggable adapters. API handlers MUST not call target-specific publication logic directly.

## 2) Anchoring abstraction

Add `engine::anchoring` module with:

- `AnchoringPublisher` trait
- `AnchoringRequest`
- `AnchoringTarget` (`tableland`, `on_chain`, `both`)
- `AnchoringPublication` (per-adapter evidence)
- `AnchoringReceipt` (aggregated response with audit metadata)
- `AnchoringError` (validation, idempotency conflict, adapter failure, retry exhausted)

`AnchoringPublisher::publish` is invoked per target with attempt context and returns publication evidence or a typed error.

## 3) Adapter model

Two concrete adapters are wired by default:

1. `TablelandAnchoringPublisher`
2. `OnChainAnchoringPublisher`

For target `both`, engine executes adapters in deterministic order (`tableland` then `on_chain`) and aggregates outputs into one receipt.

## 4) Retry and failure semantics

Each adapter publish path is wrapped with bounded retry logic:

- `max_retry_attempts` default: `3`
- retry only when `AnchoringError::AdapterFailure { retryable: true }`
- if retries are exhausted, return `AnchoringError::RetryExhausted`
- non-retryable adapter failures abort immediately

API maps errors as follows:

- `Validation` -> `400 Bad Request`
- `IdempotencyConflict` -> `409 Conflict`
- retryable adapter failures / retry exhausted -> `503 Service Unavailable`
- non-retryable adapter failure -> `502 Bad Gateway`

## 5) Idempotency + replay safeguards

Gateway derives an idempotency key when absent:

`state_commit:{target}:{normalized_state_root}`

Gateway computes a deterministic request fingerprint from:

- normalized state root,
- target,
- metadata (stable-sorted key/value order).

Rules:

1. Same key + same fingerprint => return cached receipt with `idempotent_replay=true`.
2. Same key + different fingerprint => reject with `IdempotencyConflict`.
3. New key => execute publish flow and store receipt.

## 6) Metadata + audit output

`AnchoringReceipt` includes:

- `receipt_id`
- `state_root`
- `target`
- `idempotency_key`
- `idempotent_replay`
- `status`
- `published_at`
- `total_attempts`
- `publications[]` (per adapter path evidence)
- `audit_metadata` (`request_fingerprint`, `targets_executed`, `retry_budget`, deterministic replay markers)

For backward compatibility, when Tableland publication is present the receipt also includes legacy top-level fields:

- `table_name`
- `transaction_hash`
- `persistence`

## 7) API contract updates

`POST /api/v1/state/commit` accepts:

- existing: `state_root`, `testnet`
- new optional: `target`, `idempotency_key`, `max_retry_attempts`, `metadata`

If `target` is omitted, default is `tableland`.

## 8) Test strategy

- Unit tests for engine anchoring flow:
  - successful publish path,
  - idempotent replay,
  - idempotency conflict,
  - retry success after transient errors,
  - retry exhausted handling.
- API tests for error mapping from `AnchoringError` to HTTP status.
