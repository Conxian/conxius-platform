# Orbit retirement and Gateway decentralization

## Status
Proposed

## Scope
Retire archived `conxius-orbit` from active platform contracts without deleting historical evidence. Define a decentralized Gateway boundary that routes across independently owned providers and never becomes a single protocol, custody, or policy authority.

## Decisions
- Orbit may remain in historical audits, archived change records, and compatibility notes, but must not be an active deployable service or dependency.
- Active deployment and verification ownership moves to a platform-owned contract plus an explicitly selected current execution surface.
- Gateway routing must support multiple independently operated providers, health/evidence-based selection, bounded retries, and fail-closed behavior when no provider satisfies policy.
- Platform stores references to evidence and observed revisions; it does not hold signing keys, wallet secrets, or protocol authority.

## Non-goals
- Do not delete or mutate the archived upstream repository from this workspace.
- Do not purge valid historical GitHub issue, PR, or audit links.
- Do not implement a centralized gateway operator, treasury, signer, or cloud-provisioning portal.

## Acceptance criteria
- The active service catalog contains no archived Orbit service/dependency.
- A machine-readable reference policy distinguishes active, historical, replacement-required, and invalid references.
- CI fails when new active configuration references an archived repository.
- Gateway contract documents provider independence, routing policy, evidence, and fail-closed semantics.
- Existing local validation remains green.
