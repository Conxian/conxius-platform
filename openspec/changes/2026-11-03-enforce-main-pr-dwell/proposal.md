# Enforce staged dwell in the required main-PR check

## Problem

The automatic promotion generator validates staged dwell before creating a
main candidate, but the required Branch Promotion Policy check validates only
route and body metadata. A manually created exact-source candidate can therefore
pass the required check and merge before the staged dwell completes.

This occurred on 2026-11-03: the exact staged source entered `staged` at
07:02:10Z and was merged to `main` at 07:14:22Z, before the 12-hour boundary and
without an independent submitted review. The merge retained the intended tree
and parents, but it did not satisfy the release process.

## Change

- Make the trusted `pull_request_target` policy fetch only the exact candidate
  commit metadata for PRs targeting `main`.
- Run the existing fail-closed staged-dwell validator in the required policy
  job, independently of candidate generation.
- Require an exact two-parent staged-entry merge and reject octopus merges.
- Add regression coverage for the workflow integration and parent cardinality.

## Security and compatibility

The workflow continues to execute trusted default-branch code only. It never
checks out or executes PR-head content, retains read-only permissions, preserves
the existing route/evidence matrix, and does not change deployment, custody,
signing, settlement, or runtime behavior.

## Acceptance

- A staged-to-main PR before the 12-hour boundary fails the required Branch
  Promotion Policy check even if it was created manually.
- The exact candidate becomes dwell-eligible only at the boundary.
- Missing, shallow, single-parent, future-dated, or octopus commit evidence
  fails closed.
- Existing ordinary, staged, reconciliation, and evidence-pack rules remain
  enforced.
