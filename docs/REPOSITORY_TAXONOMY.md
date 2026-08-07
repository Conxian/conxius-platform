# Conxian Repository Taxonomy & Ownership Map

This document is the **canonical source of truth** for Conxian repository inventory and classification.

Ownership authority remains defined in each repository's root `CODEOWNERS` file. For `Conxian/conxius-platform`, `CODEOWNERS` is authoritative.

> [!NOTE]
> Keep repository inventory updates in this file first. Other docs (for example `README.md` and `SYSTEM_GRAPH.md`) should link here rather than duplicate the full inventory.

## Canonical repository inventory

| Repository | Intended audience | Visibility | Owner | Primary classification | Public purpose | Current status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [`Conxian/.github-private`](https://github.com/Conxian/.github-private) | Internal organization administrators and security maintainers | Private | TBD (owner confirmation required; `CODEOWNERS` not found) | Organization governance (private) | Hosts private organization defaults, policy automation, and internal templates | Active (not archived; last push 2026-06-08). Required control snapshot: [`docs/runbooks/GITHUB_PRIVATE_CONTROL_SNAPSHOT.md`](./runbooks/GITHUB_PRIVATE_CONTROL_SNAPSHOT.md). |
| [`Conxian/.github`](https://github.com/Conxian/.github) | Conxian maintainers and external contributors using shared templates | Public | `@Conxian/Admins` | Organization governance (public) | Provides shared community health files, issue templates, and contribution defaults | Active (not archived; last push 2026-04-18) |
| [`Conxian/Conxian`](https://github.com/Conxian/Conxian) | Protocol engineers, integrators, and auditors | Public | `@botshelomokoka`, `@admin-conxian-labs` | Flagship protocol/contracts | Implements the Stacks-native automated monetary platform core | Baseline v0.2.4 (Active; last push 2026-06-20) |
| [`Conxian/conxian_ui`](https://github.com/Conxian/conxian_ui) | Institutional dashboard users and frontend engineers | Public | `@botshelomokoka`, `@admin-conxian-labs` | Product UI | Delivers the primary web dashboard/user interface surface | Baseline v0.2.4 (Active; last push 2026-06-20) |
| [`Conxian/conxius-orbit`](https://github.com/Conxian/conxius-orbit) | DevOps engineers and release operators | Public | `@botshelomokoka`, `@admin-conxian-labs` | Deployment tooling (GUI/CLI) | Provides contract deployment and operator tooling for the ecosystem | Baseline v0.2.4 (Active; last push 2026-06-20) |
| [`Conxian/conxius-wallet`](https://github.com/Conxian/conxius-wallet) | Wallet users plus mobile/security engineers | Public | `@botshelomokoka`, `@admin-conxian-labs` | Product wallet client | Delivers sovereign wallet functionality with secure enclave signing flows | Baseline v0.2.4 (Active; last push 2026-06-20) |
| [`Conxian/conxian-labs-site`](https://github.com/Conxian/conxian-labs-site) | Public ecosystem audience, partners, and communications team | Public | `@botshelomokoka`, `@admin-conxian-labs` | Public website | Publishes Conxian Labs web presence and public-facing messaging | Baseline v0.2.4 (Active; last push 2026-06-20) |
| [`Conxian/conxian-gateway`](https://github.com/Conxian/conxian-gateway) | Backend/API engineers and integration partners | Public | `@botshelomokoka`, `@admin-conxian-labs` | Middleware/API service | Exposes middleware bridging Bitcoin/Stacks flows with institutional interfaces | Baseline v0.2.4 (Active; last push 2026-06-20) |
| [`Conxian/lib-conxian-core`](https://github.com/Conxian/lib-conxian-core) | Core protocol developers and SDK consumers | Public | `@botshelomokoka`, `@admin-conxian-labs`, `@Conxian/mobile` | Shared core library/SDK | Provides shared protocol primitives and reusable core logic | Baseline v0.2.4 (Active; last push 2026-06-20) |
| [`Conxian/conxius-platform`](https://github.com/Conxian/conxius-platform) | Platform/infrastructure engineers and operators | Public | `@botshelomokoka`, `@admin-conxian-labs` | Control plane/orchestration | Operates the local-first control plane, orchestration, and operational topology | Baseline v0.2.5 (Active; last push 2026-06-20) |
| [`Conxian/conxian-nexus`](https://github.com/Conxian/conxian-nexus) | State/indexing engineers and backend maintainers | Public | `@Conxian/core-devs`, `@botshelomokoka`, `@admin-conxian-labs` | State/indexing service | Maintains the Nexus/Glass Node API bridge and state synchronization surface | Baseline v0.2.4 (Active; last push 2026-06-20) |
| [`Conxian/elizaos-plugin-conxian`](https://github.com/Conxian/elizaos-plugin-conxian) | AI agent developers and integrators | Public | `@botshelomokoka`, `@admin-conxian-labs` | AI plugin (Platform Service) | ElizaOS plugin for Conxian Gateway and multidimensional metrics | Baseline v0.2.5 (Active; last push 2026-07-03) |
| [`Conxian/conxian-business`](https://github.com/Conxian/conxian-business) | Internal leadership, strategy, legal, and operations teams | Private | `@botshelomokoka`, `@admin-conxian-labs` | Business operations (private) | Stores non-public strategic, legal, and operational documentation; scaffolds `apps/control-plane` for BOS admin interface; coordinates lifecycle control with conxius-platform | Baseline v0.2.4 (Active; last push 2026-06-20) |
| [`Conxian/conxius-enclave-sdk`](https://github.com/Conxian/conxius-enclave-sdk) | Security/mobile engineers integrating hardware enclave capabilities | Public | `@botshelomokoka`, `@admin-conxian-labs` | Security/enclave SDK | Provides cross-platform enclave abstractions for sovereign computing | Baseline v0.2.4 (Active; last push 2026-06-20) |
| [`Conxian/demo-repository`](https://github.com/Conxian/demo-repository) | Demo/scaffold audience, contributors evaluating Conxian ecosystem | Public | `@botshelomokoka`, `@admin-conxian-labs` | Demo/scaffold | Minimal scaffold repository for demonstrating Conxian ecosystem integration patterns | Active (pending hardening per [conxius-platform#1064](https://github.com/Conxian/conxius-platform/issues/1064)): governance files and lock file required before investor-ready status. |

## Narrative taxonomy (summary)

### 1. Platform, product, and protocol surfaces
- `Conxian/Conxian`
- `Conxian/conxius-platform`
- `Conxian/elizaos-plugin-conxian`
- `Conxian/conxian_ui`
- `Conxian/conxius-wallet`

### 2. Infrastructure, middleware, and shared runtime
- `Conxian/conxian-gateway`
- `Conxian/conxian-nexus`
- `Conxian/lib-conxian-core`
- `Conxian/conxius-enclave-sdk`
- `Conxian/conxius-orbit`

### 3. Organization governance and operations
- `Conxian/.github`
- `Conxian/.github-private`
- `Conxian/conxian-business`

### 4. Public communications surface
- `Conxian/conxian-labs-site`

### 5. Demo/scaffold surfaces
- `Conxian/demo-repository` (pending hardening per [conxius-platform#1064](https://github.com/Conxian/conxius-platform/issues/1064))

## Mandatory governance control-review inclusion (do not omit)

Control-review passes must include the repositories and snapshot evidence below. Do not remove entries unless the same change introduces a superseding control artifact and rationale.

| Repository | Required control snapshot evidence | Tracking parent |
| :--- | :--- | :--- |
| [`Conxian/.github-private`](https://github.com/Conxian/.github-private) | [`docs/runbooks/GITHUB_PRIVATE_CONTROL_SNAPSHOT.md`](./runbooks/GITHUB_PRIVATE_CONTROL_SNAPSHOT.md) | [conxius-platform#776](https://github.com/Conxian/conxius-platform/issues/776) |

## Control inheritance for chain-specific deployment repos

Chain-specific deployment/operator repositories (including `Conxian/conxius-orbit` for Conxius Orbit) inherit parent control expectations from `Conxian/conxius-platform`:

- lifecycle and governance controls in [`GOVERNANCE.md`](../GOVERNANCE.md),
- production-boundary and operator-safety constraints in [`docs/PRODUCTION_BOUNDARY.md`](./PRODUCTION_BOUNDARY.md), and
- release discipline in [`RELEASING.md`](../RELEASING.md).

## Maintenance notes

- Visibility and activity status are based on current GitHub repository metadata.
- Owner values are taken from each repository's root `CODEOWNERS` (or `.github/CODEOWNERS`) when available.
- Operational gate-owner roles are tracked in runbooks and do not supersede `CODEOWNERS` review/merge ownership.
- If ownership/classification cannot be verified confidently, use explicit conservative wording: `TBD (owner confirmation required)`.
- The `Mandatory governance control-review inclusion` section is normative for recurring control reviews.

## Temporary Exceptions & Transitional States Register (Living)

This register tracks repository states that intentionally diverge from the target sovereign architecture while migration or restructuring work is in progress.

Update this table when an exception is added, re-scoped, or closed. Keep entries factual and linked to an existing tracked artifact.

All entries in this register belong to the **live execution lane** (active work in progress) or **historical context lane** (closed/archived exceptions) as defined in [`GOVERNANCE.md`](../GOVERNANCE.md). The governance baseline lane defines the policy for how exceptions are managed but does not appear as an entry in this register.

| Repository | Owner | Governance Lane | Type / Status | Rationale (documented) | Intended end state | Review timing | Tracking reference |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `conxius-platform` | `Conxian` | Live execution | Transitional architecture migration (in progress) | `SYSTEM_GRAPH.md` and Phase 7 planning document migration away from centralized orchestration and imperative secret provisioning toward declarative infrastructure. | Operate as declarative NixOS control plane (no master orchestrator role). | Phase 7 Sovereign Redesign (`2026-Q3` target). | `CON-556`; `GAPS.md` §4 |
| `conxian-ui` | `Conxian` | Live execution | Transitional restructuring + workspace exception (in progress) | Phase 7 defines migration to local-first micro-frontend federation. `CONTRIBUTING.md` also records a temporary workspace exclusion to avoid lockfile churn when submodule is initialized locally. | Federated local-first UI modules with normalized workspace integration. | Phase 7 Sovereign Redesign (`2026-Q3` target); workspace-normalization timing `TBD`. | `GAPS.md` §4; `docs/architecture/SOVEREIGN_REPR_2026.md`; `CONTRIBUTING.md` note |
| `admin-dashboard` | `Conxian` | Live execution | Transitional client-layer restructuring (planned/in progress) | Architecture redesign requires Admin Dashboard migration away from cloud-hosted monolithic structure to local-first model. | Local-first modular Admin Dashboard aligned to BFF topology. | Phase 7 Sovereign Redesign (`2026-Q3` target). | `docs/architecture/SOVEREIGN_REPR_2026.md`; `GAPS.md` §4 |
| `lib-conxian-core` | `Conxian` | Live execution | Transitional protocol standardization (planned/in progress) | Redesign defines this repository as shared source of truth for cryptographic/protocol logic, compiled to Wasm for client and middleware reuse. | Unified shared primitives/Wasm SDK across UI, wallet, and BFF components. | Phase 7 Sovereign Redesign (`2026-Q3` target). | `docs/architecture/SOVEREIGN_REPR_2026.md`; `GAPS.md` §4 |
| `conxian-nexus` | `Conxian` | Live execution | Transitional indexer redesign (planned) | Phase 7 tracks Nexus transition from current indexer role to IVC-based Nexus OS design. | Nexus OS / IVC-driven verifiable off-chain computation interface. | Phase 7 Sovereign Redesign (`2026-Q3` target). | `GAPS.md` §4; `SYSTEM_GRAPH.md` repository roles |
| `admin-pulse-bos` | `Conxian` | Live execution | Intentional dev-only exception (active) | Explicitly designated as dev-only and excluded from production boundary wiring. | Remain isolated from production unless production-boundary policy is explicitly revised. | `TBD` (review cadence not yet documented). | `docs/PRODUCTION_BOUNDARY.md` (Dev-only surfaces) |
| `demo-repository` | `Conxian` | Live execution | Investor-readiness hardening (in progress) | Live repo review found missing governance files, no lock file, and unpinned workflows. | Governance-hardened demo repo with lock file, SHA-pinned actions, and proper READMEs. | `conxius-platform#1064` resolution | `conxius-platform#1064` |
| `conxian-business` | `Conxian` | Live execution | Approved Private Visibility | Proprietary business operations, strategic roadmap, legal/financial records, and administrative control-plane scaffolds must remain confidential. | Maintain private visibility boundary; prevent exposure of business secrets. | Quarterly audit | `docs/BUSINESS_REPO_ALIGNMENT.md` (`CON-324`) |
| `.github-private` | `Conxian` | Live execution | Approved Private Visibility | Private default templates, sensitive workflow runner overrides, and internal policy automation configs are restricted to org admins. | Maintain private visibility boundary; prevent exposure of administrative infra. | Quarterly audit | `docs/runbooks/GITHUB_PRIVATE_CONTROL_SNAPSHOT.md` (`CON-324`) |
