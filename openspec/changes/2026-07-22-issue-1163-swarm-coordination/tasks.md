# Tasks: Deterministic, Transport-Neutral Swarm Coordination Protocol

## Phase 1 — OpenSpec artifact baseline

- [x] Create `openspec/changes/2026-07-22-issue-1163-swarm-coordination/` from current `origin/main`.
- [x] Add `.openspec.yaml`, `proposal.md`, `design.md`, the `swarm-coordination` capability delta, `spec-delta.md`, and `tasks.md` before implementation edits.
- [x] Migrate the change delta to `specs/swarm-coordination/spec.md` with one OpenSpec requirement/scenario mapped to each of AC-1 through AC-5, while keeping `openspec/specs/swarm-coordination-v1.spec.md` as the single canonical normative contract.
- [x] Record the dependency on merged issue #1162 without modifying its artifacts or implementation.
- [x] Define the transport-neutral boundary and explicitly exclude a centralized runtime, scheduler, and provider-specific transports.
- [x] Define versioned envelopes, identity/correlation/idempotency, lifecycle, DAG decomposition, capability matching, aggregation, handover, bounded context, serialization, security, compatibility, and failure semantics.
- [x] Tie acceptance criteria to each of issue #1163's five unchecked items.
- [ ] Obtain review/approval before implementation begins. **Outstanding:** no independent review/approval evidence is present in this branch; no issue or PR state was changed by this implementation.

## Phase 2 — Canonical specification and implementation

- [x] Add the standalone normative specification at `openspec/specs/swarm-coordination-v1.spec.md`, aligned with the schema, runtime, #1162 discovery boundary, and AC-1 through AC-5.
- [x] Add strict protocol types and versioned object families in `scripts/agent-coordination.ts`, with the machine-readable contract in `schemas/agent-swarm.schema.json`.
- [x] Add fail-closed validation, canonical JSON, duplicate-key parsing, domain-separated SHA-256, and integrity helpers in `scripts/agent-coordination.ts`.
- [x] Add DAG validation, stable topological ordering, bounded retry/timeout checks, and capability matching in `scripts/agent-coordination.ts`.
- [x] Add deterministic envelope/result duplicate collapse, conflict preservation, partial-failure classification, dependency impact, and evidence ordering in `scripts/agent-coordination.ts`.
- [x] Add machine-readable handover validation, graph linkage, digest checks, stale-context handling, and resumability assessment in `scripts/agent-coordination.ts`.
- [x] Add bounded, allowlisted, redacted context packaging, merge precedence, freshness checks, truncation metadata, and provenance digests in `scripts/agent-coordination.ts`.
- [x] Keep the implementation transport-neutral, zero-network, side-effect free, and independent of a centralized scheduler or provider SDK.

## Phase 2 — Review hardening, tests, and CI

