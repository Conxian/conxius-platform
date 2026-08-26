# Organization Service and Capability Review

**Review mode:** approved remediation baseline; no repository resources deleted.

## Authority and service matrix

| Repository | Classification | Owns | Platform may consume | Status |
|---|---|---|---|---|
| `lib-conxian-core` | Core SDK | Shared protocol primitives and canonical types | Versioned neutral contracts only | Evidence-scoped |
| `conxius-enclave-sdk` | Security SDK | Signing and attestation primitives | Verification evidence only | Evidence-scoped |
| `conxius-wallet` | Wallet service/SDK | User authorization, custody, signing, transaction construction | Opaque intent and authorization evidence | External provider |
| `conxian-gateway` | Routing service | Provider adapters and execution routing | Provider capability and result evidence | Evidence-scoped |
| `conxian-nexus` | Proof/observation service | Observation, synchronization, finality, verification | Read-only proof/evidence | Evidence-scoped |
| `conxian_market` | Product/economic service | Pricing, fees, escrow, settlement, labor economics | Product capability status only | External product |
| `conxian_ui` | Client experience | User-facing workflows and presentation | Public capability metadata | External client |
| `conxian-business` | Governance service | Doctrine, OpenSpec, approvals, evidence policy | Governance decisions | Authority |
| `conxius-platform` | Neutral control plane | Orchestration, lifecycle, reconciliation, evidence aggregation | All capabilities through contracts | Active, bounded |
| `Conxian` | Protocol surface | Protocol contracts and state transitions | No universal ownership claim | External protocol |
| `conxius-orbit` | Archived compatibility | Historical deployment material | None by default | Archived |

## Required service evidence

Every deployable service must publish a versioned capability manifest covering owner, entrypoint, health/readiness, persistence, authentication, authorization, dependencies, deployment evidence, rollback evidence, and compatibility. Missing evidence must be reported as `Unavailable` or `Owner-action`.

## Findings

- Wallet is correctly treated as an optional external SDK/provider; existing resources remain preserved.
- Market economics remain product-owned and must not enter the universal platform contract.
- Gateway and Nexus are providers, not universal authorities.
- Platform-level economy and wallet validators now enforce the active catalog boundary, but legacy runtime migrations remain owner-coordinated.
- Organization-wide CI, branch protection, Docker/runtime, and production evidence cannot be certified from this sandbox alone.

## Promotion rule

A capability may be promoted only when its owning repository provides contract/version evidence and an independent verification result. A green local platform check does not certify external service readiness.
