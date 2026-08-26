# CI/CD Baseline Gap Analysis

Maps current implementation status against the strict enforcement model
defined in [#1103](https://github.com/Conxian/conxius-platform/issues/1103). Last updated: 2026-07-04 (v2 — post-audit).

## Gap Summary

| Gate | Current State | Target | Status |
|------|--------------|--------|--------|
| No green build, no merge | ⚠️ Required checks are defined locally; remote branch protection is not verifiable with the current read-only evidence | Strict | **Owner evidence required** |
| No required checks, no merge | ⚠️ Workflow candidates exist locally; required-check rulesets must be verified in GitHub | Strict | **Owner evidence required** |
| No pinned actions, no workflow acceptance | ✅ All actions pinned to major versions. CONXIUS_CICD_BASELINE.md documents pins. Drift guard validates. | Strict | **Met** |
| No secret scan, no merge | ✅ `secret-scan.yml` (Gitleaks) required on PRs. Reusable at `reusable-secret-scan.yml` | Strict | **Met** |
| No dependency review, no merge | ✅ `dependency-review.yml` runs `actions/dependency-review-action@v5.0.0` on all PRs. | Strict | **Met** |
| No static analysis, no merge | 🏗️ CodeQL workflow added (`codeql.yml`). TypeScript strict mode enabled. No SAST previously. | Strict (critical repos) | **In progress** |
| No SBOM, no release | ✅ `anchore/sbom-action@v0.24.0` in `release.yml` generates CycloneDX SBOM per release | Strict | **Met** |
| No provenance/attestation, no release | 🏗️ SLSA provenance generator added to `release.yml` via `slsa-framework/slsa-github-generator`. Previously SBOM-only. | Strict (build-artifact repos) | **In progress** |
| No environment approval, no production deploy | ✅ `.env.production.schema` validation in release. Deploy gating via Render/Docker | Strict | **Met** |
| No rollback path, no production release | ⚠️ Rollback documented in runbooks. No automated rollback workflow. Low priority for conxius-platform (no direct deployment). | Strict (deployment repos) | **Deferred** |
| No repo-native ownership, no issue acceptance | ✅ CODEOWNERS, GOVERNANCE.md, RELEASE_CONTROL.md, PR_TRIAGE_POLICY.md | Strict | **Met** |

**Conxius-platform status: 10/11 gates met or in progress, 1 deferred (rollback — not a deployment repo)**

## Detailed Gaps

### 1. Dependency Review on PRs — ✅ RESOLVED

`dependency-review.yml` runs `actions/dependency-review-action@v5.0.0` on all PRs.
The reusable variant was removed in 2026-07 (no callers).

### 2. Static Analysis (SAST) — 🏗️ IN PROGRESS

`codeql.yml` has been added with JavaScript/TypeScript analysis running on PRs
and pushes to main. CodeQL provides security vulnerability detection, data flow
analysis, and code quality checks.

Coverage: TypeScript/JavaScript (the primary conxius-platform language).
Python and Rust repos need their own CodeQL configuration.

### 3. Provenance / Attestation — 🏗️ IN PROGRESS

SLSA v1.0 provenance generation added to `release.yml` via
`slsa-framework/slsa-github-generator`. The generator produces signed attestations
proving the release artifacts originated from the claimed commit and workflow.

For `conxius-platform` (tag-only releases without build artifacts), SBOM +
provenance satisfies the strict gate. Repos that produce build artifacts
(conxian-gateway, conxius-wallet, conxius-enclave-sdk) need the full SLSA
builder flow.

### 4. Automated Rollback — DEFERRED

Rollback procedures are documented in runbooks but not automated. Low priority
for `conxius-platform` (no direct deployment). Higher priority for
deployment-bearing repos (conxian-gateway, conxian_ui, conxian-labs-site).

## Evidence interpretation

The table above describes repository-local workflow configuration, not proof that GitHub organization rulesets or branch protection are active. The read-only audit can verify workflow files and action pins; it cannot verify required-check enforcement when the branch-protection endpoint is unavailable. Until owner/admin evidence is attached, the relevant rows remain owner actions.

## Cross-Repo Status

| Repo | Classification | Baseline Status |
|------|---------------|-----------------|
| conxius-platform | Critical | **10/11 gates** — CodeQL + provenance added this session |
| conxian-gateway | Critical | Needs assessment (Rust — CodeQL for Rust, SLSA builder for binaries) |
| conxian-nexus | Critical | Needs assessment (Python — CodeQL for Python, SLSA for packages) |
| lib-conxian-core | Critical | Needs assessment (Rust lib — shared primitives, no deploy artifacts) |
| conxius-wallet | Critical | Needs assessment (TypeScript/Android — build artifacts, SLSA builder) |
| conxius-orbit | Critical | Needs assessment (Python + Node wrapper — PyPI publish, SLSA) |
| conxius-enclave-sdk | Critical | Needs assessment (Rust — binary artifacts, hardware attestation) |
| conxian_ui | Public surface | Needs assessment (TypeScript/Next.js — static export, public-release gate) |
| conxian-labs-site | Public surface | Needs assessment (HTML — static site, public-release gate) |
| conxian-business | Private ops | Needs assessment (TypeScript — private, workflow-permission gate) |

## Required Next Steps

1. ~~**Dependency review action**~~ — ✅ Already configured and active
2. ~~**CodeQL**~~ — 🏗️ Added for JS/TS in conxius-platform. Needs cross-repo rollout.
3. ~~**SLSA provenance**~~ — 🏗️ Added to release workflow. Build-artifact repos need SLSA builder.
4. **Cross-repo assessment** — Run this gap analysis against each repo in the portfolio
5. **Rollback automation** — Implement for deployment-bearing repos (gateway, conxian_ui, conxian-labs-site)

## Verification

- `hygiene-drift-guard.yml` validates workflow pin alignment on every push/PR
- `secret-scan.yml` validates no secrets on every push/PR
- `dependency-review.yml` validates dependency changes on every PR
- `codeql.yml` runs security analysis on PRs and main pushes
- `release.yml` validates tag format, main ancestry, .env.production.schema, changelog, SBOM, and provenance on every tag
- `.github/CONXIUS_CICD_BASELINE.md` documents the canonical action version baseline
