# Tasks: Fail-Closed Verifier Boundaries

## Phase 1 — OpenSpec baseline

- [x] Create the issue-specific `spec-driven` OpenSpec artifacts before source
  implementation edits.
- [x] Define the canonical typed verifier/payment boundary and simulation
  quarantine.
- [x] Define settlement failure and guard acceptance criteria.

## Phase 2 — Contract and runtime hardening

- [x] Add the versioned canonical verifier contract and validation helpers.
- [x] Replace BitVM2 length-only success with explicit backend injection and
  typed unavailable/invalid results.
- [x] Replace BitVM3 unconditional recursive success with explicit backend
  injection and typed unavailable/invalid results.
- [x] Replace ZKCP default verifier/monitor and synthetic key behavior with
  unavailable adapters and independent payment evidence.
- [x] Harden settlement route validation, unknown actions, and state transitions.
- [x] Extend Python and PowerShell contamination guards.

## Phase 3 — Tests and documentation

- [x] Rewrite focused BitVM/BitVM3/ZKCP/settlement/Phase 7 tests around the
  fail-closed contract and test-only deterministic fixtures.
- [x] Update readiness, risk, debt, production-boundary, research, and session
  continuity documentation.
- [x] Run OpenSpec validation, typecheck, focused Vitest, lifecycle/guard, and
  diff hygiene checks.

## Phase 4 — Handoff

- [x] Commit with a focused conventional commit, push the branch, and open a PR
  to `main` resolving issue #1187.
- [x] Record residual Gateway/Core/Nexus backend dependencies without claiming
  production cryptographic verification.

## Phase 5 — Formal review remediation (PR #1196)

- [x] Require adapter-owned authoritative backend identity matching for
  production verification, payment observation, and key release; reject the
  unavailable/non-authoritative sentinel.
- [x] Add versioned deterministic ZKCP intent statement/domain binding for
  encrypted data, payment condition, parties, amount, network, proof, and
  ordered public inputs.
- [x] Return immutable intent snapshots, retain authoritative evidence
  internally, reject duplicate ids, and revalidate exact evidence at
  finalization.
- [x] Gate BitVM2 aggregation on authorized unique signers and explicit
  injected signature attestations; keep the default verifier unavailable.
- [x] Normalize contradictory verifier/payment outcomes before user-visible
  status/state transitions.
- [x] Totalize throwing/malformed adapters, bound settlement amounts to safe
  integers, return defensive BitVM3 state copies, and make terminal ZKCP
  finalization idempotent/serialized.
- [x] Make Python and PowerShell contamination scans full-content/multiline
  aware, add alias/fixture-import detection, and add Python guard self-tests.
- [x] Update the change-local design/spec and truthful production-boundary
  documentation without adding or claiming a cryptographic backend.

## Phase 6 — Independent review hardening (PR #1198)

- [x] Serialize ZKCP verify/watch/finalize operations per intent and guard
  every async evidence or terminal-state commit with operation identity,
  generation, and expected-state compare-and-swap checks.
- [x] Atomically reserve BitVM2 signer ids per proof before async verification,
  release reservations on invalid/throwing/unavailable paths, and re-check
  uniqueness at the aggregation commit.
- [x] Add versioned `conxian.verifier.limits.v1` request-body, proof,
  public-input, identifier, signature, signer-set, tap-count, payment, and
  result-string limits; reject before decoding/hashing/backend dispatch.
- [x] Map resource-limit failures to HTTP `413` in the settlement route and
  add helper, BitVM, ZKCP, and route boundary tests.
- [x] Align the PowerShell unavailable ZKCP bridge allow-list with canonical
  construction and add a Python static parity fixture check; do not claim
  `pwsh` runtime execution when unavailable.
- [x] Add controlled deferred-promise race coverage for same/distinct BitVM
  signers, verifier throw/retry, concurrent ZKCP verification, and watch/
  finalize ordering.

## Phase 7 — Formal review remediation (PR #1198)

- [x] Serialize BitVM2 floor initialization/replay with signature submission,
  define idempotent replay/conflict semantics, and guard signature commit with
  aggregation identity compare-and-swap without poisoning the per-proof queue.
- [x] Centralize bounded normalization for verifier, payment, signature, and
  key-release adapter errors plus settlement-route catch responses; add returned
  and thrown over-limit coverage.
