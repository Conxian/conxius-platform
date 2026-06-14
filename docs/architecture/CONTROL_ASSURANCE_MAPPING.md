# Control & Assurance Mapping (CON-1180)

This document maps the Conxian control baseline across the public repository estate and release surfaces.

## 1. Core Control Baseline

| Control Area | Enforcement Mechanism | Verification Method | Applicability |
| :--- | :--- | :--- | :--- |
| **Branch Protection** | GitHub Rulesets (PR required, 1+ approval) | `system_audit.py` | All Public Repos |
| **Secret Scanning** | GitHub Secret Scanning & Push Protection | `hardened_audit.py` | All Repos |
| **Dependency Review** | GitHub Dependency Review Action | CI Gate | All Public Repos |
| **Artifact Integrity** | Semantic Versioning & Tagged Releases | `CHANGELOG.md` check | Platform & Core |
| **Deployment Gates** | Lifecycle Control Gates (`scripts/verify_*`) | `check:lifecycle-control` | Platform Repo |

## 2. Repository Role Mapping

| Repo Class | Primary Controls | Deployment Posture |
| :--- | :--- | :--- |
| **Platform (Control Plane)** | Strict Branch Policy, ZSE Audit, Lifecycle Gates | Manual/Orchestrated (GCP/Render) |
| **Product (UI/Wallet)** | Vibe-Check, Design Compliance, PR Approvals | Deployment-Tracked (Render/App Store) |
| **Infrastructure (Gateway/Nexus)** | Protocol Drift Audit, Kwil/State Invariants | Containerized (K8s/GCP) |
| **Core (Libraries/SDKs)** | Wasm Compatibility, Mathematical Certainty | Tag-Triggered (NPM/GitHub) |

## 3. Assurance & Trust Boundaries

- **Non-Custodial**: All controls ensure that orchestration layers do not gain access to user private keys.
- **Auditability**: All state-changing operations (governance, release) are recorded in `CHANGELOG.md` and pinned via Git tags.
- **Transparency**: READMEs must explicitly state maturity and non-custodial positioning (CON-808).

## 4. Current Enforcement Status (June 2026)

- **Platform**: 100% Audit Aligned.
- **UI/Wallet**: Standardized Governance Files (CON-1186).
- **Gateway/Nexus**: Phase 6 Core Alignment Complete.

---
*Maintained by Jules (Sovereign Engineering Agent)*
