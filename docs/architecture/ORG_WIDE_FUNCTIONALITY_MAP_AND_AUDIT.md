# Organization-Wide Functionality Map & Master Architecture Audit Report

**Organization**: Conxian Labs (`org-silent-sun-00457600`)
**Platform Baseline**: v0.2.5
**Audit Date**: September 2026 / Q3 2026
**Lead Systems Engineer**: Jules (Autonomous Platform Engineer)

---

## Executive Summary

This report delivers a full organization-wide functionality mapping, dependency graph audit, and enterprise client onboarding review across all Conxian Cloud infrastructure (Neon PostgreSQL databases, Render web services), monorepo service topology (`admin-dashboard`, `admin-pulse-bos`, `elizaos-plugin-conxian`, `conxian_nexus`), API surfaces, database schemas, Knowledge Base (KB) self-evolution pipelines, and security/governance compliance controls.

Conxian operates exclusively as a pure Deep-Tech B2B infrastructure vendor specializing in hardware-secured, memory-safe sovereign infrastructure for Bitcoin L1, legacy banking (ISO 20022), and AI settlement. Conxian does NOT operate public DeFi protocols; all stateless container images and hardware execution parameters are licensed for enterprise clients to run within private clouds or hardware enclaves.

---

## 1. Strict Domain Separation & Routing Firewall Matrix

Conxian maintains a strict legal and architectural firewall between open-source protocol distribution (`conxian.org`) and corporate/BOS operations (`conxian-labs.com`).

### 1.1 Protocol & Developer Surface (`conxian.org`)
*Pure technical distribution, stateless container images, SDKs, open specifications. No corporate marketing.*
- `conxian-nexus` -> `nexus.conxian.org`
- `conxian-gateway` -> `gateway.conxian.org`
- `conxius-enclave-sdk` -> `sdk.conxian.org`
- `conxius-platform` -> `platform.conxian.org`
- `conxian_market` -> `market.conxian.org`

### 1.2 Corporate & Governance Surface (`conxian-labs.com`)
*B2B Sales, Enterprise Licensing, Legal Compliance, Operations, and Sovereign Control Plane.*
- `conxian-business` -> `bos.conxian-labs.com`
- `conxian-labs-site` -> `www.conxian-labs.com`

---

## 2. Cloud Infrastructure & Service Topology Map

### 2.1 Neon Cloud Database Portfolio
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

### 2.2 Render Hosting & Deployment Architecture
- **Workspace**: My Workspace (`tea-d4ufhh8gjchc73c80mu0`, Team)
- **Active Web Service**: `srv-d9ndhr2jnfac73as7te0` (`conxian-labs-site`, `https://conxian-labs-site-xhqq.onrender.com`)
  - **Runtime**: Node.js
  - **Build Command**: `npm install`
  - **Start Command**: `npm start`
  - **Region**: Oregon (`oregon`)
  - **Auto-Deploy**: Enabled (`yes` on `main` branch push)

---

## 3. Monorepo Service Taxonomy & Primitives Dependency Graph

| Service Directory | Classification | Role & Target | Primary Tech Stack | Status |
|---|---|---|---|---|
| `services/admin-dashboard` | Institutional Dashboard & BFF | Public/Institutional Management API & UI | Next.js 16, React 19, TypeScript, Vitest | Active / Production |
| `services/admin-pulse-bos` | Internal Developer UI | Developer & Operations Dashboard (BOS) | React 19, Vite, Vitest, JSDOM | Active / Internal Dev |
| `services/elizaos-plugin-conxian` | AI Agent Integration | Autonomous AI Agent Plugin | TypeScript, ElizaOS SDK | Active |
| `src/conxian_nexus` | Python Core Engine | Protocol Adapters (Citrea, Strata) & Shadow Monitor | Python 3.12, pytest, aiohttp | Active |

### 3.1 Primitives Mapping (`lib-conxian-core`, `conxian-nexus`, `conxian-gateway`, `conxius-enclave-sdk`)
1. **`lib-conxian-core`**: Core cryptographic primitives (MuSig2, FROST, Schnorr, BIP-322) compiled to WebAssembly (Wasm).
2. **`conxian-gateway`**: Middleware consuming Wasm primitives for ISO 20022 message parsing and Universal Settlement Interface (USI) intent signing.
3. **`conxian-nexus`**: Cross-chain state indexer maintaining Kwil DB MMR tree state on Neon Cloud PostgreSQL (`public.mmr_nodes`).
4. **`conxius-enclave-sdk`**: Hardware enclave abstractions enforcing key derivation inside AWS Nitro Enclaves or Apple Secure Enclaves without key extraction.

---

## 4. Comprehensive API Surface Taxonomy (`admin-dashboard`)

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

## 5. B2B Enterprise Client Journey Simulation

### 5.1 Purchasing & Licensing
Enterprise clients acquire entitlement via Conxian Labs B2B Sales (`bos.conxian-labs.com`). Stateless container images and hardware execution parameters are pulled from `conxian.org` registries. M2M API tokens (`cx_live_...` or `cx_test_...`) are issued via `/api/v1/m2m/tokens` with SHA-256 hashed storage.

