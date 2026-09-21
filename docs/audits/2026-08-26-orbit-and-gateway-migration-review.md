# Orbit and Gateway migration review

## Decision
`conxius-orbit` is archived and must not be an active delivery dependency. It remains only as a historical compatibility reference until a current execution surface proves replacement coverage. Permanent deletion and remote repository mutation are outside this workspace and are not recommended before preserving release, provenance, and rollback evidence.

## Current-code review
The platform catalog has no Orbit service entry or active dependency. The repository reference registry marks Orbit as archived, historical, and non-active. Existing Orbit mentions in audits, OpenSpec history, and migration records are intentionally retained for traceability.

The current Gateway repository contains substantial provider adapters, routing/coordination code, trust policy, health/readiness, and Bitcoin/Stacks/Lightning/RGB/Liquid/Fedimint-related boundaries. This is more suitable as the replacement execution surface than Orbit, but the Gateway must not become a centralized authority. The decentralized contract is documented in `docs/architecture/GATEWAY_DECENTRALIZATION_CONTRACT_2026.md`.

## Required next steps

1. Gateway owners publish a versioned provider capability matrix and verification-result schema.
2. Platform consumes provider manifests/evidence rather than calling one hardcoded provider.
3. Enclave/Wallet owners retain signing and key custody; Gateway accepts scoped attestations only.
4. Orbit capabilities are migrated one at a time; until verified, status is `unavailable` rather than simulated or implicitly delegated.
5. Historical links remain, while new active configuration references to archived repositories are rejected by CI.
6. Valid `Conxian/...` links are not removed merely because they contain the organization name; classify them as active, historical, external authority, replacement-required, or invalid.

## Residual risks
Remote rulesets, deployment targets, live Gateway redundancy, and owner approvals require authenticated organization evidence and cannot be established from this local checkout alone.
