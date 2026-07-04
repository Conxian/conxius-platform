# PR Triage, Issue Linkage, and Dependency-Update Policy

Standardizes operational discipline for pull requests across public Conxian
repositories. Addresses [conxius-platform#952](https://github.com/Conxian/conxius-platform/issues/952).

## 1. Issue Linkage

### When a PR must reference an issue

| PR type | Issue required? | Format |
|---------|----------------|--------|
| Feature / enhancement | **Yes** | `Closes #NNN` or `Refs #NNN` in PR body |
| Bug fix | **Yes** | `Fixes #NNN` in PR body |
| Documentation-only change | Optional | `Refs #NNN` if tracked |
| Dependency update (Dependabot) | No | Dependabot branch name is sufficient |
| CI / workflow maintenance | Yes (if tracked) | `Refs #NNN` |
| Hotfix / emergency | **Yes** | Issue may be created retroactively; link in PR |

### Linkage format

Linkage must appear in the PR body, not just the branch name or commit
message. Use GitHub's auto-close keywords (`Closes`, `Fixes`, `Resolves`)
when the PR completes the issue. Use `Refs` for partial or preparatory work.

## 2. Dependency-Update Triage

Dependency PRs (Dependabot or grouped) follow a triage decision tree
instead of accumulating passively.

### Decision tree

```
Dependency PR opened
  │
  ├── CI GREEN → Proceed to review, merge if low-risk (patch/minor)
  │
  └── CI RED
        │
        ├── Baseline CI failure (unrelated to the dep change)?
        │     ├── YES → Retry CI. If still red after 2 retries, add
        │     │         `ci-known-flake` label and document blocker.
        │     │         Merge if only baseline flake and dep change
        │     │         is low-risk.
        │     └── NO  → Dep introduces breakage. Open a tracking issue,
        │               add `dep-blocked` label, and pause the PR.
        │
        └── PR-specific regression?
              ├── YES → Do not merge. Open tracking issue. Add
              │         `dep-blocked` label. Close PR if no resolution
              │         within 14 days.
              └── UNCLEAR → Retry CI once. If still red, treat as
                            PR-specific regression.
```

### Batching and retry rules

| Rule | Action |
|------|--------|
| Grouped update PRs | Batch weekly. Review all together. |
| Same-dep repeated failures | After 3 failed CI runs, open an investigation issue and pause auto-updates for that dep. |
| Stale dep PR (>30 days) | Close with comment linking the investigation issue. |
| Security patches | Expedite. Do not batch. Review within 48 hours. |

### Labels

| Label | Meaning |
|-------|---------|
| `dep-blocked` | Dependency update blocked by CI regression |
| `ci-known-flake` | CI failure is a known flake, not PR-specific |
| `dep-batch` | Part of a grouped update batch |
| `dep-security` | Security-related dependency update; expedite |

## 3. PR Review Checklist

Every non-trivial PR reviewer should verify:

- [ ] **Linked issue**: PR body references a tracked issue (or reason for
  exemption is documented).
- [ ] **CI status**: All required checks are green. Baseline failures are
  distinguished from PR-specific regressions.
- [ ] **True blocker**: If CI is red, the failure is attributable to this
  PR's changes and not a pre-existing condition.
- [ ] **Merge readiness**: PR is not a draft. Review approvals are
  complete. Branch is up to date with the base.
- [ ] **Owner**: An assignee is set. The PR has a clear owner responsible
  for seeing it through.

## 4. Cross-Repo Alignment

This policy applies to all public Conxian repositories. Private repos
(`conxian-business`) may adjust the dependency-update triage timeline
but must follow the issue-linkage and review-checklist rules.

Repos that already enforce stricter rules (e.g., `conxius-platform` with
its lifecycle control gates) are not relaxed by this policy. This document
sets the **minimum** standard.

### Repository-specific overrides

| Repo | Override |
|------|----------|
| `conxius-platform` | Lifecycle control gates required per `RELEASE_POLICY.md` |
| `conxian-gateway` | Integration test suite must pass before merge |
| `conxius-orbit` | Cross-repo control alignment per `GOVERNANCE.md` |

## 5. Drift Prevention

Repository maintainers must ensure their branch protection rules and
required-check configuration enforce the linkage and CI-passing
requirements declared here. Configurations that drift from this policy
open a remediation issue automatically.

## 6. Policy Maintenance

This document is part of the governance baseline. Changes follow the
standard contribution flow (PR against `dev`) and require at least
one maintainer approval.
