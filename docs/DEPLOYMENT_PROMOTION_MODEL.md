# Deployment Promotion Model

This document defines how the `conxius-platform` control plane owns and guides deployment promotion across the Conxian ecosystem. It distinguishes three tiers of responsibility and establishes the rules for advancing software through environments.

## Control-Plane Boundary

The Conxian ecosystem distributes delivery responsibility across three tiers. This repository governs the boundary between them.

| Tier | Owner | Scope | Tools |
|------|-------|-------|-------|
| **Repo CI** | Individual repository | Lint, typecheck, unit test, build, secret scan | GitHub Actions (per-repo) |
| **Release Orchestration** | `conxius-platform` (this repo) | Cross-repo coordination, shared workflows, schema enforcement, promotion gating | Reusable workflows, `deployment-manifest.json`, `verification-result.json` |
| **Deployment Promotion** | `conxius-platform` + environment owners | Environment gating, approval chains, rollback authority, GitOps sync | Environment protection rules, GitOps manifests |

### What lives where

**In individual application repos** (not here):
- Application-specific CI steps (language-specific lint, build, test)
- Service-level Dockerfiles and build configuration
- Repo-local integration tests
- Application dependency management

**In `conxius-platform` (control plane)**:
- Shared, reusable CI workflows consumable by all repos
- Cross-repo deployment manifest and verification schemas
- Environment inventory and promotion rules
- GitOps manifests for long-lived production services (target state)
- Operator/admin tooling and secrets provisioning patterns

**Neither place**:
- Production credentials or secret-bearing environment files
- Internal finance or business development records
- Legal drafts

## Environment Promotion Ladder

```
dev ──► staging ──► production
 │                    ▲
 └──► testnet ───────┘
```

### Promotion Rules

| From | To | Gate |
|------|----|------|
| `dev` | `staging` | CI green (lint, typecheck, test, secret scan, hygiene). No approval required. |
| `staging` | `production` | CI green + `verification-result.json` with `outcome: passed` + environment approval + CHANGELOG section exists + tag on `main`. |
| `dev` | `testnet` | CI green. No approval required. |
| `testnet` | `production` | CI green + `verification-result.json` with `outcome: passed` + environment approval + tag on `main`. |

### Promotion Artifacts

Every deployment that crosses an environment boundary must emit:

1. **`deployment-manifest.json`** — per `schemas/deployment-manifest.schema.json`. Describes what was deployed, where, with artifact checksums.
2. **`verification-result.json`** — per `schemas/verification-result.schema.json`. Evidence that the deployment passed required gates.

These artifacts are consumed by:
- **Platform** (this repo): promotion gating and audit trail
- **Gateway**: service discovery and health integration
- **Nexus**: state verification anchoring
- **Release workflows**: automated release note generation

## Deployment Models

### Direct from Actions (low-risk)
For docs, previews, and testnet services where blast radius is small. No promotion required — merge to `main` or `develop` triggers deploy.

### Environment-Gated (medium-risk)
For staging and pre-production. Deployment requires a `staging` environment with reviewer approval. Used by `conxian-gateway`, `conxian-nexus` staging instances.

### GitOps for Production (high-risk)
For long-lived production infrastructure. Changes flow through a GitOps operator (ArgoCD, Flux) watching the GitOps manifests in this repository. This model:
- Decouples CI (validation) from CD (deployment)
- Provides an immutable audit trail in Git
- Enables automated rollback via Git revert

## GitOps Manifest Ownership

This repository (`conxius-platform`) is the designated home for GitOps manifests that govern long-lived production services. The migration path:

1. **Current**: GitHub Actions + manual deployments with environment protection rules
2. **Near-term**: Environment protection + approval gates enforced via reusable workflows
3. **Target**: GitOps manifests in `gitops/` directory consumed by a cluster-side operator

Downstream repos must not self-deploy to production directly from CI. They must route production changes through the control plane's promotion model.

## Cross-Repo Coordination

### When a downstream repo cuts a release
1. Tag is pushed to the application repo
2. Application repo CI produces build artifacts
3. Application emits a `deployment-manifest.json`
4. `conxius-platform` verification workflow runs `verification-result.json`
5. If gates pass, promotion to the next environment is unblocked
6. For production: GitOps operator syncs the updated manifest

### Reusable workflows
All repos consume standardized CI from this control plane:

```yaml
jobs:
  ci:
    uses: Conxian/conxius-platform/.github/workflows/reusable-ci.yml@main
  secret-scan:
    uses: Conxian/conxius-platform/.github/workflows/reusable-secret-scan.yml@main
```

Application repos retain ownership of their own build configuration but inherit security and hygiene gates from the control plane.

## Security Governance

All promotion paths must pass:
- Secret scan (Gitleaks)
- Dependency review
- Hygiene audit
- Lifecycle control gates

Production promotion additionally requires:
- Environment protection rules
- Reviewer approval from CODEOWNERS
- Signed tag on `main`
- CHANGELOG section for the version

---

*Defined per Issue #975 — Repo hardening: control-plane boundary and deployment promotion.*
