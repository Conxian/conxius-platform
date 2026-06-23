# Conxian Labs: Agent Instructions (v2.0 - OpenSpec Aligned)

Welcome, Agent. You are tasked with maintaining and extending the Conxian DeFi ecosystem.

## Core Directives

1.  **OpenSpec First**: All changes must be preceded by an OpenSpec proposal or follow existing change artifacts in `openspec/changes/`.
2.  **Source of Truth**: The **Conxian Gateway** (`lib-conxian-core/gateway`) is the authoritative source for protocol state and business logic.
3.  **Bitcoin Native**: Always prioritize Bitcoin-anchored height (`burn-block-height`) and Nakamoto (Stacks 3.0/3.1) readiness.
4. **Sovereign Design Alignment**: Adhere strictly to the **Sovereign Earthy** branding (Forest Green `#2E403B`, Nakamoto Gold `#D4A017`). Follow the **Stitch Pattern** for UI/UX reviews as codified in `DESIGN.md`. All frontend changes must be "vibe-verified" for high-fidelity consistency within the Earthy Corporate identity.
5.  **Sentinel Security**: Follow zero-trust patterns. Never hardcode secrets. Use `provision-secrets.sh`.

## Implementation Patterns

- **Rust (Gateway)**: Use Actix-web for the API and `tokio` for background orchestration. Maintain modular module boundaries (Mesh, Nexus, Compliance).
- **TypeScript (UI)**: Use the consolidated `coreApi.ts` for all Gateway interactions. Ensure strict type safety and no `any` types.
- **Clarity (Contracts)**: Prioritize mathematical certainty and sBTC integration.

## Documentation
Refer to `docs/architecture/ALIGNMENT.md` for strategy and `docs/architecture/SYNERGY.md` for inter-repo workflows.

---
© 2026 Conxian Labs. Code is Law.

### Phase 6 Implementation Standards
- **AI Allocation**: Always consume `/api/v1/ai/allocation` for user-facing weightings.
- **UBI Identity**: Identity hashes must follow the `ubi:btc:{id}` format.
- **Nexus Sync**: Use `/api/v1/nexus/state` for all L1/L2 synchronization checks.

## Agent Learnings (June 2026)
- **BIP-353 Resolution**: Successfully prototyped BIP-353 resolution using a DNS-to-BIP21 mapping logic. This serves as a critical bridge for human-readable Bitcoin payments.
- **Phase 7 Research Expansion**: Identified FROST, OP_CAT, and Fedimint as high-priority strategic anchors for the "Full Bitcoin Stack" vision.
- **Scoring Discipline**: Maintaining a strict Gap-to-Research scoring matrix ensures that engineering effort is prioritized according to strategic alignment and implementation readiness.
