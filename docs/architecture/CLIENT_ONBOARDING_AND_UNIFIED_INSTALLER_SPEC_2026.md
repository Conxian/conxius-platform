# Client Onboarding, System Installation & Unified Installer Architecture Specification (2026)

**Status:** Active System Architecture Blueprint
**Last Verified:** 2026-09-08
**Scope:** Client Acquisition, First-Time Onboarding, Declarative Provisioning, Inter-Service Connectivity, and Fail-Closed Diagnostics.

---

## 1. Executive Summary & System Positioning

Conxian provides a non-custodial, high-throughput financial orchestration control plane bridging Bitcoin Layer 1 (Taproot, BitVM2, BitVMX, Silent Payments, sBTC, ZKCP, FROST) and Stacks Layer 2 with institutional systems. Conxian operates exclusively as a **routing and settlement orchestration surface**: it never holds custody of client funds, private keys, or proprietary data of record.

This document establishes the end-to-end client lifecycle from first purchase to full enterprise production deployment, defining:
1. **What Clients Purchase & Install**: The composition of Conxian Sovereign Enterprise Stack services.
2. **First-Time Installation Journey**: The exact workflow a client executes to install, configure, align, and launch the platform.
3. **Client Input Requirements**: The exact credentials, connection strings, and RPC endpoints required from the client.
4. **Inter-Service Connectivity & Verification**: The end-to-end diagnostic harness ensuring all deployed client assets connect reliably.
5. **Unified Conxian Installer (`@conxian/cli`) Recommendation**: Replacing legacy archived deployment CLI tools with a unified, fail-closed installer engine.

---

## 2. What Clients Purchase (Sovereign Enterprise Stack Composition)

When an enterprise client acquires a Conxian Sovereign License, they receive access to a modular, self-hostable (or managed) suite of platform components:

```
+-----------------------------------------------------------------------------------+
|                        CONXIAN SOVEREIGN ENTERPRISE STACK                         |
+-----------------------------------------------------------------------------------+
|  1. Conxian Gateway (conxian-gateway)                                             |
|     - Rust/Actix-web API router & M2M JWT/Bearer token authorization engine        |
|     - High-speed payload dispatch & rate-limited gateway endpoints               |
|                                                                                   |
|  2. Nexus Glass Node (conxian-nexus)                                              |
|     - Verifiable state indexing & IVC proof layer                                 |
|     - Backed by Kwil DB & PostgreSQL for deterministic state tracking             |
|                                                                                   |
|  3. Admin Control Plane (admin-dashboard)                                         |
|     - Next.js institutional control interface & multi-dimensional telemetry       |
|     - BFF API routes for liquidity, PSBT, Nostr P&L, USI, and M2M management      |
|                                                                                   |
|  4. Sovereign Enclave SDK (conxius-enclave-sdk)                                  |
|     - Hardware enclave & AWS KMS / GCP KMS signing abstraction                    |
|     - Non-custodial key release & threshold signature (FROST / MuSig2) pipe       |
|                                                                                   |
|  5. Universal Settlement Interface (USI)                                          |
|     - Orchestrator for BitVM2, BitVMX, ZKCP, sBTC, and Silent Payments            |
|                                                                                   |
|  6. ElizaOS AI Agent Plugin (elizaos-plugin-conxian)                              |
|     - Autonomous agent actions for multi-dimensional metrics and yield harvesting |
+-----------------------------------------------------------------------------------+
```

---

## 3. First-Time Client Installation Journey (Step-by-Step)

```
[ Step 1: License & M2M Token Issuance ]
           │
           ▼
[ Step 2: Infrastructure Input Provisioning ]
           │ (DB URIs, RPC endpoints, KMS Keys)
           ▼
[ Step 3: Unified Installer Execution (@conxian/cli) ]
           │ (Generates NixOS / Docker Compose / Helm configs)
           ▼
[ Step 4: Pre-Flight Inter-Service Diagnostic Check ]
           │ (Verifies 6-point connectivity matrix)
           ▼
[ Step 5: Production Launch & Telemetry Pulse ]
```

### Step 1: License Acquisition & M2M API Token Issuance
1. Enterprise receives a Conxian Sovereign License Key and generates an initial API token via the M2M Token Management surface (`/api/v1/m2m/tokens`).
2. Generated API tokens use the standardized prefixed format:
   - Production: `cx_live_a1b2c3d4...`
   - Testing: `cx_test_e5f6g7h8...`
3. Scopes bound to the client token: `admin:read`, `admin:write`, `m2m:rotate`, `settlement:execute`, `usi:orchestrate`.

### Step 2: Client Infrastructure Inputs & Environment Alignment
The client provides and configures their required environment parameters:

| Input Parameter | Type / Format | Purpose / Connected System |
| :--- | :--- | :--- |
| `CORE_DB_URI` / `DATABASE_URL` | `postgresql://user:pass@host:5432/dbname?sslmode=require` | Primary PostgreSQL / Neon database connection string |
| `BITCOIN_RPC_URL` | `https://username:password@btc-node.client.internal:8332` | Bitcoin L1 RPC node endpoint for block height & UTXO verification |
| `STACKS_RPC_URL` | `https://stacks-node.client.internal:20443` | Stacks L2 RPC endpoint for Nakamoto / sBTC contract calls |
| `KWIL_DB_URL` | `https://kwil-node.client.internal:8080` | Kwil DB endpoint for Nexus Glass Node verifiable indexing |
| `GATEWAY_ADMIN_API_KEY` | High-entropy string | Gateway administrative API authorization key |
| `GATEWAY_JWT_SECRET` | 256-bit secret string | Gateway JWT signing and verification secret |
| `CONXIAN_API_TOKEN` | `cx_live_...` or `cx_test_...` | Platform M2M service token for cross-service authentication |
| `ENCLAVE_KMS_KEY_ARN` | AWS KMS ARN / GCP Key ID / Enclave Path | Hardware enclave or KMS key reference for non-custodial signing |

