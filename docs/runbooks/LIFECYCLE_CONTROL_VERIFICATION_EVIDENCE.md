# Lifecycle/control gate verification evidence path (CON-698)

Refs: #721, CON-698

## Purpose

Define where lifecycle/control verification artifacts live, how to refresh them, and what evidence links must be included in PR/issue records.

## Evidence artifact locations

- **Local/CI workspace path:** `test-results/lifecycle-control-gates/`
  - `lifecycle-control-gates.log` (full command output)
  - `summary.md` (check status summary)
- **CI artifact name:** `lifecycle-control-gates` (uploaded by `.github/workflows/lifecycle-control-gates.yml`)

## Refresh procedure

Run from repository root:

```bash
pnpm run check:lifecycle-control
```

This command executes `scripts/ci/run-lifecycle-control-gates.sh`, which runs:

1. `python3 scripts/verify_lifecycle_control_gates.py`
2. `python3 scripts/verify_bos_production_boundary.py`
3. `python3 scripts/verify_submodule_integrity.py`
4. `python3 scripts/verify_contamination_guard.py`

## What to link in PRs/issues

For lifecycle/control implementation or release-readiness work, include:

1. Workflow run URL for `Lifecycle Control Gates` (or local command output excerpt when CI is unavailable).
2. Link/reference to `test-results/lifecycle-control-gates/summary.md` content (status + timestamp).
3. Paths to updated readiness artifacts:
   - `docs/architecture/CON-698_LIFECYCLE_CONTROL_DESIGN_IMPACT_REVIEW.md`
   - `docs/runbooks/LIFECYCLE_CONTROL_GATE_OPERATIONS.md`
   - `docs/runbooks/RELEASE_CHECKLIST_TEMPLATE.md`
4. Exact commit SHA used for verification.

## Validation notes

- Gate evidence is **required** for lifecycle/control changes and recommended for release PRs.
- If a gate fails, do not bypass silently; record the failure cause and remediation reference before retrying.

## Current local validation snapshot (CON-698 implementation)

Validation run timestamp (UTC): `2026-05-28T05:07:02Z`

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm run check:lifecycle-control` | PASS | Generated `test-results/lifecycle-control-gates/summary.md` and `lifecycle-control-gates.log`; all 4 gate checks passed. |
| `pnpm run lint` | PASS | Workspace lint command completed without reported lint violations. |
| `pnpm run typecheck` | FAIL | Pre-existing TypeScript environment/type-definition issues in `services/elizaos-plugin-conxian` (missing `process`/`fetch`/DOM globals); unrelated to lifecycle/control doc+CI gate changes. |
