# Conxius Platform

The `conxius-platform` repository contains development and control-plane scaffolding for composing parts of the Conxian stack locally and in managed environments.

## Status

**Active development.** This is a platform control-plane repository and should be read primarily as contributor and operator infrastructure rather than as an end-user product surface.

This repository uses formal versioned releases tracked in `CHANGELOG.md` and published via GitHub Releases.

## Positioning

Conxian provides non-custodial control and orchestration surfaces; it does not take possession of customer funds or operate as a raw customer-data system of record.

## Purpose

Provide platform configuration, orchestration, CI/release automation, and environment scaffolding for contributors and maintainers working across the Conxian ecosystem.

[![Secret Scan](https://github.com/Conxian/conxius-platform/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/Conxian/conxius-platform/actions/workflows/secret-scan.yml) [![Repository Hygiene Guard](https://github.com/Conxian/conxius-platform/actions/workflows/hygiene.yml/badge.svg)](https://github.com/Conxian/conxius-platform/actions/workflows/hygiene.yml) [![Lifecycle Control Gates](https://github.com/Conxian/conxius-platform/actions/workflows/lifecycle-control-gates.yml/badge.svg)](https://github.com/Conxian/conxius-platform/actions/workflows/lifecycle-control-gates.yml)

## Session governance

See [SESSION.md](SESSION.md) for the session standard — the enforcement baseline for grounding, verification, classification, and canonical updates across all Conxian-Labs sessions.

## Audience

Use this repository if you need:

- local or managed environment scaffolding
- control-plane and orchestration assets
- CI and release automation references
- developer tooling that spans multiple Conxian repositories

For protocol logic, wallet/client behavior, or public site content, use the owning repository directly.

## CI source of truth

GitHub Actions workflows in [`.github/workflows`](./.github/workflows) are the sole CI source of truth for this repository. Legacy CircleCI configuration has been intentionally removed.

## Scope

`conxius-platform` is a platform control-plane repository. Keep root-level content focused on:

- environment and runtime orchestration
- CI and release automation
- integration harnesses and developer tooling
- platform architecture and repository-boundary guidance

Out of scope here: portfolio strategy narratives, legal or financial operations material, and non-platform product planning. Route those to the owning repository in [Repository Taxonomy](./docs/REPOSITORY_TAXONOMY.md) or the Conxian Linear `CON` workspace.

## Governance relation

This repository is maintained by Conxian Labs. It supports development and operational enablement around the public Conxian stack, but it is not itself a governance authority for the protocol.

## Relationship to the Conxian stack

- `Conxian` is the protocol and public ecosystem layer.
- `conxius-wallet` is the sovereign wallet and reference client.
- `conxian-gateway` and `conxian-nexus` provide middleware and service-side coordination surfaces.
- `conxian-labs-site` is the public narrative and discovery surface.

## Technical documentation map

- [Documentation Index](./docs/README.md)
- [Local Development](./docs/LOCAL_DEVELOPMENT.md)
- [Deployment Surfaces](./docs/DEPLOYMENT.md)
- [Deployment Promotion Model](./docs/DEPLOYMENT_PROMOTION_MODEL.md)
- [Information Hierarchy & Maintenance Rules](./docs/INFORMATION_HIERARCHY.md)
- [Conxian Unified Theory v2](./docs/CONXIAN_UNIFIED_THEORY_v2.md)
- [Sovereign Computing Redesign (2026)](./docs/architecture/SOVEREIGN_REPR_2026.md)
- [Whitepaper](./docs/WHITEPAPER.md)
- [System Architecture Graph](./docs/architecture/SYSTEM_GRAPH.md)
- [Alignment Strategy](./docs/architecture/ALIGNMENT.md)
- [Ecosystem Synergy](./docs/architecture/SYNERGY.md)
- [Gap Analysis](./docs/GAPS.md)
- [Repository Taxonomy](./docs/REPOSITORY_TAXONOMY.md)
- [ADR 001: Repo Ownership](./docs/architecture/ADR-001_REPO_OWNERSHIP_AND_BOUNDARIES.md)
- [Repository Evolution Plan](./docs/architecture/REPO_EVOLUTION_PLAN.md)
- [Alignment Blueprint 2026](./docs/architecture/ALIGNMENT_BLUEPRINT_2026.md)
- [Full Stack Bitcoin Research (Phase 7)](./docs/architecture/FULL_STACK_BITCOIN_RESEARCH.md)
- [Phase 7 BFF Topology](./docs/architecture/PHASE_7_BFF_TOPOLOGY.md)
- [Universal Settlement Interface (USI)](./docs/architecture/PHASE_7_PROPOSAL_UNIVERSAL_SETTLEMENT.md)
- [Repo Boundary Contract v1](./docs/REPO_BOUNDARY_CONTRACT_V1.md)
- [Platform–Orbit Capability Registry](./schemas/capabilities.json)
- [Orbit CLI Canonical Surface Contract](./docs/architecture/ORBIT_CLI_CONTRACT.md)

## Quick start

Last verified: 2026-07-27

```bash
make init
make auth
# Populate remaining required development credentials from an approved source.
make start
make bench
```

This starts the local Compose control-plane/integration harness, not a full
protocol or production stack. The direct Admin Dashboard defaults to
`http://localhost:3001`; the Compose dashboard is `http://localhost:3002`,
while Compose Grafana uses `http://localhost:3001`. See
[`docs/LOCAL_DEVELOPMENT.md`](./docs/LOCAL_DEVELOPMENT.md) before provisioning
secrets or selecting external Gateway/UI images.

Use templates and generated local secrets for development only. `make auth`
does not generate `ADMIN_DASHBOARD_API_KEY` or `SERVICE_KEY_*`, and it does not
establish production authentication. Do not commit real credentials.

`make deploy` is not a guaranteed deployment path: it delegates to an
externally installed `conxius-orbit` binary when present and otherwise only
prints fallback messages. See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## Release posture

- This repository follows Semantic Versioning via annotated tags (`vX.Y.Z`).
- Changes are recorded in `CHANGELOG.md`.
- Releases are triggered by tags and verified by the [`release.yml`](./.github/workflows/release.yml) workflow.

## Policies

- [LICENSE](LICENSE)
- [SECURITY.md](SECURITY.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [GOVERNANCE.md](GOVERNANCE.md)
- [SUPPORT.md](SUPPORT.md)
- [REVIEWS.md](REVIEWS.md)
- [RELEASE_POLICY.md](RELEASE_POLICY.md)
- [CODEOWNERS](CODEOWNERS)

## Contact

- Support: [SUPPORT.md](SUPPORT.md) | [support@conxian-labs.com](mailto:support@conxian-labs.com)
- Security: [security@conxian-labs.com](mailto:security@conxian-labs.com)
- General: [info@conxian-labs.com](mailto:info@conxian-labs.com)

## CI/CD Hardening
This repository uses a hardened CI baseline with the following gates:
- **Secret Scan**: Gitleaks enforcement across all branches.
- **Repository Hygiene**: Automated detection of committed artifacts and sensitive files.
- **Lifecycle Control**: Verification of repository boundaries, submodule integrity, and contamination guards.
- **Dependency Review**: Security scanning for all new package additions.
