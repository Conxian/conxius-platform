# CI Workflow Remediation

## Why

Recent GitHub workflow failures need to be separated into genuine repository defects versus duplicate reports of the same dependency drift or failures belonging to other branches. The repository should keep one authoritative dependency policy and avoid adding overlapping CI jobs.

## What changes

- Reconcile the existing Next.js dependency policy and lockfile without weakening the consistency gate.
- Review existing workflows and reusable workflow calls for duplicate coverage, permissions, and actionable defects.
- Correct only verified workflow or configuration defects, preserving security and deployment gates.
- Validate the same local checks used by CI and document external failures that cannot be reproduced locally.

## Scope boundaries

- No new equivalent workflow will be added.
- No remote workflow run will be retried, canceled, pushed, or modified by this change.
- No secrets or credentials will be added to source control.

## Acceptance criteria

- Dependency consistency passes from a single source of truth.
- Existing workflow coverage remains non-duplicated and security gates are not weakened.
- Local CI-equivalent checks pass, or remaining failures are clearly attributable to GitHub-hosted permissions, secrets, or external repositories.
- Changes are limited to files required by the verified failures.
