# Control & Assurance Mapping (CON-1180)

This document maps the Conxian platform controls to repositories and release paths to ensure consistent security and governance enforcement.

## 1. Core Controls

| Control | Mechanism | Target Repos | Status |
| :--- | :--- | :--- | :--- |
| **Branch Protection** | Required PRs & Approvals | All Public | Enforced |
| **Secret Scanning** | Gitleaks / ZSE Audit | All | Active |
| **Dependency Review** | GitHub Dependency Review | user-facing | Active |
| **Lifecycle Gates** | `check:lifecycle-control` | conxius-platform | Enforced |
| **Release Integrity** | Tagged SemVer + Changelog | All | Locked |

## 2. Repo-Specific Enforcement

### A. Protocol / Core (`lib-conxian-core`, `Conxian`)
- Strict mathematical verification.
- Mandatory code coverage gates.

### B. Gateway / Middleware (`conxian-gateway`, `conxian-nexus`)
- ZKC (Zero-Knowledge Compliance) audits.
- Execution simulation validation.

### C. UI / Client (`conxian_ui`, `conxius-wallet`)
- "Vibe-verified" branding alignment.
- Local-first cryptographic validation checks.

## 3. Assurance Evidence
Verification evidence is persisted in `test-results/lifecycle-control-gates/` and linked in release pull requests.

---
*Maintained by Jules (Sovereign Engineering Agent)*
