# Gateway decentralization contract — 2026

## Purpose
The Gateway is a routing and interoperability data plane, not a centralized authority. It must remain replaceable, provider-independent, and unable to custody funds, wallet keys, or protocol authority.

## Required properties

1. **Provider plurality** — requests can target multiple independently operated adapters/providers. No single provider is required for platform correctness when policy-compliant alternatives exist.
2. **Evidence-based selection** — selection uses declared capabilities, observed health, freshness, latency/error budgets, chain height, and verification evidence. Unknown state is not healthy.
3. **Policy separation** — routing policy is versioned and reviewable; business mandates remain owned by the business/BOS repository; protocol state remains owned by Nexus/protocol repositories.
4. **Fail-closed routing** — if no provider satisfies the requested capability, trust policy, or freshness threshold, return a typed unavailable/degraded result. Never silently fall back to an untrusted or simulated provider.
5. **Bounded coordination** — retries, fan-out, quorum, and hedging are bounded by request policy and must not create duplicate side effects. Read paths should prefer parallel observation; write paths require explicit idempotency and ownership.
6. **No custody** — signing is delegated to the enclave/wallet boundary. Gateway receives scoped attestations or signed payloads, not private keys.
7. **Auditable observation** — every route decision records provider identity, observed revision/height, policy version, timestamp, and evidence reference without storing secrets or becoming the business ledger.
8. **Independent failure domains** — provider health and circuit state are isolated; one provider outage must not poison all routes.

## Minimum interface shape

A provider adapter exposes:

- `capabilities`: supported rails, operations, networks, and proof types;
- `observe(request)`: bounded read-only observation with revision/height and evidence;
- `execute(request, idempotencyKey)`: only where explicitly authorized, returning a provider receipt;
- `health()`: authenticated readiness and dependency state;
- `trustPolicy`: requirements for accepting its result.

The Gateway router returns `selectedProvider`, `routeClass`, `observations`, `evidenceRefs`, and a typed `failureClass` when unavailable. It must not return a false healthy state for missing, stale, simulated, or unverifiable data.

## Migration from Orbit
Archived Orbit remains a historical compatibility reference only. Deployment, verification, and signing capabilities must be supplied by current repository-owned contracts and independently operated execution surfaces. Until a replacement is evidenced, the capability is `unavailable`, not implicitly delegated to Orbit.

## Verification checklist

- At least two provider adapters can be configured for each claimed redundant capability.
- Provider selection tests cover outage, stale height, conflicting observations, and no-provider cases.
- Write operations prove idempotency and do not retain custody material.
- Evidence records are bounded, timestamped, and linked to observed revisions.
- Platform catalog and CI contain no active dependency on archived repositories.
