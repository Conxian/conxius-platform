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
