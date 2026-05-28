# Proposal: Issue #722 Conxius Orbit control alignment

## Problem
`conxius-platform` policy docs describe control-plane ownership, but they do not explicitly bind chain-specific deployment/operator repositories (including Conxius Orbit) to the same parent control, lifecycle, and release controls.

## Decision
- Add explicit policy statements that chain-specific deployment/operator repos are subordinate to `conxius-platform` governance and production-boundary controls.
- Clarify Conxius Orbit operator setup, deployment safety, release discipline, trust assumptions, and scope boundaries as documentation-level controls.
- Replace deprecated `StacksOrbit` naming in active guidance with `Conxius Orbit` (legacy alias only on first mention where needed for traceability).

## Acceptance criteria
1. `docs/REPOSITORY_TAXONOMY.md`, `GOVERNANCE.md`, `docs/PRODUCTION_BOUNDARY.md`, and `RELEASING.md` each contain additive control statements that bind Conxius Orbit/chain-specific operator repos to parent controls.
2. `ALIGNMENT.md` and `docs/architecture/SOVEREIGN_REPR_2026.md` use `Conxius Orbit` naming for active guidance.
3. OpenSpec task checklist maps each #722 requirement theme to concrete evidence links in this repository.

## Non-goals
- No runtime/code-path changes.
- No ownership transfer across repositories.
- No release pipeline behavior changes beyond documented policy requirements.
