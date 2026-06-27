# Conxian Repo Boundary Contract v1

This document defines the strict functional and architectural boundaries between core repositories to prevent logic duplication and ensure clear ownership.

## 1. Gateway ↔ Nexus Boundary
- **Nexus (The "Glass Node")**: Owns the authoritative state record, Merkle tree management, and L1 checkpointing.
- **Gateway (The "Access Layer")**: Owns the API surface, service integration (Bisq/RGB), and identity resolution.
- **Interface**: Gateway queries Nexus via standardized structs (`NexusState`) for proof-of-state verification.

## 2. Platform ↔ Business Boundary
- **Business (The "Strategy Store")**: Owns mandates, hiring criteria, institutional specs (ISO 20022), and legal/regulatory templates.
- **Platform (The "Control Plane")**: Owns CI/CD automation, deployment orchestration, live-system telemetry ingestion, cross-repo deployment schemas, and environment promotion rules. See [`DEPLOYMENT_PROMOTION_MODEL.md`](./DEPLOYMENT_PROMOTION_MODEL.md) for the full promotion ladder and gating model.
- **Interface**: Platform implements triggers defined in Business mandates. Deployment manifests (`schemas/deployment-manifest.schema.json`) and verification results (`schemas/verification-result.schema.json`) serve as the machine-readable contract between orchestration and promotion.

## 3. Core ↔ Conclave SDK Boundary
- **Core (The "Protocol Base")**: Owns shared protocol models, MuSig2 logic, and platform-agnostic cryptography.
- **Conclave SDK (The "Enclave Bridge")**: Owns TEE-specific (Intel SGX/StrongBox) attestation and hardware-backed signing wrappers.
- **Interface**: Conclave SDK depends on Core; Core has zero hardware dependencies.

## 4. UI ↔ Wallet Boundary
- **UI (The "Portal")**: Owns the dashboard experience, system monitoring, and cross-repo telemetry visualization.
- **Wallet (The "Execution Client")**: Owns private key management, transaction construction, and account-scoped policy enforcement.
- **Interface**: UI invokes Wallet for execution intent signing.
