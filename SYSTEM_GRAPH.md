# Conxian System Architecture: Holistic Viewpoint

> [!IMPORTANT]
> **Architectural Transition in Progress**: The platform is migrating from a centralized orchestration model to a decentralized, local-first, BFF-driven topology. See [SOVEREIGN_REPR_2026.md](./docs/architecture/SOVEREIGN_REPR_2026.md) for the authoritative redesign specification.

## 1. Proposed Sovereign Architecture (Target State)
The target architecture dismantling the "Master Control Center" in favor of declarative NixOS configuration and Backend-for-Frontend (BFF) routing.

```mermaid
graph TD
    subgraph "Infrastructure (Declarative NixOS)"
        NIX[nix-bitcoin / NixOS]
        REPO[Declarative Repo - Source of Truth]
    end

    subgraph "Middleware (BFF Topology)"
        UI_BFF[UI BFF - High Throughput]
        WAL_BFF[Wallet BFF - Hardened / PSBT]
        SOV_PRX[Sovereign Proxy - Isolated]
        NX_OS[Nexus OS - IVC Indexer]
    end

    subgraph "Client Layer (Local-First)"
        UI[Conxian UI - Wasm lib-core]
        W[Conxius Wallet - Local Enclave]
        ADM[Admin Dashboard]
    end

    subgraph "Protocol Layer (Nakamoto / sBTC)"
        DEX[DEX Factory V2]
        LAUNCH[Self-Launch Coordinator]
        SBTC[sBTC Vaults]
    end

    subgraph "Bitcoin Sovereign Layers"
        BISQ[Bisq P2P]
        RGB[RGB Client-Side]
        BITVM[BitVM Optimistic]
        LN[Lightning Network]
        BTC[Bitcoin L1]
    end

    REPO -->|Nix Pull| NIX
    NIX -->|Builds| UI_BFF
    NIX -->|Builds| WAL_BFF
    NIX -->|Builds| SOV_PRX
    NIX -->|Builds| NX_OS

    UI -->|Local Logic| UI
    UI -->|Telemetry| UI_BFF
    UI_BFF -->|Query| NX_OS

    W -->|Local Signing| W
    W -->|Restricted PSBT| WAL_BFF
    WAL_BFF -->|Bridge| SOV_PRX

    SOV_PRX -->|Protected Traffic| Sovereign

    subgraph Sovereign [Sovereign Services]
        BISQ
        RGB
        BITVM
    end

    NX_OS -->|Nakamoto Sync| BTC
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

## Repository Roles
| Repository | Role |
| :--- | :--- |
| **conxius-platform** | Control Plane (Migrating to NixOS) |
| **lib-conxian-core** | Shared Primitives (Wasm-ready) |
| **conxian-ui** | Web Dashboard (Local-first) |
| **conxius-wallet** | Mobile Sovereign Enclave |
| **conxian-nexus** | Nexus OS / IVC Indexer |

For full details, see [REPOSITORY_TAXONOMY](docs/REPOSITORY_TAXONOMY.md).
