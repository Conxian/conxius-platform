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
