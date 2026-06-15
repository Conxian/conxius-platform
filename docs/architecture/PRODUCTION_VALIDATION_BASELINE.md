# Production Validation Baseline (CON-1197)

This document defines the mandatory validation baseline that every release-relevant repository in the Conxian organization must satisfy before being promoted to production.

## 1. Mandatory Pre-Release Gates

| Category | Requirement | Verification Tool |
| :--- | :--- | :--- |
| **Security** | Zero hardcoded secrets in source control. | `gitleaks`, `hardened_audit.py` |
| **Security** | No tracked sensitive files (.env, .pem, etc.). | `system_audit.py` |
| **Integrity** | All pull requests must be approved by CODEOWNERS. | GitHub Rulesets |
| **Integrity** | CI must pass on the latest default branch state. | GitHub Actions |
| **Hygiene** | No tracked generated artifacts (node_modules, dist). | `system_audit.py` |
| **Versioning** | SemVer-compliant annotated tags (vX.Y.Z). | `git tag -a` |
| **Release** | Synchronized CHANGELOG.md using 'Keep a Changelog'. | Manual / Automated |

## 2. Technical Validation Standards

### A. JavaScript / TypeScript
- **Lockfile Enforcement**: CI must use `pnpm install --frozen-lockfile`.
- **Type Safety**: No `any` types in production-critical paths; `tsc --noEmit` must pass.
- **Linting**: Standardized ESLint/Prettier configuration with no warnings in CI.

### B. Rust
- **Audit**: `cargo audit` must pass with no unvetted vulnerabilities.
- **Formatting**: `cargo fmt --check` must pass.
- **Clippy**: No clippy errors in default build profiles.

### C. Container / Infrastructure
- **Declarative**: All environment scaffolding must be NixOS-compatible or Docker-contained.
- **Secrets**: No secrets in environment variables; use secure volume mounts or TEE-backed provisioning.

## 3. Deployment Posture
- **Render**: Services must bind to `0.0.0.0` and use dynamic `PORT` variables.
- **Health Checks**: Every service must expose a `GET /health` or similar status endpoint.
- **Rollback**: Every deployment must have a verified one-click or automated rollback path.

---
*Maintained by Jules (Sovereign Engineering Agent) - June 2026*
