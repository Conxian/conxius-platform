# Releasing

This repository uses **Semantic Versioning** with Git tags and GitHub Releases.

- Version tag format: `vX.Y.Z` (**annotated tags only**)
- Changelog: [`CHANGELOG.md`](./CHANGELOG.md) (Keep a Changelog format)
- Release checklist template: [`docs/runbooks/RELEASE_CHECKLIST_TEMPLATE.md`](./docs/runbooks/RELEASE_CHECKLIST_TEMPLATE.md)
- Release discipline: [`.github/RELEASE_HYGIENE.md`](./.github/RELEASE_HYGIENE.md)

## When to release

Create a release when user-facing behavior, platform operations, security posture, or integration contracts change in a way that should be pinned to an immutable reference.

## Minimum public-repo release workflow

1. **Prepare a release PR.**
   - Move items from `## [Unreleased]` into `## [X.Y.Z] - YYYY-MM-DD` in `CHANGELOG.md`.
   - Keep `## [Unreleased]` present for subsequent work.
   - Add concise release notes in the PR (highlights, breaking changes if any, and operator/security impacts).
   - Complete minimum quality gates: required PR checks for `main`, required review approvals, and merge readiness.
2. **Merge the release PR to `main`.**
3. **Create and push an annotated SemVer tag from the merged release commit.**

```bash
git checkout main
git pull --ff-only
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

4. **Verify the tag-triggered workflow** ([`.github/workflows/release.yml`](./.github/workflows/release.yml)) **succeeds.**
   - Validates tag format (`vX.Y.Z`).
   - Verifies the tagged commit is contained in `origin/main`.
   - Validates `.env.production.schema` for production-safe defaults.
   - Verifies `CHANGELOG.md` contains matching `## [X.Y.Z]` section.
   - Creates the GitHub Release.
5. **Finalize release notes on the GitHub Release.**
   - Ensure notes match the changelog section and include any upgrade/migration callouts.

Use [`docs/runbooks/RELEASE_CHECKLIST_TEMPLATE.md`](./docs/runbooks/RELEASE_CHECKLIST_TEMPLATE.md) as the copy/paste checklist for each release PR/tag.

## Cross-repository release discipline

For chain-specific deployment/operator repositories (including Conxius Orbit in `Conxian/conxius-orbit`):

- Every release PR/tag should reference the controlling parent issue/spec in `conxius-platform`.
- Release notes should state deployment safety assumptions and trust assumptions for operator-managed surfaces.
- Release scope must remain bounded to deployment/operator concerns (no broad protocol-ownership expansion).

## Confidence gates beyond minimum

Heavy suites (extended E2E, soak, manual exploratory QA, security deep-dive) are treated as **optional/nightly/manual confidence gates by default**.

Teams may promote any of these gates to required status checks when their release policy needs stricter controls.

## Creating a release manually (fallback)

If needed, create the GitHub Release manually from an existing tag:

```bash
gh release create vX.Y.Z --title "vX.Y.Z"
```

Prefer copying release notes from the matching `CHANGELOG.md` section.
