# Design: Automatic Agent Discovery Protocol

## 1. Protocol components

The protocol is intentionally repository-local and file-based:

```text
requested directory / cwd
          │
          ▼
walk upward to .agents/manifest.json
          │
          ├── validate manifest + repository-relative allowlists
          ├── read required context in priority order
          ├── optionally read optional context
          └── read registry metadata + selected/default active skill content
```

The directory containing `.agents/manifest.json` is the logical repository root. The implementation resolves that root once and checks every loaded target against its real path so an in-root symlink is allowed only when it remains in the repository.

## 2. Manifest contract

`.agents/manifest.json` uses `manifestVersion` and `protocol` fields. Context is split into ordered `required` and `optional` arrays. Each entry contains a safe relative `path`, a positive integer `priority`, and a human-readable `description`. Arrays must be strictly ordered by ascending priority, paths must be unique across both arrays, and the required list must include the four canonical onboarding documents:

1. `AGENTS.md`
2. `GOVERNANCE.md`
3. `docs/AGENT_ONBOARDING.md`
4. `docs/SESSION_CONTINUITY.md`

The `skills.registry` field points to the registry using the same safe relative-path rules. Registry entries mark default active skill IDs explicitly rather than inferring them from directory contents.

## 3. Registry contract

`.agents/skills/registry.json` is metadata only. Each skill entry declares an ID, name, description, safe relative content path, `status`, default selection, manual activation policy, and content format. It has no command, hook, executable, or entrypoint fields. The initial registry contains only `agent-onboarding`.

The existing skill receives a minimal YAML frontmatter block (`name`, `description`, `license`, and metadata) so the content follows the repository skill convention. The discovery CLI verifies frontmatter identity for selected skills but treats the body as inert text.

## 4. Discovery algorithm

1. Resolve the `--root` argument, or `process.cwd()` when omitted, as a starting directory. Reject a missing or non-directory start path.
2. Walk parent directories until `.agents/manifest.json` is found. Do not recurse or scan sibling/child directories.
3. Establish the repository root from the manifest location and reject a manifest or `.agents` symlink whose real target escapes that root.
4. Parse JSON and validate manifest version, protocol, required/optional entries, priorities, canonical required paths, registry path, and default skill IDs.
5. Read required files in manifest order. Missing, unreadable, non-file, invalid, or escaping required files fail closed.
6. Validate declared optional targets without reading their contents. Missing optional files become warnings; read their contents only when `--include-optional` is present. Invalid or escaping declared optional files remain fatal because the manifest would be unsafe.
7. Read and validate the registry metadata. Select repeated `--skill` IDs when provided; otherwise select active default skills. Reject unknown, inactive, duplicate, or invalid selections.
8. Read only selected skill files, verify their in-root target and required frontmatter identity, and return metadata plus inert content.
9. Emit a stable JSON object with relative paths, ordered arrays, and sorted warning/error fields. No timestamps or host-absolute paths are included by default.

## 5. CLI contract

```text
pnpm --silent agent-discovery --json [--root <directory>] [--include-optional] [--skill <id>]
```

- `--json` emits machine-readable JSON on success and failure.
- `--root <directory>` changes only the starting directory for upward manifest discovery; it does not bypass repository-root checks.
- `--include-optional` includes declared optional documents.
- `--skill <id>` may be repeated. When present, it replaces the registry's default selection; without it, active entries marked `default: true` are selected.
- Unknown flags, missing flag values, duplicate selections, and invalid paths fail closed.
- Human-readable mode is concise and uses stderr for failures; JSON mode keeps stdout as the single machine-readable result.

## 6. Validation and CI

The implementation uses Node built-ins and the existing locked `tsx` runner. No schema-validation package or network call is added. The tests use `node:test` and temporary directories, with fixtures copied or created locally. The reusable CI workflow runs `pnpm test:agent-discovery` and `pnpm typecheck:agent-discovery` after installation, independently of the recursive workspace test command.
