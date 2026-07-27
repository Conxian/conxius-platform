# Validate Active Documentation Links and Entry Points

Refs #1201

Linear: https://linear.app/conxian-labs/issue/CON-1584/a-verify-and-check-for-all-relevant-docs

## Goal

Add a dependency-light validation gate for active repository documentation and repair the first set of evidence-backed broken local references found by the CON-1584 audit.

## Scope

- Validate repository-local Markdown link paths outside generated, vendor, and historical trees.
- Reject active-document links into historical/archive trees.
- Check that declared onboarding, canonical, and policy entry points exist.
- Run focused parser tests and the repository's reusable secret scan for documentation-only changes.
- Add a compact tiered documentation index and repair unambiguous active-file link paths.

## Non-goals

- Product naming, branding, architecture, or production deployment decisions.
- Heading-fragment or external-URL availability validation.
- Modernizing archived content or changing the OpenSpec lifecycle in bulk.
- Creating replacement authorities for documents that do not currently exist.

## Risk

Markdown syntax permits ambiguous constructs. The validator intentionally focuses on deterministic repository-local destinations, ignores fenced examples and explicit placeholders, and has focused tests for those boundaries.
