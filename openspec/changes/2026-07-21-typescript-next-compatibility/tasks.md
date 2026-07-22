# Tasks: Restore Next.js Build Compatibility with TypeScript 6

## Implementation checklist

- [x] Confirm the current PR head and validate the repaired admin-dashboard build path; the original TypeScript 7 Docker failure is documented in the proposal and task context.
- [x] Restore TypeScript `^6.0.3` in every workspace manifest changed by PR #1171.
- [x] Retain Vite `8.1.5` and `@types/node` `^26.1.1`.
- [x] Regenerate `pnpm-lock.yaml` with pnpm `9.15.5` and remove direct TypeScript 7 resolution.
- [x] Run frozen install, repository typecheck, repository tests, local Next build equivalents, version checks, and `git diff --check`; Docker checks are recorded as environment-blocked below.
- [ ] Review scope, append the required AGENTS.md session log entry, commit with DCO signoff, and push to the existing PR head branch.

## Acceptance criteria

- [x] All direct workspace TypeScript specifiers are `^6.0.3` and resolve to `6.0.3`.
- [x] Vite resolves to `8.1.5` and `@types/node` resolves to `26.1.1`.
- [x] `pnpm install --frozen-lockfile`, repository typecheck, and repository tests pass.
- [ ] `docker build -f services/admin-dashboard/Dockerfile services/admin-dashboard -t admin-dashboard-ci` passes. **Blocked:** Docker is not installed in the execution environment.
- [ ] `docker compose build admin-dashboard` passes when Docker/Compose is available. **Blocked:** Docker and `docker-compose` are not installed in the execution environment.
- [x] No workflow, Dockerfile, Next.js, application-source, or unrelated dependency changes are introduced.

## Environment limitation

The repaired Next.js path passes with `pnpm --dir services/admin-dashboard build` and the workspace `pnpm run build`. The exact Docker and Compose commands could not run because neither Docker nor `docker-compose` is available in the execution environment.
