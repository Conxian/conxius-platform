# Tasks: Validate Active Documentation

Refs #1201

## Implementation

- [x] Add a Python standard-library validator for active local Markdown links.
- [x] Add focused parser and path-resolution tests.
- [x] Add documentation validation and documentation-triggered secret scanning in CI.
- [x] Repair unambiguous active documentation references exposed by the validator.
- [x] Add the tiered `docs/README.md` index.

## Validation

- [x] Run the validator and focused unit tests.
- [x] Run repository agent discovery, lint, typecheck, and tests.
- [x] Validate workflow syntax where local tooling permits.
- [x] Run `git diff --check` and inspect the complete scoped diff.
