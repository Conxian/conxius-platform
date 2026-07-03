# Spec Delta: Registry Anchoring Checkpoint Commitments

This change introduces a new normative specification document:

- `openspec/specs/registry-anchoring-checkpoint-commitments.spec.md`

## Added requirements

1. Gateway MUST expose a publication abstraction for checkpoint commitment anchoring.
2. Gateway MUST support `tableland`, `on_chain`, and `both` target modes via concrete adapters.
3. Gateway MUST enforce deterministic idempotency replay and replay conflict behavior.
4. Gateway MUST apply bounded retry semantics for retryable adapter failures.
5. Gateway MUST emit structured publication and audit metadata for downstream verification.
6. `/api/v1/state/commit` MUST default to Tableland-compatible behavior when `target` is omitted.
