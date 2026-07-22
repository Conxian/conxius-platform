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

## Validation evidence

- `pnpm lint` passed.
- `pnpm typecheck` passed, including the strict discovery typecheck.
- `pnpm test` passed: discovery tests plus all three workspace test suites (`22` dashboard files / `117` tests, `1` pulse file / `6` tests, and `1` plugin file / `7` tests).
- Root and nested JSON CLI runs produced byte-identical output; the checked-in JSON contracts parsed successfully; `git diff --check` passed.
- `pnpm install --frozen-lockfile` remains blocked by the pre-existing `origin/main` mismatch between the root `pnpm.overrides.next` value and the committed lockfile override. This change intentionally does not repair unrelated dependency state.

## Post-merge remediation for PR #1188 — 2026-07-22

- [x] Make the relative containment predicate separator-independent by normalizing both `/` and `\\` before rejecting `..` escapes; remove the hard-coded POSIX-only separator guard.
- [x] Add regression coverage for Windows-style `..\\outside` and `..\\outside\\secret.md` escapes, while retaining acceptance for valid Windows-style descendants such as `inside\\child\\context.md`.
- [x] Re-run discovery tests and strict discovery typecheck after adding the focused helper seam and root-owned compiler dependency.
- [x] Local clean-install evidence now supersedes the prior pre-remediation note: `pnpm install --frozen-lockfile`, `pnpm run test:agent-discovery`, `pnpm run typecheck:agent-discovery`, root `pnpm test`, and root `pnpm typecheck` passed on 2026-07-22.
- [x] Inspect hosted discovery/CI checks on remediation PR [#1190](https://github.com/Conxian/conxius-platform/pull/1190) head `70d2e2d0db7feab6a21881ed7d1574d38716a851`: CI, cross-repo, multi-environment, synergy, CodeQL, dependency review, and security checks passed on 2026-07-22; results were read from the remediation head rather than inferred from PR #1188.
