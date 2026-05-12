# Tasks: Issue #534 / CON-506 Registry Anchoring Commitments

## Implementation checklist

- [x] Add OpenSpec proposal/design/tasks/spec-delta artifacts for registry anchoring commitments.
- [x] Add a gateway anchoring abstraction module (`trait`, request/receipt/error types).
- [x] Integrate concrete `tableland` and `on_chain` publishers behind abstraction.
- [x] Wire `/api/v1/state/commit` through anchoring interface with backward-compatible defaults.
- [x] Add deterministic idempotency key derivation + replay conflict safeguards.
- [x] Add bounded retry handling for retryable adapter failures.
- [x] Emit enriched receipt metadata for downstream verification/audit.
- [x] Add/adjust tests for success, idempotent replay, adapter failure mapping, and retry handling.

## Acceptance criteria (testable)

- [x] **AC-1 (success path):** a valid commit request with default target returns a finalized receipt including at least one publication entry and legacy tableland fields.
  - **Pass when:** engine/API response includes `publications` and `table_name`/`transaction_hash` compatibility fields.
  - **Fail when:** abstraction response omits publication evidence or breaks default tableland behavior.

- [x] **AC-2 (idempotent replay):** identical request replay returns cached receipt without re-publishing and marks replay deterministically.
  - **Pass when:** second call returns same `receipt_id` with `idempotent_replay=true`.
  - **Fail when:** replay generates new side effects or a new receipt.

- [x] **AC-3 (conflict safeguard):** same idempotency key with a different request fingerprint fails with conflict semantics.
  - **Pass when:** engine returns `IdempotencyConflict` and API maps to `409`.
  - **Fail when:** request is accepted or remapped to non-conflict status.

- [x] **AC-4 (retry handling):** transient adapter failures are retried up to configured max and surface deterministic error when budget is exhausted.
  - **Pass when:** tests prove both retry-success and retry-exhausted branches.
  - **Fail when:** retryable failures are never retried or retry budget is ignored.

- [x] **AC-5 (failure mapping):** adapter failures are mapped to deterministic HTTP classes.
  - **Pass when:** retryable/retry-exhausted map to `503`, non-retryable map to `502`, validation maps to `400`.
  - **Fail when:** all failures collapse into one generic `500` mapping.
