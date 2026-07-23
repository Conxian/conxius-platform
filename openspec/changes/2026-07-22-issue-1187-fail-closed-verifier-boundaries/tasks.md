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

## Phase 12 — P1 altered-binding/backend drift and P2 evidence bounds (PR #1198 review 4759805105)

- [x] Replace idempotency-key-only obligation identity with a versioned,
  domain-separated encrypted-data obligation id that excludes mutable terms,
  payment txids, timestamps, and backend artifact/version while retaining
  stable seller/buyer identity where it defines the payload authority.
- [x] Extend the durable coordinator contract with pinned registry metadata,
  lookup-by-obligation, atomic obligation claim, matching reconciliation,
  typed binding conflict, and lookup-by-obligation retry semantics for
  ambiguous outcomes and process loss.
- [x] Reject missing or drifted registry namespaces before lookup/release and
  keep backend artifact rotation on the same durable registry namespace or
  fail closed before dispatch.
- [x] Replace recursive adapter evidence copying with a bounded canonical JSON
  string and exact flat primitive allow-list; add hostile proxy, cycle, deep,
  oversized, array/nested, extra-property, mutation, forged identity, and
  backend/registry drift regressions.
- [x] Update the issue #1187 proposal/design/spec, production boundary, risk,
  debt, gaps, scoring, architecture, and knowledge-base/session records to
  document stable obligation identity, registry pinning, typed conflicts, and
  the absence of a production durable coordinator.
- [ ] Re-run focused/full Vitest, dashboard typecheck, lifecycle/control and
  contamination guards, strict OpenSpec validation, dependency checks, diff
  hygiene, and hosted PR checks after the focused commit is pushed.

## Phase 11 — P1 durable ZKCP release idempotency (PR #1198 review 4759710914; superseded by Phase 12 obligation identity)

- [x] Define the initial versioned key-release capability metadata requiring
  durable idempotency, legacy lookup-by-idempotency-key compatibility,
  idempotent release, and an exactly-once-per-key binding guarantee; reject
  unsupported adapters before dispatch while keeping the production default
  unavailable. Phase 12 makes lookup-by-obligation and exactly-once-per-
  obligation authoritative.
- [x] Derive a bounded deterministic key from immutable intent, statement,
  encrypted-data, observed-payment, backend/artifact, and release-policy
  bindings; validate durable evidence against every binding.
- [x] Implement lookup-first finalization under the intent lock. Release only
  after an absent lookup, reuse the same key after ambiguity, and keep local
  attempt/evidence state as an optimization rather than the authority.
- [x] Add shared durable-adapter restart/crash regressions for process loss
  before local commit, backend-commit timeout, normal retry, lookup errors,
  missing capability metadata, and mismatched key/statement/encrypted-data/
  backend/artifact evidence; keep fixtures test-only.
- [x] Update the issue #1187 proposal/design/spec, production boundary, risk,
  debt, gaps, scoring, architecture, and knowledge-base/session records to
  state that exactly-once depends on the external durable backend contract.
- [ ] Re-run focused/full Vitest, dashboard typecheck, lifecycle/control and
  contamination guards, strict OpenSpec validation, dependency checks, diff
  hygiene, and hosted PR checks after the focused commit is pushed.

## Phase 13 — Complete production key-release quarantine (PR #1198 review 4759956526)

The release-coordinator work described in Phases 10–12 is historical and is
superseded by this quarantine. Those design sketches do not authorize a
production adapter, registry, obligation lookup, or irreversible dispatch.

- [x] Remove production key-release interfaces, registry/obligation execution,
  constructor injection, release evidence, synthetic-key paths, and finalized
  status output from `ZKCPBridge` and the settlement route.
- [x] Make direct-library and `zkcp-finalize` route finalization typed
  unavailable/unsupported for every payload with zero bridge or adapter calls.
- [x] Preserve authoritative proof/payment fail-closed transitions while
  keeping `paid` distinct from `finalized`; retain no executable release
  coordinator in production or test fixtures.
- [x] Add direct-library and route tests for malicious/conforming-looking
  adapters, arbitrary payloads, replay, restart-shaped inputs, and drift; prove
  zero calls, no finalized state, and no decryption-key output.
- [x] Extend Python/PowerShell contamination guards for production release
  adapters, dispatch, decryption-key output, and finalized status.
- [x] Document the remaining future dependency: independently authenticated,
  server-bound Gateway/Core atomic claim-or-get plus a durable registry.
- [x] Document future obligation identity as canonical encrypted-data
  commitment bytes plus version/domain only; exclude raw seller/buyer strings
  and specify exact byte/encoding rules.
- [ ] Re-run focused/full Vitest, dashboard typecheck, lifecycle/control and
  contamination guards, strict OpenSpec validation, dependency checks, diff
  hygiene, and hosted PR checks after the focused commit is pushed.

## Phase 14 — Final P2 response and paid-evidence retention closure (PR #1198 review 4760057624)

- [x] Preserve the payment-observation operation `status` in `zkcp-watch` and
  expose the intent lifecycle state separately as `lifecycle_status`; retain
  failure-code HTTP mapping for unavailable, invalid, simulated, and observed
  responses.
- [x] Treat `paid` as terminal payment evidence for bounded retention while
  keeping `pending`/`verified` active; retain paid intents through the TTL and
  atomically purge intent, proof/payment evidence, generation, lock, and queue
  metadata after expiry.
- [x] Preserve in-flight and queued watch operations during terminal cleanup;
  add paid-TTL, evidence-cleanup, capacity-recovery, and in-flight regressions.
- [x] Update the production-boundary and OpenSpec retention documentation to
  describe the permanent key-release quarantine and bounded paid evidence.
- [x] Re-run focused/full Vitest, dashboard typecheck, lifecycle/control and
  contamination guards, strict OpenSpec validation, diff hygiene, and hosted PR
  checks after the focused commit is pushed.
