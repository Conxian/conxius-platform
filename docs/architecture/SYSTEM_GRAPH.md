# Conxian System Architecture: Sovereign Declarative Topology

> [!IMPORTANT]
> **Architectural Transition in Progress**: The platform is migrating from a centralized orchestration model to a decentralized, local-first, BFF-driven topology. See [SOVEREIGN_REPR_2026.md](./SOVEREIGN_REPR_2026.md) for the authoritative redesign specification.

## 1. Proposed Sovereign Architecture (Target State)
This graph represents the holistic viewpoint of the Conxian organization, transitioning from centralized orchestration to a decentralized NixOS control plane.

```mermaid
graph TD
    subgraph "NixOS Control Plane (conxius-platform)"
        P[Declarative Flake State]
        S[sops-nix / age]
        CI[NixOS Rebuild / CI]
        SDK[Unified Vault SDK - Core SDK]
    end

    subgraph "Middleware (Backend-for-Frontend)"
        subgraph GW [Conxian Gateway]
            UBFF[UI BFF]
            WBFF[Wallet BFF]
            SP[Sovereign Proxy]
        end
        NX[Conxian Nexus / Nexus OS - IVC Indexer]
        AUTH[Enclave Auth / ZKC]
    end

    subgraph "Client Layer (Local-First)"
        UI[Conxian UI - Next.js / Wasm]
        ADM[Admin Dashboard - NixOS Status]
        W[Conxius Wallet - Secure Enclave]
        ORB[Conxius Orbit - TUI Deployer]
    end

    subgraph "Protocol Layer (Nakamoto / sBTC)"
        DEX[DEX Factory V2]
        LAUNCH[Self-Launch Coordinator]
        GOV[Governance & Reputation]
        SBTC[sBTC Vaults]
        MEV[PVDE MEV Protection]
    end

    subgraph "Bitcoin Sovereign Layers"
        BISQ[Bisq P2P]
        RGB[RGB Client-Side]
        BITVM[BitVM Optimistic]
        STX[Stacks Node - Nakamoto]
        LN[Lightning Network]
        BTC[Bitcoin L1]
    end

    P -->|Defines| GW
    P -->|Defines| UI
    P -->|Defines| ADM
    P -->|Defines| NX
    CI -->|Validates| P
    SDK -->|Powers| W
    SDK -->|Powers| UI
    SDK -->|Library| GW

    S -->|Cryptographic Provisioning| GW
    S -->|Cryptographic Provisioning| UI
    S -->|Cryptographic Provisioning| ADM
    S -->|Cryptographic Provisioning| W

    UI -->|Telemetry / Wasm| UBFF
    ADM -->|System Status| P
    W -->|PSBT Hand-off| WBFF
    ORB -->|Deploys| Protocol
    ORB -->|Monitors| STX

    GW -->|Authenticates| AUTH
    GW -->|Routes| Sovereign
    GW -->|Queries| NX
    NX -->|Syncs| STX

    STX -->|Anchored to| BTC

    subgraph Protocol [On-Chain Logic]
        DEX
        LAUNCH
        GOV
        SBTC
        MEV
    end

    subgraph Sovereign [Sovereign Services]
        BISQ
        RGB
        BITVM
    end

    Sovereign -->|Anchored| BTC
```

## 2. Legacy Orchestration (Deprecated)
The following graph represents the legacy hub-and-spoke model which is being phased out due to centralization risks.

```mermaid
graph TD
    subgraph "Orchestration & Infrastructure (Legacy)"
        P[Master Control Center]
        S[provision-secrets.sh]
        CI[CI/CD Runner]
    end

    subgraph "API & Middleware Layer"
        GW[Conxian Gateway - Monolithic]
        NX[Conxian Nexus - Glass Node]
    end

    subgraph "Client Layer"
        UI[Conxian UI]
        W[Conxius Wallet]
    end

    P -->|Manages| GW
    P -->|Manages| UI
    S -->|Configures| GW
    S -->|Configures| W

    UI -->|Unified API| GW
    W -->|Secure Signing| GW
    GW -->|Proxies| Sovereign
    GW -->|Queries| NX
```

## Enhancements & Roadmap Alignment
- **NixOS Control Plane**: Transitioned from Master Control Center to a declarative, reproducible state model.
- **BFF Topology**: Gateway refactored into domain-specific BFFs for improved security and isolation.
- **Local-First Execution**: Clients leverage Wasm-compiled lib-conxian-core for local cryptographic validation.
- **MEV Protection**: Implementation of Practical Verifiable Delay Encryption (PVDE) to neutralize front-running.

## Repository Roles
| Repository | Role |
| :--- | :--- |
| **conxius-platform** | Declarative Control Plane (Migrating to NixOS) |
| **lib-conxian-core** | **Unified Vault SDK** (Core Primitive) |
| **conxian-ui** | Local-First Web Dashboard |
| **admin-dashboard** | Infrastructure Monitoring |
| **Conxian** | Smart Contracts (L1/L2) |
| **conxius-wallet** | Mobile Sovereign Enclave |
| **stacksorbit** | TUI Deployment & Monitoring |
| **conxian-nexus** | Nexus OS / Glass Node / State Sync |

For full details, see [REPOSITORY_TAXONOMY](docs/REPOSITORY_TAXONOMY.md).
