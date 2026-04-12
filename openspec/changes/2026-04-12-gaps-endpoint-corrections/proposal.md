# Proposal: Correct Nexus/Kwil and UBI endpoint references in `GAPS.md`

## Problem
`GAPS.md` is used as a high-level operational truth for Phase 6 platform alignment. Two bullets in the “Conxian Gateway & Nexus” section currently point at endpoints that can mislead consumers:

- **Kwil Transactional State** references `/api/v1/kwil/info`, which reads like adapter/chain info rather than the Nexus state/history surface.
- **Universal Bitcoin Identity (UBI)** is documented as `/api/v1/identity/ubi`, but the intended contract is an address-scoped route.

These inaccuracies can cause confusion for UI/client implementers and for anyone validating Gateway coverage against Phase milestones.

## Decision

- Update the Kwil/Nexus bullet to reference the Nexus state surface (`/api/v1/nexus/state`) and clarify that `/api/v1/kwil/info` is adapter info.
- Update the UBI bullet to reflect the address-scoped route (`/api/v1/identity/ubi/{address}`).

## Non-goals

- Changing Gateway behavior or adding new endpoints.
- Version alignment or dependency remediation from PR #477 (handled separately if/when requested).
