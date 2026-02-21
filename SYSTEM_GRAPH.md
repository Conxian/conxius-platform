# Conxian System Architecture

This graph represents the full viewpoint of the `conxius-platform` and its constituent services.

```mermaid
graph TD
    subgraph "Orchestration Layer (conxius-platform)"
        P[Master Makefile / Docker Compose]
        S[provision-secrets.sh]
    end

    subgraph "API Layer (lib-conxian-core/gateway)"
        GW[Conxian Gateway - Actix-web]
        AUTH[JWT Middleware]
        HIRO[Hiro API Compatibility]
        SWAG[Swagger/OpenAPI]
    end

    subgraph "Frontend Layer (conxian-ui)"
        UI[Conxian UI - Next.js]
        ADM[Admin Dashboard]
        THEME[Earthy Corporate Theme]
    end

    subgraph "Protocol Layer (lib-conxian-core)"
        CORE[Shared Rust Primitives]
        SDK[Shared TS Libraries]
    end

    subgraph "External Nodes (Sovereign Services)"
        BISQ[Bisq Node]
        RGB[RGB Node]
        BITVM[BitVM Node]
        STX[Stacks Node]
    end

    P -->|Manages| GW
    P -->|Manages| UI
    P -->|Manages| External
    S -->|Configures| GW
    S -->|Configures| UI

    UI -->|API Requests| GW
    GW -->|Authenticates| AUTH
    GW -->|Proxies| BISQ
    GW -->|Proxies| RGB
    GW -->|Proxies| BITVM
    GW -->|Wraps| STX

    UI -->|Uses| SDK
    GW -->|Uses| CORE

    subgraph External [Sovereign Network]
        BISQ
        RGB
        BITVM
        STX
    end
```

## Enhancements & Alignment
- **Unified Entry Point**: All client requests flow through the Gateway.
- **Shared Primitives**: Both Gateway and UI (via SDK) share logic defined in `lib-conxian-core`.
- **Theme Consistency**: UI follows the Earthy Corporate Finance palette as defined in `globals.css`.
- **Sovereign Integration**: Roadmap includes full integration of Bisq, RGB, and BitVM nodes.
