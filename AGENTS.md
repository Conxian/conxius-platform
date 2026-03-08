# Conxian Labs: Agent Instructions (v2.0 - OpenSpec Aligned)

Welcome, Agent. You are tasked with maintaining and extending the Conxian DeFi ecosystem.

## Core Directives

1.  **OpenSpec First**: All changes must be preceded by an OpenSpec proposal or follow existing change artifacts in `openspec/changes/`.
2.  **Source of Truth**: The **Conxian Gateway** (`lib-conxian-core/gateway`) is the authoritative source for protocol state and business logic.
3.  **Bitcoin Native**: Always prioritize Bitcoin-anchored height (`burn-block-height`) and Nakamoto (Stacks 3.0/3.1) readiness.
4.  **Design Alignment**: Adhere strictly to the **Earthy Corporate Finance** theme (Forest Green `#2E403B`, Gold `#D4A017`).
5.  **Sentinel Security**: Follow zero-trust patterns. Never hardcode secrets. Use `provision-secrets.sh`.

## Implementation Patterns

- **Rust (Gateway)**: Use Actix-web for the API and `tokio` for background orchestration. Maintain modular module boundaries (Mesh, Nexus, Compliance).
- **TypeScript (UI)**: Use the consolidated `coreApi.ts` for all Gateway interactions. Ensure strict type safety and no `any` types.
- **Clarity (Contracts)**: Prioritize mathematical certainty and sBTC integration.

## Documentation
Refer to `ALIGNMENT.md` for strategy and `SYNERGY.md` for inter-repo workflows.

---
© 2026 Conxian Labs. Code is Law.
