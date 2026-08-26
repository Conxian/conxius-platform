# Conxian Labs: Agent Instructions (v3.0 — Session 58, Aug 2026)

> **Archive**: `docs/archive/AGENTS_archive_session_58.md` (full historical context)

## Core Directives

1. **OpenSpec First**: All changes must be preceded by an OpenSpec proposal or follow existing change artifacts in `openspec/changes/`.
2. **Authority Coordination**: Active documents contain conflicting Protocol, Nexus, Gateway, and Platform authority claims. Do not choose a side during maintenance work; follow repository ownership boundaries and defer the cross-repository authority decision to issue #1167.
3. **Bitcoin Native**: Always prioritize Bitcoin-anchored height (`burn-block-height`) and Nakamoto (Stacks 3.0/3.1) readiness.
4. **Sovereign Design Alignment**: Adhere strictly to the **Sovereign Earthy** branding (Forest Green `#2E403B`, Nakamoto Gold `#D4A017`). Follow the **Stitch Pattern** for UI/UX reviews as codified in `DESIGN.md`.
5. **Sentinel Security**: Follow zero-trust patterns. Never hardcode secrets. Use `provision-secrets.sh`.
6. **Routing Only**: Conxian is a routing/infrastructure layer — we never touch user data or funds directly. We route payments, settlements, and messages between protocols. We do not hold custody, manage wallets, or execute trades.
7. **Protocol Handoff**: The Conxian protocol/DeFi system creates regulatory risks for Conxian-Labs. Community should own the protocol — conxius-platform manages infrastructure, not the DeFi protocol itself.

## Implementation Patterns

- **Rust (Gateway)**: Use Actix-web for the API and `tokio` for background orchestration. Maintain modular module boundaries (Mesh, Nexus, Compliance).
- **TypeScript (UI)**: Use the consolidated `coreApi.ts` for all Gateway interactions. Ensure strict type safety and no `any` types.
- **Clarity (Contracts)**: Prioritize mathematical certainty and sBTC integration.
- **Orbit CLI (Python canonical, Node wrapper)**: The canonical CLI surface is Python (`conxius_orbit_cli.py`). The Node.js binary (`conxius-orbit`) is a wrapper that delegates core operations (deploy, monitor, verify, dashboard, diagnose, detect) to Python. Automation and CI paths should target the Node binary entry point as the stable user-facing contract.
- **Rust toolchain**: 1.97.1 minimum.

## Session Log

### 2026-08-26 — Repository and Service Readiness Audit
**Trigger**: User requested a full repository, services, workflow, and functionality review with remediation.

**What was done**:
- Audited repository discovery, open issues/PRs, service manifests, service entrypoints, workflows, Compose configuration, and gap markers.
- Added OpenSpec proposal `openspec/changes/2026-08-26-service-readiness-audit/proposal.md`.
- Corrected default nginx placeholder health probes and removed a false no-op lint success script.
- Declared the Next.js dashboard package as ESM to remove its module-mode build warning.
- Verified frozen install, dependency consistency, tests, typechecks, and builds.

**Key discoveries**:
- Three executable workspace services/packages are present: admin-dashboard, admin-pulse-bos, and elizaos-plugin-conxian.
- Docker is unavailable in the sandbox, so Compose startup could not be executed locally.
- Gateway and UI Compose images are intentionally external dependency slots; defaults remain nginx placeholders.
- The admin-dashboard build still reports a non-fatal NFT tracing warning caused by required filesystem-backed M2M registry logic.

**Files touched**: `docker-compose.yml`, `services/admin-dashboard/package.json`, `services/admin-pulse-bos/package.json`, `openspec/changes/2026-08-26-service-readiness-audit/proposal.md`, `AGENTS.md`

**Gaps identified**:
- Docker/Compose runtime verification requires a Docker-enabled runner.
- External Gateway/UI images and protocol services are outside this repository boundary.

**Gotchas**:
- Docker/Compose runtime verification requires a Docker-enabled runner.
- External Gateway/UI images and protocol services are outside this repository boundary.

### 2026-08-26 — Organization PaaS Alignment
**Trigger**: User approved alignment of the organization repositories around a platform-as-a-service outcome.

**What was done**:
- Added OpenSpec proposal `openspec/changes/2026-08-26-organization-paas-alignment/proposal.md`.
- Added `docs/architecture/ORGANIZATION_PAAS_BLUEPRINT_2026.md` defining repository roles, contract spine, golden path, and phased delivery.
- Linked the blueprint from `docs/README.md`.

**Key discoveries**:
- `conxius-platform` already owns deployment orchestration, lifecycle gates, verification, and telemetry by the boundary contract.
- The organization has distinct strategy, data-plane, proof, protocol, security, deployment, product, and experience repositories; the PaaS must coordinate them without absorbing their authorities.
- Git/CI/GitOps-first desired state is safer than direct portal-to-cloud mutation.

