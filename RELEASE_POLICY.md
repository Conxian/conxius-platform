# Release Promotion Cycle and LTS Gate Policy

Canonical policy anchor for the portfolio release promotion cycle and LTS
gating. This document defines the branch promotion flow (`dev` → `release/x.y`
→ `main`), the gates required at each promotion step, and the rules under
which an LTS track may be declared.

It extends existing governance and branch-promotion work. For environment
promotion see [`docs/DEPLOYMENT_PROMOTION_MODEL.md`](./docs/DEPLOYMENT_PROMOTION_MODEL.md).
For tagging and release mechanics see [`RELEASING.md`](./RELEASING.md). For
branch lifecycle and cleanup see [`docs/BRANCH-MAINTENANCE.md`](./docs/BRANCH-MAINTENANCE.md).

## Traceability

- Implements [conxius-platform#913](https://github.com/Conxian/conxius-platform/issues/913)
- Supports [conxius-platform#918](https://github.com/Conxian/conxius-platform/issues/918) (parent — public web presence and repo docs operating model)
- Follows [Public web presence and repository docs operating model](https://linear.app/conxian-labs/document/public-web-presence-and-repository-docs-operating-model-949b5bcf5883)

## Branch Strategy

The portfolio release cycle uses three branch tiers:

| Branch        | Purpose                                                  | Protection |
| ------------- | -------------------------------------------------------- | ---------- |
| `dev`         | Active development; all feature branches merge here      | PR required, CI must pass |
| `release/x.y` | Stabilisation branch for version `x.y`; cut from `dev`   | PR required, full gate suite |
| `main`        | Production-ready, tagged releases only                   | Full (rules, PRs, signed merges) |

This strategy is distinct from the environment promotion ladder defined in
[`docs/DEPLOYMENT_PROMOTION_MODEL.md`](./docs/DEPLOYMENT_PROMOTION_MODEL.md).
The release promotion cycle governs **which branch a release cut originates
from**; the environment promotion model governs **which environment a
deployment targets**.

## Promotion Cycle

```
feature/*  ──→  dev  ──→  release/x.y  ──→  main
                  │            │               │
                  │   CI +     │   full gate    │   tag +
                  │   review   │   suite        │   provenance
```

### 1. Feature → `dev`

- Feature branches are squashed or rebased onto `dev`.
- CI must pass (build, lint, unit tests, secret scan, hygiene).
- At least one approving code review is required.
- Merged feature branches are deleted per
  [`docs/BRANCH-MAINTENANCE.md`](./docs/BRANCH-MAINTENANCE.md).

### 2. `dev` → `release/x.y`

A release branch is cut from `dev` when the scope for version `x.y` is
feature-complete. The release branch is short-lived and exists only for
stabilisation before promotion to `main`.

**Promotion gates (all required):**

| Gate                       | Requirement                                                       |
| -------------------------- | ----------------------------------------------------------------- |
| CI (extended)              | Full integration and end-to-end suite passes on the release branch |
| Security scan              | No HIGH or CRITICAL findings without a documented, time-boxed waiver |
| Changelog                  | `CHANGELOG.md` updated with all user-visible changes              |
| Dependency audit           | Known vulnerabilities in direct dependencies addressed or waived  |
| API / contract             | Breaking changes documented in migration guide; contract schemas valid |
| Lifecycle control gates    | `Lifecycle Control Gates` CI workflow passing per [`RELEASING.md`](./RELEASING.md) |
| Release manager sign-off   | Formal approval from the designated release manager               |

Once all gates pass, a PR from `release/x.y` into `main` is opened.

### 3. `release/x.y` → `main`

Merging into `main` is the final promotion step for a release.

**Approval points:**

- At least **two** maintainer approvals on the merge PR.
- All promotion-gate evidence linked in the PR body.
- The merge MUST be a signed merge-commit (no squash, no rebase).
- A semver tag (e.g. `v1.2.0`) is applied on the merge commit immediately after merge.

**Post-merge:**

- The tag triggers the release workflow per [`RELEASING.md`](./RELEASING.md).
- `CHANGELOG.md` section is finalised in the GitHub Release notes.
- The `release/x.y` branch is deleted after the tag is confirmed live.

## LTS Gate Policy

Long-Term Support (LTS) carries an extended maintenance commitment. An LTS
track is **not** declared based on a roadmap or pre-emptively. It is only
opened when all of the following conditions are met:

1. **Production-proven release required.** A `1.0.0` or later production
   release has shipped to real users.
2. **Stability window.** The release has run in production without a rollback
   for at least **30 calendar days**.
3. **No open HIGH or CRITICAL regressions** against that release line.
4. **Formal maintainer vote.** The maintainer group has voted to declare the
   track as LTS and published the corresponding support window (minimum 12
   months).

Once declared, the LTS track receives:

- Backported security fixes for the duration of the support window.
- Critical bug fixes at maintainer discretion.
- No new features, behavioural changes, or non-security dependency upgrades.

LTS tracks are identified by a branch named `lts/x.y` pointing at the last
patch tag on that line. The `lts/*` branches are protected per
[`docs/BRANCH-MAINTENANCE.md`](./docs/BRANCH-MAINTENANCE.md).

## Roles

| Role             | Responsibility                                                  |
| ---------------- | --------------------------------------------------------------- |
| Release manager  | Owns the release branch, gates, and promotion PR                |
| Maintainer       | Approves promotion PRs; may also act as release manager         |
| Contributor      | Opens feature PRs against `dev`; responds to review             |

## Relationship to Existing Policies

| Document | Concern | Relationship |
| -------- | ------- | ------------ |
| [`RELEASING.md`](./RELEASING.md) | Tagging, versioning, release workflow | Mechanics triggered after promotion |
| [`GOVERNANCE.md`](./GOVERNANCE.md) | Ownership, change control, lanes | Governance baseline this policy lives within |
| [`docs/DEPLOYMENT_PROMOTION_MODEL.md`](./docs/DEPLOYMENT_PROMOTION_MODEL.md) | Environment promotion (dev→staging→production) | Orthogonal dimension; deployment gates |
| [`docs/BRANCH-MAINTENANCE.md`](./docs/BRANCH-MAINTENANCE.md) | Branch lifecycle, cleanup, stale detection | Operates on the branches this policy creates |

## Policy Maintenance

This document is the standing policy anchor for release promotion and LTS
gating. Proposed changes follow the standard contribution flow (PR against
`dev`) and require at least two maintainer approvals. It must be reviewed
whenever branch, artefact, or promotion practices evolve.
