# Organization PaaS Alignment

## Intent
Establish `conxius-platform` as Conxian's control plane and PaaS foundation while preserving protocol, custody, signing, business, and product ownership in their existing repositories.

## Scope
- Define repository roles and cross-repository contracts.
- Standardize declarative service manifests, environment overlays, health/readiness, release provenance, and verification evidence.
- Establish a Git/CI/GitOps-first golden path for future self-service provisioning.
- Document phased delivery and ownership-boundary gates.

## Non-goals
- No wallet custody, protocol execution, trade execution, or signing-key management.
- No direct mutation of external cloud resources from the dashboard.
- No replacement of `conxian-business` strategy/legal authority or `conxian-gateway` data-plane authority.

## Acceptance criteria
- A canonical PaaS blueprint maps all active organization repositories to owner, responsibility, trust boundary, and interface.
- Platform-to-business, platform-to-gateway, platform-to-nexus, platform-to-orbit, and product-facing contracts are explicit.
- Golden-path stages define inputs, generated artifacts, promotion gates, and rollback evidence.
- Cross-repository work is identified as separate follow-up PRs with clear owners.
- Documentation links back to existing boundary, deployment, lifecycle, and security controls.

## Governance
All implementation follows `AGENTS.md`, `GOVERNANCE.md`, `docs/REPO_BOUNDARY_CONTRACT_V1.md`, and OpenSpec-first change control.
