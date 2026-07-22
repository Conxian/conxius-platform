# OpenSpec Proposal: Automatic Agent Discovery Protocol

**Date**: 2026-07-22
**Reference**: [Issue #1162](https://github.com/Conxian/conxius-platform/issues/1162)
**Status**: Proposed

## 1. Problem statement

Agents entering `conxius-platform` currently have to infer the repository's context contract from prose. The onboarding guide and skill exist, but there is no versioned machine-readable entrypoint that identifies the repository root, orders required context, declares optional context, or points to the skill metadata registry. This makes onboarding inconsistent and makes it difficult for tooling to enforce the repository security boundary.

## 2. Goals

- Provide a versioned `.agents/manifest.json` entrypoint with an explicit ordered allowlist of required and optional context files.
- Provide a metadata-only `.agents/skills/registry.json` for the existing `agent-onboarding` skill without creating an automatic execution surface.
- Define portable JSON Schemas for both contracts.
- Provide a zero-network, deterministic TypeScript CLI that discovers the manifest from a requested directory or current working directory, validates the contracts, and loads only declared context and selected skill content.
- Fail closed for invalid or missing required inputs and warn, without failing, for missing optional context.
- Cover the success path and path/symlink, version, duplicate, missing-file, ordering, determinism, and allowlist behavior with repository-level tests.

## 3. Scope

### 3.1 In scope

- `.agents/manifest.json` and `.agents/skills/registry.json`.
- `schemas/agent-manifest.schema.json` and `schemas/agent-skill-registry.schema.json`.
- `scripts/agent-discovery.ts` and `scripts/agent-discovery.test.ts`.
- Root `package.json` scripts and the reusable CI workflow step needed to run the discovery test and typecheck.
- Onboarding documentation and the current `AGENTS.md` gap/status/session log entries.
- A minimal YAML frontmatter repair to `agent-onboarding/SKILL.md` so its registry metadata is compatible with the repository skill format.

### 3.2 Out of scope

- Automatic execution of skills, commands, hooks, or code found in the repository.
- Network access, remote manifest resolution, plugin installation, or dynamic dependency installation.
- Swarm coordination implementation; issue #1163 is only acknowledged as a forward-compatible follow-up.
- Changes to protocol, Gateway, Nexus, wallet, user data, or funds handling.

## 4. Security and failure policy

- Manifest and registry paths are repository-relative POSIX paths. Absolute paths, drive/UNC paths, `..` traversal, empty path segments, and backslash-separated paths are invalid.
- The resolved target of every loaded file must remain inside the manifest repository root. Symlinks that resolve outside the root are rejected.
- The CLI reads only the manifest, its declared context files, the declared registry, and selected/default active skill files. It does not scan the repository.
- Unsupported protocol major versions, malformed JSON, duplicate declarations, invalid priorities, invalid registry metadata, missing required files, and selected skill failures are fatal.
- Missing optional files produce deterministic warnings and do not prevent a successful result.
- JSON output contains repository-relative paths and no timestamp unless a future explicit flag requests one.

## 5. Deliverables

1. OpenSpec artifacts in `openspec/changes/2026-07-22-issue-1162-agent-discovery/`.
2. Versioned manifest, registry, and schemas.
3. Strict, no-network discovery implementation and CLI.
4. Node test-runner coverage and explicit CI coverage.
5. Updated onboarding and knowledge-base documentation.

## 6. Acceptance criteria

- A clean checkout can run `pnpm test:agent-discovery` without network access.
- Discovery succeeds from the repository root and a nested directory and returns the same deterministic JSON.
- Required context is returned in ascending priority order; optional context is loaded only with `--include-optional`.
- `--skill agent-onboarding` loads only that active skill's metadata and content; no skill is executed.
- Security and failure tests cover absolute/traversal paths, symlink escape, duplicates, unsupported major versions, missing required versus optional files, and unlisted sensitive files.
- `pnpm typecheck:agent-discovery`, the reusable CI step, and the full requested repository validation are either passing or have documented pre-existing/environment-owned blockers.
