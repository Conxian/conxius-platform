# Design: CI Dependency and Knowledge-Base Reliability

## 1. Design intent

The repair should make the repository's dependency graph and validation paths converge on one source of truth:

```text
workspace manifests + root overrides + pnpm-lock.yaml
                         │
                         ├── local pnpm commands
                         ├── GitHub Actions installs
                         ├── dashboard Docker build
                         └── Docker Compose / environment validation
```

The design is intentionally conservative. It stabilizes the current dashboard toolchain before considering a TypeScript major upgrade and treats a green service-local install as insufficient evidence for repository readiness.

## 2. Dependency and lockfile model

### 2.1 One intentional dashboard graph

The current evidence shows a split graph:

| Input | Observed state at PR #1170 head |
| --- | --- |
| Dashboard direct dependency | Next.js `16.2.10`, TypeScript `^7.0.2`, `@types/node` `^26.1.1` |
| Root lock/override evidence | Next.js `15.5.18`, TypeScript `6.0.3`, `@types/node` `26.1.0` |
| CI behavior | Frozen install rejects the stale root lockfile |
| Docker behavior | Service-local unlocked install resolves the dashboard manifest independently |

The implementation MUST choose and document one compatible Next.js/TypeScript pair. It MUST either align the dashboard direct specifier with the root override or intentionally remove/change the override and regenerate the lockfile. Leaving contradictory declarations in place is not an accepted compatibility strategy.

### 2.2 TypeScript 7 deferral

TypeScript 7 is a deferred option, not the default repair. The default implementation path is to use the last TypeScript line demonstrated by the repository's Next.js and test toolchain. TypeScript 7 can be enabled only when the compatibility matrix covers:

1. `pnpm --filter admin-dashboard typecheck`.
2. `pnpm --filter admin-dashboard build`.
3. Dashboard Vitest tests.
4. The canonical Docker build.
5. The supported Node.js version in CI and local validation.

The matrix must include the resolved Next.js version, TypeScript version, pnpm version, Node.js version, and pass/fail result. A package-manager resolution success alone is not evidence of compatibility.

### 2.3 Lockfile lifecycle

- Every dashboard manifest update is accompanied by a root lockfile update.
- CI, KB Evolution, Docker, and Compose validation use `pnpm install --frozen-lockfile` or an equivalent frozen workspace operation.
- No CI or Docker path may use `pnpm install --no-frozen-lockfile`.
- A clean validation run must leave `pnpm-lock.yaml` and the package manifests unchanged.
- Dependabot updates are accepted only when the dependency manifest and root lockfile form one reviewable change.

## 3. Dashboard Docker topology

### 3.1 Root build context

The dashboard is a workspace package, not an isolated npm project. The canonical build contract is:

```text
repository root (Docker build context)
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── services/*/package.json
└── services/admin-dashboard/...
```

`docker-compose.yml` MUST point the `admin-dashboard` build to the repository root context and the dashboard Dockerfile. Direct validation MUST use the same root context.

### 3.2 Dockerfile stages

The implementation should retain the existing multi-stage image shape while changing dependency inputs:

1. Enable the repository's pinned pnpm version through Corepack.
2. Copy the root package manager files and the workspace package manifests needed for dependency resolution before copying source files.
3. Run a frozen, workspace-filtered install for `admin-dashboard` and its required dependency graph.
4. Copy source files after the dependency layer is established.
5. Run the dashboard build through the workspace filter.
6. Copy only the required standalone/static output into the runtime stage.

The image build must not resolve from a service-local `package.json` alone. The root lockfile and root override policy must be observable inputs to the build cache key.

### 3.3 Compose and hosted workflow parity

The following paths must exercise the same contract:

- `docker build -f services/admin-dashboard/Dockerfile .`
- `docker compose build admin-dashboard`
- the synergy workflow's isolated dashboard build and service start
- the multi-environment workflow's server and cloud dashboard validation

The cloud workflow's Docker command must be updated alongside Compose so it does not retain a stale service-local context.

## 4. KB Evolution execution model

### 4.1 Root script registry

`package.json` must contain one `scripts` object. The merged object preserves:

- `lint`, `test`, `build`, and `typecheck`;
- lifecycle and cross-repo control-gate commands;
- `prepublishOnly`; and
- `kb:ingest`, `kb:patterns`, `kb:research`, `kb:update`, and `kb:status`.