- [x] Add focused canonical JSON/digest coverage for object-key ordering, array preservation, negative-zero normalization, duplicate-key rejection, non-finite rejection, prototype-key preservation, and integrity validation.
- [x] Test envelope schema/version handling, lifecycle transitions, idempotency, replay conflicts, expiry, authentication requirements, payload linkage, and unknown-field behavior.
- [x] Test DAG cycles, missing dependencies, deterministic topological order, graph bounds, capability version matching, unmet requirements, normalization, and candidate tie-breaking.
- [x] Test aggregation under reordered input, identical duplicate delivery, retry attempts, partial optional failure, required failure, cancellation, dependency blocking, and conflicting results.
- [x] Test handover round-trip, missing/invalid state, graph/task linkage, artifact and context digests, stale mandatory context, unresolved conflicts, and resumability decisions.
- [x] Test context allowlists, #1162 required/optional semantics, redaction, byte/item/depth bounds, truncation, precedence, staleness, expiry, and deterministic conflict records.
- [x] Verify no-network/no-side-effect behavior and rejection of unsafe paths, raw secrets, hidden files, unknown core fields, and provider-specific core fields through the implementation boundary, strict schema, and focused tests.
- [x] Keep the focused root scripts and invoke `test:agent-coordination` and `typecheck:agent-coordination` from `.github/workflows/reusable-ci.yml` without weakening existing gates.
- [x] Close review findings for missing capability constraints, effective-now freshness, semantic result fingerprints, strict calendar timestamps, lifecycle bounds, #1162 allowlist provenance, explicit `.agents` sources, and prototype-safe records.
- [x] Add Ajv 2020 JSON Schema contract tests for representative valid/invalid envelope, graph/task, result, handover, and context fixtures; keep Ajv and format support explicitly declared in root devDependencies and lockfile.
- [x] Enforce graph `max_context_bytes` as the effective context budget and keep handover authentication envelope-only.
- [x] Require graph-aware handover validation with a matching `graph_digest` and enforce the schema/runtime minimum of two distinct handover conflict payload digests.
- [x] Revalidate the derived #1162 `ContextAllowlist` and source `DiscoveryResult` at handover creation, validation, resumability, and handover-envelope replay/deduplication boundaries; add forged local-entry/snapshot digest regression coverage.
- [x] Add the versioned content-addressed #1162 discovery attestation/trust-anchor contract, require the trusted anchor at authoritative context validation and merge boundaries, reject forged discovery/path/tier/skill/anchor mutations, and document that trusted-anchor delivery is an adapter/deployment responsibility outside the pure library.
- [x] Adopt the strict RFC 3339 millisecond timestamp profile across runtime, schema, canonical specification, change artifacts, and boundary/digest tests; reject four-to-nine fractional digits and out-of-range UTC year conversion.
- [x] Reconcile the root Next override and dashboard dependency graph with the latest `origin/main` repair at Next `15.5.18`, while retaining explicitly pinned Ajv dependencies and the dashboard TypeScript `6.0.3` compatibility pin used by the repaired graph; do not downgrade or remove the latest-main JWT/M2M dependencies.

## Phase 3 — Documentation and handover

- [x] Document the actual `conxian.swarm` protocol, lifecycle, DAG/capability matching, idempotent delivery, deterministic aggregation/conflict/partial-failure semantics, and transport-neutral boundary in `docs/AGENT_ONBOARDING.md`.
- [x] Document the `handover.v1` machine contract, Markdown migration relationship, linkage/digest/risk/blocker/next-step fields, and bounded context usage in `docs/SESSION_CONTINUITY.md`.
- [x] Document how #1162 discovery feeds the bounded context allowlist and why discovery/skills remain unmodified and inert.
- [x] Document the implementation ownership boundary: protocol validation in this repository; transport, authentication, and runtime scheduling in consuming systems.
- [x] Record validation evidence, unresolved policy decisions, and provider/admin-owned blockers without changing issue or repository state as part of source implementation.

## Acceptance criteria mapped to issue #1163

The five issue-level criteria are checked against the canonical specification, reviewed OpenSpec artifacts, `schemas/agent-swarm.schema.json`, `scripts/agent-coordination.ts`, focused tests, CI wiring, and the Phase 3 documentation. Independent review/approval remains explicitly tracked above and is not claimed by this implementation.

