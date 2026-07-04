# Release Control Path

Canonical release-governance document for the Conxian repository portfolio.
Coordinated from [conxius-platform#1103](https://github.com/Conxian/conxius-platform/issues/1103).

## 1. Release Pipeline Decision

Release pipelines are **not** configured in Linear. Linear is used for
issue tracking and work orchestration only.

The release control path is implemented as an explicit, version-controlled
mechanism in each shipping repository:

- **Control surface**: GitHub Actions workflows with required-check enforcement
  and branch-protection rules, not Linear status transitions.
- **Release gating**: Release-readiness is determined by verifiable CI
  artifacts (attestations, SBOMs, provenance) rather than issue state or
  workflow discipline.
- **Auditability**: Every release gate produces durable, machine-verifiable
  evidence stored alongside the release artifact. Linear issues may link to
  these artifacts but do not substitute for them.

## 2. Repository Classification

### Release-Bearing Repos

Repos that produce artifacts distributed to users, downstream consumers, or
production environments. All release controls in §3 apply.

| Repo | Risk Class | Notes |
|------|-----------|-------|
| `conxius-platform` | Critical | Platform coordination and governance |
| `conxian-gateway` | Critical | API gateway, production ingress |
| `conxian-nexus` | Critical | Service mesh / routing |
| `lib-conxian-core` | Critical | Shared core library consumed by other repos |
| `conxius-wallet` | Critical | Wallet service |
| `conxius-orbit` | Critical | Orbit service |
| `conxius-enclave-sdk` | Critical | Enclave SDK distributed to integrators |
| `conxian_ui` | Public Surface | Public-facing user interface |
| `conxian-labs-site` | Public Surface | Public website |

### Support-Only Repos

Repos that do not produce distributable artifacts. Release controls are
scoped down (see §4).

| Repo | Classification | Notes |
|------|---------------|-------|
| `conxian-business` | Private Ops | Internal business operations |

## 3. Minimum Release Controls for Shipping Repos

Every release-bearing repo MUST satisfy the following gates before a
release can be considered credible. Each gate produces reviewable evidence.

### 3.1 Critical Repos (strict gate)

| Gate | Evidence | Enforcement |
|------|----------|-------------|
| Build verification | Green CI on merge commit | Branch protection, required status check |
| Required checks | All configured checks passing | Branch protection ruleset |
| Secret scanning | Clean scan on PR and default branch | Push-level and scheduled scanning |
| Dependency review | Reviewed dependency changes on PR | Dependency-review-action, required |
| Static analysis | SAST pass on critical paths | CodeQL or equivalent, required |
| SBOM | SPDX SBOM generated and attached to release | Release workflow artifact |
| Provenance / attestation | SLSA provenance generated for release artifact | Sigstore / GitHub attestations |
| Environment approval | Manual approval gate before production deploy | Deployment environment protection rule |
| Rollback path | Documented rollback procedure in repo | Verified during release review |
| Repo-native ownership | CODEOWNERS covering all paths | Branch protection with required reviews |

### 3.2 Public Surface Repos (public-release gate)

| Gate | Evidence | Enforcement |
|------|----------|-------------|
| Build verification | Green CI on merge commit | Branch protection, required status check |
| Required checks | All configured checks passing | Branch protection ruleset |
| Secret scanning | Clean scan on PR and default branch | Push-level and scheduled scanning |
| Dependency review | Reviewed dependency changes on PR | Dependency-review-action, required |
| SBOM | SPDX SBOM generated and attached to release | Release workflow artifact |
| Provenance / attestation | SLSA provenance generated for release artifact | Sigstore / GitHub attestations |
| Rollback path | Documented rollback procedure in repo | Verified during release review |
| Repo-native ownership | CODEOWNERS covering all paths | Branch protection with required reviews |

## 4. Justified Exceptions

### `conxian-business` (Private Ops)

This repo is classified as support-only because it handles internal business
operations and does not ship artifacts to external consumers. The following
controls are relaxed:

- **SBOM and provenance**: Not required (no external distribution).
- **Static analysis**: Recommended but not gating.
- **Environment approval**: Scoped to the private boundary only.

All other controls (build verification, required checks, secret scanning,
dependency review, rollback path, CODEOWNERS) remain in effect.

## 5. Evidence and Reviewability

Release readiness must be evaluable from durable, machine-verifiable
evidence rather than ad hoc interpretation of scattered workflows or issue
state.

- **Release attestation bundle**: Each release produces an attestation
  bundle containing the SBOM, provenance statement, and check-run summary.
  This bundle is the single source of truth for release credibility.
- **Release review checklist**: Each release-bearing repo maintains a
  `RELEASE_CHECKLIST.md` that maps each gate in §3 to the specific workflow
  or tool that satisfies it.
- **Drift detection**: A scheduled workflow in `conxius-platform` verifies
  that each release-bearing repo's actual branch protection, required
  checks, and workflow configuration match the declared baseline. Drift
  opens an issue automatically.

## 6. Acceptance Criteria

- [ ] Each release-bearing repo has a `RELEASE_CHECKLIST.md` mapping gates to
  workflows
- [ ] Each release-bearing repo has branch protection and required checks
  matching its risk class
- [ ] Release attestation bundles are generated and retained for each
  release
- [ ] Drift detection workflow is active in `conxius-platform`
- [ ] `conxian-business` exceptions are documented and reviewed
