# Release hygiene

This repository treats GitHub Actions workflows in [`.github/workflows`](./workflows) as the source of truth for what CI can run. Branch protection determines which checks are required to merge.

## Pull request discipline

- No direct commits to `main`; use pull requests.
- Keep PRs focused and reviewable.
- Ensure `CODEOWNERS`-routed review is satisfied before merge.

## Checks to monitor for PRs to `main`

As of this baseline, the workflows that run on `push`/`pull_request` for `main` are:

- [`bos-production-guard.yml`](./workflows/bos-production-guard.yml) (`BOS production boundary guard`)
- [`synergy-test.yml`](./workflows/synergy-test.yml) (`End-to-End Synergy Testing`)

Use the PR checks UI as the final source of truth for required status checks.

## Release discipline

- Release tags must use `vX.Y.Z`.
- Cut tags from reviewed commits already merged to `main`.
- `CHANGELOG.md` must contain a matching `## [X.Y.Z]` section before tag push.
- Each release tag should correspond to a GitHub Release.

## Tag-triggered release workflow

[`release.yml`](./workflows/release.yml) runs on `vX.Y.Z` tags and:

1. Validates the tag format.
2. Verifies the matching changelog section exists.
3. Creates a GitHub Release for the tag.
