# Restore Next.js Build Compatibility with TypeScript 6

## Goal

Repair the dependency regression in PR #1171 so the admin-dashboard Docker build and its dependent CI checks complete successfully without reverting the compatible Vite or Node.js type updates.

## Problem

PR #1171 upgrades the workspace TypeScript development dependency from `6.0.3` to `7.0.2`. The failing admin-dashboard Docker build reaches Next.js's TypeScript compiler discovery path, which expects the legacy programmatic compiler API exposed by TypeScript 6.0.3. TypeScript 7.0.2 no longer exposes that API in the expected shape, producing `The "id" argument must be of type string. Received undefined` during `pnpm build`.

This is a build-time Next.js/TypeScript compatibility regression, not an application type error: workspace typecheck and tests remain independently valid under TypeScript 7.

## Decision

- Restore the direct workspace TypeScript ranges changed by PR #1171 to `^6.0.3`.
- Regenerate `pnpm-lock.yaml` with the repository-pinned pnpm `9.15.5` so direct TypeScript resolution is `6.0.3` and no direct TypeScript 7 resolution remains.
- Retain Vite `8.1.5` and `@types/node` `26.1.1` from PR #1171; neither is implicated in the reproduced failure.

## Scope

- Update only the affected workspace dependency manifests and lockfile.
- Add verification evidence through the repository's existing typecheck, test, Docker, Compose, and diff checks.
- Do not change workflows, Dockerfiles, Next.js configuration, application source, or unrelated dependencies.

## Out of scope

- Supporting TypeScript 7 in the current Next.js build path.
- Changing application behavior or introducing a compatibility shim.
- Updating canonical OpenSpec specifications; this is a dependency compatibility repair only.

## Risks

- TypeScript 7 support remains deferred until the Next.js compiler discovery path is compatible with its API surface.
- Future grouped dependency updates should validate the admin-dashboard Docker build before accepting a TypeScript major upgrade.
