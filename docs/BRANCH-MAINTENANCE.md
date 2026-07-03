# Branch maintenance policy

Establishes recurring branch maintenance and stale branch review as a repeatable repository control. This document defines branch classifications, lifecycle expectations, review cadence, and cleanup rules for the `conxius-platform` repository.

Traceability: supports [conxius-platform#915](https://github.com/Conxian/conxius-platform/issues/915), follows the [public web presence and repository docs operating model](https://linear.app/conxian-labs/document/public-web-presence-and-repository-docs-operating-model-949b5bcf5883).

## Branch classification

### Protected long-lived branches

These branches are permanent, subject to branch protection rules, and must never be deleted:

| Branch        | Purpose                                              | Protection        |
|---------------|------------------------------------------------------|--------------------|
| `main`        | Production-ready, release-tagged surface             | Full (rules, PRs)  |
| `staged`      | Pre-release integration and secret-scan gate         | Full (rules, PRs)  |
| `develop`     | Active integration branch (when in use)              | Full (rules, PRs)  |
| `dev`         | Active development; feature branches merge here      | Full (rules, PRs)  |
| `release/*`   | Stabilisation branch for version x.y; cut from `dev` | Full (rules, PRs)  |
| `lts/*`       | Long-Term Support track for a release line           | Full (rules, PRs)  |

The `dev` → `release/x.y` → `main` promotion cycle is governed by [`RELEASE_POLICY.md`](../RELEASE_POLICY.md). The `lts/*` branches are declared per the LTS Gate Policy in that document.

The secret-scan and hygiene CI workflows already treat `main`, `staged`, `develop`, and `dev` as protected trigger branches. These branches and `release/*` and `lts/*` patterns are excluded from all automated stale-branch detection and deletion.

### Short-lived working branches

All feature, fix, chore, and exploration work follows a branch naming convention based on Linear issue keys or descriptive slugs:

| Pattern              | Example                                          | Expected lifetime |
|----------------------|--------------------------------------------------|--------------------|
| `feature/*`          | `feature/conxian-labs-domain-cutover-...`        | Days to weeks      |
| `fix/*`              | `fix/issue-951-claim-discipline-review`          | Days               |
| `feat/*`             | `feat/multidimensional-erp-testing-...`          | Days to weeks      |
| `chore/*`            | `chore/con-742-github-private-control-snapshot`  | Days               |
| `phase-*`            | `phase-7-research-implementation-...`            | Weeks (research)   |
| `circleci-project-*` | `circleci-project-setup`                         | Days (migration)   |

Short-lived branches must be deleted after merge. Branches left open after merge or abandoned without activity become stale and are subject to the review and cleanup cadence below.

### Non-standard long-lived branches

`staged` is treated as a **protected long-lived branch**. It serves as the pre-release integration surface where secret-scan, hygiene, and integration gates run before promotion to `main`. It is excluded from stale-branch detection and deletion.

`dev` is the active development branch where feature branches merge. `release/*` branches are short-lived stabilisation branches cut from `dev` and promoted to `main`. `lts/*` branches carry extended maintenance commitments. All are registered as protected in the table above.

If additional long-lived integration or environment branches are introduced (e.g., `qa`), they must be:
- Registered in this document as protected
- Added to the stale-branch-review workflow exclusion list
- Subject to the same branch protection rules as `main`

## Review cadence

### Automated stale branch review

The `.github/workflows/stale-branch-review.yml` workflow runs **monthly (first day of the month)** and on-demand via `workflow_dispatch`. It:

1. Lists all remote branches
2. Excludes protected long-lived branches (`main`, `master`, `staged`, `develop`, `dev`, `gh-pages`)
3. Identifies branches with no commits in **90+ days** as stale
4. Creates a GitHub Issue with the stale branch report for maintainer review
5. Flags branches with no commits in **180+ days** as deletion candidates

### Manual review cadence

Maintainers are expected to review the monthly stale branch report issue within the sprint it is filed. For each reported branch, decide to:

- **Keep** — branch is still under active or paused development; add a comment with the expected timeline
- **Delete** — branch is abandoned, merged, or superseded; delete via `git push origin --delete <branch>`
- **Archive** — preserve the branch tip as a tag (`archive/<branchname>`) before deletion, if historical traceability is required

## Cleanup cadence

### Automated (local)

`scripts/maintenance/repo_cleanup.sh` handles local branch hygiene:
- Deletes local branches already merged into `main`
- Deletes local branches with no commits in 90+ days (excluding protected branches)

This script is intended for developer workstation use, not CI.

### Manual (remote)

Remote branch cleanup is a manual, reviewed action driven by the monthly stale branch report. Branches flagged as stale (> 90 days) require explicit maintainer decision before deletion. Branches flagged as deletion candidates (> 180 days) are deleted unless a maintainer objects within the sprint review window.

## Branch sprawl prevention

Branch sprawl is managed as a **repeatable control**, not occasional cleanup:

1. **At PR merge**: Contributors are expected to delete their working branch after merge. GitHub's "Automatically delete head branches" setting should be enabled at the repository level.
2. **Monthly review**: The stale-branch-review workflow surfaces abandoned branches systematically.
3. **Quarterly deep clean**: Every quarter, maintainers run a full remote branch audit using `git branch -r --merged origin/main` and delete all merged remote branches that were not auto-deleted.

## Enforcement

- The stale-branch-review workflow is non-blocking (creates an Issue, not a failing check)
- Branch protection rules on `main`, `staged`, and `develop` prevent direct pushes and require PR review
- PR merge requires branch deletion by convention, enforced through review
- Quarterly deep clean is tracked as a recurring hygiene task in Linear
