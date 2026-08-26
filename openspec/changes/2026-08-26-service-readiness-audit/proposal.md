# Proposal: Service readiness and orchestration audit

## Why
The repository-wide audit found that code-level service tests, typechecks, and builds pass, but the service boundary still has readiness gaps: one package reports a successful no-op lint, Next.js emits an avoidable module-mode warning, and the default nginx-backed external service placeholders probe the wrong container port. Compose also requires a local Prometheus scrape secret that is intentionally absent from a fresh checkout.

## Scope
- Make package validation truthful without adding duplicate CI coverage.
- Remove the Next.js module-mode warning using the existing ESM configuration.
- Correct health probes for the existing nginx placeholder services.
- Preserve secret hygiene while making the required local secret setup explicit in the existing environment documentation.
- Do not replace external dependency placeholders with protocol implementations or introduce new services.

## Acceptance criteria
- All existing workspace tests, typechecks, builds, and dependency checks pass.
- No package advertises a successful no-op lint command.
- Compose health probes target the ports actually served by the default nginx images.
- No secrets are committed; fresh local setup clearly documents the Prometheus secret requirement.
- No duplicate workflows, jobs, or service implementations are added.

## Verification
- `pnpm install --frozen-lockfile`
- `pnpm run check:dependency-consistency`
- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `docker compose config --quiet` and service startup when Docker is available.
