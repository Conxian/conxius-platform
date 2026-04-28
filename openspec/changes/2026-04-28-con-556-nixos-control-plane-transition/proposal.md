# Proposal: Narrowing Conxius Platform to NixOS Control Plane (CON-556)

## 1. Problem Statement
The current Conxius platform architecture relies on a centralized "Master Control Center" (MCC) and imperative shell scripts (`provision-secrets.sh`) for orchestration and secret management. This creates a single point of failure and contradicts the sovereign, trust-minimized ethos of the Bitcoin ecosystem.

## 2. Proposed Solution
Transition the orchestration layer to a purely functional, declarative model using **NixOS** and **sops-nix**.

### 2.1 Declarative Infrastructure
- Replace the MCC with NixOS configurations using the `nix-bitcoin` module suite.
- Infrastructure state will be defined in a decentralized, version-controlled repository.
- Each node pulls its own configuration, ensuring reproducibility and eliminating rogue state drift.

### 2.2 Cryptographic Secret Management
- Deprecate `provision-secrets.sh`.
- Adopt `sops-nix` with `age` encryption.
- Secrets will be encrypted at rest and bound to specific SSH host private keys, ensuring only the target node can decrypt its specific credentials.

### 2.3 Narrowed Scope
The `conxius-platform` repository will no longer act as a "master" but as a **Declarative Control Plane** repository containing NixOS flake definitions for the entire ecosystem.

## 3. Impact
- **Security**: Eliminates the MCC as a prime attack vector.
- **Reliability**: Guarantees identical environments via NixOS purity.
- **Sovereignty**: Empowers users to run their own "local-first" instances of the full stack with minimal trust assumptions.

## 4. Tasks
- Update documentation (`README.md`, `SYSTEM_GRAPH.md`) to reflect the new architecture.
- Define the directory structure for NixOS configurations.
- Document the migration path from imperative to declarative state.
