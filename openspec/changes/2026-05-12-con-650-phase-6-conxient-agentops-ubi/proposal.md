# OpenSpec Proposal: CON-650 / #636 — Phase 6 Conxient (AgentOps + UBI)

**Date**: 2026-05-12  
**Issue**: [#636](https://github.com/Conxian/conxius-platform/issues/636)  
**Linear**: CON-650  
**Status**: Proposed  
**Artifact Type**: Single architecture/spec proposal

---

## 1) Scope and objective for Phase 6 Conxient (AgentOps + UBI)

### Objective
Define a production-executable Phase 6 architecture/spec for AgentOps + UBI that:

1. Preserves cross-repo ownership boundaries.
2. Enforces API parity for:
   - `GET /api/v1/ai/allocation`
   - `GET /api/v1/nexus/state`
   - UBI identity format `ubi:btc:{id}`
3. Converts current prototype signals into explicit readiness gates, rollout guardrails, and rollback criteria.

### In scope
- Contract-level requirements for AgentOps + UBI interfaces used by this repository.
- Operational controls for parity, observability, and release safety.
- Validation findings from current repository evidence (including limitations).

### Out of scope
- Implementing Gateway/Nexus runtime handlers inside this repository.
- Replacing wallet-side identity attestation flows.
- Shipping code changes in gateway, nexus, wallet, or UI repos from this artifact.

---

## 2) AgentOps responsibilities and boundaries

Boundary decisions are anchored in repository policy:

- `AGENTS.md` declares OpenSpec-first and Gateway as protocol source of truth.
- `docs/PRODUCTION_BOUNDARY.md` states `conxius-platform` must not become home for core Gateway/Nexus production logic.
- `docs/REPO_BOUNDARY_CONTRACT_V1.md` separates Gateway API ownership, Nexus state ownership, and wallet execution ownership.

### Responsibility matrix

| Surface | Owned in `conxius-platform` | Not owned in `conxius-platform` (owner) |
|---|---|---|
| AgentOps integration layer | Client adapters, orchestration wiring, runbooks, release gates, telemetry expectations for platform-operated surfaces (`services/admin-dashboard`, `services/elizaos-plugin-conxian`) | Canonical protocol/business logic (Gateway/Core) |
| AI allocation API | Consumer parity checks and typed client expectations | Endpoint semantics + authoritative computation weights (`lib-conxian-core` / Gateway) |
| Nexus sync API | Consumer compatibility and dashboard/operator interpretation rules | Canonical Nexus state production and state proof generation (Nexus + Gateway) |
| UBI identity format | Format conformance checks at integration edges; documentation of canonical format | Identity attestation issuance/verification and wallet signing truth (`conxius-wallet` + Gateway identity service) |
| Rollout and operations | Feature gating policy, staged rollout policy, monitoring/alert thresholds, rollback playbook | Runtime implementation details inside external owner repositories |

### Submodule/cross-repo constraint

`services/lib-conxian-core` and `services/conxian-ui` are configured as git submodules (`.gitmodules`) and are uninitialized in this checkout, so canonical handler-level verification is limited in this repo snapshot.

---

## 3) Data contracts and operational controls

The following are normative **integration contracts** for Phase 6 parity in this repository.
They define required behavior and release-gate criteria; they are not claims that owner-repo runtimes are already verified as compliant in this checkout.

### 3.1 AI allocation contract (`GET /api/v1/ai/allocation`)

**Request**
- Method: `GET`
- Path: `/api/v1/ai/allocation`
- Query (recommended): `profile` in `{aggressive, balanced, conservative}` (default `balanced` if omitted).

**Response (minimum required compatibility fields)**
- `status: string`
- `allocations: Array<{ agent: string; weight: number }>`
- Optional, but observed in this repo's scripts/templates: `compute_weight`, `last_updated`.

**Operational controls**
- `allocations[].weight` MUST be bounded `0 <= weight <= 1`.
- Sum of all weights MUST equal `1 ± 0.001`; otherwise treat as contract violation.
- Unknown `profile` MUST fail closed with 4xx (not silent fallback to arbitrary profile).

### 3.2 Nexus sync contract (`GET /api/v1/nexus/state`)

**Request**
- Method: `GET`
- Path: `/api/v1/nexus/state`

**Response (minimum required compatibility fields)**
- `merkle_root: string`
- `leaf_count: number`
- `sync_status: string` (or equivalent drift indicator via companion status endpoint)

**Operational controls**
- Clients MAY derive display sync status using drift from `/api/v1/status`, but MUST prefer explicit `sync_status` when provided by `/api/v1/nexus/state`.
- Missing `merkle_root` MUST be treated as degraded/unverified state for operator UX.

### 3.3 UBI identity format contract (`ubi:btc:{id}`)

**Canonical format**
- Prefix MUST be exact: `ubi:btc:`
- Identifier segment `{id}` MUST be non-empty.
- Full identity hash MUST be emitted as a single string: `ubi:btc:{id}`.

**Endpoint coupling (current ecosystem usage)**
- Address-scoped lookup route in docs/client templates: `/api/v1/identity/ubi/{address}`.
- Returned `identity_hash` MUST conform to `ubi:btc:{id}` regardless of source identifier type.

**Operational controls**
- Reject malformed identities (missing prefix, empty id) instead of coercing silently.
- Log validation failures with structured labels for identity ingest source and failure reason.

---

## 4) API parity requirements and versioning notes

### 4.1 Parity requirements by interface

| Interface | Current integration evidence in this repo | Phase 6 parity requirement |
|---|---|---|
| `/api/v1/ai/allocation` | `services/elizaos-plugin-conxian/src/conxianClient.ts` consumes this route; action wiring exists in `actions.ts` | Action parameter contract and client request shape MUST match endpoint contract (including `profile` behavior) |
| `/api/v1/nexus/state` | `services/admin-dashboard/src/app/page.tsx` fetches this route and maps `merkle_root`/`leaf_count` | Dashboard contract mapping MUST remain compatible with canonical Gateway/Nexus response |
| `ubi:btc:{id}` | Required by `AGENTS.md`; format construction appears in maintenance templates/scripts | Consumer/integration paths in this repo MUST enforce canonical `ubi:btc:{id}` expectations; production enablement remains gated on owner-service runtime evidence that emitted `identity_hash` values conform |

### 4.2 Versioning notes

1. The canonical production path for these interfaces remains `v1`.
2. Backward-compatible changes in `v1` are additive only (new optional fields allowed; existing field meaning cannot change).
3. Breaking schema/semantic changes require:
   - new path version (`/api/v2/...`), and
   - dual-stack compatibility window before deprecating `v1` consumers.
4. `conxius-platform` MUST gate release readiness on consumer compatibility checks before any version transition.

---

## 5) Prototype validation findings (repo evidence, gaps, risks, readiness)

Validation performed against this checkout of `Conxian/conxius-platform` on 2026-05-12.
Scope is limited to consumer/integration-layer evidence in this repo plus local checks; end-to-end owner-repo runtime validation is a separate readiness gate.

### 5.1 What works in this checkout (implemented references + local checks)

The items below confirm implemented references and local quality signals; they do **not** alone prove fully working end-to-end owner-repo integration.

1. **Required endpoint references are implemented in active TypeScript clients/UI**:
   - `getAiAllocation()` calls `/api/v1/ai/allocation`.
   - Admin dashboard fetches `/api/v1/nexus/state`.
2. **UBI format requirement is explicitly documented** in repository instructions: `ubi:btc:{id}`.
3. **Operational monitoring patterns are present** (metrics + alerts + on-call flow) in SIDL runbooks and instrumentation; these are reusable for Phase 6 control design.
4. **Local consumer check passes**: `services/admin-dashboard` typecheck.

### 5.2 Gaps (verified)

1. **Contract mismatch in AgentOps client wiring**:
   - `actions.ts` calls `getAiAllocation(env, profile)` while `conxianClient.ts` defines `getAiAllocation(env)`.
   - `pnpm -C services/elizaos-plugin-conxian typecheck` fails with `TS2554 Expected 1 arguments, but got 2`.
2. **No direct tests found for AI allocation / nexus state / UBI contract parity** in checked-in test suites.
3. **No explicit runtime validator found in active service code for `ubi:btc:{id}`** (format is documented and templated, but validator behavior is not directly verifiable here).

### 5.3 Uncertainty and cross-repo verification limits

1. `services/lib-conxian-core` and `services/conxian-ui` are uninitialized submodules in this checkout, so authoritative Gateway/UI handler code is not directly inspectable here.
2. Repository docs claim broad Phase 6 alignment, but owner-repo runtime truth cannot be fully confirmed from this checkout alone.

### 5.4 Risk summary

- **R1: Contract drift risk** between AgentOps action parameters and Gateway endpoint expectations.
- **R2: False confidence risk** from documentation claims without owner-repo runtime verification.
- **R3: Identity integrity risk** if UBI format enforcement remains implicit/non-validated.
- **R4: Observability coverage risk** if Phase 6 routes are enabled without endpoint-specific SLO alerts.

### 5.5 Readiness criteria (must pass before production enablement)

1. **Parity fix**: Align AgentOps AI allocation action/client signatures and pass plugin typecheck.
2. **Contract tests**: Add and pass automated tests covering request/response compatibility for:
   - `/api/v1/ai/allocation`
   - `/api/v1/nexus/state`
   - UBI `identity_hash` format (`ubi:btc:{id}`)
3. **Owner-repo verification**: Capture validated evidence (commit SHA + route/handler pointers) from Gateway/Nexus/Wallet owner repositories.
4. **Observability readiness**: Define Phase 6 endpoint metrics/alerts and confirm on-call runbook ownership.
5. **Rollback rehearsal**: Demonstrate rollback execution path and decision logging prior to broad rollout.

---

## 6) Rollout guardrails (feature flags, staged rollout, observability, rollback)

### 6.1 Feature flags (required)

Introduce explicit release controls (names are normative recommendations for this phase):

- `PHASE6_AGENTOPS_READS_ENABLED`
- `PHASE6_UBI_ENFORCEMENT_ENABLED`
- `PHASE6_NEXUS_SYNC_ENFORCEMENT_ENABLED`

Rules:
1. Default all Phase 6 flags to `off` in production.
2. Enable flags independently to isolate blast radius.
3. Any parity failure auto-disables the affected flag (fail closed).

### 6.2 Staged rollout policy

1. **Stage 0 — Preflight (CI + local)**: typecheck + contract tests + schema lint all green.
2. **Stage 1 — Shadow/Internal**: enable read-only consumption for operator cohort.
3. **Stage 2 — Controlled cohort**: partial production traffic with tight error budget.
4. **Stage 3 — Broad enablement**: full rollout only after stability window and no critical alerts.

### 6.3 Observability and alerting requirements

Minimum required telemetry for each Phase 6 interface:

- Request rate by endpoint + method.
- Error rate by status family and error category.
- p95 latency.
- Contract-violation counters (schema mismatch, missing mandatory fields, invalid UBI format).

Alert gates:
- Critical: sustained 5xx or contract violations above threshold.
- Warning: elevated p95 latency or increasing client-side 4xx due validation mismatch.
- Rollback trigger: any critical alert persisting beyond agreed response window.

### 6.4 Rollback criteria and actions

Rollback if any of the following occurs post-enablement:

1. Parity validation/test failures in release candidate.
2. Contract violation rate exceeds threshold.
3. Identity format violations appear in production telemetry.
4. Nexus sync contract fields unavailable or inconsistent for operator-critical paths.

Rollback actions:
1. Disable affected Phase 6 flag(s).
2. Revert consumers to last known-good behavior.
3. Record trigger, timestamp, owner, and mitigation in release log.
4. Require post-incident parity review before re-enable.

---

## 7) Acceptance checklist mapped to issue #636

- [x] **AC1**: Single architecture/spec artifact for Phase 6 Conxient with AgentOps responsibilities, boundaries, data contracts, and operational controls.  
  - Covered in Sections 1–3.

- [x] **AC2**: Define API parity requirements and validate consumer/integration-layer parity coverage in this repository for AI allocation, UBI identity, and nexus sync (compatibility + versioning notes).  
  - Requirements are defined in Sections 3–4; validation scope in Section 5 is limited to this repo’s integration layer, with owner-repo/runtime verification remaining a readiness gate (Section 5.5.3).

- [x] **AC3**: Complete prototype validation findings (what works, gaps, risks, readiness criteria) against real integration paths.  
  - Covered in Section 5 with command-backed findings from checked-in paths and local checks.

- [x] **AC4**: Define rollout guardrails (feature flags, staged rollout, observability/alerting, rollback criteria).  
  - Covered in Section 6.

---

## 8) Evidence and assumptions

### Evidence references (checked in this repo)

- `AGENTS.md` (OpenSpec-first + Phase 6 standards)
- `services/elizaos-plugin-conxian/src/conxianClient.ts` (AI allocation + UBI route consumption)
- `services/elizaos-plugin-conxian/src/actions.ts` (AgentOps action contract wiring)
- `services/admin-dashboard/src/app/page.tsx` (Nexus state consumption)
- `docs/PRODUCTION_BOUNDARY.md` (ownership boundary)
- `docs/REPO_BOUNDARY_CONTRACT_V1.md` (cross-repo functional boundaries)
- `docs/runbooks/SIDL_ENDPOINT_MONITORING_RUNBOOK.md` and `docs/runbooks/SIDL_RELEASE_READINESS_RUNBOOK.md` (observability + rollback patterns)
- `.gitmodules` + `git submodule status` (cross-repo verification limit)

### Assumptions

1. “Conxient” in issue #636 refers to the Phase 6 intelligence track within the Conxian ecosystem naming used in this repository.
2. Owner repositories (`lib-conxian-core`, `conxian-ui`, `conxius-wallet`, `conxian-nexus`) remain the source of runtime truth for canonical handlers and identity issuance.
3. This proposal intentionally records uncertainty where submodule/cross-repo runtime evidence is not directly available in the current checkout.

