# Release Checklist Template

Copy/paste this checklist into the release PR description (or release tracking issue) and fill in the placeholders.

## Release metadata

- Version: `vX.Y.Z`
- Planned release date: `YYYY-MM-DD`
- Release owner: `@owner`
- Release PR: `#PR_NUMBER`
- Tag commit SHA (after merge): `COMMIT_SHA`

## 1) Release PR readiness (required)

- [ ] Version bump decision follows SemVer (`major`/`minor`/`patch`) and is documented in the PR.
- [ ] `CHANGELOG.md` has `## [X.Y.Z] - YYYY-MM-DD` with release notes moved from `## [Unreleased]`.
- [ ] `## [Unreleased]` remains in `CHANGELOG.md` for post-release work.
- [ ] PR includes concise release notes summary (highlights, breaking changes, operator/security impacts).
- [ ] Required checks for `main` are passing.
- [ ] Required review approvals are complete.

## 2) Optional confidence gates (team policy dependent)

- [ ] Extended E2E/regression suite run.
- [ ] Manual smoke test in target environment.
- [ ] Security/operations sanity review.
- [ ] Any team-specific release gates completed.

> These gates are optional by default for public-repo minimum workflow unless your team marks them as required.

## 3) Tag and publish (required)

- [ ] Release PR is merged to `main`.
- [ ] Local `main` is up to date (`git pull --ff-only`).
- [ ] Annotated tag created from merged release commit:

```bash
git tag -a vX.Y.Z -m "vX.Y.Z"
git push origin vX.Y.Z
```

- [ ] Tag points to a commit contained in `origin/main`.
- [ ] `.github/workflows/release.yml` completed successfully for the tag.
- [ ] GitHub Release exists for `vX.Y.Z`.

## 4) Release notes and closeout (required)

- [ ] GitHub Release notes reviewed/edited for clarity.
- [ ] Release notes align with `CHANGELOG.md` for `X.Y.Z`.
- [ ] Breaking changes and migration steps are explicit (or marked as none).
- [ ] Follow-up issues/actions captured for anything deferred.
- [ ] Release announcement posted in team channel/log (if applicable).
