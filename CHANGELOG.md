# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Integrated jurisdictional sharding for ZAR-linked settlements.
- Expanded BitVM2 verification verifiers.
- Added SIDL social release notes for the reference rollout: Farcaster frame routes (`/frames/sbtc`, `/frames/vote`), ElizaOS plugin actions for yield/vote/cart flows, and x402 cart mandate checkout (`/api/cart/mandates/sbtc-yield-frame/checkout`) with documented 402 (`PAYMENT-REQUIRED`) to settlement (`PAYMENT-RESPONSE`) behavior.
- Published readiness caveats for SIDL as a locally runnable reference implementation (not production-ready): no onchain/production facilitator settlement integration, no cryptographic frame payload verification, and vote tallies remain in-memory.

## [0.2.1] - 2026-04-10

### Added
- **ALEX Readiness (Method B)**: Direct contract-call transaction construction for sovereign custody and enclave-backed signing.
- **Structured Finance**: Implemented Ops Loans with Junior/Senior tranches and Guardian intent verification.
- **Offline-First POS**: TEE-cached transaction queue and local mesh gossip (Bluetooth/WiFi) for load-shedding resilience.
- **Universal Bitcoin Identity (UBI)**: DID-linked sovereign identity management via RGB/Taproot and BitVM proofs.
- **Nexus Glass Node State**: Full state synchronization and Merkle root management for L1/L2 parity.
- **Enterprise Connectors**: Native OData/ERP translation layers and ISO 20022 bridging (pacs.008, pacs.009).

### Improved
- **Phase 6 UI Components**: Launched `AiAllocationCard`, `NexusSyncStatus`, `UbiIdentityCard`, and `AlexMethodB` in `conxian-ui`.
- **Core API Client**: Standardized all Gateway proprietary endpoints with strict typing and resilient skeleton loaders.

## [0.2.0] - 2025-10-15

### Added
- **Global Liquidity Mesh**: HTLC-based atomic swap orchestration across Stacks, Liquid, and Rootstock.
- **Decentralized Risk Oracle**: Cryptographically signed Risk Proofs and assessments for all layers.
- **Kwil Transactional State**: Migrated Nexus Glass Node state and history storage to Kwil.
- **Sovereign AI Allocation**: Real-time compute weighting and risk-optimized asset management.
- **Hardware Security**: Integrated HSM FIPS 140-2 Level 3 status tracking.

### Changed
- Adopted a root `pnpm` workspace and `pnpm-lock.yaml` for Node/TypeScript services.
- Updated `services/admin-dashboard` to `next@15.1.12`.
- Documented ownership and repository structure for `services/elizaos-plugin-conxian`.

## [0.1.0] - 2024-11-20

### Added
- Integrated **Sovereign AI-Driven Asset Allocation** into the Gateway Engine and UI.
- Implemented **Universal Bitcoin Identity (UBI)** via RGB/Taproot and BitVM proofs.
- Launched **Global Liquidity Mesh** for cross-chain atomic swap orchestration.
- Added **Nexus Glass Node** state synchronization for real-time telemetry.
- Established **Earthy Corporate Finance** theme (Forest Green/Gold) across all UI platforms.
- Introduced **Admin Dashboard** for institutional system monitoring.
- Created `admin-pulse-bos` service for Fiscal Orchestration (SFO).

### Fixed
- Resolved Phase 5 implementation drift for Fiat routing and A2P OTP messaging.
- Sanitized repository root, moving maintenance scripts to `scripts/maintenance/`.
- Standardized monorepo governance with `SECURITY.md`, `CONTRIBUTING.md`, and `CODEOWNERS`.

### Improved
- Unified system telemetry under a single `/api/v1/status` endpoint.
- Enhanced `conxian-ui` core API client with strict typing and resilient skeleton loaders.
- Updated root `.gitignore` to cover all monorepo service artifacts.
