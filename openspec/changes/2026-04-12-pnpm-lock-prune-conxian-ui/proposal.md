# Proposal: Prune `services/conxian-ui` from the root `pnpm-lock.yaml`

## Problem
`services/conxian-ui` is a git submodule and is explicitly excluded from the pnpm workspace via `pnpm-workspace.yaml`.

The current root `pnpm-lock.yaml` includes an `importers.services/conxian-ui` block anyway. This creates lockfile churn and can accidentally record test tooling (e.g. `@playwright/test`) as production dependencies in the workspace lock.

## Decision
- Regenerate the root lockfile from the workspace root so it only reflects packages included by `pnpm-workspace.yaml`.
- Ensure `services/conxian-ui` is not present under `importers:` in the root `pnpm-lock.yaml`.

## Non-goals
- Changing `services/conxian-ui` dependencies (that belongs in the submodule repository).
- Aligning/normalizing `next`, `react`, `tailwindcss`, etc. versions across packages.
- Modifying pnpm workspace governance (the existing `!services/conxian-ui` exclusion remains the intended behavior).
