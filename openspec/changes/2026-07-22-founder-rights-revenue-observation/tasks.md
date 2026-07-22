# Tasks: Founder-Rights Revenue Observation and Evidence Contract

## Contract and implementation

- [x] Create the current `spec-driven` OpenSpec metadata and change-local
  capability delta.
- [x] Add the canonical protocol revenue observation specification.
- [x] Add the versioned JSON Schema with provenance, authority, units, stages,
  routing, anchor, payout, and custody fields.
- [x] Add a pure strict TypeScript validator with semantic fail-closed gates.
- [x] Add valid observed-only and fully evidenced fixture coverage.
- [x] Add rejection tests for ambiguous units, unratified status, incomplete
  deployment evidence, stale evidence, collector substitution, unresolved
  schedules, premature payout, invalid denominator, and custody claims.

## Research and operational alignment

- [x] Add the dated active research/evidence report with exact local and
  cross-repository paths, canonical URLs, contradictions, arithmetic, owners,
  phase plan, and legal/governance unknowns.
- [x] Add next available founder-rights, economic-drift, deployment-evidence,
  and adapter gaps to `docs/GAPS.md`.
- [x] Add the same gaps to `docs/SCORING_MATRIX.md` using its existing scoring
  method without rewriting historical entries.
- [x] Append a concise 2026-07-22 session log entry to `AGENTS.md`.

## Validation and delivery

- [x] Run focused schema, test, and typecheck commands: the Draft 2020-12
  schema compiled with strict Ajv, representative snapshots passed, and the
  focused suite passed 15 tests with strict TypeScript typecheck.
- [x] Run available repository-wide validation and record baseline failures
  without hiding them: `pnpm test`, `pnpm run typecheck`, `pnpm run lint`,
  `pnpm build`, dependency consistency, lifecycle/control gates, and the
  maintenance audit passed. Targeted strict OpenSpec validation passed. The
  repository-wide OpenSpec scan remains baseline-failing for 22 older active
  changes that do not have current change-local deltas; this change is one of
  the three passing changes.
- [ ] Commit with a conventional message, push the focused branch, and open a
  PR against `main` with `Refs #1168` and `Refs #1167`.

## Explicitly out of scope

- Clarity changes or protocol deployment.
- Fee percentages, allocation shares, beneficiaries, custody, or payout-route
  approval.
- Legal conclusions or a replacement for protocol issues #538 and #488.
