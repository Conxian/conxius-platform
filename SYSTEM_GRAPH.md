# Conxian System Architecture: Full Organization Viewpoint

This graph represents the holistic viewpoint of the Conxian organization and how `conxius-platform` orchestrates the ecosystem.

```mermaid
graph TD
    subgraph "Orchestration & Infrastructure (conxius-platform)"
        P[Master Control Center]
        S[provision-secrets.sh]
        CI[CI/CD Runner]
    end

    subgraph "API & Middleware Layer (lib-conxian-core / Nexus)"
        GW[Conxian Gateway - Actix-web]
        NX[Conxian Nexus - Glass Node]
        AUTH[JWT / Enclave Auth]
        HIRO[Hiro API Compatibility]
    end

    subgraph "Client Layer (conxian-ui / wallet / orbit / admin)"
        UI[Conxian UI - Next.js]
        ADM[Admin Dashboard - Next.js]
        W[Conxius Wallet - Android/iOS]
        ORB[StacksOrbit - TUI Deployer]
    end

    subgraph "Protocol Layer (Conxian Contracts)"
        DEX[DEX Factory V2]
        LAUNCH[Self-Launch Coordinator]
        GOV[Governance & Reputation]
        SBTC[sBTC Vaults]
    end

    subgraph "External Nodes & Bitcoin Network"
        BISQ[Bisq Node]
        RGB[RGB Node]
        BITVM[BitVM Node]
        STX[Stacks Node - Nakamoto]
        BTC[Bitcoin L1]
    end

    P -->|Manages| GW
    P -->|Manages| UI
    P -->|Manages| ADM
    P -->|Manages| NX
    S -->|Configures| GW
    S -->|Configures| UI
    S -->|Configures| ADM
    S -->|Configures| W

    UI -->|Unified API| GW
    ADM -->|Telemetry| GW
    W -->|Secure Signing| GW
    ORB -->|Deploys| Protocol
    ORB -->|Monitors| STX

    GW -->|Authenticates| AUTH
    GW -->|Proxies| Sovereign
    GW -->|Queries| NX
    NX -->|Syncs| STX

    STX -->|Anchored to| BTC

    subgraph Protocol [On-Chain Logic]
        DEX
        LAUNCH
        GOV
        SBTC
    end

    subgraph Sovereign [Sovereign Services]
        BISQ
        RGB
        BITVM
    end
```

## Enhancements & Roadmap Alignment
- **Nakamoto Readiness**: All components are aligned with Stacks Epoch 3.1 (Clarity 4).
- **Institutional Scale**: The Gateway (Gateway/Core) provides the compliance and performance layer for enterprise adoption.
- **Sovereign Integration**: Roadmap includes native RGB asset support and BitVM-based computation proofs.
- **Root-Up Ethos**: Reliability is built from the core libraries up to the user interfaces.

## Repository Roles
| Repository | Role |
| :--- | :--- |
| **conxius-platform** | Master Orchestrator |
| **lib-conxian-core** | Shared Primitives & Gateway |
| **conxian-ui** | Web Dashboard |
| **admin-dashboard** | Internal Telemetry Dashboard |
| **Conxian** | Smart Contracts (L1/L2) |
| **conxius-wallet** | Mobile Sovereign Enclave |
| **stacksorbit** | TUI Deployment & Monitoring |
| **conxian-nexus** | Glass Node / State Sync |
| **conxian-labs-site** | Public Information |
