# Conxius Platform CI/CD Baseline (Issue #968)

This document defines the control-plane, deployment orchestration, and GitOps ownership boundaries for the Conxius Platform repository, establishing org-wide CI/CD standards.

## 1. Core Principles

### 1.1 Security-First Design
- All workflows must use **immutable action pins** (SHA references) for sensitive actions
- Minimal permissions principle: request only the permissions required for the job
- Secret scanning is mandatory for all PRs and pushes to protected branches

### 1.2 Fail-Closed Deployment Rules
- Production deployments require explicit approval gates
- Merge-to-main does not automatically trigger production deployment
- Protected environments must be used for higher-risk delivery paths

### 1.3 Ownership Boundaries
The Conxius Platform repository owns:
- Operator/admin services that ship from this repo (e.g., `services/admin-dashboard`)
- Secrets provisioning and operator tooling
- Orchestration wiring (submodule pins, `docker-compose.yml`, CI workflows)
- Deployment orchestration for control-plane services

The Conxius Platform must NOT own:
- Core Nexus/Gateway production logic (belongs in their respective repositories)
- Protocol-level decisions
- Production infrastructure that should be managed via GitOps

## 2. Mandatory CI Controls

### 2.1 PR Validation on Protected Branches
All PRs targeting `main` and `develop` must pass:
- ✅ Lint validation (`pnpm lint`)
- ✅ Typecheck validation (`pnpm typecheck`)
- ✅ Unit tests (`pnpm test`)
- ✅ Secret scanning (gitleaks)
- ✅ Dependency review
- ✅ Hygiene audit

### 2.2 Action Pinning Standards
All GitHub Actions must use immutable references:

| Action | Current Pin | Migration Target |
|--------|------------|------------------|
| `actions/checkout` | `@v4` (major-version tag) | Full commit SHA (Phase 7) |
| `actions/setup-node` | `@v4` (major-version tag) | Full commit SHA (Phase 7) |
| `actions/setup-python` | `@v5` (major-version tag) | Full commit SHA (Phase 7) |
| `docker/setup-buildx-action` | `@v4` | Full commit SHA (Phase 7) |

**Current state**: Major-version tags (`@v4`, `@v5`) provide reasonable immutability for GitHub's own actions and are the approved baseline. Full commit-SHA pinning is tracked as a Phase 7 target for enhanced supply-chain security.

```yaml
# Current (approved baseline):
- uses: actions/checkout@v4

# Future target (Phase 7):
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.2.0
```

### 2.3 Workflow Permissions
Follow the principle of least privilege:

| Workflow Type | Required Permissions |
|---------------|---------------------|
| CI/Lint/Test | `contents: read` |
| Secret Scan | `contents: read` |
| Dependency Review | `contents: read`, `pull-requests: write` |
| Release | `contents: write` |
| Deployment | `contents: read`, `deployments: write` |

## 3. Deployment Patterns

### 3.1 Direct Deploy from Actions (Low-Risk)
For documentation, previews, and testnet flows:
```yaml
permissions:
  contents: write
  deployments: write
```
Deploy directly from GitHub Actions using ephemeral credentials.

### 3.2 Environment-Gated Deployment (Medium-Risk)
For staging and pre-production:
```yaml
environment:
  name: staging
  url: ${{ steps.deploy.outputs.url }}
```
Require reviewer approval for environment access.

### 3.3 GitOps for Production (High-Risk)
For long-lived production services:
- Use ArgoCD, Flux, or similar GitOps operators
- Production changes via separate GitOps repository
- Immutable deployment manifests

## 4. Release Discipline

### 4.1 Tag-Based Release Workflow
- SemVer tags (`v*.*.*`) trigger release workflow
- Release validation:
  - Tag must point to commit in `main`
  - CHANGELOG section must exist
  - Security review for breaking changes

### 4.2 Release Artifacts
| Artifact Type | Storage | Access |
|--------------|---------|--------|
| Docker images | GHCR | Public |
| NPM packages | npmjs | Public |
| NixOS configs | Source repo | Public |

## 5. Governance Compliance

### 5.1 Required Workflows
This repository MUST maintain these workflows:
- `ci.yml` - PR validation baseline
- `secret-scan.yml` - Gitleaks integration
- `dependency-review.yml` - Dependency vulnerability scanning
- `hygiene.yml` - Repository hygiene audit
- `release.yml` - Tag-based release automation

### 5.2 CODEOWNERS Requirements
- All `.github/workflows/**` must be owned by `@botshelomokoka @admin-conxian-labs`
- Release configuration owned by security admins
- No individual contributors should have merge rights to workflow changes

### 5.3 Audit Trail
- All workflow runs must be logged
- Failed security checks must block merges
- Release tags must be signed and verified

## 6. Cross-Repository Alignment

### 6.1 Reusable Workflows
Other repositories may consume workflows from this repo:

```yaml
jobs:
  ci:
    uses: Conxian/conxius-platform/.github/workflows/reusable-ci.yml@main
  secret-scan:
    uses: Conxian/conxius-platform/.github/workflows/reusable-secret-scan.yml@main
```

### 6.2 Environment Standards
Repositories inheriting from this baseline must:
- Define their own `production` environment with protection rules
- Document any deviations from this baseline
- Include deviation rationale in their `CONTRIBUTING.md`

## 7. Future GitOps Ownership

### 7.1 Target State (Phase 7)
- Declarative NixOS deployment as target
- GitOps operator for production infrastructure
- Separation of CI (validation) and CD (deployment)

### 7.2 Migration Path
1. Current: CI/CD via GitHub Actions + manual deployments
2. Near-term: Enhanced environment protection + approval gates
3. Target: GitOps-based declarative infrastructure

---

*Maintained per Issue #968 - Org-wide CI/CD Governance Baseline*
*Last updated: June 2026*
