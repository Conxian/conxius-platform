# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **BitVMX High-Efficiency Computation (G-44)**: Transitioned to Active Scaffolding with foundational state machine and adaptive challenge logic.
- **Expanded Phase 7 Research (v1.9.4)**: Added BIP-119, BIP-324, ZKCP, and decentralized transport research anchors.
- **CI/CD Hardening**: Unified `test:phase7` script in admin-dashboard for targeted verification.


### Added
- **Expanded Bitcoin Stack Research**: Added deep dives for FROST (G-14), OP_CAT (G-15), and Fedimint (G-16) to FULL_STACK_BITCOIN_RESEARCH.md.
- **BIP-353 DNS Payment Implementation**: Initialized foundational bridge and resolution logic for human-readable Bitcoin addresses (G-12).
- **Strategic Scoring Update**: Updated SCORING_MATRIX.md and GAPS.md with scores and implementation paths for Phase 7 candidates.

## [0.2.4] - 2026-06-13

### Added
- **CI Path Optimization**: Added `paths-ignore` to all GitHub Workflows to prevent documentation-only changes from triggering heavy CI suites.
- **Repository De-cluttering**: Archived over 50 legacy maintenance and reconstruction scripts to `docs/archived-scripts/`.
- **Phase 7 BFF Topology Scaffolding**: Initial decomposition of the Gateway into UI-BFF, Wallet-BFF, and Sovereign-Proxy within the Admin Dashboard.
- **Unified Cross-Chain Balance API**: A single entry point for consolidated liquidity visibility across Bitcoin L1, L2 (Lightning/RGB), and Stacks (sBTC).
- **Nostr P&L Telemetry**: Implemented decentralized institutional P&L reporting using Nostr Event Kind 20626.
- **Hardened ZSE Audit**: Added `hardened_audit.py` with aggressive Zero Secret Egress (ZSE) scanning for RSA keys and cloud provider tokens.
- **RGB Stack Upgrade**: Upgraded core protocol stack to version 0.12.0 for improved scalability and security.
- **Execution Simulation**: Pre-execution cost and policy validation for institutional settlement.
- **Deterministic BOS Supply Chain**: Commitment window and manifest generation logic for immutable verification.
- **Institutional Treasury Enhancements**: Integrated Glassnode API for real-time Profit Ratio and Unrealized PnL metrics.
- **Multi-Sig Intent Drafting**: Implemented Safe{Core} compatible treasury intent drafting for autonomous rebalancing with human-in-the-loop approval.
- **BOS Invoicing**: Integrated Request Network for decentralized business-to-business invoicing and payment tracking.
- **Sovereign Handshake v2**: Enhanced handshake logic for multi-sig execution of agent-drafted financial maneuvers.

### Improved
- **Documentation Alignment**: Moved root-level strategic and architecture documents to `docs/architecture/` and updated all internal references.
- **README Visibility**: Added CI status badges to `README.md` for real-time hygiene and security visibility.
- **System Drift Remediation**: Restored critical missing Phase 6 logic in the Gateway Engine and UI.
- **UI Restoration**: Rebuilt and integrated 7 missing Phase 6 dashboard components in `conxian-ui`.
- **Gateway Engine**: Injected missing logic for AI Allocation, UBI Identity, Nexus State, and ALEX Method B.
- **CI Hygiene**: Implemented `hygiene-drift-guard.yml` to prevent future implementation drift and ensure 100% audit alignment.
- **System Audit Modernization**: Refactored `system_audit.py` to align with the post-submodule monorepo topology and active service monitoring.
- **Service Governance Standardization**: Enforced mandatory `LICENSE` and `SECURITY.md` files across all active services (`admin-dashboard`, `admin-pulse-bos`, `elizaos-plugin-conxian`).
- **Package Metadata Hygiene**: Initialized standardized `package.json` for `admin-pulse-bos`.

## [0.2.3-aligned] - 2026-06-08

### Added
- **CI Path Optimization**: Added `paths-ignore` to all GitHub Workflows to prevent documentation-only changes from triggering heavy CI suites.
- **Repository De-cluttering**: Archived over 50 legacy maintenance and reconstruction scripts to `docs/archived-scripts/`.
- **Multidimensional Platform Pulse**: Launched at `/multidimensional`, integrating Bitcoin-native business intelligence.
- **Sovereign Financial Office (SFO) Integration**: Embedded the SFO Command Pulse from `admin-pulse-bos` into the platform dashboard.
- **UI-BFF Telemetry API**: Implemented `/api/v1/ui/telemetry` for real-time service health monitoring, replacing static stubs.
- **BFF Scaffolding**: Deployed skeleton endpoints for Unified Liquidity, Nostr P&L, and Wallet PSBT coordination.
- **Admin Navigation Enhancement**: Unified the platform interface with direct access to Multidimensional metrics and SFO controls.

