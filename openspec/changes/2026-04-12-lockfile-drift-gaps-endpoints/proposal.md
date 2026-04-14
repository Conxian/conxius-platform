# Proposal: Correct `GAPS.md` endpoint references and eliminate `pnpm-lock.yaml` drift from excluded submodules

## Problem
This repo treats `services/conxian-ui` as a git submodule and explicitly excludes it from the root pnpm workspace (`pnpm-workspace.yaml`). Despite that, `pnpm-lock.yaml` currently records `services/conxian-ui` as an importer.

Impact:

- Lockfile includes dependencies for an excluded (and often uninitialized) submodule, making installs non-deterministic across environments.
- It introduces version fragmentation (e.g. multiple `next`/`react` lines) that appears like a monorepo policy issue, but is actually lockfile drift.

Separately, `GAPS.md` references endpoints that don’t match the intended Gateway surface (UBI is address-scoped; the Kwil migration claim should point at Nexus state/sync APIs rather than adapter info).

## Decision

- Update `GAPS.md` to reference the address-scoped UBI route and the Nexus state/sync endpoints.
- Regenerate `pnpm-lock.yaml` from the root workspace so it matches `pnpm-workspace.yaml` (i.e. no `services/conxian-ui` importer).

## Non-goals

- Changing the pinned `services/conxian-ui` submodule SHA.
- Managing `services/conxian-ui` dependencies from this repo (those belong in the submodule’s own repository).

## Implementation

- `GAPS.md` endpoint corrections: implemented via PRs #478 and #479 (commits `2dc6fb4`, `124a7e4`).
- `pnpm-lock.yaml` drift cleanup (remove `services/conxian-ui` importer): implemented via PR #480 (commit `fc94804`).
- This proposal document was added later in PR #481 (commit `f05ab6c`) to preserve an auditable decision record.
