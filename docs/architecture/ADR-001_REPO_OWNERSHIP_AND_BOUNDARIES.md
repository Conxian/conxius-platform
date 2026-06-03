# ADR 001: Repository Ownership and Architectural Boundaries

## Status
Proposed (June 2026)

## Context
The Conxius Platform has grown from a monolithic structure to a multi-repository ecosystem. To ensure maintainability, security, and clear authority, we need to define the boundaries of each repository and the language/technology strategy for each.

## Decision
We define the following repository roles:

1. **conxius-platform (Control Plane)**
   - **Role**: Composition, Orchestration, Local-First Harness.
   - **Tech**: NixOS, Shell, Docker, TypeScript (for orchestration logic).
   - **Boundary**: Does not contain runtime business logic or protocol primitives.

2. **conxian-gateway (Middleware)**
   - **Role**: Backend-for-Frontend (BFF), API Gateway, Multi-chain Orchestration.
   - **Tech**: Rust (Actix-web), Kwil.
   - **Boundary**: Owns the API contract for clients; bridges Bitcoin/Stacks protocols.

3. **lib-conxian-core (Protocol Core)**
   - **Role**: Shared Primitives, Cryptography, Wasm SDK.
   - **Tech**: Rust (compiling to Wasm).
   - **Boundary**: Single source of truth for protocol logic; used by Gateway, UI, and Wallet.

4. **conxian-ui (Public Interface)**
   - **Role**: Institutional Dashboard, DEX Interface.
   - **Tech**: Next.js, TypeScript.
   - **Boundary**: Pure UI layer; consumes Gateway APIs; executes local-first validation via Wasm.

5. **conxian-business (Operations)**
   - **Role**: Private Strategy, Legal, Internal Control Plane UI.
   - **Tech**: Next.js, Markdown.
   - **Boundary**: Contains sensitive institutional documents and the administrative 'control-plane' app.

## Consequences
- **Logic Migration**: Any protocol logic currently in the Gateway should be moved to `lib-conxian-core`.
- **Infrastructure**: Provisioning moves from imperative scripts to declarative NixOS modules.
- **Security**: Institutional secrets are managed via `sops-nix` in the Control Plane, never reaching public repos.