### Fixed
- **Navigation Drift**: Resolved issue where the Multidimensional dashboard was unreachable via the main UI.
- **Component Interactivity**: Added missing refresh triggers and state management to the Pulse dashboard.
- **Error Handling**: Hardened `BlueprintCard` and `SettingsPage` against fetch failures and unauthorized access.

## [0.2.2-aligned] - 2026-05-20
### Fixed
- **System Drift Remediation**: Restored massive missing Phase 6 logic in the Gateway office and UI.
- **Gateway Engine**: Rebuilt `engine/mod.rs` and `api/mod.rs` to support AI Allocation, UBI Identity, Nexus State, and Nostr Telemetry.

## [0.2.1] - 2026-04-10

### Added
- **CI Path Optimization**: Added `paths-ignore` to all GitHub Workflows to prevent documentation-only changes from triggering heavy CI suites.
- **Repository De-cluttering**: Archived over 50 legacy maintenance and reconstruction scripts to `docs/archived-scripts/`.
- **Execution Simulation**: Pre-execution cost and policy validation for institutional settlement.
- **Deterministic BOS Supply Chain**: Commitment window and manifest generation logic for immutable verification.
- **ALEX Readiness (Method B)**: Direct contract-call transaction construction for sovereign custody and enclave-backed signing.
- **Structured Finance**: Implemented Ops Loans with Junior/Senior tranches and Guardian intent verification.
- **Offline-First POS**: TEE-cached transaction queue and local mesh gossip (Bluetooth/WiFi) for load-shedding resilience.
- **Universal Bitcoin Identity (UBI)**: DID-linked sovereign identity management via RGB/Taproot and BitVM proofs.
- **Nexus Glass Node State**: Full state synchronization and Merkle root management for L1/L2 parity.
- **Enterprise Connectors**: Native OData/ERP translation layers and ISO 20022 bridging (pacs.008, pacs.009).

### Improved
- **Documentation Alignment**: Moved root-level strategic and architecture documents to `docs/architecture/` and updated all internal references.
- **README Visibility**: Added CI status badges to `README.md` for real-time hygiene and security visibility.
- **Phase 6 UI Components**: Launched `AiAllocationCard`, `NexusSyncStatus`, `UbiIdentityCard`, and `AlexMethodB` in `conxian-ui`.
- **Core API Client**: Standardized all Gateway proprietary endpoints with strict typing and resilient skeleton loaders.

## [0.2.0] - 2025-10-15

### Added
- **CI Path Optimization**: Added `paths-ignore` to all GitHub Workflows to prevent documentation-only changes from triggering heavy CI suites.
- **Repository De-cluttering**: Archived over 50 legacy maintenance and reconstruction scripts to `docs/archived-scripts/`.
- **Execution Simulation**: Pre-execution cost and policy validation for institutional settlement.
- **Deterministic BOS Supply Chain**: Commitment window and manifest generation logic for immutable verification.
- **Global Liquidity Mesh**: HTLC-based atomic swap orchestration across Stacks, Liquid, and Rootstock.
- **Decentralized Risk Oracle**: Cryptographically signed Risk Proofs and assessments for all layers.
- **Kwil Transactional State**: Migrated Nexus Glass Node state and history storage to Kwil.
- **Sovereign AI Allocation**: Real-time compute weighting and risk-optimized asset management.
- **Hardware Security**: Integrated HSM FIPS 140-2 Level 3 status tracking.

## [0.2.5] - 2026-06-15

### Added
- **SIDL Hardening**: Implemented mandatory API key authentication for state-changing SIDL endpoints (CON-353).
- **Full Bitcoin Stack Research**: Published 'docs/architecture/FULL_STACK_BITCOIN_RESEARCH.md' covering RGB, BitVM, and FDC3.
- **Architectural Clarity**: Added 'CONTROL_ASSURANCE_MAPPING.md' and updated 'ARCHITECTURE_MODEL.md'.

### Fixed
- **Workflow Realignment**: Corrected repository paths in 'multi-env-test.yml' and 'synergy-test.yml' to reflect monorepo pivot.
- **Render Remediation**: Updated blueprint API with correct build/start commands for UI and Labs Site (CON-739).
- **Docker Compose**: Standardized 'docker-compose.yml' to orchestrate external service stubs and hardened internal services.
- **CI Resilience**: Standardized all workflows to 'self-hosted' runners and added 'paths-ignore' for documentation.
