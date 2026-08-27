# Organization-Wide Functionality Map & Audit Report

**Organization**: Conxian Labs (`org-silent-sun-00457600`)
**Platform Version**: v0.2.5
**Date**: August 2026 / Q3 2026
**Auditor**: Jules (Autonomous Platform Engineer)

---

## Executive Summary

This report delivers a full org-wide functionality mapping and audit across all cloud infrastructure (Neon PostgreSQL databases, Render hosting services), monorepo service topology (`admin-dashboard`, `admin-pulse-bos`, `elizaos-plugin-conxian`, `conxian_nexus`), API surfaces, database schemas, Knowledge Base (KB) self-evolution pipelines, and security/governance compliance controls.

---

## 1. Cloud Infrastructure & Service Topology Map

### 1.1 Neon Cloud Database Portfolio
- **Organization**: Conxian Labs (`org-silent-sun-00457600`)
- **Total Provisioned Projects**: 6

| Project ID | Project Name | Region | PG Version | Database Schemas & Active Tables | Purpose / Domain |
|---|---|---|---|---|---|
| `sparkling-sunset-69236559` | `corelibs` | `aws-us-east-2` | 18 | `neondb` (0 user tables) | Core Library Dev & Experiments |
| `weathered-night-98492579` | `Software dev kit` | `aws-us-east-2` | 18 | `neondb` (0 user tables) | SDK Testing & Provisioning |
| `noisy-flower-17484435` | `Business Operating System` | `aws-us-east-2` | 18 | `affiliate`, `cnx_bos`, `erp_mock`, `neon_auth`, `public` | Production BOS & ERP Simulation Data |
| `small-math-44741750` | `market` | `aws-eu-central-1` | 18 | `affiliate`, `cnx_bos`, `erp_mock`, `neon_auth`, `public` | Decentralized Market Engine |
| `noisy-cloud-41146057` | `Gateway` | `aws-ap-southeast-1` | 18 | `public.mmr_nodes` | Conxian Gateway State & MMR Nodes |
| `orange-paper-76209725` | `Conxian Nexus` | `aws-eu-central-1` | 17 | `affiliate`, `cnx_bos`, `erp_mock`, `neon_auth`, `public` (`_sqlx_migrations`, `local_cache`, `mmr_nodes`) | Conxian Nexus Cross-Chain Hub |

