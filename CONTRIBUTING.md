# Contributing to Conxius Platform

Thanks for contributing to `conxius-platform`.

## Scope

This repository contains platform and environment tooling for the Conxian ecosystem. Keep contributions focused on infrastructure, orchestration, and developer tooling.

For service-specific conventions, see:

- `services/admin-dashboard/CONTRIBUTING.md`

## Issue routing

Use this repository's issues for platform/orchestration work only (CI/workflows, environment scaffolding, integration harnesses, and operator tooling). This is the **live issue-execution lane** as defined in [`GOVERNANCE.md`](./GOVERNANCE.md#2-live-issue-execution-lane-what-we-are-doing-right-now).

For portfolio strategy, legal/finance operations, or non-platform product planning, route work to the owning repository in `docs/REPOSITORY_TAXONOMY.md` or the Conxian Linear `CON` workspace.

Historical sweep reports, closed-phase review findings, and archived task summaries are preserved in the **historical context lane** (`docs/archived-reports/`, `docs/archived-tasks/`, `docs/archived-scripts/`). Do not create live issues to re-litigate closed historical findings unless a new governance baseline change is proposed via OpenSpec.

## Getting started

Prerequisites:

- Node.js `>=20.19.0`
- `pnpm` (via Corepack)

```bash
corepack enable
pnpm install
make init
```

Use development credentials only. Never commit real secrets.

## Change workflow

1. Create a branch from `main` with a descriptive name.
2. Keep changes scoped and include documentation updates when behavior changes.
3. For significant architecture/process changes, add an OpenSpec proposal under `openspec/changes/`.

## Validation

Run the checks relevant to your changes before opening a PR:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

You can run targeted checks for a specific package with `pnpm --filter <package> <script>`.

## Security and policy

- Follow `SECURITY.md` for vulnerability reporting.
- Keep environment templates in `.env.example` and schema files; do not commit secrets.
- Respect repository ownership and review expectations in `CODEOWNERS`.
