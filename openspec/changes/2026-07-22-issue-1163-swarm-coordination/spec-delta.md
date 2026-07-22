# Spec Delta: Deterministic Swarm Coordination Protocol v1

This change proposes a new canonical specification at:

`openspec/specs/swarm-coordination-v1.spec.md`

The canonical specification is intentionally not created in this phase. This phase establishes the reviewed contract and implementation boundary before source changes begin.

## Normative additions

1. The repository SHALL define a versioned, transport-neutral protocol namespace `conxian.swarm`.
2. Every core inter-agent message SHALL use a versioned envelope containing `message_id`, `message_type`, `sender`, `recipient`, `correlation_id`, `idempotency_key`, lifecycle state/sequence, expiry, payload, and integrity metadata. `causation_id` SHALL be supported for delegation, retries, and handover resumption.
3. Envelope identity fields SHALL be treated as claims unless an explicit deployment profile verifies authentication. Missing or invalid required authentication SHALL fail closed.
4. Lifecycle transitions SHALL be explicit, monotonic, and validated. Terminal states SHALL NOT be reopened; retries and corrections SHALL create new linked messages.
5. Idempotency SHALL be evaluated by a declared scope, key, and canonical payload digest. Identical replays SHALL be safe; reuse of a key with a different digest SHALL produce a machine-readable replay conflict.
6. A task graph SHALL be a validated DAG with unique task IDs, declared dependencies, required/optional status, capability requirements, and bounded retry/timeout policy. Cycles, missing dependencies, ambiguous requirements, and invalid bounds SHALL be rejected.
7. Topological task order and capability candidate order SHALL be deterministic and independent of message arrival order, transport, or provider implementation. Matching SHALL produce evidence/candidates, not a scheduling command.
8. Result aggregation SHALL distinguish `COMPLETE`, `PARTIAL`, `FAILED`, `CONFLICT`, and `CANCELLED` outcomes. Identical duplicate results SHALL collapse by canonical digest. Conflicting results SHALL be retained and SHALL NOT be resolved by arrival order or implicit provider preference.
9. A versioned machine-readable handover SHALL include correlation/graph identity, lifecycle state, completed/active/blocked/pending tasks, decisions, artifacts with digests, conflicts, risks/blockers, bounded context, and structured resume instructions. A handover SHALL be self-describing and resumability SHALL fail closed when mandatory state is missing, stale, or unverifiable.
10. Session context SHALL be admitted only from explicit task input, governance/canonical sources, #1162-declared repository context, validated artifact references, or explicitly marked assumptions. Unlisted paths, arbitrary environment/configuration, credentials, raw secrets, and implicit provider transcripts SHALL NOT be admitted.
11. Context entries SHALL carry provenance, classification, redaction status, capture/stale/expiry metadata, precedence, size/depth accounting, and truncation/original-digest metadata when applicable. Context profiles SHALL enforce item, byte, depth, and per-entry bounds.
12. Context resolution SHALL use explicit precedence: current task input, governance/canonical sources, architectural context, live operational context, evidence, historical reference, then agent assumptions. Stale/expired values SHALL NOT silently satisfy current requirements, and discarded lower-precedence conflicts SHALL remain observable.
13. Normative objects SHALL use stable UTF-8 canonical JSON with RFC 8785-compatible object-key ordering, documented semantic array ordering, normalized UTC timestamps, finite numeric values, and domain-separated SHA-256 digests.
14. Validators SHALL be zero-network, side-effect free, and fail closed for malformed data, unsafe paths, unsupported major versions, unknown required fields, invalid transitions, stale mandatory context, digest mismatches, and graph/handover violations.
15. Minor-version extensions SHALL be explicitly namespaced and optional. Unknown core types, unsupported namespaces, and unknown required extensions SHALL be rejected. Core validation SHALL not interpret provider-specific behavior.
16. The protocol SHALL not require or define a centralized scheduler, queue, broker, provider transport, credential/key issuance system, automatic skill execution path, protocol/funds logic, or user-data handling.

## Compatibility and dependency notes

- Issue #1163 depends on the merged #1162 discovery protocol for repository root, declared context, and inert skill boundaries. This delta consumes those outputs but does not modify them.
- Existing onboarding and continuity prose remains compatible. Follow-up documentation should link to the canonical swarm specification rather than duplicate its normative rules.
- Implementations that cannot validate a required major version, mandatory field, digest, authentication profile, or context boundary MUST reject the object rather than downgrade silently.

## Proposed implementation surface

The follow-up implementation is expected to add a canonical spec, strict TypeScript protocol/validation modules under `src/swarm/`, unit/property/contract tests under `src/swarm/__tests__/`, focused root scripts and reusable CI coverage, and links from `docs/AGENT_ONBOARDING.md` and `docs/SESSION_CONTINUITY.md`. None of those files are part of this phase's change set.
