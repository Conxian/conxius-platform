# Tasks: Deterministic, Transport-Neutral Swarm Coordination Protocol

## Phase 1 — OpenSpec artifact baseline

- [x] Create `openspec/changes/2026-07-22-issue-1163-swarm-coordination/` from current `origin/main`.
- [x] Add `.openspec.yaml`, `proposal.md`, `design.md`, `spec-delta.md`, and `tasks.md` before implementation edits.
- [x] Record the dependency on merged issue #1162 without modifying its artifacts or implementation.
- [x] Define the transport-neutral boundary and explicitly exclude a centralized runtime, scheduler, and provider-specific transports.
- [x] Define versioned envelopes, identity/correlation/idempotency, lifecycle, DAG decomposition, capability matching, aggregation, handover, bounded context, serialization, security, compatibility, and failure semantics.
- [x] Tie acceptance criteria to each of issue #1163's five unchecked items.
- [ ] Obtain review/approval before implementation begins. **Outstanding:** no independent review/approval evidence is present in this branch; no issue or PR state was changed by this implementation.

## Phase 2 — Canonical specification and implementation

- [ ] Add the standalone normative specification at `openspec/specs/swarm-coordination-v1.spec.md`. **Outstanding:** the reviewed `proposal.md`, `design.md`, `spec-delta.md`, checked-in JSON Schema, and implementation currently provide the contract, but the proposed standalone spec file has not been created.
- [x] Add strict protocol types and versioned object families in `scripts/agent-coordination.ts`, with the machine-readable contract in `schemas/agent-swarm.schema.json`.
- [x] Add fail-closed validation, canonical JSON, duplicate-key parsing, domain-separated SHA-256, and integrity helpers in `scripts/agent-coordination.ts`.
- [x] Add DAG validation, stable topological ordering, bounded retry/timeout checks, and capability matching in `scripts/agent-coordination.ts`.
- [x] Add deterministic envelope/result duplicate collapse, conflict preservation, partial-failure classification, dependency impact, and evidence ordering in `scripts/agent-coordination.ts`.
- [x] Add machine-readable handover validation, graph linkage, digest checks, stale-context handling, and resumability assessment in `scripts/agent-coordination.ts`.
- [x] Add bounded, allowlisted, redacted context packaging, merge precedence, freshness checks, truncation metadata, and provenance digests in `scripts/agent-coordination.ts`.
- [x] Keep the implementation transport-neutral, zero-network, side-effect free, and independent of a centralized scheduler or provider SDK.

## Phase 2 — Tests and CI

- [x] Add focused canonical JSON/digest coverage for object-key ordering, array preservation, negative-zero normalization, duplicate-key rejection, non-finite rejection, and integrity validation. **Note:** an explicit standalone timestamp-normalization vector remains a follow-up test gap; the validator and existing fixtures normalize RFC 3339 timestamps.
- [x] Test envelope schema/version handling, lifecycle transitions, idempotency, replay conflicts, expiry, authentication requirements, payload linkage, and unknown-field behavior.
- [x] Test DAG cycles, missing dependencies, deterministic topological order, graph bounds, capability version matching, unmet requirements, normalization, and candidate tie-breaking.
- [x] Test aggregation under reordered input, identical duplicate delivery, retry attempts, partial optional failure, required failure, cancellation, dependency blocking, and conflicting results.
- [x] Test handover round-trip, missing/invalid state, graph/task linkage, artifact and context digests, stale mandatory context, unresolved conflicts, and resumability decisions.
- [x] Test context allowlists, #1162 required/optional semantics, redaction, byte/item/depth bounds, truncation, precedence, staleness, expiry, and deterministic conflict records.
- [x] Verify no-network/no-side-effect behavior and rejection of unsafe paths, raw secrets, hidden files, unknown core fields, and provider-specific core fields through the implementation boundary, strict schema, and focused tests.
- [x] Keep the focused root scripts and invoke `test:agent-coordination` and `typecheck:agent-coordination` from `.github/workflows/reusable-ci.yml` without weakening existing gates.

## Phase 3 — Documentation and handover

