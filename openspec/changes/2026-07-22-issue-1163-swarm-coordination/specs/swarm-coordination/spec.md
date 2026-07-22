# Specification: Swarm Coordination

This change-local capability delta records the five issue-level acceptance
criteria for #1163. The canonical normative contract remains
[`openspec/specs/swarm-coordination-v1.spec.md`](../../../../specs/swarm-coordination-v1.spec.md);
this file provides the current spec-driven OpenSpec delta shape without
repeating that canonical specification.

## ADDED Requirements

### Requirement: AC-1 — Transport-neutral envelope and lifecycle validation

The `swarm-coordination` capability MUST provide the versioned
`conxian.swarm` envelope, lifecycle, replay, integrity, and envelope-only
authentication validation defined by the canonical specification's Section 5.
Validation MUST be deterministic and independent of any delivery transport or
centralized scheduler.

#### Scenario: AC-1 — Equivalent validators reject the same invalid envelope

- **WHEN** independent validators receive the same canonical envelope, and a
  second input has an unsupported major version, invalid lifecycle transition,
  or conflicting reuse of an idempotency key
- **THEN** they produce the same accept/reject result and structured failure
  evidence without consulting a provider runtime

### Requirement: AC-2 — Deterministic task decomposition and capability matching

The `swarm-coordination` capability MUST provide the validated `task-graph.v1`
DAG and capability-matching contract defined by the canonical specification's
Section 6. Task identifiers, dependencies, retry/timeout bounds, capability
requirements, topological order, and candidate evidence MUST be validated and
deterministic; matching MUST NOT schedule or execute an agent.

#### Scenario: AC-2 — Invalid graphs fail closed and valid ordering is stable

- **WHEN** a graph contains a duplicate task, missing dependency, cycle, or
  ambiguous capability requirement, or when the same valid graph and candidate
  set are supplied in different input orders
- **THEN** invalid graphs are rejected and valid inputs produce the same
  topological order and capability candidate order every time

### Requirement: AC-3 — Deterministic result aggregation and conflict evidence

The `swarm-coordination` capability MUST provide the result identity,
semantic-deduplication, conflict-preservation, and aggregate outcome contract
defined by the canonical specification's Section 7. Required and optional task
policy MUST determine complete, partial, failed, blocked, conflict, or
cancelled outcomes without arrival-order or provider preference deciding a
conflict.

#### Scenario: AC-3 — Reordered and duplicated results remain equivalent

- **WHEN** result deliveries are reordered, duplicated, retried, partially
  failed, or contain conflicting semantic metadata for the same task attempt
- **THEN** identical semantic deliveries collapse as duplicate evidence,
  conflicting results remain visible, and the aggregate status and evidence
  order remain unchanged

### Requirement: AC-4 — Graph-linked machine-readable handover

The `swarm-coordination` capability MUST provide the versioned `handover.v1`
document and graph/provenance validation defined by the canonical
specification's Section 8. Handover validation MUST use the referenced graph,
the validated #1162 allowlist and discovery result, and the same trusted
discovery anchor, while preserving task state, artifacts, conflicts, risks,
bounded context, and structured resume instructions.

#### Scenario: AC-4 — A fresh validator rejects unverifiable handover state

- **WHEN** a handover is missing graph linkage, has a mismatched digest, stale
  mandatory context, unallowlisted provenance, or fewer than two distinct
  conflict payload digests
- **THEN** the handover is rejected or marked non-resumable rather than being
  authorized by a locally recomputed digest or hidden process state

### Requirement: AC-5 — Allowlisted, bounded, and precedence-aware context sharing

The `swarm-coordination` capability MUST provide the bounded context and #1162
provenance contract defined by the canonical specification's Section 9. Context
packaging, validation, merging, and resolution MUST enforce explicit task or
declared repository sources, trusted-anchor provenance, redaction, item/byte/
depth bounds, precedence, freshness, expiry, and truncation semantics.

#### Scenario: AC-5 — Unallowlisted or stale context cannot satisfy current work

- **WHEN** context contains an unallowlisted path, raw secret, over-bound
  entry, forged provenance, or stale/expired value competing with current
  higher-precedence input
- **THEN** the boundary fails closed or preserves the value only as marked
  evidence, and resolution retains deterministic precedence/conflict evidence
  without silently treating it as current authoritative context
