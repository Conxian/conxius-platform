# Conxian-Labs: Systemic Alignment & Production Readiness Enhancement Plan

This plan outlines the sequential steps required to reconcile the current codebase with Linear "Done" status, satisfy Phase 5/6 architectural specifications, and achieve production-grade readiness.

## Phase 1: Gateway Core Restoration & Alignment
**Goal**: Bring the Conxian Gateway into parity with documented "Done" features and Phase 6 specifications.

1.  **HSM & Security Wiring (CON-34)**:
    *   Implement HSM FIPS 140-2 Level 3 status tracking in the Engine.
    *   Add `/api/v1/hsm/status` endpoint.
2.  **ISO 20022 & Institutional Bridge (CON-76, CON-63)**:
    *   Implement OData v4 parsers and pacs.008 wrapper in the Gateway.
    *   Add `/api/v1/erp/sync` and `/api/v1/iso2022/pacs008` endpoints.
3.  **Revenue & Financial Intelligence (CON-68, CON-60)**:
    *   Implement the 'Revenue Intelligence' module for real-time attribution.
    *   Add persistence logic for ARR/MRR/Churn metrics.
4.  **Phase 6 Sovereign Primitives (Alignment)**:
    *   Implement Sovereign AI Allocation logic (`/api/v1/ai/allocation`).
    *   Implement Universal Bitcoin Identity (UBI) management (`/api/v1/identity/ubi`).
    *   Implement Nexus Glass Node state synchronization (`/api/v1/nexus/state`).

## Phase 2: Frontend API Layer & UI Connectivity
**Goal**: Wire the UI to consume the high-fidelity Gateway endpoints.

1.  **Core API Client Extension**:
    *   Update `services/conxian-ui/src/lib/core-api.ts` with Phase 6 methods: `getAiAllocation`, `getUbiIdentity`, `getNexusState`.
2.  **System Telemetry Integration**:
    *   Refactor UI `SystemStatus` component to fetch live data from the Gateway's unified telemetry instead of contract mocks.
3.  **Component "Vibe-Verification"**:
    *   Audit all UI components (AiAllocationCard, NexusSyncStatus, UbiIdentityCard) for adherence to the "Sovereign Earthy" theme.

## Phase 3: Smart Contract Logic Stabilization
**Goal**: Transition from stubs to functional Clarity 4 code.

1.  **Revenue Automation (CON-60)**:
    *   Implement the 1% non-negotiable protocol fee logic in `revenue-automation.clar`.
2.  **DLC Bond Lifecycle (CON-72, CON-62)**:
    *   Implement the full lifecycle logic in `dlc-orchestrator.clar`.

## Phase 4: Operational & Tooling Readiness
**Goal**: Finalize deployment configurations and service health.

1.  **Render Service Configuration**:
    *   Provision and configure Render services for the Gateway and UI to resolve the current empty workspace state.
2.  **Verification Sweep**:
    *   Execute `clarinet check` and Vitest/Playwright suites across all business units.
    *   Verify Zero Secret Egress (ZSE) compliance.
