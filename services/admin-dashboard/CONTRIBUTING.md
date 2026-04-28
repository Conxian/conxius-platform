# Contributing to Conxian

Welcome! We appreciate your interest in contributing to the Conxian monorepo.

## Monorepo Overview

This repository is organized as a monorepo containing multiple services:

- `services/conxian-ui`: The primary web application (Next.js).
- `services/lib-conxian-core`: Core business logic and the Gateway Engine (Rust).
- `services/admin-dashboard`: Administrative monitoring and management tool (Next.js).
- `services/admin-pulse-bos`: Administrative components for fiscal orchestration (SFO).
- `services/elizaos-plugin-conxian`: ElizaOS plugin for Conxian Gateway and social interfaces.

## Development Guidelines

- **OpenSpec First**: Before making significant architectural changes, propose them in the `openspec/` directory. All changes must be preceded by an OpenSpec proposal or follow existing change artifacts in `openspec/changes/`.
- **Earthy Corporate Finance Theme**: Adhere to the defined color palette (Forest Green #2E403B, Gold #D4A017) and institutional design patterns.
- **Type Safety**: No `any` types. Use explicit TypeScript interfaces for all frontend data.
- **Testing**: Run relevant tests before submitting a PR.
- **Security**: Never commit real secrets or credentials. Use `.env.example` for configuration templates.

## Node/TypeScript services

The Node/TypeScript services under `services/` (as configured in `pnpm-workspace.yaml`) are managed as a `pnpm` workspace with a single root `pnpm-lock.yaml`.

Note: `services/conxian-ui` and `services/lib-conxian-core` are git submodules. `conxian-ui` is currently excluded from the root `pnpm` workspace to avoid lockfile churn when it’s initialized locally.

### Prerequisites

- Node.js >= 20.19.0 (see `package.json#engines`)
- pnpm (managed via Corepack; version pinned in `package.json#packageManager`)

```bash
corepack enable

pnpm install

pnpm --filter ./services/admin-dashboard test
pnpm --filter ./services/elizaos-plugin-conxian test
```

## Pull Request Process

1. Create a descriptive branch for your changes.
2. Ensure all tests pass.
3. Update relevant documentation (README, specifications, etc.).
4. Submit your PR for review.
5. Once approved, changes will be merged into the main branch.

## Contact

For any questions or feedback, please reach out via GitHub Issues or contact the team at dev@conxian.com.
