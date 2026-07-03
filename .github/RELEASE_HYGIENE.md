# Release hygiene

This repository treats GitHub Actions workflows in [`.github/workflows`](./workflows) as the source of truth for what CI can run. Branch protection determines which checks are required to merge.

Legacy CircleCI configuration is deprecated for this repository, and `.circleci/` is intentionally not used.

## Pull request discipline

- No direct commits to `main`; use pull requests.
- Keep PRs focused and reviewable.
- Ensure `CODEOWNERS`-routed review is satisfied before merge.

## Checks to monitor for PRs to protected branches

As of this baseline, the workflows that run on `push`/`pull_request` for protected branches
(`main`, `dev`, `release/*`) are:

- [`bos-production-guard.yml`](./workflows/bos-production-guard.yml) (`BOS production boundary guard`)
- [`synergy-test.yml`](./workflows/synergy-test.yml) (`End-to-End Synergy Testing`)
- [`ci.yml`](./workflows/ci.yml) (`CI Baseline`)
- [`secret-scan.yml`](./workflows/secret-scan.yml) (`Secret Scan`)
- [`dependency-review.yml`](./workflows/dependency-review.yml) (`Dependency Review`)
- [`hygiene.yml`](./workflows/hygiene.yml) (`Repository Hygiene Guard`)
- [`lifecycle-control-gates.yml`](./workflows/lifecycle-control-gates.yml) (`Lifecycle Control Gates`)

Use the PR checks UI as the final source of truth for required status checks.

Branch protection rules and the release promotion cycle are defined in
[`RELEASE_POLICY.md`](../RELEASE_POLICY.md) and [`docs/BRANCH-MAINTENANCE.md`](../docs/BRANCH-MAINTENANCE.md).

## Release discipline

- Release tags must use `vX.Y.Z`.
- Cut tags from reviewed commits already merged to `main`.
- `CHANGELOG.md` must contain a matching `## [X.Y.Z]` section before tag push.
- Each release tag should correspond to a GitHub Release.

## Tag-triggered release workflow

[`release.yml`](./workflows/release.yml) runs on `vX.Y.Z` tags and:

1. Validates the tag format.
2. Verifies the tagged commit is contained in `origin/main`.
3. Validates `.env.production.schema` is production-safe (no `development` / `testnet` defaults).
4. Verifies the matching changelog section exists.
5. Creates a GitHub Release for the tag.
