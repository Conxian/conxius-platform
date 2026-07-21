# OpenSpec Proposal: CI Dependency and Knowledge-Base Reliability

**Date**: 2026-07-21
**Reference**: [PR #1170](https://github.com/Conxian/conxius-platform/pull/1170)
**Reviewed PR head**: `94f904ccf884f1272e2b19ea356f168da4f6fcd3`
**Status**: Proposed

## 1. Problem statement

PR #1170 is a Dependabot dashboard dependency update that currently exposes several independent CI/CD reliability problems:

1. The dashboard package changed `@types/node` from `26.1.0` to `26.1.1` and TypeScript from `6.0.3` to `7.0.2`, but the root `pnpm-lock.yaml` still records the previous specifiers. The repository's frozen install therefore fails before lint, typecheck, or tests run.
2. The dashboard Dockerfile builds from `services/admin-dashboard` and runs `pnpm install --no-frozen-lockfile`. This bypasses the root workspace lockfile and root overrides, allowing a different dependency graph from CI and producing a non-deterministic build surface.
3. The dashboard Docker build reaches Next.js compilation but fails during the TypeScript phase, including `The "id" argument must be of type string. Received undefined`. The observed image installed Next.js `16.2.10` and TypeScript `7.0.2`, while the root workspace lock/override resolves a different Next.js and TypeScript graph.
4. The root `package.json` contains two `scripts` objects. JSON parsing keeps only the latter object, so the documented `kb:*` commands are not exposed by the root package manager scripts.
5. The Knowledge Base Evolution workflow invokes `npx ts-node` without a lockfile-managed runner. Recent runs failed while resolving the project configuration with `TypeError: Cannot read properties of undefined (reading 'fileExists')` under Node.js `24.18.0`, after dynamically installing `ts-node@10.9.2`.
6. CI failures need an explicit ownership boundary. Repository-code failures are repairable in source; queued provider checks, provider outages, and branch-protection/ruleset configuration are not repaired by changing application code or package manifests.

The evidence is recorded in the failing runs associated with the reviewed head:

| Surface | Evidence |
| --- | --- |
| Frozen workspace install | [CI Baseline run 29824502909](https://github.com/Conxian/conxius-platform/actions/runs/29824502909) |
| Docker/Compose build | [Synergy run 29824502767](https://github.com/Conxian/conxius-platform/actions/runs/29824502767) and [Multi-Environment run 29824502804](https://github.com/Conxian/conxius-platform/actions/runs/29824502804) |
| KB TypeScript runner | [KB Evolution run 29824484071](https://github.com/Conxian/conxius-platform/actions/runs/29824484071) |
| Historical action-policy failure | [KB Evolution run 29729604876](https://github.com/Conxian/conxius-platform/actions/runs/29729604876) |

## 2. Goals

- Keep routine dashboard dependency updates compatible with the repository's Next.js, Node.js, TypeScript, and test toolchain.
- Explicitly defer TypeScript 7 until a compatibility matrix demonstrates that the selected Next.js/toolchain combination supports it in local, CI, and Docker builds.
- Keep the root `pnpm-lock.yaml` synchronized with every workspace manifest and make frozen installs deterministic.
- Make dashboard Docker and Compose builds consume the canonical root workspace dependency graph rather than service-local unlocked resolution.
- Repair the KB Evolution TypeScript execution path and preserve all existing root package scripts in one valid `scripts` object.
- Define concrete validation and acceptance criteria for root install/typecheck/tests, dashboard build, Docker/Compose paths, KB commands, and GitHub checks.
- Separate source-fixable workflow failures from provider-owned queued checks and admin-only branch-protection or ruleset concerns.

## 3. Scope

### 3.1 Dependency compatibility policy

- Reconcile the dashboard's direct dependency declarations with the root workspace override and lockfile so one intentional Next.js graph is used everywhere.
- Keep the dashboard on a TypeScript version demonstrated to work with the selected Next.js version and repository toolchain.
- Treat TypeScript 7 as deferred work. It may be enabled only after documented evidence covers `tsc`, `next build`, Vitest, Node.js CI, and the canonical Docker build.
- Do not accept a Dependabot update solely because package resolution succeeds in a service-local install.

### 3.2 Workspace lockfile determinism

- Update `pnpm-lock.yaml` together with dashboard manifest changes.
- Require CI and the KB workflow to use frozen, lockfile-backed installs.
- Ensure the lockfile is the authoritative resolution input for all workspace-aware validation and release paths.

### 3.3 Canonical dashboard container builds

- Change the dashboard container build contract to use the repository root as its build context.
- Copy the root workspace manifests and lockfile before dependency installation.
- Install and build through the workspace-aware package manager using the selected dashboard filter; do not use `--no-frozen-lockfile` in CI or Compose validation.
- Align `docker-compose.yml`, direct `docker build`, synergy testing, and multi-environment validation on the same Dockerfile/context contract.

### 3.4 KB Evolution runner and root scripts

- Merge the duplicate root `scripts` objects without dropping existing lint, test, build, typecheck, or control-gate commands.
- Add an explicit, lockfile-managed TypeScript runner for KB scripts and invoke it through `pnpm`, not dynamic `npx` installation.
- Keep the documented `kb:ingest`, `kb:patterns`, `kb:research`, `kb:update`, and `kb:status` commands runnable from the repository root.
- Align the KB workflow's installation and command execution with the root workspace contract.

### 3.5 Validation and failure ownership

- Add or repair validation for the root package graph, dashboard build, Docker/Compose paths, KB command surface, and GitHub workflow outcomes.
- Classify every failing or non-terminal check as repository-code, provider-owned, or admin-only before deciding on a repair.
- Preserve the existing policy that PR metadata, branch protection, rulesets, merge queues, and required-check configuration are not changed as part of source repairs.

## 4. Non-goals

- Implementing protocol, Gateway, Nexus, wallet, or user-data behavior.
- Upgrading Next.js or TypeScript major versions without the compatibility evidence required above.
- Making branch-protection, ruleset, required-status, merge-queue, or other repository-admin changes.
- Masking a failing provider check by weakening a required check or changing PR metadata.
- Replacing the KB's knowledge model or external research policy beyond making its existing runners deterministic and executable.

## 5. Deliverables

This proposal governs a follow-up implementation change set. The implementation is expected to deliver:

1. A synchronized dashboard manifest and root lockfile with an explicit TypeScript compatibility decision.
2. A root-context, frozen-install dashboard Docker/Compose path used consistently by CI.
3. A valid root `scripts` object and lockfile-managed KB TypeScript runner.
4. KB workflow commands that use the declared workspace runner and deterministic install mode.
5. Validation evidence covering local commands, Docker/Compose commands, KB commands, and GitHub checks.
6. A failure triage record distinguishing code-fixable failures from provider-owned and admin-only concerns.

The current phase creates only the OpenSpec artifacts; it does not implement any package, workflow, Docker, or script changes.

## 6. Risks and mitigations

- **Risk: TypeScript 7 remains incompatible with the selected Next.js release.**
  **Mitigation:** Restore or retain the last demonstrated compatible TypeScript line until the required matrix is green.
- **Risk: Docker and CI silently resolve different versions.**
  **Mitigation:** Use one root context, one lockfile, frozen installs, and a single workspace filter contract.
- **Risk: Fixing the duplicate `scripts` key drops an existing command.**
  **Mitigation:** Compare the pre-change command set and assert that every existing command plus every `kb:*` command is present after the merge.
- **Risk: KB workflow behavior depends on undeclared network-installed tooling.**
  **Mitigation:** Declare the runner in the root manifest, lock it, and invoke it with `pnpm exec` or root scripts.
- **Risk: External queued checks are mistaken for source regressions.**
  **Mitigation:** Require check-by-check ownership classification and retain provider/admin blockers as explicit follow-up items.

## 7. Sequencing and decision gates

1. Establish the dependency and lockfile baseline.
2. Select and record the compatible Next.js/TypeScript pair; TypeScript 7 remains deferred unless the evidence gate passes.
3. Repair the canonical workspace container build and run local Docker/Compose validation.
4. Repair root scripts and the KB runner, then validate all KB commands.
5. Run the full local validation matrix and inspect GitHub checks.
6. Hand off provider-owned or admin-only blockers without changing repository metadata.

No implementation change should precede approval of this artifact and its acceptance criteria.