- [x] **AC-1 — Inter-agent communication protocols:** `Envelope`/`envelope.v1`, `createEnvelope()`, `validateEnvelope()`, `validateLifecycleTransition()`, and `deduplicateEnvelopes()` cover identity, correlation, idempotency, lifecycle, expiry, integrity, envelope-only authentication, replay conflicts, unknown fields/versions, and fail-closed invalid input without a transport or scheduler. Evidence: `openspec/specs/swarm-coordination-v1.spec.md` Section 5; `scripts/agent-coordination.test.ts`; `schemas/agent-swarm.schema.json` `envelope` definition; `docs/AGENT_ONBOARDING.md` protocol section.
- [x] **AC-2 — Task decomposition patterns:** `validateTaskGraph()`, `deterministicTopologicalOrder()`, and `matchCapabilities()` cover unique IDs, dependencies, required/optional nodes, retry/timeout and graph bounds, capability requirements, cycle rejection, stable topological order, normalized version matching, missing/extra/mismatched constraints, and deterministic candidate order. Evidence: `openspec/specs/swarm-coordination-v1.spec.md` Section 6; `scripts/agent-coordination.test.ts`; schema `taskGraph`/`taskNode` definitions; onboarding DAG section.
- [x] **AC-3 — Result aggregation mechanisms:** `deduplicateResults()` and `aggregateResults()` produce deterministic complete/partial/failed/blocked/conflict/cancelled outcomes, collapse identical semantic deliveries, fingerprint all normative result metadata, preserve same-payload status/evidence/artifact conflicts, propagate dependency impact, and remain invariant to input order. Evidence: `openspec/specs/swarm-coordination-v1.spec.md` Section 7; `scripts/agent-coordination.test.ts`; schema `taskResult`; onboarding aggregation section.
- [x] **AC-4 — Agent-to-agent handover format:** `handover.v1`, `createHandover()`, `validateHandover()`, and `assessHandoverResumability()` require graph input plus `graph_digest` and validated #1162 allowlist/discovery/trusted-anchor provenance, enforce graph/task/provenance linkage and two-digest conflicts, carry task state, artifacts/digests, decisions, risks/blockers, bounded context, and structured resume instructions; malformed, stale, expired, unallowlisted, or unverifiable state is rejected or reported non-resumable. Evidence: `openspec/specs/swarm-coordination-v1.spec.md` Section 8; `scripts/agent-coordination.test.ts`; schema `handover`; `docs/SESSION_CONTINUITY.md` machine-readable handover section.
- [x] **AC-5 — Session context sharing:** `packageContext()`, `validateContextSnapshot()`, `resolveContextSnapshot()`, `mergeContextSnapshots()`, and `redactSensitiveFields()` admit only explicit/#1162-declared/validated/marked sources, require a content-addressed trusted discovery anchor at authoritative boundaries, enforce versioned/digested provenance, explicit `.agents` exceptions, redaction, precedence, effective-now staleness, expiry, truncation, graph byte budgets, and item/byte/depth bounds, and retain deterministic conflicts. Evidence: `openspec/specs/swarm-coordination-v1.spec.md` Section 9; `scripts/agent-coordination.test.ts`; schemas `contextSnapshot`/`contextAllowlist`/`agent-discovery-trust`; continuity context section.

## Validation evidence

- [x] The current OpenSpec CLI requires a `specs/<capability>/spec.md` delta; the change-local `swarm-coordination` capability now carries the five acceptance-mapped requirements and scenarios, while `spec-delta.md` remains a non-duplicating index.
- [x] With `@fission-ai/openspec` version `1.6.0`, `pnpm dlx @fission-ai/openspec validate 2026-07-22-issue-1163-swarm-coordination --strict --no-interactive --json` passes with one valid change and no issues.
- [x] `pnpm dlx @fission-ai/openspec show 2026-07-22-issue-1163-swarm-coordination --json --deltas-only --no-interactive` parses five `ADDED` deltas under the `swarm-coordination` capability, each with a scenario.
- [x] Cross-document review confirms the proposal, design, spec delta, canonical spec, schema, implementation, tests, and docs use the same `conxian.swarm` v1 namespace, #1162 boundary, transport-neutral ownership, lifecycle, deterministic ordering, conflict, provenance, freshness, graph linkage, and authentication semantics.
- [x] Focused validation passes: `pnpm run test:agent-coordination` (26/26), `pnpm run typecheck:agent-coordination`, `pnpm run test:agent-discovery` (21/21), and `pnpm run typecheck:agent-discovery`.
- [x] JSON Schema tests compile Ajv 2020 with explicitly declared `ajv` and `ajv-formats` dependencies and cover valid/invalid envelope, graph, result, handover, and context fixtures.
- [x] Current repository checks pass: `pnpm test`, `pnpm typecheck`, `pnpm lint`, JSON parsing for 17 tracked files, YAML parsing for 35 tracked files, relative-link validation for the five changed OpenSpec Markdown files, and `git diff --check`.
- [x] The repo-wide `pnpm dlx @fission-ai/openspec validate --all --strict --no-interactive --json` run was recorded: #1160 and #1163 pass, while 21 older active changes without current `specs/<capability>/spec.md` deltas remain baseline failures; no unrelated changes were made to mask them.
- [x] Earlier implementation validation remains recorded separately: `pnpm install --frozen-lockfile`, `pnpm run check:lifecycle-control`, and `pnpm run build` passed on the implementation branch before this layout-only remediation.
- [x] `git diff --check` passes for the remediation diff. Independent external review/approval remains unchecked and is the only review gate outside this implementation.