**Files touched**: `openspec/changes/2026-08-26-organization-paas-alignment/proposal.md`, `docs/architecture/ORGANIZATION_PAAS_BLUEPRINT_2026.md`, `docs/README.md`, `AGENTS.md`

**Gaps identified**:
- Manifest and verification contracts need broader machine-readable fixtures and cross-repository compatibility checks.
- Cross-repository workflow reuse and service catalog ingestion require coordinated external-repository PRs.
- Docker/runtime and live external-service validation remain environment-dependent.

**Gotchas**:
- Backstage, Argo CD, and Crossplane are reference patterns, not immediate authorities; contract and evidence foundations come first.

### 2026-08-26 — Organization Lifecycle Audit
**Trigger**: User approved a full organization repository, service, issue, PR, and project alignment review.

**What was done**:
- Added machine-readable local service catalog `platform/services.catalog.json`.
- Added `scripts/verify_service_catalog.py` and wired it into the lifecycle gate and reusable CI workflow.
- Added `docs/audits/2026-08-26-organization-lifecycle-audit.md` and linked it from `docs/README.md`.

**Key discoveries**:
- Local services are `admin-dashboard` (active), `admin-pulse-bos` (source-consumed), and `elizaos-plugin-conxian` (active).
- `conxius-orbit` is archived upstream and must be treated as a compatibility dependency until ownership confirms replacement.
- No local service is safe to delete yet under the required evidence policy; low activity alone is insufficient.
- GitHub Projects could not be enumerated with the current token because `projectsV2` access is unavailable.

**Gaps identified**:
- Cross-repository manifest/verification fixtures and compatibility matrices remain to be coordinated with owning repositories.
- Docker/Compose runtime validation requires a Docker-enabled runner.

### 2026-08-26 — Live Data and Retirement Remediation
**Trigger**: User approved removal of synthetic production surfaces and alignment to a neutral PaaS control plane.

**What was done**:
- Added OpenSpec proposal `openspec/changes/2026-08-26-live-data-remediation/proposal.md`.
- Replaced hardcoded multidimensional metrics with a no-store Gateway `/api/v1/metrics` adapter.
- Added explicit live/unavailable source and observation metadata.
- Removed the rendered usage simulator, FDC3 panel, and BOS stub from the multidimensional dashboard.
- Added `docs/audits/2026-08-26-live-data-retirement-register.md` with non-destructive organization retirement actions.

**Key discoveries**:
- The configured Gateway endpoint is not available to the local dashboard runtime, so the metrics route correctly returns HTTP 503 rather than fabricated values.
- Test-only mocks remain in tests; remaining production simulation/deprecation markers require separate owner-approved migrations.
- External repository deletion/archive was not performed; retirement actions are documented for owner coordination.

**Gaps identified**:
- Gateway `/api/v1/metrics` contract must be confirmed by the Gateway owner.
- Organization-wide live adapters require each source repository's supported read contract and credentials.
- GitHub Projects access and Docker/Compose runtime verification remain environment-dependent.

### 2026-08-26 — Cross-Repository Platform Readiness Audit
**Trigger**: User approved inspection of all organization repositories and platform setup.

**What was done**:
- Inspected all 14 visible Conxian organization repositories, including archived `conxius-orbit` and organization metadata repositories.
- Verified repository-local discovery, service catalog, security, dependency consistency, and full test gates.
- Added `docs/audits/2026-08-26-platform-readiness-audit.md` with repository matrix, evidence, boundaries, and owner-coordinated actions.
- Linked the audit from `docs/README.md` without modifying remote repositories or GitHub settings.

**Key discoveries**:
- Platform-local controls pass; organization-wide readiness cannot be claimed without owner evidence from external repositories.
- No inspected `main` branch returned available branch-protection data through the read-only token.
- Archived Orbit remains a compatibility dependency pending an explicit replacement decision.

**Files touched**: `docs/audits/2026-08-26-platform-readiness-audit.md`, `docs/README.md`, `AGENTS.md`

**Gaps identified**:
- Organization rulesets/branch protection, cross-repository manifests, reusable workflow adoption, live deployment evidence, Docker runtime evidence, and GitHub Projects access require external coordination.

### 2026-08-26 — Full Connection Audit Follow-up
**Trigger**: User-approved audit of databases, app integrations, knowledge bases, agents, and docs.

**What was done**:
- Re-ran repository discovery, governance checks, hardened security audit, dependency consistency, and test suite.
- Probed configured Supabase and Upstash endpoints without exposing credentials or response bodies.
- Added a compatibility alias for `check:dependencies` and recorded sanitized findings in `docs/audits/2026-08-26-connection-audit.md`.

