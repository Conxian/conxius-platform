# Managed Nexus deployment contract

## Intent

Define a versioned, provider-neutral desired-state contract for Conxian-Labs to operate highly available Nexus nodes without moving Nexus verification logic into this repository.

## Scope

- Describe tenant-scoped AWS or GCP deployment intent.
- Pin immutable Nexus images and approved zkVM program digests.
- Require private nodes, multi-zone placement, Bitcoin network policy, health checks, recovery objectives, and evidence destinations.
- Add a fail-closed local validator and fixture that can become a CI input.

## Non-goals

- No direct cloud mutation, credential storage, billing, custody, signing, or proof verification.
- No claim that an AWS/GCP environment or SLA currently exists.
- No replacement of Nexus, Gateway, Enclave SDK, or business authority.

## Acceptance criteria

- Invalid production topology, mutable image references, inline secrets, unsupported providers, and weak Bitcoin confirmation policies fail validation.
- The example manifest validates locally.
- Documentation distinguishes public protocol ownership from managed commercial operation.

