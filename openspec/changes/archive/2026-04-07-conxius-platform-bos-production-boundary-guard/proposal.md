# Proposal: Enforce BOS production boundary in conxius-platform

## Problem
`conxius-platform` contains operator/admin surfaces that can ship and influence production behavior (for example, `services/admin-dashboard` and secrets tooling). Without an explicit, enforced production boundary, it’s easy for dev-only defaults (localhost fallbacks, simulated “Operational” UI) to leak into production-deployable paths.

## Decision

- Document the repo’s BOS owner surface + production boundary in `docs/PRODUCTION_BOUNDARY.md`.
- Add CI-enforced guards:
  - `scripts/verify_bos_production_boundary.py` (boundary + stub file constraints)
  - `scripts/verify_contamination_guard.py` (forbidden patterns in production boundary)
- Update `services/admin-dashboard` to be fail-closed when the Core API URL is not configured (no localhost fallbacks, no simulated-success service health).

## Non-goals

- Scanning or enforcing constraints inside pinned submodules (`services/conxian-ui`, `services/lib-conxian-core`). Those repos should enforce their own production boundaries (or be covered by a portfolio gate).
- Implementing production BOS runtime logic (Nexus/Gateway ownership).
