# Tasks: Automatic Agent Discovery Protocol

## Artifact baseline

- [x] Create a dated OpenSpec change directory for issue #1162.
- [x] Add `proposal.md`, `design.md`, `spec-delta.md`, and `.openspec.yaml` before implementation edits.
- [x] Record the security boundary, fail-closed behavior, and issue #1163 non-goal.

## Implementation checklist

- [x] Add `.agents/manifest.json` with canonical required context, justified optional context, and registry/default skill references.
- [x] Add `.agents/skills/registry.json` as metadata-only, manual-activation registry.
- [x] Add YAML frontmatter to `.agents/skills/agent-onboarding/SKILL.md` for registry compatibility.
- [x] Add portable JSON Schemas for the manifest and registry.
- [x] Implement `scripts/agent-discovery.ts` with upward discovery, path/symlink containment, version validation, ordered loading, optional warnings, skill selection, and deterministic JSON output.
- [x] Add Node test-runner coverage for success, ordering, schema parsing, duplicates, unsafe paths, symlink escape, missing files, versions, determinism, and allowlist behavior.
- [x] Add root package scripts and explicit reusable CI steps.
- [x] Update onboarding documentation with the protocol, CLI, failure behavior, security boundary, and compatibility fallback.
- [x] Correct the #1162 gap/status in `AGENTS.md` and append the 2026-07-22 session log entry without rewriting history.

## Acceptance criteria

- [x] `pnpm test:agent-discovery` passes with no network access.
- [x] `pnpm typecheck:agent-discovery` passes.
- [x] JSON output is identical for repeated root and nested-directory runs.
- [x] Required context order and optional/skill selection semantics are observable and tested.
- [x] Full requested validation is run and any unrelated/environment-owned failure is documented with focused evidence.

## Audit hardening follow-up

- [x] Harden containment checks for both POSIX and Windows path separators while preserving absolute, traversal, and symlink-escape rejection.
- [x] Align schema comments/descriptions with runtime-enforced cross-item and filesystem invariants.
- [x] Expand deterministic regression coverage for priority ordering, registry uniqueness, malformed inputs, frontmatter, repeated skill selection, CLI argument failures, and in-root symlinks.
- [x] Make the onboarding skill defer to the manifest/discovery CLI and document schema-versus-runtime validation boundaries.

## Validation evidence

- `pnpm lint` passed.
- `pnpm typecheck` passed, including the strict discovery typecheck.
- `pnpm test` passed: discovery tests plus all three workspace test suites (`22` dashboard files / `117` tests, `1` pulse file / `6` tests, and `1` plugin file / `7` tests).
- Root and nested JSON CLI runs produced byte-identical output; the checked-in JSON contracts parsed successfully; `git diff --check` passed.
- `pnpm install --frozen-lockfile` remains blocked by the pre-existing `origin/main` mismatch between the root `pnpm.overrides.next` value and the committed lockfile override. This change intentionally does not repair unrelated dependency state.
