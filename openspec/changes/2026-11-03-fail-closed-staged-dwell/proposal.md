# Fail-closed staged dwell evidence

## Problem

The current staged-to-main automation accepts repository variable values below
the documented 12-hour minimum, including zero, and measures the age of any
source commit. That lets configuration bypass the release soak and does not
prove when the exact candidate entered `staged`.

## Change

- Reject missing, non-integer, negative, zero, and below-12 dwell values.
- Require the exact `staged` head to be a two-parent merge commit.
- Use that immutable staged-entry merge commit's timestamp for the dwell
  boundary.
- Keep an ineligible candidate in the existing hourly recheck path.
- Fail the workflow when staged-entry evidence cannot be established.
- Add focused tests for invalid configuration, missing merge evidence, the
  boundary, pre-boundary state, and future timestamps.

## Compatibility and controls

The branch route, draft promotion PR behavior, manual review, evidence pack,
concurrency, permissions, protected workflows, and promotion order remain
unchanged. This change strengthens the existing control and creates no runtime,
custody, signing, settlement, or deployment authority.

## Acceptance

- A value below 12 hours cannot open a staged-to-main candidate.
- A single-parent staged head cannot open a staged-to-main candidate.
- An exact staged-entry merge is ineligible one second before the boundary and
  eligible at the boundary.
- The repository's existing CI and independent review gates pass for the exact
  final head.
