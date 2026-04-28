# Conxian System Architecture: Sovereign Declarative Topology

This graph represents the holistic viewpoint of the Conxian organization, transitioning from centralized orchestration to a decentralized NixOS control plane.

```mermaid
graph TD
    subgraph "NixOS Control Plane (conxius-platform)"
        P[Declarative Flake State]
        S[sops-nix / age]
        CI[NixOS Rebuild / CI]
    end

    subgraph "Middleware (Backend-for-Frontend)"
        subgraph GW [Conxian Gateway]
            UBFF[UI BFF]
            WBFF[Wallet BFF]
            SP[Sovereign Proxy]
        end
        NX[Conxian Nexus - Glass Node]
        AUTH[Enclave Auth / ZKC]
    end

    subgraph "Client Layer (Local-First)"
        UI[Conxian UI - Next.js / Wasm]
        ADM[Admin Dashboard - NixOS Status]
        W[Conxius Wallet - Secure Enclave]
        ORB[StacksOrbit - TUI Deployer]
    end

    subgraph "Protocol Layer (Conxian Contracts)"
        DEX[DEX Factory V2]
        LAUNCH[Self-Launch Coordinator]
        GOV[Governance & Reputation]
        SBTC[sBTC Vaults]
        MEV[PVDE MEV Protection]
    end

    subgraph "External Nodes & Bitcoin Network"
        BISQ[Bisq Node]
        RGB[RGB Node]
        BITVM[BitVM Node]
        STX[Stacks Node - Nakamoto]
        BTC[Bitcoin L1]
    end

    P -->|Defines| GW
    P -->|Defines| UI
    P -->|Defines| ADM
    P -->|Defines| NX
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
```

## Enhancements & Roadmap Alignment
- **NixOS Control Plane**: Transitioned from Master Control Center to a declarative, reproducible state model.
- **BFF Topology**: Gateway refactored into domain-specific BFFs for improved security and isolation.
- **Local-First Execution**: Clients leverage Wasm-compiled lib-conxian-core for local cryptographic validation.
- **MEV Protection**: Implementation of Practical Verifiable Delay Encryption (PVDE) to neutralize front-running.

## Repository Roles
| Repository | Role |
| :--- | :--- |
| **conxius-platform** | Declarative Control Plane |
| **lib-conxian-core** | Shared Primitives & Wasm SDK |
| **conxian-ui** | Local-First Web Dashboard |
| **admin-dashboard** | Infrastructure Monitoring |
| **Conxian** | Smart Contracts (L1/L2) |
| **conxius-wallet** | Mobile Sovereign Enclave |
| **stacksorbit** | TUI Deployment & Monitoring |
| **conxian-nexus** | Glass Node / State Sync |
