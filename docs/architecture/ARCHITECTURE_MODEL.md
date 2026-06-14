# Conxian Stack Architecture Model (CON-1179)

This document defines the machine-readable architecture model for the Conxian stack, outlining trust boundaries, ownership, and integration contracts.

## 1. Stack Components

| Component | Identifier | Role | Ownership | Trust Boundary |
| :--- | :--- | :--- | :--- | :--- |
| **Protocol** | `conxian-core` | Consensus & Logic | Core Devs | Decentralized (L1/L2) |
| **Gateway** | `conxian-gateway` | Middleware & Route | Ops Team | Protected (Cloud/TEE) |
| **Nexus** | `conxian-nexus` | State & Indexing | State Team | Verifiable (IVC) |
| **UI** | `conxian-ui` | Orchestration Surface | UI Team | Public / Local-First |
| **Wallet** | `conxius-wallet` | Signing & Identity | Mobile Team | Secure Enclave |
| **Platform** | `conxius-platform` | Control Plane | Platform Team | Declarative (NixOS) |

## 2. Integration Contracts

### A. Nexus to Gateway
- **Format**: Cross-Chain Events (Nexus Feed).
- **Security**: Signed Merkle proofs.
- **Contract**: `/api/v1/nexus/state`.

### B. UI to BFF
- **Format**: JSON / REST.
- **Security**: API Key + mTLS (Planned).
- **Contract**: `/api/v1/ui/telemetry`.

### C. Wallet to BFF
- **Format**: PSBT / BIP-174.
- **Security**: Out-of-band signing.
- **Contract**: `/api/v1/wallet/psbt`.

## 3. Deployment Lanes

- **Lane A (Community)**: Docker Compose / Sovereign Node.
- **Lane B (Managed)**: GCP / Render (Institutional).
- **Lane C (Enterprise)**: Private Cloud / NixOS (High-Assurance).

## 4. Operational Gates

- **CI/CD**: Lifecycle Control Gates (`check:lifecycle-control`).
- **Release**: Tagged SemVer (`vX.Y.Z`).
- **Audit**: Zero Secret Egress (ZSE) Scanning.

---
*Maintained by Jules (Sovereign Engineering Agent)*
