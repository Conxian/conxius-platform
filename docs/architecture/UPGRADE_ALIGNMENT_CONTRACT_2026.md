# Upgrade Alignment Contract (2026)

## Purpose

`conxius-platform` is a universal, protocol-agnostic control plane. It discovers and routes between independently owned providers; it does not own economic policy, liquidity, custody, pricing, treasury, or protocol execution.

## Versioned boundaries

Every provider publishes a capability manifest containing `schemaVersion`, owner, supported chain/network families, operation classes (`observe`, `route`, or `delegated-execute`), evidence formats, finality semantics, health state, and compatibility range. Missing or stale manifests produce `unavailable`, never an inferred healthy or compatible state.

The neutral M2M intent schema is `platform/neutral-m2m-intent.schema.json`. Intents require domain/network binding, positive amounts, nonce, expiry, idempotency, route constraints, and optional sender signature. A platform adapter may relay an intent only after authentication, replay protection, capability negotiation, and policy-independent provider selection.

## Upgrade rules

1. Additive schema changes require a new minor compatibility declaration; breaking changes require a new major schema version.
2. Providers must advertise the versions they consume and produce.
3. Upgrade promotion requires reproducible artifact identity, test evidence, rollback reference, and an owner.
4. Provider plurality is required for universal claims; one provider is an explicit single-provider limitation.
5. Conflicting, stale, or unverifiable evidence blocks promotion.
6. Economic terms are inputs owned by the requesting client or protocol, not platform defaults.
7. Signing remains user/provider controlled; the platform never receives private keys or takes custody.

## Explicit non-goals

No market fees, yield splits, treasury routing, swaps, lending, borrowing, proprietary solver, DAO policy, or protocol-specific deployment defaults belong in this platform.

## Upgrade status vocabulary

`compatible`, `degraded`, `unavailable`, `blocked`, and `superseded` are the only valid platform states. A missing external deployment provider, unsupported chain capability, or absent finality evidence is `unavailable`.
