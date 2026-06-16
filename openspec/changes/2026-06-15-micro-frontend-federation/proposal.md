# Proposal: Micro-Frontend Federation for Admin Dashboard

## 1. Problem Statement
The Admin Dashboard is currently a monolithic Next.js application. As Phase 7 introduces complex domains like BitVM monitoring, RGB asset management, and Institutional ERP integration, the monolith creates organizational friction, deployment bottlenecks, and increased blast radii for regressions.

## 2. Proposed Solution
Implement Module Federation (or Next.js Multi-Zones) to decompose the dashboard into independent, local-first micro-frontends.

### Key MFEs:
- **Core-Shell**: Shared layout, navigation, and authentication.
- **Liquidity-Pulse**: Unified balance and yield telemetry.
- **Settlement-Engine**: USI intent drafting and PSBT coordination.
- **Governance-Console**: DAO voting and policy management.

## 3. Technical Requirements
- **Framework**: Next.js with Webpack 5 Module Federation or `@module-federation/nextjs-mf`.
- **Shared Library**: Core primitives and types from `@conxian/core-sdk`.
- **Communication**: Custom Events or a shared Redux/Zustand store slice for global context (Auth, Active Asset).

## 4. Expected Benefits
- **Independent Scalability**: Teams can deploy updates to the Settlement Engine without affecting the Governance Console.
- **Resilience**: A failure in the BitVM explorer doesn't crash the core treasury dashboard.
- **Local-First Development**: Developers can run only the specific MFE they are working on.

## 5. Implementation Path
1. Proof-of-Concept federation between Shell and Liquidity-Pulse.
2. Establish shared CI gates for cross-MFE integration testing.
3. Migrate existing pages to federated zones.
