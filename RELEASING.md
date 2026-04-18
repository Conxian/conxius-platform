# Releasing

This repository uses **Semantic Versioning** with Git tags and GitHub Releases.

- Version tag format: `vX.Y.Z`
- Changelog: [`CHANGELOG.md`](./CHANGELOG.md) (Keep a Changelog format)
- Release discipline: [`.github/RELEASE_HYGIENE.md`](./.github/RELEASE_HYGIENE.md)

## When to release

Create a release when user-facing behavior, platform operations, security posture, or integration contracts change in a way that should be pinned to an immutable reference.

## Release process

1. Prepare the release in a pull request.
   - Move items from `## [Unreleased]` into `## [X.Y.Z] - YYYY-MM-DD` in `CHANGELOG.md`.
   - Keep `## [Unreleased]` present for subsequent work.
2. Merge the PR to `main` after required checks pass.
3. Create and push an annotated SemVer tag from the release commit:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

4. Confirm the tag-triggered workflow (`.github/workflows/release.yml`) completes and creates the GitHub Release.

## Creating a release manually (fallback)

If needed, create the GitHub Release manually from the existing tag:

```bash
gh release create vX.Y.Z --title "vX.Y.Z"
```

Prefer copying release notes from the matching `CHANGELOG.md` section.
