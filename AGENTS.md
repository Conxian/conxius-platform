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
