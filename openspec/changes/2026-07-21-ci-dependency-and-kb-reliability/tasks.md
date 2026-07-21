# Tasks: CI Dependency and Knowledge-Base Reliability

## Artifact baseline

- [x] Create `proposal.md`, `design.md`, and `tasks.md` in the dated OpenSpec change directory.
- [x] Record PR #1170, the reviewed head SHA, and the observed CI/KB evidence.
- [x] Define the TypeScript 7 deferral and the source/provider/admin failure boundary.

## Implementation tasks

- [x] **T1 — Establish the dependency baseline.** Compare the dashboard manifest, root overrides, and `pnpm-lock.yaml`; choose one intentional Next.js/TypeScript graph. Keep TypeScript 7 deferred unless the compatibility evidence in AC-2 is complete.
  - Evidence: [dependency repair commit `60482a9396709a7d7c57f2a3b89ee82cadbe9bc0`](https://github.com/Conxian/conxius-platform/commit/60482a9396709a7d7c57f2a3b89ee82cadbe9bc0) selects TypeScript `6.0.3` and `@types/node` `26.1.1`, synchronizes the root lockfile, and records the TypeScript 7 deferral.
- [x] **T2 — Synchronize the workspace lockfile.** Update the root lockfile with the selected manifest state and ensure all CI install paths use frozen resolution.
  - Evidence: the dependency repair and KB repair commits use the synchronized root `pnpm-lock.yaml`; frozen root installation passed locally and the KB workflow uses a frozen install.
- [x] **T3 — Repair the dashboard container contract.** Make Compose and direct Docker builds use the repository root context, root workspace manifests, the root lockfile, and a workspace-filtered frozen install.
  - Evidence: [Docker contract commit `145440755f9952a790dfa4396eb55a7351c4d4a1`](https://github.com/Conxian/conxius-platform/commit/145440755f9952a790dfa4396eb55a7351c4d4a1) establishes the root-context/frozen workspace install contract; hosted Synergy, Server, and Cloud validation passed in [run `29827322592`](https://github.com/Conxian/conxius-platform/actions/runs/29827322592) and [run `29827322658`](https://github.com/Conxian/conxius-platform/actions/runs/29827322658).
- [x] **T4 — Repair the root script registry.** Merge the duplicate `scripts` objects and preserve every pre-existing root command plus the five documented `kb:*` commands.
  - Evidence: [KB repair commit `5d422cb02de1685f5eb23a4bdb3e7fb421f2206a`](https://github.com/Conxian/conxius-platform/commit/5d422cb02de1685f5eb23a4bdb3e7fb421f2206a) merges the root scripts and preserves the existing quality/control-gate commands alongside all five `kb:*` commands.
- [x] **T5 — Repair the KB TypeScript runner.** Declare and lock the runner, replace dynamic `npx ts-node` execution with the root-managed runner, and align the KB workflow install/command steps with the workspace contract.
  - Evidence: [KB repair commit `5d422cb02de1685f5eb23a4bdb3e7fb421f2206a`](https://github.com/Conxian/conxius-platform/commit/5d422cb02de1685f5eb23a4bdb3e7fb421f2206a) declares exact `tsx@4.23.1`, uses frozen installation, and invokes the root `pnpm kb:*` scripts; local KB status, patterns, update, missing-key research, and ingest paths passed. The first hosted manual dispatch [run `29829364746`](https://github.com/Conxian/conxius-platform/actions/runs/29829364746) exposed an artifact defect: hidden `.knowledge-store.json` was excluded by `upload-artifact`, so no artifact was produced and Research/Health failed while Ingest's frozen install and `tsx` commands passed. [Fix commit `da186a78c32ca79e2099461401bbf27952d930b0`](https://github.com/Conxian/conxius-platform/commit/da186a78c32ca79e2099461401bbf27952d930b0) adds `include-hidden-files: true` and `if-no-files-found: error` to the existing upload step without changing its action pin, retention, or conditions. The successful manual dispatch [run `29829870126`](https://github.com/Conxian/conxius-platform/actions/runs/29829870126) at that head passed Ingest, Research, and Health; Synthesize was intentionally skipped because it is schedule-only, and the seven-day `knowledge-store` artifact [ID `8494802707`](https://github.com/Conxian/conxius-platform/actions/runs/29829870126/artifacts/8494802707) was produced.
- [x] **T6 — Add or update validation.** Cover root package checks, dashboard build, direct Docker build, Compose config/build/start paths, KB commands, and workflow check inspection without changing PR metadata.
  - Evidence: broad local validation passed for frozen install, root typecheck/test/lint/build, 117 dashboard tests, 7 plugin tests, dashboard production build, lifecycle, Phase 6, Playwright structural, Python smoke/verification, action-version, YAML/Compose, and KB checks. Hosted Synergy, Server, Cloud, and the other required checks passed. Docker-local execution is not claimed because the local Docker daemon was unavailable.
- [x] **T7 — Classify remaining failures.** Record repository-code failures with the source fix; record provider-owned queued/outage failures with their external evidence; route branch-protection/ruleset/required-check changes to repository administrators.
  - Evidence: all 18 GitHub check runs at implementation head `da186a78c32ca79e2099461401bbf27952d930b0` passed; eight external provider suites remain queued with zero check runs and are classified as provider/admin follow-up rather than code failures.

## Acceptance criteria

- [x] **AC-1 — Dependency intent is explicit.** The dashboard manifest, root override policy, and lockfile resolve one intentional Next.js graph. The implementation documents the selected TypeScript version and states that TypeScript 7 is deferred unless AC-2 passes.
  - Evidence: commit `60482a9396709a7d7c57f2a3b89ee82cadbe9bc0` aligns the dashboard with the locked TypeScript `6.0.3` / `@types/node` `26.1.1` graph and keeps TypeScript 7 deferred.
  - **Pass when:** no service-local install produces a dependency graph different from the canonical root workspace graph.
  - **Fail when:** the direct Next.js specifier, root override, lockfile, and Docker-installed version disagree without an approved compatibility decision.

- [x] **AC-2 — TypeScript compatibility gate.** The selected TypeScript version passes all of the following on the supported Node.js version: dashboard `tsc`, dashboard `next build`, dashboard Vitest tests, and the canonical Docker build.
  - Evidence: dashboard typecheck, production build, and 117 dashboard tests passed locally; the hosted root-context Docker contract passed through Synergy, Server, and Cloud validation. No dynamic TypeScript installation or `tsconfig.json` rewrite was observed.
  - **Pass when:** all commands complete without Next.js TypeScript auto-installation or build-worker errors, and the command outputs show the same locked dependency graph.
  - **Fail when:** TypeScript is installed dynamically, Next.js rewrites `tsconfig.json`, or the build reproduces the observed `id`/TypeScript failure.

- [x] **AC-3 — Frozen root install.** From the repository root, `pnpm install --frozen-lockfile` succeeds on a clean checkout.
  - Evidence: frozen root installation passed and the package manifests plus `pnpm-lock.yaml` remained clean.
  - **Pass when:** the command exits zero and a subsequent `git diff --exit-code -- pnpm-lock.yaml package.json services/admin-dashboard/package.json` is clean.
  - **Fail when:** pnpm reports `ERR_PNPM_OUTDATED_LOCKFILE`, requires `--no-frozen-lockfile`, or mutates the lockfile.

- [x] **AC-4 — Root quality commands.** `pnpm typecheck` and `pnpm test` pass from the repository root; `pnpm lint` is run when the workspace exposes lint scripts.
  - Evidence: root typecheck, test, lint, and build passed locally from the repository root.
  - **Pass when:** each applicable command exits zero using the same frozen install.
  - **Fail when:** a command is skipped because the duplicate `scripts` object hides it or because the workspace is not installed from the root lockfile.

- [x] **AC-5 — Dashboard build.** `pnpm --filter admin-dashboard build` passes from the root workspace without changing tracked configuration or dependency files.
  - Evidence: dashboard typecheck and production build passed locally from the root workspace with no tracked dependency/configuration changes.
  - **Pass when:** the build uses the locked workspace graph and does not dynamically install TypeScript or rewrite `tsconfig.json`.
  - **Fail when:** the build only passes after a service-local unlocked install or reproduces the PR's Next.js/TypeScript error.

- [x] **AC-6 — Docker and Compose parity.** The following paths use the same root-context/frozen-install contract and pass:
  - `docker build -f services/admin-dashboard/Dockerfile .`
  - `docker compose config`
  - `docker compose build admin-dashboard`
  - the relevant dashboard start and health-check path in synergy and multi-environment validation.
  - **Pass when:** all paths resolve the same lockfile-backed dashboard graph and the image reaches a healthy dashboard process.
  - **Fail when:** any path uses `services/admin-dashboard` as an isolated context, uses `--no-frozen-lockfile`, or resolves undeclared service-local versions.
  - Evidence: hosted Synergy, Server, and Cloud validation passed for the root-context/frozen-install contract in [run `29827322592`](https://github.com/Conxian/conxius-platform/actions/runs/29827322592) and [run `29827322658`](https://github.com/Conxian/conxius-platform/actions/runs/29827322658). The local Docker daemon was unavailable, so no Docker-local execution is claimed.

- [x] **AC-7 — KB command surface.** From a clean root install, `pnpm kb:status`, `pnpm kb:patterns`, `pnpm kb:update`, and the network-dependent `pnpm kb:ingest`/`pnpm kb:research` paths execute through the declared runner. Network-dependent checks may use controlled fixtures or documented credentials in CI.
  - Evidence: exact `tsx@4.23.1` is declared and local `kb:status`, `kb:patterns`, `kb:update`, missing-key research, and `kb:ingest` paths passed without dynamic `npx ts-node` installation. The first hosted manual dispatch [run `29829364746`](https://github.com/Conxian/conxius-platform/actions/runs/29829364746) identified the hidden-file artifact defect; [fix commit `da186a78c32ca79e2099461401bbf27952d930b0`](https://github.com/Conxian/conxius-platform/commit/da186a78c32ca79e2099461401bbf27952d930b0) enabled hidden-file upload and fail-closed artifact discovery, and the successful manual dispatch [run `29829870126`](https://github.com/Conxian/conxius-platform/actions/runs/29829870126) produced the seven-day `knowledge-store` artifact [ID `8494802707`](https://github.com/Conxian/conxius-platform/actions/runs/29829870126/artifacts/8494802707). Ingest, Research, and Health succeeded; Synthesize was intentionally skipped because it is schedule-only.
  - **Pass when:** the commands do not download `ts-node` through `npx`, do not fail in runner configuration parsing, and preserve the expected knowledge-store artifact behavior.
  - **Fail when:** a command is missing from `package.json`, relies on an undeclared runner, or reproduces `Cannot read properties of undefined (reading 'fileExists')`.

- [x] **AC-8 — Root script integrity.** The parsed root package has exactly one `scripts` object containing all prior root commands and `kb:ingest`, `kb:patterns`, `kb:research`, `kb:update`, and `kb:status`.
  - Evidence: commit `5d422cb02de1685f5eb23a4bdb3e7fb421f2206a` merges the duplicate root script objects; local KB and root validation resolved the complete command surface.
  - **Pass when:** `jq`/Node parsing exposes every command and `pnpm run <command> --help` or an equivalent dry-run check resolves the intended script.
  - **Fail when:** duplicate JSON keys, a missing command, or an overwritten control-gate script remains.

- [x] **AC-9 — GitHub check validation.** After implementation, inspect `gh pr checks 1170` and the relevant workflow runs.
  - Evidence: all 18 check runs at `da186a78c32ca79e2099461401bbf27952d930b0` passed, including CI, Cloud, Server, Test Summary, Synergy, security, hygiene, CodeQL, lifecycle, cross-repo, and action-version checks. See the [current check page](https://github.com/Conxian/conxius-platform/commit/da186a78c32ca79e2099461401bbf27952d930b0/checks). The first hosted manual KB dispatch [run `29829364746`](https://github.com/Conxian/conxius-platform/actions/runs/29829364746) failed because hidden `.knowledge-store.json` was excluded by `upload-artifact`, yielding zero artifact output and failing Research/Health; Ingest's frozen install and `tsx` commands passed. [Fix commit `da186a78c32ca79e2099461401bbf27952d930b0`](https://github.com/Conxian/conxius-platform/commit/da186a78c32ca79e2099461401bbf27952d930b0) adds `include-hidden-files: true` and `if-no-files-found: error` to the existing upload step without changing its action pin, retention, or conditions. The successful manual dispatch [run `29829870126`](https://github.com/Conxian/conxius-platform/actions/runs/29829870126) ran at the repaired implementation head and passed all executable KB jobs: Ingest, Research, and Health. Synthesize was intentionally skipped because it is schedule-only. The seven-day `knowledge-store` artifact [ID `8494802707`](https://github.com/Conxian/conxius-platform/actions/runs/29829870126/artifacts/8494802707) was produced, satisfying the acceptance criterion's manual-dispatch validation requirement.
  - **Pass when:** repository-code checks covering `ci / validate`, `synergy-test`, `Server (Full Stack)`, `Cloud (Blueprint validation)`, `Test Summary`, and the KB workflow's executable jobs are green for the implementation head.
  - **Fail when:** a source-backed check remains red, or a check is declared fixed without a successful run on the implementation head.

- [x] **AC-10 — Ownership separation.** Every non-green or non-terminal check is classified before follow-up.
  - **Repository-code:** repair in this change set when logs point to manifests, lockfiles, Dockerfiles, scripts, or workflow YAML in this repository.
  - **Provider-owned:** record the provider URL, queue/outage/permission evidence, and retry status; do not weaken source checks to mask it.
  - **Admin-only:** branch protection, rulesets, required status contexts, merge queues, and repository settings are handed to an administrator; no PR metadata or repository settings are changed here.
  - Evidence: eight external provider suites remain queued with zero check runs and are recorded as provider/admin follow-up, not repository-code failures; no PR metadata or repository settings were changed.

## Validation evidence to retain

- Exact commands, working directory, Node.js and pnpm versions, and exit status for each local criterion.
- Docker image/build output identifying the root context and frozen install path.
- KB command output showing the declared runner and generated artifact behavior, with secrets and tokens redacted.
- GitHub workflow run URLs and the implementation head SHA for every required check.
- A short triage note for provider-owned or admin-only blockers that cannot be repaired in source.

### Hosted KB artifact validation

- The first hosted manual dispatch [run `29829364746`](https://github.com/Conxian/conxius-platform/actions/runs/29829364746) failed Research/Health because hidden `.knowledge-store.json` was excluded by `upload-artifact`, producing zero artifact output; Ingest's frozen install and `tsx` commands passed.
- [Fix commit `da186a78c32ca79e2099461401bbf27952d930b0`](https://github.com/Conxian/conxius-platform/commit/da186a78c32ca79e2099461401bbf27952d930b0) adds `include-hidden-files: true` and `if-no-files-found: error` to the existing upload step without changing the action pin, retention, or conditions.
- The successful manual dispatch [run `29829870126`](https://github.com/Conxian/conxius-platform/actions/runs/29829870126) ran at head `da186a78c32ca79e2099461401bbf27952d930b0`; Ingest, Research, and Health succeeded, Synthesize was intentionally skipped because it is schedule-only, and the seven-day `knowledge-store` artifact [ID `8494802707`](https://github.com/Conxian/conxius-platform/actions/runs/29829870126/artifacts/8494802707) was produced. No branch, commit, or PR was created by the hosted dispatch.

## Recorded implementation evidence for PR #1170

- Dependency baseline: [commit `60482a9396709a7d7c57f2a3b89ee82cadbe9bc0`](https://github.com/Conxian/conxius-platform/commit/60482a9396709a7d7c57f2a3b89ee82cadbe9bc0) selects TypeScript `6.0.3` and `@types/node` `26.1.1`; the root lockfile, frozen install, dashboard typecheck, and dashboard build were verified.
- Docker contract: [commit `145440755f9952a790dfa4396eb55a7351c4d4a1`](https://github.com/Conxian/conxius-platform/commit/145440755f9952a790dfa4396eb55a7351c4d4a1) uses the repository root context and frozen workspace install; hosted Synergy and Multi-Environment Server/Cloud runs passed in [run `29827322592`](https://github.com/Conxian/conxius-platform/actions/runs/29827322592) and [run `29827322658`](https://github.com/Conxian/conxius-platform/actions/runs/29827322658).
- Dependabot policy: [commit `2515622dcb68723f0d7b4f1317c43529348007e6`](https://github.com/Conxian/conxius-platform/commit/2515622dcb68723f0d7b4f1317c43529348007e6) leaves one root npm updater, routine minor/patch groups, and removes nested/stale entries.
- KB repair: [commit `5d422cb02de1685f5eb23a4bdb3e7fb421f2206a`](https://github.com/Conxian/conxius-platform/commit/5d422cb02de1685f5eb23a4bdb3e7fb421f2206a) merges root scripts, locks exact `tsx@4.23.1`, and uses frozen installation plus root `pnpm kb:*` scripts. Local status, patterns, update, missing-key research, and ingest checks passed. The first hosted manual dispatch [run `29829364746`](https://github.com/Conxian/conxius-platform/actions/runs/29829364746) exposed the hidden-file artifact defect; [fix commit `da186a78c32ca79e2099461401bbf27952d930b0`](https://github.com/Conxian/conxius-platform/commit/da186a78c32ca79e2099461401bbf27952d930b0) enabled hidden-file upload and fail-closed artifact discovery. The successful manual dispatch [run `29829870126`](https://github.com/Conxian/conxius-platform/actions/runs/29829870126) passed Ingest, Research, and Health and produced the seven-day `knowledge-store` artifact [ID `8494802707`](https://github.com/Conxian/conxius-platform/actions/runs/29829870126/artifacts/8494802707); Synthesize was intentionally skipped because it is schedule-only. No branch, commit, or PR was created by the hosted dispatch.
- Local validation: frozen install, root typecheck/test/lint/build, 117 dashboard tests, 7 plugin tests, dashboard production build, lifecycle, Phase 6, Playwright structural, Python smoke/verification, action-version, YAML/Compose, and KB status/pattern checks passed. Local pytest collection was blocked by missing declared Python packages, and the Docker daemon was unavailable locally.
- Hosted checks: all 18 check runs at implementation head `da186a78c32ca79e2099461401bbf27952d930b0` passed, including CI, Cloud, Server, Test Summary, Synergy, security, hygiene, CodeQL, lifecycle, cross-repo, and action versions. Eight external provider suites remain queued with zero check runs and are classified as provider/admin follow-up.

## Open review checklist

- [ ] Maintainers approve the selected Next.js/TypeScript compatibility pair.
- [ ] CI owners confirm the lockfile and frozen-install contract applies to all workspace workflows.
- [ ] Container owners confirm root-context Docker/Compose behavior on local and hosted runners.
- [ ] KB owners confirm runner choice, network-dependent test strategy, and artifact retention behavior.
- [ ] Repository administrators confirm any required-check or branch-protection follow-up separately from this source change.
