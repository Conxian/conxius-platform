# Proposal: Issue #534 / CON-506 Registry Anchoring Interface for Checkpoint Commitments

## Problem

`POST /api/v1/state/commit` currently returns a static Tableland-style payload and does not expose a formal publication abstraction, deterministic idempotency controls, or retry/error semantics suitable for production checkpoint commitment anchoring.

This leaves three gaps:

1. There is no interface boundary for multiple publication targets (Tableland + on-chain).
2. Replays cannot be handled deterministically with conflict detection.
3. Downstream verifiers lack structured audit metadata and adapter-attempt evidence.

## Goals

1. Introduce a registry anchoring interface abstraction for checkpoint commitment publication.
2. Support concrete publication adapters for `tableland` and `on_chain` (and combined mode) behind that interface.
3. Add deterministic idempotency behavior, replay conflict safeguards, and bounded retry semantics.
4. Emit commitment publication metadata suitable for downstream verification/audit.
5. Preserve backward compatibility for existing `state/commit` consumers where feasible.

## Scope

### In scope

- Gateway engine anchoring abstraction module (trait + request/receipt/error types).
- Engine orchestration for target routing, retry policy, and idempotency/replay safeguards.
- API request/response wiring for `/api/v1/state/commit` into the new anchoring interface.
- Adapter error-to-HTTP mapping.
- Tests for success path, idempotent replay, adapter failure mapping, and retry behavior.

### Out of scope

- Live chain broadcasting or real Tableland write integration.
- Persistent idempotency storage beyond current in-memory gateway process lifetime.
- New external endpoint families beyond `/api/v1/state/commit`.

## Deliverables

- `openspec/changes/2026-05-12-issue-534-registry-anchoring-commitments/proposal.md`
- `openspec/changes/2026-05-12-issue-534-registry-anchoring-commitments/design.md`
- `openspec/changes/2026-05-12-issue-534-registry-anchoring-commitments/tasks.md`
- `openspec/changes/2026-05-12-issue-534-registry-anchoring-commitments/spec-delta.md`
- `openspec/specs/registry-anchoring-checkpoint-commitments.spec.md`
