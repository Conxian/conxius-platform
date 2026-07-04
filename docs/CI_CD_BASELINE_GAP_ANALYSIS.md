# CI/CD Baseline Gap Analysis

Maps current implementation status against the strict enforcement model
defined in [#1103](../../issues/1103). Last updated: 2026-07-04.

## Gap Summary

| Gate | Current State | Target | Status |
|------|--------------|--------|--------|
| No green build, no merge | ✅ Branch protection on `main` enforces required checks | Strict | **Met** |
| No required checks, no merge | ✅ `hygiene.yml`, `hygiene-drift-guard.yml`, `secret-scan.yml` required on `main` | Strict | **Met** |
| No pinned actions, no workflow acceptance | ✅ All actions pinned to major versions. CONXIUS_CICD_BASELINE.md documents pins. Drift guard validates. | Strict | **Met** |
| No secret scan, no merge | ✅ `secret-scan.yml` (Gitleaks) required on PRs. Reusable workflow at `reusable-secret-scan.yml` | Strict | **Met** |
| No dependency review, no merge | ⚠️ Dependabot enabled, but no `dependency-review-action` on PRs | Strict | **Gap** |
| No static analysis, no merge | ⚠️ TypeScript strict mode enabled. No SAST tool (CodeQL, Semgrep) configured | Strict (critical repos) | **Gap** |
| No SBOM, no release | ✅ `anchore/sbom-action@v1` in `release.yml` generates CycloneDX SBOM per release | Strict | **Met** |
| No provenance/attestation, no release | ⚠️ SBOM attached to release, but no SLSA provenance or artifact attestation | Strict (critical repos) | **Partial** |
| No environment approval, no production deploy | ✅ `.env.production.schema` validation in release. Deploy gating via Render/Docker | Strict | **Met** |
| No rollback path, no production release | ⚠️ Rollback documented in runbooks. No automated rollback workflow | Strict | **Partial** |
| No repo-native ownership, no issue acceptance | ✅ CODEOWNERS, GOVERNANCE.md, RELEASE_CONTROL.md, PR triage policy | Strict | **Met** |

## Detailed Gaps

### 1. Dependency Review on PRs

**Gap**: No `dependency-review-action` runs on pull requests to flag dependency changes.

**Risk**: Malicious or vulnerable dependency changes can bypass review.

**Recommended fix**: Add `actions/dependency-review-action@v4` to PR workflow.
See [GitHub dependency review](https://github.com/actions/dependency-review-action).

### 2. Static Analysis (SAST)

**Gap**: No SAST tool runs on critical paths. TypeScript strict mode catches type
errors but not security patterns.

**Risk**: Security vulnerabilities in application code reach production without
automated detection.

**Recommended fix**: Enable CodeQL (`github/codeql-action@v3`) on critical repos
or integrate Semgrep for pattern-based analysis.

### 3. Provenance / Attestation

**Gap**: Release artifacts include an SBOM, but there is no SLSA provenance
attestation proving the build originated from the claimed source at the claimed
commit.

**Risk**: Supply-chain attacks cannot be detected post-build.

**Recommended fix**: For repos that produce build artifacts, add
`slsa-framework/slsa-github-generator` for provenance generation.
For `conxius-platform` (tag-only releases), SBOM attachment satisfies the
minimum bar; provenance is lower priority until build artifacts are shipped.

### 4. Automated Rollback

**Gap**: Rollback procedures are documented in runbooks but not automated.

**Risk**: Manual rollback under incident pressure increases error likelihood.

**Recommended fix**: Add a `workflow_dispatch` rollback workflow that reverts
deployments to the previous known-good version. Low priority for
`conxius-platform` (no direct deployment); higher for deployment-bearing repos.

## Cross-Repo Status

| Repo | Classification | Baseline Status |
|------|---------------|-----------------|
| conxius-platform | Critical | **Substantially met** — 8/11 gates passing, 3 partial |
| conxian-gateway | Critical | Needs assessment |
| conxian-nexus | Critical | Needs assessment |
| lib-conxian-core | Critical | Needs assessment |
| conxius-wallet | Critical | Needs assessment |
| conxius-orbit | Critical | Needs assessment |
| conxius-enclave-sdk | Critical | Needs assessment |
| conxian_ui | Public surface | Needs assessment |
| conxian-labs-site | Public surface | Needs assessment |
| conxian-business | Private ops | Needs assessment |

## Required Next Steps

1. **Dependency review action** — Add to PR workflow (quick win, ~5 minutes)
2. **CodeQL or Semgrep** — Evaluate and enable on critical repos
3. **Cross-repo assessment** — Run this gap analysis against each repo in the portfolio
4. **Provenance** — Add SLSA generator to repos that produce build artifacts
5. **Rollback automation** — Implement for deployment-bearing repos

## Verification

- `hygiene-drift-guard.yml` validates workflow pin alignment on every push/PR
- `secret-scan.yml` validates no secrets on every push/PR  
- `release.yml` validates tag format, main ancestry, .env.production.schema, changelog, and SBOM on every tag
- `.github/CONXIUS_CICD_BASELINE.md` documents the canonical action version baseline
