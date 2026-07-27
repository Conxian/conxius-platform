# Contributing to Conxius Platform

Thanks for contributing to `conxius-platform`.

## Scope

This repository contains platform and environment tooling for the Conxian ecosystem. Keep contributions focused on infrastructure, orchestration, and developer tooling.

This repository is organized as a pnpm monorepo containing multiple platform services under `services/`.

For service-specific conventions, see:

- `services/admin-dashboard/CONTRIBUTING.md`
- `services/admin-pulse-bos/CONTRIBUTING.md`
- `services/elizaos-plugin-conxian/CONTRIBUTING.md`

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

Use development credentials only. Never commit real secrets. Follow strict environment hygiene: do not commit `.env` files, `.DS_Store`, or generated artifacts. Use provided templates like `.env.example` or service-specific templates (e.g., `services/admin-dashboard/.env.admin.example`) for local configuration.

Follow [`docs/LOCAL_DEVELOPMENT.md`](./docs/LOCAL_DEVELOPMENT.md) for the
direct-versus-Compose ports, placeholder/stub boundaries, and the exact limits
of `make auth`.

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
pnpm run docs:check
```

You can run targeted checks for a specific package with
`pnpm --filter <package> run <script>`. For example, the Phase 7 dashboard
selection is `pnpm --filter admin-dashboard run test:phase7`.

## Security and policy

- Follow `SECURITY.md` for vulnerability reporting.
- Keep environment templates in `.env.example` and schema files; do not commit secrets.
- **Environment Isolation**: Service-specific secrets (e.g., for the Admin Dashboard) must be kept in their respective service directories using the `.env.admin` pattern, which is globally ignored.
- Respect repository ownership and review expectations in `CODEOWNERS`.
