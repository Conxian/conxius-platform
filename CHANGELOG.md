# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Execution Simulation**: Pre-execution cost and policy validation for institutional settlement.
- **Deterministic BOS Supply Chain**: Commitment window and manifest generation logic for immutable verification.
- **Institutional Treasury Enhancements**: Integrated Glassnode API for real-time Profit Ratio and Unrealized PnL metrics.
- **Multi-Sig Intent Drafting**: Implemented Safe{Core} compatible treasury intent drafting for autonomous rebalancing with human-in-the-loop approval.
- **BOS Invoicing**: Integrated Request Network for decentralized business-to-business invoicing and payment tracking.
- **Sovereign Handshake v2**: Enhanced handshake logic for multi-sig execution of agent-drafted financial maneuvers.

### Improved
- **UI/UX Polish**: Integrated `InstitutionalMetricsCard`, `TreasuryHandshake`, and `FinanceInvoices` into the System Overview dashboard.
- **Gateway Robustness**: Completed full Phase 6 backend logic restoration, remediating drift in AI allocation, UBI, and Nexus state sync.

## [0.2.1] - 2026-04-10

### Added
- **Execution Simulation**: Pre-execution cost and policy validation for institutional settlement.
- **Deterministic BOS Supply Chain**: Commitment window and manifest generation logic for immutable verification.
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
- **Execution Simulation**: Pre-execution cost and policy validation for institutional settlement.
- **Deterministic BOS Supply Chain**: Commitment window and manifest generation logic for immutable verification.
- **Global Liquidity Mesh**: HTLC-based atomic swap orchestration across Stacks, Liquid, and Rootstock.
- **Decentralized Risk Oracle**: Cryptographically signed Risk Proofs and assessments for all layers.
- **Kwil Transactional State**: Migrated Nexus Glass Node state and history storage to Kwil.
- **Sovereign AI Allocation**: Real-time compute weighting and risk-optimized asset management.
- **Hardware Security**: Integrated HSM FIPS 140-2 Level 3 status tracking.
