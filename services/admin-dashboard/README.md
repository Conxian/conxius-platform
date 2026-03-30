# Conxius Admin Dashboard

This service is the internal backend/frontend orchestration layer for the Conxian platform. It provides real-time telemetry from the Unified Gateway Engine and allows for management of institutional secrets.

## Features

- **Infrastructure Pulse**: Real-time monitoring of Gateway health, Engine version, and request throughput.
- **Nexus "Glass Node" State**: Visibility into Merkle roots and synchronization status with Stacks L1.
- **Sovereign Services Tracking**: Status monitoring for Stacks (L2), Bisq (P2P), RGB, BitVM, and Lightning Network.
- **Secret Management**: Interface for provisioning institutional secrets and BOS wallet mappings (accessible via `/settings`).

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **State Management**: React Hooks (useState, useEffect)

## Getting Started

### Local Development

1.  Navigate to the service directory:
    ```bash
    cd services/admin-dashboard
    ```
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Run the development server:
    ```bash
    pnpm dev
    ```
    The dashboard will be available at [http://localhost:3001](http://localhost:3001).

## Architecture

- `src/app/`: Next.js App Router for UI components and API routes.
- `src/app/api/secrets/`: Backend logic for managing `.env.admin` secrets.
- `src/app/settings/`: Enterprise Management Console settings for high-privilege configuration.

## RBAC & Security

Access to this dashboard is currently intended for internal use. Future iterations will include Role-Based Access Control (RBAC) integrated with `conxian-access.clar`.
