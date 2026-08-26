# Conxian Organization PaaS Blueprint — 2026

## Executive outcome
`conxius-platform` should operate as the organization control plane: the place where services are declared, contracts are validated, environments are promoted, health and evidence are aggregated, and operators receive a trustworthy view of the running system. It should not become a centralized runtime, protocol authority, wallet, custodian, or direct cloud-mutation portal.

The target operating model is **declarative and Git/CI/GitOps-first**. A portal may generate or review a manifest, but deployment execution belongs to the deployment lane and infrastructure reconciler, not to browser code. This aligns with the industry pattern of a service catalog/portal, Git-based desired state, a reconciler, and observable verification evidence.

The machine-readable local catalog is [`platform/services.catalog.json`](../../platform/services.catalog.json) and is enforced by `pnpm run check:service-catalog`.

Runtime API configuration and readiness are centralized in `services/admin-dashboard/src/lib/support/upstreams.ts`; operators use [`/api/readiness`](../runbooks/PLATFORM_API_SETUP_RUNBOOK_2026.md) to verify live upstreams without exposing secrets.

## Repository capability map

| Repository | PaaS relationship | Owns | Must not own |
|---|---|---|---|
| `conxius-platform` | Control plane | Manifests, promotion gates, cross-repo verification, telemetry ingestion, operator workflows | Protocol logic, custody, signing, direct cloud mutation |
| `conxian-business` | Strategy and BOS authority | Mandates, legal/regulatory policy, hiring, private operating records | Runtime deployment implementation |
| `conxian-gateway` | Data plane/access layer | APIs, routing, integrations, identity resolution | Organization-wide policy authority |
| `conxian-nexus` | Proof/state layer | State records, synchronization, Merkle/checkpoint evidence | Gateway routing or product UX |
| `lib-conxian-core` | Shared primitive layer | Protocol models, cryptography, portable/Wasm primitives | Hardware-specific attestation |
| `conxius-enclave-sdk` | Security boundary | Hardware-backed signing and attestation adapters | Business policy or deployment orchestration |
| `conxius-orbit` | Deployment execution surface | Chain-aware execution, diagnostics, verification results | Platform governance or signing-key custody |
| `Conxian` | Protocol surface | Clarity contracts and protocol behavior | Infrastructure orchestration |
| `conxius-wallet` | Execution client | Identity, private keys, transaction construction, user policy | Server-side custody or platform keys |
| `conxian_ui` / `conxian-labs-site` | Experience surfaces | User/operator presentation and public communication | Source-of-truth deployment state |
| `conxian_market` | Product/market experience | Catalog and market-facing presentation | Settlement custody or protocol authority |
| `elizaos-plugin-conxian` | AI integration | Agent actions over approved platform/gateway interfaces | Unbounded infrastructure mutation |
| `.github` / `.github-private` | Org governance | Shared policy, templates, private controls | Product runtime |

## Contract spine

1. **Manifest contract**: platform emits a versioned deployment manifest containing service identity, repository/ref, artifact digest, environment, dependencies, owner, side-effect class, and rollback reference.
2. **Verification contract**: execution surfaces return a versioned verification result containing target, observed revision, health/readiness, proof/evidence references, timestamps, and failure classification.
3. **Promotion contract**: business mandates define required controls; platform evaluates them and records pass/fail/pending evidence. A failed gate cannot promote.
4. **Telemetry contract**: services publish bounded health, metrics, and deployment signals. Platform stores/aggregates evidence without becoming the authoritative business ledger.
5. **Security contract**: credentials remain in secret managers or injected runtime environments; manifests contain references, never secret values. Wallet/enclave material never crosses into platform storage.
6. **Ownership contract**: every capability has one owning repository and one approving team. Cross-repository changes require coordinated PRs; platform may validate but does not silently redefine another repository's authority.

## Golden path

```text
service manifest -> schema validation -> dependency/security gates
       -> build + signed provenance -> environment promotion request
       -> execution surface/reconciler -> health/readiness verification
       -> evidence record -> operator catalog and rollback path
```

The first implementation should be read-only and evidence-producing. Self-service provisioning is a later phase, gated by security, legal, reliability, and rollback controls.

## Phased delivery

### Phase 1 — Inventory and contracts
- Keep the repository taxonomy canonical and machine-readable.
- Validate deployment and verification schemas in CI.
- Add contract fixtures for each service class.
- Require ownership, version, health semantics, and rollback metadata.

### Phase 2 — Catalog and health
- Build a service catalog from manifests, not hand-maintained UI data.
- Aggregate health/readiness with explicit `unknown`, `degraded`, and `healthy` states.
- Link every status to timestamped evidence and source revision.
- Keep metrics endpoints read-only and fail gracefully when a dependency is unavailable.

### Phase 3 — Promotion and release evidence
- Connect business mandates to lifecycle gates.
- Record artifact provenance, approvals, verification results, and rollback decisions.
- Use Git commits/PRs as the desired-state audit trail.
- Coordinate Orbit and external deployment repositories through versioned contracts.

### Phase 4 — Guarded self-service
- Offer templates for approved service classes and environments.
- Generate pull requests or declarative claims; do not let the portal call cloud APIs directly.
- Require policy checks, least privilege, budget/resource limits, and tested rollback.
- Introduce tenant/product provisioning only after the previous phases are demonstrably reliable.

## Immediate next actions

| Priority | Action | Owner |
|---|---|---|
| P0 | Add schema validation and contract fixtures to platform CI | `conxius-platform` |
| P0 | Confirm lifecycle ownership and mandate interface with private BOS repo | `conxian-business` + platform |
| P0 | Publish Gateway/Nexus/Orbit compatibility matrix | respective owners + platform |
| P1 | Define service manifest registry and catalog ingestion | platform |
| P1 | Add signed build provenance and verification evidence requirements | platform + `.github` |
| P1 | Create coordinated PRs for reusable workflows in `.github` and business repo | org governance |
| P2 | Evaluate Backstage/Argo CD/Crossplane only against the local-first and sovereign constraints | platform architecture |
| P2 | Prototype self-service claim generation without provisioning side effects | platform |

## Decision guidance

Backstage, Argo CD, and Crossplane are useful reference patterns, but adoption should not precede the contract spine. Backstage can be a catalog/portal, Argo CD a GitOps reconciler, and Crossplane an infrastructure abstraction layer; however, none should become a new authority over protocol state, wallet execution, or private business policy. Start with repository-owned manifests, CI validation, and evidence; add components only when they remove a measured operational bottleneck.

## Success measures

- Every deployable service has an owner, manifest, health contract, artifact provenance, and rollback reference.
- A platform operator can identify desired revision, observed revision, health, and evidence without reading multiple repositories manually.
- Failed or unknown dependencies produce actionable states rather than HTTP 500s or false green dashboards.
- No platform workflow requires custody keys, wallet secrets, or protocol authority.
- Cross-repository changes are traceable to linked proposals, issues, and PRs.
