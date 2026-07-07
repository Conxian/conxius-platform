# Branch Protection Rulesets

This document defines the GitHub rulesets that must be configured on
`Conxian/conxius-platform` to enforce the branch promotion cycle
defined in [`RELEASE_POLICY.md`](../RELEASE_POLICY.md).

> **Note**: For org-wide rulesets and push protection requirements,
> see [`ORG_SECURITY_GOVERNANCE.md`](./ORG_SECURITY_GOVERNANCE.md).
> This document focuses on repository-level branch protection rules.

Traceability:

- Implements [conxius-platform#917](https://github.com/Conxian/conxius-platform/issues/917)
- Supports [conxius-platform#854](https://github.com/Conxian/conxius-platform/issues/854) (Org-wide rulesets)
- Supports [conxius-platform#1103](https://github.com/Conxian/conxius-platform/issues/1103) (CI/CD strict enforcement EPIC)
- Aligned with branch strategy: `feature/*` → `dev` → `release/x.y` → `main`

## Ruleset Summary

| Name | Target | Enforcement | Key Rules |
|------|--------|-------------|-----------|
| `protected-main` | `main` | Active | PR required, signed commits, required checks, no force push, no deletion |
| `protected-dev` | `dev` | Active | PR required, required checks, no force push, no deletion |
| `protected-release` | `release/**` | Active | PR required, full gate suite, no force push, no deletion |
| `protected-lts` | `lts/**` | Active | PR required, signed commits, no force push, no deletion |

## Ruleset: `protected-main`

Target: branch `main` (default branch).

Enforcement: **Active** (rules are enforced immediately).

### Rules

| Rule | Configuration |
|------|---------------|
| Restrict deletions | Enabled |
| Block force pushes | Enabled |
| Require a pull request before merging | Enabled, dismiss stale reviews, require approval from CODEOWNERS |
| Require signed commits | Enabled |
| Require linear history | Enabled |
| Required status checks | See [Required Checks](#required-checks) below |
| Block pushes for non-admin roles | Enabled (restrict pushes to admins and the `release` GitHub App only) |
| Require branches to be up-to-date before merging | Enabled |

## Ruleset: `protected-dev`

Target: branch `dev`.

Enforcement: **Active**.

### Rules

| Rule | Configuration |
|------|---------------|
| Restrict deletions | Enabled |
| Block force pushes | Enabled |
| Require a pull request before merging | Enabled, dismiss stale reviews, 1 approval minimum |
| Required status checks | See [Required Checks](#required-checks) below |
| Require branches to be up-to-date before merging | Enabled |

## Ruleset: `protected-release`

Target: branch pattern `release/**`.

Enforcement: **Active**.

### Rules

| Rule | Configuration |
|------|---------------|
| Restrict deletions | Enabled |
| Block force pushes | Enabled |
| Require a pull request before merging | Enabled, dismiss stale reviews, 2 approvals minimum |
| Required status checks | See [Required Checks](#required-checks) below, plus `Lifecycle Control Gates` |
| Require branches to be up-to-date before merging | Enabled |

## Ruleset: `protected-lts`

Target: branch pattern `lts/**`.

Enforcement: **Active**.

### Rules

| Rule | Configuration |
|------|---------------|
| Restrict deletions | Enabled |
| Block force pushes | Enabled |
| Require a pull request before merging | Enabled, dismiss stale reviews, 1 approval minimum |
| Require signed commits | Enabled |
| Required status checks | `Secret Scan`, `Dependency Review`, `CI Baseline` |

## Required Checks

The following CI workflow checks must pass before merge on protected branches.
The specific subset required per branch is noted in each ruleset above.

| Check Workflow | File | Applies To |
|----------------|------|------------|
| `CI Baseline` | `ci.yml` | `main`, `dev`, `release/**` |
| `Secret Scan` | `secret-scan.yml` | `main`, `dev`, `release/**`, `lts/**` |
| `Dependency Review` | `dependency-review.yml` | All PRs (no branch filter) |
| `Repository Hygiene Guard` | `hygiene.yml` | `main`, `dev`, `release/**` |
| `Lifecycle Control Gates` | `lifecycle-control-gates.yml` | `main`, `dev`, `release/**` |
| `BOS production boundary guard` | `bos-production-guard.yml` | `main`, `dev`, `release/**` |
| `Implementation Drift Guard` | `hygiene-drift-guard.yml` | `main`, `dev`, `release/**` |

> **Note**: The `Multi-Environment Deployment Validation` and `End-to-End Synergy Testing`
> workflows run on protected branches but are treated as confidence gates, not
> required checks. Teams may promote them to required at their discretion per
> [`RELEASING.md`](../RELEASING.md).

## Verification Cadence

Per [conxius-platform#917](https://github.com/Conxian/conxius-platform/issues/917):

- **Quarterly**: Maintainers verify all four rulesets are active and aligned with this document.
- **On policy change**: Rulesets are re-verified whenever `RELEASE_POLICY.md`,
  `BRANCH-MAINTENANCE.md`, or this document is updated.
- **CI workflow change**: Required checks lists are re-verified when workflow files
  are added, removed, or renamed.

## Drift Detection

If GitHub rulesets do not match the policy defined here:

1. Open a tracking issue with label `Hygiene` referencing conxius-platform#917.
2. Update the rulesets via the GitHub repository settings UI or API.
3. Update this document if the policy itself has evolved.

## See Also

- [`RELEASE_POLICY.md`](../RELEASE_POLICY.md) — Branch promotion cycle and LTS gate policy
- [`docs/BRANCH-MAINTENANCE.md`](../docs/BRANCH-MAINTENANCE.md) — Branch lifecycle and cleanup
- [`.github/CONXIUS_CICD_BASELINE.md`](./CONXIUS_CICD_BASELINE.md) — CI/CD baseline standards
- [`.github/RELEASE_HYGIENE.md`](./RELEASE_HYGIENE.md) — Release hygiene and checks
- [`.github/ORG_SECURITY_GOVERNANCE.md`](./ORG_SECURITY_GOVERNANCE.md) — Org-wide rulesets and push protection
- [`.github/ORG_EXCEPTIONS.md`](./ORG_EXCEPTIONS.md) — Approved exceptions to org security requirements
