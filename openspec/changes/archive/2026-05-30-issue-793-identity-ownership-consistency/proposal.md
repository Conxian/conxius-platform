# Proposal: Issue #793 identity and ownership consistency remediation

## Problem
- Root package identity drifts from repository identity (`conxian-platform` vs `conxius-platform`).
- Ownership docs mix repository review/merge authority with lifecycle gate operations, creating ambiguity.
- A directly relevant stale naming token (`Conxian_UI`) remains in alignment guidance.

## Decision
- Align repository package identity by renaming the root package to `conxius-platform`.
- Clarify governance/ownership docs so root `CODEOWNERS` is explicit as review/merge authority.
- Keep lifecycle/control gate owner language where needed, but mark it as an operational role (not code ownership authority).
- Normalize low-risk naming drift directly related to this consistency pass.

## Non-goals
- Changes to actual `CODEOWNERS` assignments.
- Expanding scope into cross-repository ownership remapping beyond consistency clarifications in this repo.
- Runtime, API, or production-behavior changes.
