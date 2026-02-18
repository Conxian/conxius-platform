# Conxian Labs: Unified Alignment Strategy

This document serves as the authoritative guide for aligning business logic, design, and authority across all Conxian Labs repositories.

## 1. Business Logic Alignment (The "Fusion")

- **Single Source of Truth**: The **Conxian Gateway** is the unified entry point for all protocol state and sovereign services (Bisq, RGB, BitVM, Changelly).
- **Core Primitives**: All shared cryptographic and protocol logic resides in `lib-conxian-core`. No duplication of logic across clients.
- **Protocol State**: Clients (UI, Wallet) should interact with the Gateway for state monitoring and compliance pipes rather than raw contract RPC where possible.

## 2. Design Alignment (Earthy Corporate Finance)

- **Theme**: All interfaces follow the **Tier0 light theme**.
- **Palette**: Professional, grounded, precise.
  - Primary: `#2E403B` (Forest Green)
  - Accent: `#D4A017` (Gold)
  - Background: `#F5F5F5` / `#FFFFFF`
  - Text: `#333333`
- **Typography**: Inter (Sans-serif) for professional clarity.
- **Assets**: Use `conxian-mark-b.svg` (outlined shield) as the canonical mark.

## 3. Authority Alignment (Sovereign Autonomous Business)

- **Orchestration**: `conxius-platform` is the master control center. Use it to spin up the entire ecosystem.
- **Secrets Management**: All sensitive keys must be provisioned via `scripts/provision-secrets.sh`. Zero-trust local development.
- **Deployment**: Unified deployment via Render (UI/Admin) and GCP (Gateway/Core).
- **Code is Law**: Decisions are encoded in Rust and Clarity. Human discretion is replaced by mathematical certainty.

## Repo-Specific Directives

- **Conxian_UI**: Use canonical components (`Button`, `Input`, `Card`). No design-token drift.
- **lib-conxian-core**: Maintain audit-ready Rust binaries and shared TypeScript libraries.
- **conxian-gateway**: Consolidate all sovereign service APIs.

## 4. Resource Registry

- **Conxius Wallet**: Sovereign Android Vault.
- **Conxian Finance**: Stacks-native DeFi engine.
- **Conxian Gateway**: Unified institutional backend.
- **Conxian Nexus**: API bridge for legacy integrations.
- **lib-conxian-core**: Shared crypto/protocol primitives.