- [x] Define `conxian.verifier.signature.v1` canonical even-byte hex encoding
  with explicit minimum/maximum byte limits and reject odd-length signatures
  before backend dispatch.
- [x] Enforce BitVM3 identifier and versioned recursive-height bounds, including
  safe-integer, overflow, negative, NaN, and adapter-dispatch tests.
- [x] Re-run focused/full Vitest, dashboard typecheck, lifecycle/control and
  contamination guards, strict OpenSpec validation, and diff hygiene.

## Phase 8 — P2 review remediation (PR #1198 review 4759182306)

- [x] Collapse oversized BitVM proof identifiers to a fixed bounded sentinel in
  direct-library and route failures, with response regression coverage.
- [x] Add versioned bounded attestation constraints, iterative hostile-graph
  validation, detached deeply immutable snapshots, adapter mutation protection,
  and cycle/accessor/prototype/size tests.
- [x] Add per-proof BitVM3 FIFO replay/conflict/CAS protection with deferred
  identical-replay, conflicting-request, adapter-throw, and queue-cleanup tests.
- [x] Add versioned ZKCP active/total quotas, terminal TTL cleanup, atomic
  evidence removal, injectable clock, deterministic paginated listing, route
  pagination validation, capacity, no-active-eviction, and retention tests.
- [x] Bound direct-library verifier/settlement logs and add a spy regression
  proving oversized intent identifiers are never logged verbatim.
- [x] Update the production-boundary, risk, gap, debt, and session-continuity
  documentation to record attestation, retention, pagination, logging, and
  same-proof concurrency guarantees without claiming production backends.
- [ ] Re-run focused/full Vitest, dashboard typecheck, lifecycle/control and
  contamination guards, strict OpenSpec validation, diff hygiene, and hosted
  PR checks after the focused commit is pushed.

## Phase 9 — Final P2 resource-boundary remediation (PR #1198 review 4759335450)

- [x] Change signature-verifier attestations to bounded canonical JSON string
  payloads; reject object/proxy values before parsing, enforce encoded length
  before `JSON.parse`, apply detached JSON validation/canonicalization, and
  document canonical reserialization as authoritative for duplicate-key
  ambiguity.
- [x] Add hostile proxy/own-key, over-limit pre-parse, malformed, deep/large,
  and valid canonical snapshot/digest regression tests.
- [x] Add versioned BitVM3 bounded terminal-retention policy with a hard cap,
  pre-dispatch capacity reservation, injectable clock, terminal TTL cleanup,
  all-map/queue cleanup, in-flight preservation, and safe replay after expiry.
- [x] Add BitVM3 cap, no-dispatch, no-in-flight-eviction, TTL/map-cleanup, and
  replay-after-expiry regression tests.
- [x] Update the change-local design/spec, production-boundary/limits/risk
  documentation, and one session-continuity entry without selecting or
  claiming a production verifier backend.
- [ ] Re-run focused/full Vitest, dashboard typecheck, lifecycle/control and
  contamination guards, strict OpenSpec validation, diff hygiene, and hosted
  PR checks after the focused commit is pushed.

## Phase 10 — P1/P2 review remediation (PR #1198 review 4759557321)

- [x] Move ZKCP clock validation, bounded release-input construction, and the
  one-shot release-attempt latch before external key-releaser dispatch; remove
  post-call clock/serialization/CAS failure paths and add malformed/throwing,
  deferred, rollback, out-of-range, and retry-count tests.
- [x] Add versioned BitVM3 tombstone cap/TTL identity retention, deterministic
  same-request replay, conflicting replay rejection after state expiry,
  tombstone expiry/cap behavior, atomic cleanup, and durable Gateway/Core
  identity-registry requirements for permanent reuse prevention.
- [x] Add versioned BitVM2 retained floor/aggregation/initialization caps with
  pre-dispatch reservations, in-flight/challenge/signature preservation,
  terminal associated-map cleanup, and replay/conflict/capacity tests.
- [x] Apply safe monotonic timestamp/error handling to adjacent BitVM2 and ZKCP
  commit timestamps and update the issue #1187 design/spec, production
  boundary, risk, debt, gap, and session-continuity documentation.
- [ ] Re-run focused/full Vitest, dashboard typecheck, lifecycle/control and
  contamination guards, strict OpenSpec validation, dependency checks, diff
  hygiene, and hosted PR checks after the single focused commit is pushed.