- [x] Document the actual `conxian.swarm` protocol, lifecycle, DAG/capability matching, idempotent delivery, deterministic aggregation/conflict/partial-failure semantics, and transport-neutral boundary in `docs/AGENT_ONBOARDING.md`.
- [x] Document the `handover.v1` machine contract, Markdown migration relationship, linkage/digest/risk/blocker/next-step fields, and bounded context usage in `docs/SESSION_CONTINUITY.md`.
- [x] Document how #1162 discovery feeds the bounded context allowlist and why discovery/skills remain unmodified and inert.
- [x] Document the implementation ownership boundary: protocol validation in this repository; transport, authentication, and runtime scheduling in consuming systems.
- [x] Record validation evidence, unresolved policy decisions, and provider/admin-owned blockers without changing issue or repository state as part of source implementation.

## Acceptance criteria mapped to issue #1163

The five issue-level criteria are checked against the reviewed OpenSpec artifacts, `schemas/agent-swarm.schema.json`, `scripts/agent-coordination.ts`, focused tests, CI wiring, and the Phase 3 documentation. The standalone spec-file and independent-review gaps remain explicitly tracked above; this mapping does not claim either outstanding artifact exists.

- [x] **AC-1 — Inter-agent communication protocols:** `Envelope`/`envelope.v1`, `createEnvelope()`, `validateEnvelope()`, `validateLifecycleTransition()`, and `deduplicateEnvelopes()` cover identity, correlation, idempotency, lifecycle, expiry, integrity, authentication requirements, replay conflicts, unknown fields/versions, and fail-closed invalid input without a transport or scheduler. Evidence: `scripts/agent-coordination.test.ts` tests 1, 2, 7, and 8; `schemas/agent-swarm.schema.json` `envelope` definition; `docs/AGENT_ONBOARDING.md` protocol section.
- [x] **AC-2 — Task decomposition patterns:** `validateTaskGraph()`, `deterministicTopologicalOrder()`, and `matchCapabilities()` cover unique IDs, dependencies, required/optional nodes, retry/timeout and graph bounds, capability requirements, cycle rejection, stable topological order, normalized version matching, and deterministic candidate order. Evidence: tests 3 and 4; schema `taskGraph`/`taskNode` definitions; onboarding DAG section.
- [x] **AC-3 — Result aggregation mechanisms:** `deduplicateResults()` and `aggregateResults()` produce deterministic complete/partial/failed/blocked/conflict/cancelled outcomes, collapse identical deliveries, preserve conflicting evidence, propagate dependency impact, and remain invariant to input order. Evidence: tests 6, 13, and 14; schema `taskResult`; onboarding aggregation section.
- [x] **AC-4 — Agent-to-agent handover format:** `handover.v1`, `createHandover()`, `validateHandover()`, and `assessHandoverResumability()` carry graph/correlation linkage, task state, artifacts/digests, decisions, risks/blockers, conflicts, bounded context, and structured resume instructions; malformed, stale, expired, or unverifiable state is rejected or reported non-resumable. Evidence: tests 15 and 16; schema `handover`; `docs/SESSION_CONTINUITY.md` machine-readable handover section.
- [x] **AC-5 — Session context sharing:** `packageContext()`, `validateContextSnapshot()`, `resolveContextSnapshot()`, `mergeContextSnapshots()`, and `redactSensitiveFields()` admit only explicit/#1162-declared/validated/marked sources, enforce redaction, provenance, precedence, staleness, expiry, truncation, and item/byte/depth bounds, and retain deterministic conflicts. Evidence: tests 9–12 and 17–18; schema `contextSnapshot`; continuity context section.

## Validation evidence

- [x] No repository-provided OpenSpec validator was found during inspection; equivalent structural checks cover the five required files, `.openspec.yaml` (`schema: spec-driven`, `created: 2026-07-22`), required headings/links, all five acceptance IDs, and the absence of implementation files in the change directory.
- [x] Cross-document review confirms the proposal, design, spec delta, checklist, schema, implementation, and Phase 3 docs use the same `conxian.swarm` v1 namespace, #1162 boundary, transport-neutral ownership, lifecycle, deterministic ordering, conflict, and stale-context semantics.
- [x] Focused validation passes: `pnpm run test:agent-coordination` (18/18), `pnpm run typecheck:agent-coordination`, `pnpm run test:agent-discovery` (11/11), and `pnpm run typecheck:agent-discovery`.
- [x] `git diff --check` passes for the final phase-3 diff. The earlier OpenSpec baseline commit contains only the five files in this change directory; the phase-3 commit also includes the requested docs, CI, checklist, and AGENTS continuity updates.