**Key discoveries**:
- Supabase is network-reachable; its API root returns expected HTTP 404.
- Upstash is network-reachable and correctly requires authentication with HTTP 401 for an unauthenticated probe.
- Gateway, Oracle, Stacks, Tableland, and Kwil live probes are blocked by missing endpoint configuration in the shell environment.
- Docker is unavailable, so Compose startup and container health remain deferred.

**Files touched**: `package.json`, `docs/audits/2026-08-26-connection-audit.md`, `AGENTS.md`

**Gaps identified**:
- Live schema/permission checks and migrations require MCP access and explicit per-target migration records.
- Compose verification requires a Docker-enabled runner.

**Gotchas**:
- The repository's canonical dependency script is `check:dependency-consistency`; the compatibility alias now points to it.

### 2026-08-26 — Platform Gap Remediation
**Trigger**: User approved investigation and remediation of all gaps found in the conversation and readiness audit.

**What was done**:
- Added OpenSpec proposal `openspec/changes/2026-08-26-platform-gap-remediation/proposal.md`.
- Added `scripts/verify_org_readiness.py` and package commands for repeatable cross-repository evidence collection.
- Added readiness tests and fail-closed handling when GitHub authentication is unavailable.
- Corrected CI documentation so local workflow files are not presented as proof of remote branch protection.
- Documented database URL precedence and component-variable fallback in the connection audit.
- Updated the active gap register and platform audit with current evidence interpretation.

**Key discoveries**:
- Local platform checks pass; the GitHub CLI in the execution shell was not authenticated, so organization readiness collection correctly failed closed.
- Remote branch protection, deployment health, Docker runtime, cross-repository manifests, and external ownership decisions remain outside this repository's mutation boundary.

**Files touched**: `openspec/changes/2026-08-26-platform-gap-remediation/proposal.md`, `scripts/verify_org_readiness.py`, `scripts/verify_org_readiness.test.ts`, `package.json`, `docs/GAPS.md`, `docs/CI_CD_BASELINE_GAP_ANALYSIS.md`, `docs/audits/2026-08-26-connection-audit.md`, `docs/audits/2026-08-26-platform-readiness-audit.md`, `AGENTS.md`

**Gaps identified**:
- Organization-wide verification requires an authenticated GitHub CLI or owner-provided evidence.
- Docker/live service checks and external repository changes require separate environments and owner coordination.

### 2026-08-26 — Page and Organization Surface Audit
**Trigger**: User requested an audit of all pages against the conversation and all organization repositories.

**What was done**:
- Audited all 15 dashboard page routes in the local preview; every route returned HTTP 200.
- Browser-verified overview, unavailable metrics, settings, launch, and shared navigation surfaces.
- Added `docs/audits/2026-08-26-page-and-organization-surface-audit.md` and linked it from `docs/README.md`.

**Key discoveries**:
- The dashboard is fail-closed for unavailable live metrics and contributor profile data, but the error states need more actionable operator context.
- Shared navigation is crowded and not responsive at the audited desktop width; settings lacks visible save-state/confirmation evidence.
- Several page heading trees and active-navigation semantics need an accessibility pass.
- Organization-wide GitHub controls and runtime evidence remain externally constrained.

**Files touched**: `docs/audits/2026-08-26-page-and-organization-surface-audit.md`, `docs/README.md`, `AGENTS.md`

**Gaps identified**:
- Responsive shared layout and design-token cleanup.
- Settings interaction status and high-privilege workflow review.
- Actionable live-source error metadata without exposing secrets.
- Full keyboard, focus, heading, and active-navigation verification.

## Repository Knowledge Graph (Current)


| Crate | Path | Role |
|-------|------|------|
| `conxius-enclave-sdk` | `../conxius-enclave-sdk` | Production Vault SDK (v2.0.16) — hardware signing, attestation |
| `lib-conxian-core` | `../lib-conxian-core` | Shared protocol primitives (v0.3.2) |
| `conxian-gateway` | `../conxian-gateway` | Runtime orchestration + middleware (v0.1.5) |
| `conxian-nexus` | `../conxian-nexus` | Glass Node proof layer (v0.4.22) |
| `conxius-orbit` | `../conxius-orbit` | Deployment CLI + Clarinet AST management |
| `conxius-wallet` | `../conxius-wallet` | Wallet application |
| `conxian_market` | `../conxian-market` | Market documentation |

## Key References

- **Build**: `cargo build --locked && cargo test --locked && cargo clippy -- -D warnings`
- **CI**: All repos monitored via `conxian-unified-ci.yml` in conxian-business
- **Release**: See `conxius-enclave-sdk/RELEASING.md` for publish workflow
- **Archive**: `docs/archive/AGENTS_archive_session_58.md` (full session history, agent learnings, skills reference)
