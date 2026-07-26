# Align Private Workspace License Metadata with Existing MIT Terms

Refs #1200

Portfolio context: https://github.com/Conxian/.github/issues/60

## Goal

Align the root and first-party private workspace package manifests with the MIT license terms already recorded in the repository's root and nested `LICENSE` files.

## Scope

- Add `"license": "MIT"` to the root `package.json` and the three first-party private service manifests.
- Keep the change limited to package metadata and its OpenSpec process record.
- Preserve the existing private-package and dependency configuration.

## Non-goals

- Relicensing code, selecting new license terms, or changing copyright ownership.
- Creating dependency-policy exceptions or changing dependency resolution.
- Changing package publication, release, registry, or runtime behavior.

## Risk

The metadata could be mistaken for a licensing decision. The implementation and PR description therefore state that the existing MIT license text remains authoritative and this change only makes package metadata consistent with it.
