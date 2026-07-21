# Tasks: CI Dependency and Knowledge-Base Reliability

## Artifact baseline

- [x] Create `proposal.md`, `design.md`, and `tasks.md` in the dated OpenSpec change directory.
- [x] Record PR #1170, the reviewed head SHA, and the observed CI/KB evidence.
- [x] Define the TypeScript 7 deferral and the source/provider/admin failure boundary.

## Implementation tasks

- [ ] **T1 — Establish the dependency baseline.** Compare the dashboard manifest, root overrides, and `pnpm-lock.yaml`; choose one intentional Next.js/TypeScript graph. Keep TypeScript 7 deferred unless the compatibility evidence in AC-2 is complete.
- [ ] **T2 — Synchronize the workspace lockfile.** Update the root lockfile with the selected manifest state and ensure all CI install paths use frozen resolution.
- [ ] **T3 — Repair the dashboard container contract.** Make Compose and direct Docker builds use the repository root context, root workspace manifests, the root lockfile, and a workspace-filtered frozen install.
- [ ] **T4 — Repair the root script registry.** Merge the duplicate `scripts` objects and preserve every pre-existing root command plus the five documented `kb:*` commands.
- [ ] **T5 — Repair the KB TypeScript runner.** Declare and lock the runner, replace dynamic `npx ts-node` execution with the root-managed runner, and align the KB workflow install/command steps with the workspace contract.
- [ ] **T6 — Add or update validation.** Cover root package checks, dashboard build, direct Docker build, Compose config/build/start paths, KB commands, and workflow check inspection without changing PR metadata.
- [ ] **T7 — Classify remaining failures.** Record repository-code failures with the source fix; record provider-owned queued/outage failures with their external evidence; route branch-protection/ruleset/required-check changes to repository administrators.

## Acceptance criteria

- [ ] **AC-1 — Dependency intent is explicit.** The dashboard manifest, root override policy, and lockfile resolve one intentional Next.js graph. The implementation documents the selected TypeScript version and states that TypeScript 7 is deferred unless AC-2 passes.
  - **Pass when:** no service-local install produces a dependency graph different from the canonical root workspace graph.
  - **Fail when:** the direct Next.js specifier, root override, lockfile, and Docker-installed version disagree without an approved compatibility decision.

- [ ] **AC-2 — TypeScript compatibility gate.** The selected TypeScript version passes all of the following on the supported Node.js version: dashboard `tsc`, dashboard `next build`, dashboard Vitest tests, and the canonical Docker build.
  - **Pass when:** all commands complete without Next.js TypeScript auto-installation or build-worker errors, and the command outputs show the same locked dependency graph.
  - **Fail when:** TypeScript is installed dynamically, Next.js rewrites `tsconfig.json`, or the build reproduces the observed `id`/TypeScript failure.

- [ ] **AC-3 — Frozen root install.** From the repository root, `pnpm install --frozen-lockfile` succeeds on a clean checkout.
  - **Pass when:** the command exits zero and a subsequent `git diff --exit-code -- pnpm-lock.yaml package.json services/admin-dashboard/package.json` is clean.
  - **Fail when:** pnpm reports `ERR_PNPM_OUTDATED_LOCKFILE`, requires `--no-frozen-lockfile`, or mutates the lockfile.

- [ ] **AC-4 — Root quality commands.** `pnpm typecheck` and `pnpm test` pass from the repository root; `pnpm lint` is run when the workspace exposes lint scripts.
  - **Pass when:** each applicable command exits zero using the same frozen install.
  - **Fail when:** a command is skipped because the duplicate `scripts` object hides it or because the workspace is not installed from the root lockfile.

- [ ] **AC-5 — Dashboard build.** `pnpm --filter admin-dashboard build` passes from the root workspace without changing tracked configuration or dependency files.
  - **Pass when:** the build uses the locked workspace graph and does not dynamically install TypeScript or rewrite `tsconfig.json`.
  - **Fail when:** the build only passes after a service-local unlocked install or reproduces the PR's Next.js/TypeScript error.

- [ ] **AC-6 — Docker and Compose parity.** The following paths use the same root-context/frozen-install contract and pass:
  - `docker build -f services/admin-dashboard/Dockerfile .`
  - `docker compose config`
  - `docker compose build admin-dashboard`
  - the relevant dashboard start and health-check path in synergy and multi-environment validation.
  - **Pass when:** all paths resolve the same lockfile-backed dashboard graph and the image reaches a healthy dashboard process.
  - **Fail when:** any path uses `services/admin-dashboard` as an isolated context, uses `--no-frozen-lockfile`, or resolves undeclared service-local versions.

- [ ] **AC-7 — KB command surface.** From a clean root install, `pnpm kb:status`, `pnpm kb:patterns`, `pnpm kb:update`, and the network-dependent `pnpm kb:ingest`/`pnpm kb:research` paths execute through the declared runner. Network-dependent checks may use controlled fixtures or documented credentials in CI.
  - **Pass when:** the commands do not download `ts-node` through `npx`, do not fail in runner configuration parsing, and preserve the expected knowledge-store artifact behavior.
  - **Fail when:** a command is missing from `package.json`, relies on an undeclared runner, or reproduces `Cannot read properties of undefined (reading 'fileExists')`.

- [ ] **AC-8 — Root script integrity.** The parsed root package has exactly one `scripts` object containing all prior root commands and `kb:ingest`, `kb:patterns`, `kb:research`, `kb:update`, and `kb:status`.
  - **Pass when:** `jq`/Node parsing exposes every command and `pnpm run <command> --help` or an equivalent dry-run check resolves the intended script.
  - **Fail when:** duplicate JSON keys, a missing command, or an overwritten control-gate script remains.

- [ ] **AC-9 — GitHub check validation.** After implementation, inspect `gh pr checks 1170` and the relevant workflow runs.
  - **Pass when:** repository-code checks covering `ci / validate`, `synergy-test`, `Server (Full Stack)`, `Cloud (Blueprint validation)`, `Test Summary`, and the KB workflow's executable jobs are green for the implementation head.
  - **Fail when:** a source-backed check remains red, or a check is declared fixed without a successful run on the implementation head.

- [ ] **AC-10 — Ownership separation.** Every non-green or non-terminal check is classified before follow-up.
  - **Repository-code:** repair in this change set when logs point to manifests, lockfiles, Dockerfiles, scripts, or workflow YAML in this repository.
  - **Provider-owned:** record the provider URL, queue/outage/permission evidence, and retry status; do not weaken source checks to mask it.
  - **Admin-only:** branch protection, rulesets, required status contexts, merge queues, and repository settings are handed to an administrator; no PR metadata or repository settings are changed here.

## Validation evidence to retain

- Exact commands, working directory, Node.js and pnpm versions, and exit status for each local criterion.
- Docker image/build output identifying the root context and frozen install path.
- KB command output showing the declared runner and generated artifact behavior, with secrets and tokens redacted.
- GitHub workflow run URLs and the implementation head SHA for every required check.
- A short triage note for provider-owned or admin-only blockers that cannot be repaired in source.

## Open review checklist

- [ ] Maintainers approve the selected Next.js/TypeScript compatibility pair.
- [ ] CI owners confirm the lockfile and frozen-install contract applies to all workspace workflows.
- [ ] Container owners confirm root-context Docker/Compose behavior on local and hosted runners.
- [ ] KB owners confirm runner choice, network-dependent test strategy, and artifact retention behavior.
- [ ] Repository administrators confirm any required-check or branch-protection follow-up separately from this source change.
