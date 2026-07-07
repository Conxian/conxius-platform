# Org-Level Security Governance

This document defines the org-wide GitHub rulesets, push protection requirements,
and security posture controls that must be enforced across the Conxian organization.

Traceability:

- Implements [conxius-platform#854](https://github.com/Conxian/conxius-platform/issues/854)
- Supports [conxius-platform#1103](https://github.com/Conxian/conxius-platform/issues/1103) (CI/CD strict enforcement EPIC)

## 1. Org-Level Rulesets

### 1.1 Required Org Rulesets

The following rulesets must be configured at the organization level (`Conxian`):

| Ruleset Name | Target | Enforcement | Key Rules |
|-------------|--------|-------------|-----------|
| `org-default-branch-protection` | All repositories | Active | PR required, require linear history, block force push |
| `org-secret-scanning-enforcement` | All repositories | Active | Secret scanning enabled, push protection enabled |
| `org-dependency-review` | All repositories | Active | Dependency review on PRs touching dependencies |
| `org-push-protection` | All public repositories | Active | Block commits containing secrets, require remediation |

### 1.2 Ruleset Configuration Requirements

#### Org Default Branch Protection

| Setting | Required Value |
|---------|---------------|
| Require pull request reviews | Enabled (1 approval minimum) |
| Dismiss stale reviews | Enabled |
| Require linear history | Enabled |
| Block force pushes | Enabled |
| Allow force pushes for admins | Disabled |
| Block deletions | Enabled |

#### Secret Scanning & Push Protection

| Setting | Required Value |
|---------|---------------|
| Secret scanning | Enabled (all repositories) |
| Push protection | Enabled (all public repositories) |
| Secret scanning alerts email notification | Enabled |
| Dependency review | Enabled (all repositories) |
| GitHub Advanced Security | Enabled where available |

## 2. Push Protection & Secret-Sanning Posture

### 2.1 Push Protection Requirements

All public repositories **must** have push protection enabled:

- **Block commits with secrets**: Commits containing detected secrets are blocked at push time
- **Remediation required**: Blocked pushes require secret removal or explicit bypass by security team
- **Audit trail**: All bypass events are logged and reviewed quarterly

### 2.2 Secret Scanning Configuration

```yaml
# Organization-level settings
secret_scanning:
  enabled: true
  push_protection: true
  alerts_notifications: true
  dependency_review: true
```

### 2.3 Secret Scanning Coverage

| Repository Type | Coverage Requirement |
|----------------|---------------------|
| Public repositories | 100% (mandatory) |
| Private repositories | 100% (mandatory) |
| Internal repositories | 100% (mandatory) |

## 3. Required Pull Request Review Requirements

### 3.1 Org-Wide PR Requirements

All repositories must enforce the following at the org level:

| Requirement | Configuration |
|------------|-------------|
| PR Required for all changes | Enabled |
| Dismiss stale reviews | Enabled |
| Require CODEOWNERS approval for `.github/**` | Enabled |
| Require approval before merge | Enabled |
| Allow auto-merge only with passing checks | Enabled |

### 3.2 Review Requirements by Repository Type

| Repository Type | Minimum Approvals | Required Reviewers |
|----------------|-------------------|-------------------|
| Critical (core services) | 2 | CODEOWNERS |
| Standard (platform) | 1 | CODEOWNERS |
| Public surface (docs, sites) | 1 | Any maintainer |
| Internal tooling | 0-1 | Discretionary |

## 4. Required Status Checks

### 4.1 Org-Level Required Checks

The following checks must be required for merge to protected branches:

| Check | Applies To | Required |
|-------|-----------|----------|
| `CI Baseline` | All protected branches | Yes |
| `Secret Scan` | All branches with commits | Yes |
| `Dependency Review` | All PRs touching dependencies | Yes |
| `Repository Hygiene Guard` | Protected branches | Yes |
| `Lifecycle Control Gates` | Protected branches | Yes |

### 4.2 Required Checks by Branch Type

| Branch Pattern | Required Checks |
|---------------|----------------|
| `main` | CI, Secret Scan, Dependency Review, Hygiene, Lifecycle Gates, BOS Guard, Drift Guard |
| `dev` | CI, Secret Scan, Dependency Review, Hygiene, Lifecycle Gates |
| `release/**` | CI, Secret Scan, Dependency Review, Hygiene, Lifecycle Gates, +2 approvals |
| `lts/**` | Secret Scan, Dependency Review, Signed Commits, 2 approvals |

## 5. Branch Protection on Priority Repositories

### 5.1 Priority Public Repositories

The following repositories require enhanced branch protection:

| Repository | Classification | Protection Level |
|-----------|---------------|-----------------|
| `.github` | Critical | Highest — CODEOWNERS-only merges |
| `Conxian` | Critical | Highest — CODEOWNERS-only merges |
| `conxius-wallet` | Critical | High — 2 approvals + signed commits |
| `conxian-gateway` | Critical | High — 2 approvals + signed commits |
| `conxian-nexus` | Critical | High — 2 approvals + signed commits |
| `lib-conxian-core` | Critical | High — CODEOWNERS + CI |
| `conxius-platform` | Platform | Standard — 1 approval + CI |
| `conxius-enclave-sdk` | Critical | High — 2 approvals + signed commits |
| `conxian_ui` | Public surface | Standard — 1 approval + CI |
| `conxian-labs-site` | Public surface | Standard — 1 approval + CI |

### 5.2 Priority Repository Requirements

#### Highest Protection (`.github`, `Conxian`)

| Requirement | Configuration |
|------------|-------------|
| Required approvals | CODEOWNERS only |
| Dismiss stale reviews | Enabled |
| Require signed commits | Enabled |
| Require linear history | Enabled |
| Block force pushes | Enabled |
| Required status checks | All CI checks |
| Restrict who can push | CODEOWNERS + release app |

#### High Protection (Critical repos)

| Requirement | Configuration |
|------------|-------------|
| Required approvals | 2 minimum |
| CODEOWNERS approval | Required for sensitive paths |
| Require signed commits | Enabled |
| Require linear history | Enabled |
| Block force pushes | Enabled |
| Required status checks | All CI checks |

#### Standard Protection (Platform/Public)

| Requirement | Configuration |
|------------|-------------|
| Required approvals | 1 minimum |
| Require linear history | Enabled |
| Block force pushes | Enabled |
| Required status checks | CI, Secret Scan, Dependency Review |

## 6. Dependency Review Coverage

### 6.1 Dependency Review Requirements

All repositories must have dependency review enabled for PRs:

| Trigger | Action |
|---------|--------|
| New dependency added | Block if vulnerable |
| Dependency version bump | Block if vulnerable |
| New transitive dependency | Block if vulnerable |

### 6.2 Dependency Review Configuration

```yaml
# Organization-level dependency review settings
dependency_review:
  enabled: true
  fail_on_severity: high, critical
  allow_acknowledged: false
  comment_on_additions: true
```

### 6.3 Dependency Update Coverage

| Update Type | Required Action |
|-------------|----------------|
| Major version bump | Security review required |
| Minor version bump | Automated check sufficient |
| Patch version bump | Automated check sufficient |
| New transitive dependency | Automated check sufficient |

## 7. Repo-Level Exceptions

### 7.1 Exception Request Process

To request a repository-level exception:

1. Open an issue in `conxius-platform` with:
   - Repository name
   - Exception type requested
   - Business justification
   - Duration (temporary or permanent)
   - Mitigation plan

2. Security team reviews within 5 business days

3. Exception documented in `.github/ORG_EXCEPTIONS.md`

### 7.2 Exception Types

| Exception Type | Requires Approval | Documentation |
|---------------|------------------|---------------|
| Disable secret scanning | Security team | Required |
| Reduce approval count | CODEOWNERS + Security | Required |
| Allow force pushes | Security team | Required |
| Disable linear history | Security team | Required |
| Disable dependency review | Security team | Required |
| Custom branch protection | CODEOWNERS | Required |

### 7.3 Exception Review Cadence

All exceptions are reviewed quarterly:

- Temporary exceptions expire automatically
- Permanent exceptions require annual re-approval
- Exceptions are documented in `.github/ORG_EXCEPTIONS.md`

## 8. Verification & Audit

### 8.1 Verification Cadence

Per [conxius-platform#854](https://github.com/Conxian/conxius-platform/issues/854):

- **Quarterly**: Full org-level ruleset audit
- **Monthly**: Automated verification of required checks
- **Weekly**: Secret scanning and push protection review
- **On-demand**: After any org or repo configuration change

### 8.2 Automated Verification

Automated verification is available via:

| Tool | Description | Usage |
|------|-------------|-------|
| `.github/workflows/org-security-verify.yml` | GitHub Actions workflow for periodic verification | Run manually or on schedule |
| `scripts/verify_org_security.py` | Python script for detailed verification | `python scripts/verify_org_security.py --org Conxian --token $GITHUB_TOKEN` |

**Running Verification:**

```bash
# Using the script (requires GitHub token)
python scripts/verify_org_security.py --org Conxian --token $GITHUB_TOKEN --output markdown

# Using the workflow (GitHub Actions)
# Navigate to: Actions > Org Security Verification > Run workflow
```

### 8.3 Verification Evidence

Verification evidence must include:

- Screenshot or API output of ruleset configuration
- Date and time of verification
- Verifier identity
- Any discrepancies found

### 8.4 Verification Repository Checklist

Priority repositories for live verification:

- [ ] `.github` — ruleset configuration
- [ ] `Conxian` — ruleset configuration
- [ ] `conxius-wallet` — branch protection + status checks
- [ ] `conxian-gateway` — branch protection + status checks
- [ ] `conxian-nexus` — branch protection + status checks
- [ ] `lib-conxian-core` — branch protection + status checks
- [ ] `conxius-platform` — branch protection + status checks
- [ ] `conxius-enclave-sdk` — branch protection + status checks
- [ ] `conxian_ui` — branch protection + status checks
- [ ] `conxian-labs-site` — branch protection + status checks

## 9. Live-Only Verification Rule

> **Critical**: Do not close this issue from documentation or repo-file presence alone.
> Close it only when settings-level evidence is captured repo by repo or org-wide.

Acceptable verification evidence:

- GitHub API response showing ruleset configuration
- GitHub Settings UI screenshot with timestamp
- Terraform/IaC configuration with apply confirmation
- Secret scanning alerts showing active blocking

Unacceptable verification evidence:

- Documentation file presence alone
- Workflow file existence alone
- CODEOWNERS file presence alone

## 10. See Also

- [`.github/BRANCH_PROTECTION_RULESETS.md`](./BRANCH_PROTECTION_RULESETS.md) — Repo-level ruleset definitions
- [`.github/CONXIUS_CICD_BASELINE.md`](./CONXIUS_CICD_BASELINE.md) — CI/CD baseline standards
- [`.github/workflows/org-security-verify.yml`](../.github/workflows/org-security-verify.yml) — Automated verification workflow
- [`scripts/verify_org_security.py`](../scripts/verify_org_security.py) — Verification script
- [`RELEASE_POLICY.md`](../RELEASE_POLICY.md) — Release promotion cycle and branch strategy
- [`docs/BRANCH-MAINTENANCE.md`](../docs/BRANCH-MAINTENANCE.md) — Branch lifecycle management