The implementation should add a small parsed-script assertion or equivalent validation so a future duplicate-key regression is caught before CI.

### 4.2 Declared runner

The KB scripts currently depend on `npx ts-node` even though the root manifest does not declare `ts-node` or a root TypeScript execution contract. This causes a dynamic install and a runner/configuration failure under the hosted Node.js environment.

The preferred design is to declare and lock `tsx` as the root KB runner, then route all five root commands and all KB workflow steps through `pnpm exec tsx` or the corresponding root `pnpm kb:*` scripts. An equivalent explicitly declared runner is acceptable only if it supports the repository's module syntax and has a reproducible lockfile-backed invocation.

The runner must:

- execute the existing `scripts/kb/*.ts` modules with their relative imports;
- avoid reading the dashboard `tsconfig.json` or treating the root application `tsconfig.json` as the KB project contract;
- avoid downloading tools through `npx` at runtime; and
- work on the supported Node.js version used by the KB workflow.

If static typechecking is added for the KB scripts, it should use a dedicated KB tsconfig that includes `scripts/kb/**/*.ts`; it must not broaden the dashboard tsconfig or change service build ownership.

### 4.3 Workflow execution

The KB workflow should follow this order in each job that executes TypeScript:

1. Checkout the repository.
2. Set up the pinned pnpm and supported Node.js versions.
3. Run `pnpm install --frozen-lockfile --ignore-scripts`.
4. Invoke the root `pnpm kb:*` command, not `npx ts-node`.
5. Upload or consume `.knowledge-store.json` and other generated artifacts as currently defined.

Network-dependent GitHub and Tavily calls remain explicit runtime inputs. Tests may use controlled fixtures or safe no-network modes, but missing credentials must not cause the runner itself to fail during configuration.

## 5. Validation matrix

| Layer | Required validation | Evidence |
| --- | --- | --- |
| Package graph | `pnpm install --frozen-lockfile`; clean lockfile diff | Exit code and clean `git diff` |
| Root quality | `pnpm lint`, `pnpm typecheck`, `pnpm test` where scripts exist | Command logs and versions |
| Dashboard | Filtered typecheck, test, and build | No dynamic TypeScript install or config rewrite |
| Direct image | `docker build -f services/admin-dashboard/Dockerfile .` | Root context and frozen install visible in logs |
| Compose | `docker compose config`, `docker compose build admin-dashboard`, start/health path | Same image contract as direct build |
| KB | `pnpm kb:status`, `pnpm kb:patterns`, `pnpm kb:update`, plus credentialed/fixture-backed ingest and research | Declared runner, expected artifacts, no `npx` download |
| Hosted CI | PR checks and KB workflow runs on the implementation head | URLs, check names, conclusions, head SHA |

Validation must be run from the repository root unless a command is explicitly a filtered workspace command. Logs must redact tokens, API keys, and generated secrets.

## 6. Failure ownership and escalation

### 6.1 Code-fixable failures

The implementation owns failures whose logs identify repository-controlled inputs, including:

- stale lockfile/specifier mismatches;
- incompatible dashboard dependency selection;
- Docker context, Dockerfile, Compose, or workspace-install errors;
- duplicate root script keys or missing root commands;
- KB runner/configuration errors;
- repository workflow YAML that invokes the wrong command or install mode.

### 6.2 Provider-owned failures

Provider-owned failures include a third-party service queue, outage, permission denial, or unavailable provider result without a repository-controlled error. The implementation must record the provider URL, timestamp, status, and retry outcome, but must not weaken or bypass repository checks to force a green result.

### 6.3 Admin-only concerns

Branch protection, rulesets, required status contexts, merge queues, repository permissions, and organization policy are administrative controls. They are not changed by this artifact or its implementation. If a source fix is green but merging remains blocked by one of these controls, the handoff must name the exact required administrator action and preserve the relevant GitHub evidence.

## 7. Rollout and rollback

1. Land dependency/lockfile alignment before Docker or KB workflow changes so later failures are attributable.
2. Validate the root install and dashboard build locally.
3. Validate direct Docker and Compose paths.
4. Validate KB commands and workflow syntax.
5. Push the implementation to the existing PR branch and inspect fresh checks.
6. If a change regresses the known-good graph, revert the implementation commit rather than reintroducing unlocked installs or weakening checks.

No rollout step includes changing PR metadata, branch protection, or repository settings.