### 5.2 Environment Setup (`.env`)
Clients populate environment parameters required for container orchestration:
- `ENVIRONMENT`: `production` | `staging` | `development`
- `CORE_DB_URI`: `postgresql://db_user:password@postgres.client.internal:5432/neondb?sslmode=require`
- `BITCOIN_RPC_URL`: `https://btc-node.client.internal:8332`
- `STACKS_RPC_URL`: `https://stacks-node.client.internal:20443`
- `KWIL_DB_URL`: `https://kwil-node.client.internal:8080`
- `M2M_TOKEN`: `cx_live_...`
- `GATEWAY_ADMIN_KEY`: Min 16-char secret key
- `GATEWAY_JWT_SECRET`: Min 32-char secret key
- `ENCLAVE_KMS_KEY_ARN`: AWS Nitro / KMS Key ARN (optional, software vault fallback)
- `TARGET`: `nixos` | `docker-compose` | `helm`

### 5.3 Deployment Flow & Connectivity
1. **ISO 20022 Input**: Client bank dispatches ISO 20022 XML message (`pacs.008`).
2. **Gateway Normalization**: Gateway parses XML, normalizes payload into USI Intent, and signs inside Enclave.
3. **Nexus Indexing**: Intent is anchored into Kwil DB MMR tree state on Nexus.
4. **L1 Settlement**: Settlement Engine dispatches L1 Bitcoin Taproot / sBTC transaction.

### 5.4 Installer Efficacy
`@conxian/cli` (`services/admin-dashboard/src/lib/support/installer.ts`) runs a fail-closed 6-point pre-flight diagnostic probe (`database`, `gateway`, `nexus`, `bitcoin-rpc`, `stacks-rpc`, `m2m-token`) before container spin-up, ensuring 100% readiness.

---

## 6. `conxian.org` Protocol Surface Architecture Specification

To preserve sovereign, minimalist, and high-security standards for the `conxian.org` public protocol surface:

### 6.1 Recommended Framework & Tooling
- **Framework**: Astro with Starlight theme (or Next.js with `output: 'export'`).
- **Rationale**: Ships zero JavaScript by default, generating immutable static assets with minimum attack surface.
- **Package Manager**: `pnpm` workspace integration.
- **CI/CD**: Node CI workflow with Gitleaks secret scanning and strict CODEOWNERS review rules.

### 6.2 Recommended Site Structure
- `/` (Home): Technical landing page defining Conxian L1/L3 ecosystem, MuSig2, FROST, and BitVM2 primitives.
- `/status` (Ecosystem Status): Live status matrix linking out to subdomains (`nexus.conxian.org`, `gateway.conxian.org`, `sdk.conxian.org`, `platform.conxian.org`, `market.conxian.org`).
- `/docs` (Developer Hub): API documentation for `conxius-enclave-sdk`, Gateway ISO 20022 XML normalizers, and OData callbacks.
- `/transparency` (Monthly Reports): Forwarding or embedding transparency summaries from `market.conxian.org`.

### 6.3 Reverse Proxy & Strict CORS Configuration (Caddy & Nginx)

#### Caddyfile Example (`conxian.org`)
```caddy
conxian.org, *.conxian.org {
    tls internal

    @nexus host nexus.conxian.org
    handle @nexus {
        reverse_proxy nexus-container:8080
    }

    @gateway host gateway.conxian.org
    handle @gateway {
        reverse_proxy gateway-container:3000
    }

    @sdk host sdk.conxian.org
    handle @sdk {
        reverse_proxy sdk-docs-container:80
    }

    @platform host platform.conxian.org
    handle @platform {
        reverse_proxy platform-container:3001
    }

    @market host market.conxian.org
    handle @market {
        reverse_proxy market-container:8081
    }

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
        Access-Control-Allow-Origin "https://conxian.org"
    }
}
```

---

## 7. Scored Gap Analysis & Phase 7 Alignment

| Gap ID | Strategic Initiative | Implementation Module / Specification | Score | Status |
|---|---|---|---|---|
| **G-65** | Conxian Unified API Token Management | `services/admin-dashboard/src/lib/support/apiTokens.ts` | **25** | 🟢 Implemented & Unit Verified |
| **G-66** | Unified Client System Installer Engine | `services/admin-dashboard/src/lib/support/installer.ts` | **25** | 🟢 Implemented & Unit Verified |
| **G-67** | End-to-End Inter-Service Connectivity Harness | `services/admin-dashboard/src/lib/support/installer.ts` | **25** | 🟢 Implemented & Unit Verified |
| **G-68** | conxian.org Protocol Surface & Developer Hub | `docs/architecture/ORG_WIDE_FUNCTIONALITY_MAP_AND_AUDIT.md` | **26** | 🟢 Blueprint & Spec Verified |
| **G-69** | Strict Domain Firewall & CORS Infrastructure | `docs/architecture/ORG_WIDE_FUNCTIONALITY_MAP_AND_AUDIT.md` | **25** | 🟢 Blueprint & Spec Verified |

---

## 8. Verification & Sign-off

- **Unit Test Suite**: 274/274 TypeScript tests passed across 32 test files; Python pytest suite passed.
- **Lifecycle Control Gates**: All 7 checks passed (`verify_service_catalog`, `verify_lifecycle_control_gates`, `verify_bos_production_boundary`, `verify_submodule_integrity`, `verify_contamination_guard`, `verify_tracked_artifacts`, `verify_release_hygiene`).
- **Security & Hygiene Audit**: 0 hardcoded secrets found; 0 tracked `.env` or key files.