### 1.2 Render Hosting & Deployment Architecture
- **Workspace**: My Workspace (`tea-d4ufhh8gjchc73c80mu0`, Team)
- **Active Web Service**: `srv-d9ndhr2jnfac73as7te0` (`conxian-labs-site`, `https://conxian-labs-site-xhqq.onrender.com`)
  - **Runtime**: Node.js
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`
  - **Region**: Oregon (`oregon`)
  - **Auto-Deploy**: Enabled (`yes` on `main` branch push)

---

## 2. Monorepo Service Taxonomy

| Service Directory | Classification | Role & Target | Primary Tech Stack | Status |
|---|---|---|---|---|
| `services/admin-dashboard` | Institutional Dashboard & BFF | Public/Institutional Management API & UI | Next.js 16, React 19, TypeScript, Vitest | Active / Production |
| `services/admin-pulse-bos` | Internal Developer UI | Developer & Operations Dashboard (BOS) | React 19, Vite, Vitest, JSDOM | Active / Internal Dev |
| `services/elizaos-plugin-conxian` | AI Agent Integration | Autonomous AI Agent Plugin | TypeScript, ElizaOS SDK | Active |
| `src/conxian_nexus` | Python Core Engine | Protocol Adapters (Citrea, Strata) & Shadow Monitor | Python 3.12, pytest, aiohttp | Active |

---

## 3. Comprehensive API Surface Taxonomy (`admin-dashboard`)

The `admin-dashboard` Backend-For-Frontend (BFF) exposes 39+ structured API endpoints under `/api/v1/`:

1. **Settlement Engine (`/api/v1/settlement-engine`)**:
   - Universal Settlement Interface (USI) orchestration.
   - BIP-322 intent signature verification.
   - BitVM2 verification floor challenge taps (364 taps, Groth16 segment validation).
   - FROST threshold signature coordination (DKG, signing packages).
   - Zero-Knowledge Contingent Payments (ZKCP) verification.
   - BitVMX adaptive execution proof management.

2. **Liquidity Engine (`/api/v1/liquidity`)**:
   - Unified cross-chain liquidity aggregation.
   - ERC-7683 solver selection engine (G-12 ranking and binding bid generation).

3. **Wallet Services (`/api/v1/wallet`)**:
   - PSBT (Partially Signed Bitcoin Transaction) construction and parsing.
   - Address derivation (Taproot, Native SegWit, BIP-322).

4. **Telemetry & UI (`/api/v1/ui`)**:
   - System state telemetry and client configuration options.

5. **Nostr Event Bus (`/api/v1/nostr`)**:
   - WebLN / NWC (Nostr Wallet Connect) event delivery stream.

6. **Cart & DNS Mandates (`/api/cart/mandates/[id]/checkout`)**:
   - SIDL persistence, x402 payment headers, and automated billing checkout.

---

## 4. Phase 7 Strategic Anchors & OpenSpec Alignment

| Anchor ID | Strategic Initiative | Implementation Module | Status |
|---|---|---|---|
| **G-01** | BitVM2 Verification Floor | `services/admin-dashboard/src/lib/support/bitvm.ts` | Active Scaffolding / Unit Verified |
| **G-05** | Silent Payments (BIP-352) | `services/admin-dashboard/src/lib/support/silentPayments.ts` | Research & Alignment |
| **G-08** | Citrea L2 Adapter | `services/admin-dashboard/src/lib/support/citrea.ts` | Active Scaffolding / Unit Verified |
| **G-09** | BIP-322 Intent Signatures | `services/admin-dashboard/src/lib/support/bip322.ts` | Active Scaffolding / Unit Verified |
| **G-11** | BitVM2 Multi-Party Aggregation | `services/admin-dashboard/src/lib/support/bitvm.ts` | Active Scaffolding / Unit Verified |
| **G-12** | ERC-7683 Solver Selection Engine | `services/admin-dashboard/src/lib/support/solver.ts` | Active Scaffolding / Unit Verified |
| **G-14** | FROST Threshold Signatures | `services/admin-dashboard/src/lib/support/frost.ts` | Active Scaffolding / Unit Verified |
| **G-20** | BitVM3 Orchestration | `services/admin-dashboard/src/lib/support/bitvm3.ts` | Active Scaffolding / Unit Verified |
| **G-23** | Ark Layer-2 Adapter | `services/admin-dashboard/src/lib/support/ark.ts` | Active Scaffolding / Unit Verified |
| **G-44** | BitVMX Execution Engine | `services/admin-dashboard/src/lib/support/bitvmx.ts` | Active Scaffolding / Unit Verified |
| **G-50** | Zero-Knowledge Contingent Payments | `services/admin-dashboard/src/lib/support/zkcp.ts` | Active Scaffolding / Unit Verified |

---

## 5. Audit Findings & Best-Option Recommendations

### 5.1 Hardened Security & Hygiene Audit
- **Tracked Secrets / Sensitive Files**: PASSED (No `.env` or private keys tracked).
- **Tracked Build Artifacts**: PASSED (No `.next`, `dist`, or `coverage` tracked).
- **Hardcoded Secret Scanning**: PASSED (Zero findings).
- **Governance & License Files**: PASSED (Root and service-level governance files in place).

### 5.2 Container & Hosting Deployment Audit (Best-Option Enhancement)
- **Finding**: Render and containerized environments (Next.js 16 standalone / `next start`) require explicit binding to host address `0.0.0.0` and dynamic port binding via `${PORT}`.
- **Action**: Update `services/admin-dashboard/package.json` to explicitly pass `-H ${HOSTNAME:-0.0.0.0} -p ${PORT:-3001}` in the start script, and extend `scripts/maintenance/hardened_audit.py` to audit start script host binding compliance.

---

## 6. Verification & Sign-off

- **Unit Test Suite**: 239/239 TypeScript tests passed; Python pytest suite passed.
- **Lifecycle Control Gates**: All 5 checks passed (`verify_service_catalog`, `verify_lifecycle_control_gates`, `verify_bos_production_boundary`, `verify_submodule_integrity`, `verify_contamination_guard`).
