# Tasks: Align Private Workspace License Metadata

Refs #1200

## Implementation

- [x] Confirm the root and nested license files contain the existing MIT terms.
- [x] Add `"license": "MIT"` to the root and three first-party private workspace manifests.
- [x] Preserve private-package, dependency, lockfile, publication, and runtime behavior.
- [x] Document the metadata-only scope and explicit non-goals.

## Validation

- [x] Parse every changed `package.json` with `jq`.
- [x] Run `pnpm install --frozen-lockfile`.
- [x] Run `pnpm run check:dependency-consistency`.
- [x] Run strict OpenSpec validation for this change.
- [x] Run `git diff --check`.