### Step 3: Unified Conxian Installer Execution (`@conxian/cli`)
Clients run the unified installer to generate aligned deployment manifests:

```bash
# Install Conxian CLI
npm install -g @conxian/cli

# Run interactive or declarative installation
conxian-installer init \
  --environment production \
  --db-uri "$DATABASE_URL" \
  --btc-rpc "$BITCOIN_RPC_URL" \
  --stacks-rpc "$STACKS_RPC_URL" \
  --m2m-token "$CONXIAN_API_TOKEN" \
  --target nixos # Options: nixos, docker-compose, helm
```

Output generated:
- Declarative `nixos/configuration.nix` or `docker-compose.production.yml`
- Sanitized `.env.production` file
- Pre-flight diagnostic manifest `installer-manifest.json`

### Step 4: Pre-Flight Inter-Service Diagnostic Harness Check
Before booting production services, the installer runs a fail-closed 6-point connectivity diagnostic:

```
                                  +---------------------+
                                  |   Admin Dashboard   |
                                  +----------+----------+
                                             |
                  +--------------------------+--------------------------+
                  |                          |                          |
                  ▼                          ▼                          ▼
        +-------------------+      +-------------------+      +-------------------+
        |  PostgreSQL /     |      |  Conxian Gateway  |      |   Upstash Redis   |
        |  Neon Cloud DB    |      |  Actix API (/v1)  |      |  Telemetry Cache  |
        +-------------------+      +---------+---------+      +-------------------+
                                             |
                                             ▼
                                   +-------------------+
                                   | Nexus Glass Node  |
                                   +---------+---------+
                                             |
                               +-------------+-------------+
                               |                           |
                               ▼                           ▼
                     +-------------------+       +-------------------+
                     | Bitcoin L1 /      |       |  Kwil DB Verifier |
                     | Stacks L2 RPC     |       |    State Store    |
                     +-------------------+       +-------------------+
```

Diagnostic Verification Matrix:
1. **DB Probe**: Validates PostgreSQL / Neon connectivity and schema migration state.
2. **Gateway Probe**: Pings `GET /api/v1/health` on Gateway using M2M token.
3. **Nexus Probe**: Verifies Glass Node status and Kwil DB sync height.
4. **RPC Probe**: Tests block-height retrieval from Bitcoin L1 and Stacks L2 endpoints.
5. **Enclave Probe**: Asserts KMS key accessibility and hardware vault state without exposing keys.
6. **M2M Token Probe**: Validates token hash and scope authorization via constant-time comparison.

### Step 5: Production Launch & Continuous Telemetry
Once all diagnostic probes pass (6/6 HTTP 200 / healthy), services are launched in order:
1. `conxian-nexus` (State Layer)
2. `conxian-gateway` (Routing & API Layer)
3. `admin-dashboard` (Control Plane)
4. `elizaos-plugin-conxian` (AI Agent Telemetry)

Continuous monitoring streams telemetry to the Multidimensional Pulse dashboard and Nostr P&L network.

---

## 4. Architecture Recommendation: Standardizing on `@conxian/cli`

**Historical Context**: Legacy documentation referenced delegating deployment to `conxius-orbit`. As of June 2026, `conxius-orbit` is archived and deprecated.

**Recommendation**:
1. Implement a unified TypeScript & Rust installer module `services/admin-dashboard/src/lib/support/installer.ts` providing programmatic installer configuration, environment validation, M2M token binding, and diagnostic checks.
2. Expose the installer via the CLI package `@conxian/cli` (`conxian-installer`).
3. Enforce **fail-closed initialization**: if any required input (DB URI, RPC URL, or M2M token) is missing or unreachable during pre-flight diagnostics, the installer halts deployment immediately with explicit remediation instructions, preventing broken runtime states.

---

## 5. Summary of Client Input vs. Conxian Provided Assets

| Item | Provided By | Responsibility |
| :--- | :--- | :--- |
| **Sovereign Codebase & Binaries** | Conxian Org | Maintained, version-tagged, and audited in GitHub release releases. |
| **M2M API Token (`cx_live_...`)** | Conxian Org | Generated via M2M Token Management surface with scope controls. |
| **Postgres / Neon DB Instance** | Client | Provisioned in client cloud; URI provided to Conxian services. |
| **Bitcoin / Stacks RPC Nodes** | Client or Managed | Full/pruned node access provided via HTTPS/WSS RPC URIs. |
| **Hardware Enclave / KMS** | Client | AWS KMS, GCP KMS, or local Enclave hardware for signing. |
| **Deployment Infrastructure** | Client | On-prem NixOS server, AWS EC2 / EKS, GCP, or Render account. |
| **Connectivity Diagnostic Harness** | Conxian Org | Pre-flight verification tool checking all asset links before boot. |
