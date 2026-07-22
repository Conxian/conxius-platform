# Tasks: Deterministic, Transport-Neutral Swarm Coordination Protocol

## Phase 1 — OpenSpec artifact baseline

- [x] Create `openspec/changes/2026-07-22-issue-1163-swarm-coordination/` from current `origin/main`.
- [x] Add `.openspec.yaml`, `proposal.md`, `design.md`, `spec-delta.md`, and `tasks.md` before implementation edits.
- [x] Record the dependency on merged issue #1162 without modifying its artifacts or implementation.
- [x] Define the transport-neutral boundary and explicitly exclude a centralized runtime, scheduler, and provider-specific transports.
- [x] Define versioned envelopes, identity/correlation/idempotency, lifecycle, DAG decomposition, capability matching, aggregation, handover, bounded context, serialization, security, compatibility, and failure semantics.
- [x] Tie acceptance criteria to each of issue #1163's five unchecked items.
- [ ] Obtain review/approval before implementation begins.

## Phase 2 — Canonical specification and implementation

- [ ] Add `openspec/specs/swarm-coordination-v1.spec.md` with the normative contract from this change.
- [ ] Add strict protocol types in `src/swarm/protocol.ts` and exports in `src/swarm/index.ts`/`src/index.ts`.
- [ ] Add fail-closed validation and canonical JSON/SHA-256 helpers in `src/swarm/validation.ts`.
- [ ] Add DAG validation, stable topological ordering, and capability matching in `src/swarm/graph.ts`.
- [ ] Add deterministic duplicate collapse, conflict preservation, partial-failure classification, and evidence ordering in `src/swarm/aggregation.ts`.
- [ ] Add machine-readable handover validation and resumability checks in `src/swarm/handover.ts`.
- [ ] Add bounded, allowlisted, redacted context resolution with precedence/staleness handling in `src/swarm/context.ts`.
- [ ] Keep all implementation modules transport-neutral, side-effect free, and independent of a centralized scheduler or provider SDK.

## Phase 2 — Tests and CI

- [ ] Add canonical serialization and digest vectors, including object-key ordering, semantic array ordering, timestamp normalization, duplicate-key rejection, and digest exclusion.
- [ ] Test envelope schema/version handling, lifecycle transitions, idempotency, replay conflicts, expiry, authentication profiles, and unknown-field behavior.
- [ ] Test DAG cycles, missing dependencies, deterministic topological order, graph bounds, capability version matching, unmet requirements, and candidate tie-breaking.
- [ ] Test aggregation under reordered input, identical duplicate delivery, retry attempts, partial optional failure, required failure, cancellation, and conflicting results.
- [ ] Test handover round-trip, missing/invalid state, artifact digests, stale mandatory context, and resumability decisions.
- [ ] Test context allowlists, #1162 required/optional semantics, redaction, byte/item/depth bounds, truncation, precedence, staleness, expiry, and deterministic conflict records.
- [ ] Verify no-network/no-side-effect behavior and rejection of unsafe paths, raw secrets, hidden files, and provider-specific core fields.
- [ ] Add focused root test/typecheck scripts and invoke them from `.github/workflows/reusable-ci.yml` without weakening existing gates.

## Phase 2 — Documentation and handover

- [ ] Link the canonical swarm specification from `docs/AGENT_ONBOARDING.md` and `docs/SESSION_CONTINUITY.md`.
- [ ] Document how #1162 discovery feeds the bounded context allowlist and why discovery/skills remain unmodified and inert.
- [ ] Document the implementation ownership boundary: protocol validation in this repository; transport, authentication, and runtime scheduling in consuming systems.
- [ ] Record validation evidence, unresolved policy decisions, and any provider/admin-owned blockers without changing issue or repository state as part of source implementation.

## Acceptance criteria mapped to issue #1163

These are implementation-phase gates. They remain unchecked until the canonical spec and code/tests provide evidence.

- [ ] **AC-1 — Inter-agent communication protocols:** A versioned envelope validator covers identity, correlation, idempotency, lifecycle transitions, expiry, integrity, compatibility, replay, and fail-closed invalid input without requiring a transport or scheduler.
- [ ] **AC-2 — Task decomposition patterns:** A DAG validator covers unique IDs, dependencies, required/optional nodes, bounded retry/timeout policy, capability requirements, cycle rejection, stable topological order, and deterministic capability candidate order.
- [ ] **AC-3 — Result aggregation mechanisms:** A pure aggregator produces deterministic complete/partial/failed/conflict/cancelled outcomes, collapses identical duplicates, preserves conflicting evidence, and is invariant to message order and delivery retries.
- [ ] **AC-4 — Agent-to-agent handover format:** A versioned machine-readable handover contains resumable graph state, artifacts/digests, decisions, blockers, conflicts, bounded context, and structured resume instructions; malformed, stale, or unverifiable handovers fail closed.
- [ ] **AC-5 — Session context sharing:** A bounded resolver admits only explicit task data, governance/canonical sources, #1162-declared context, validated artifacts, or marked assumptions; applies redaction, bounds, provenance, precedence, staleness, expiry, and deterministic conflict reporting.

## Validation evidence for Phase 1

- [ ] A repository-provided OpenSpec validator, if discovered, passes for the change directory.
- [ ] If no validator exists, equivalent structural checks confirm all five required files exist, `.openspec.yaml` uses `schema: spec-driven` and the current date, Markdown headings/links are present, all five issue acceptance IDs are present, and no implementation files are included.
- [ ] Cross-document review confirms the proposal, design, spec delta, and task checklist use the same version/boundary/dependency/failure semantics.
- [ ] `git diff --check` passes and the final commit contains only the five files in this directory.
