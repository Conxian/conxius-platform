# Conxius Platform: Repository Evolution Plan (Phase 7)

## Phase 1: Submodule Removal & Externalization (Completed May 2026)
- Transitioned from Git submodules to independent repositories for Gateway and UI.
- Established `conxius-platform` as the orchestration hub.

## Phase 2: Boundary Hardening (Current - June 2026)
- Implement ADR 001.
- Refactor `system_audit.py` to support cross-repo verification.
- Scaffold `apps/control-plane` in `conxian-business`.

## Phase 3: Sovereign Redesign Implementation (July - September 2026)
- **NixOS Transition**: Replace `provision-secrets.sh` with declarative NixOS/nix-bitcoin configurations.
- **Wasm SDK**: Full port of protocol logic to `lib-conxian-core` Wasm.
- **BFF Split**: Decompose Gateway into UI-BFF and Wallet-BFF.

## Phase 4: Productization & Audit (October 2026 - Q1 2027)
- Canonical naming standard enforcement (standard DeFi terms vs. operator jargon).
- Zero Secret Egress (ZSE) 2.0 implementation.
- Final preparation for mainnet partner auditing.
