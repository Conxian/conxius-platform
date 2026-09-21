# Organization repository and service lifecycle audit — 2026-08-26

## Outcome
`conxius-platform` remains the organization control plane and PaaS foundation. The audit does not delete or archive external repositories and does not remove local services solely because activity is low.

## Local services

| Service | Lifecycle | Decision |
|---|---|---|
| `admin-dashboard` | active | Retain as the rendered operator surface and control-plane UI. |
| `admin-pulse-bos` | source-consumed | Retain while imported by the dashboard; add tests before independent deployment. |
| `elizaos-plugin-conxian` | active | Retain as an external agent integration with bounded gateway actions. |

The authoritative machine-readable catalog is `platform/services.catalog.json`. CI validates it with `pnpm run check:service-catalog`.

## External repository alignment

- `conxian-business`: strategy, BOS, and mandate authority.
- `conxian-gateway`: runtime data plane and integration routing.
- `lib-conxian-core`: shared protocol and cryptographic primitives.
- `conxian-nexus`: proof, state, and evidence layer.
- `conxius-enclave-sdk`: hardware-backed signing and attestation boundary.
- `conxius-orbit`: archived deployment CLI; treat as a compatibility dependency only until ownership confirms replacement.
- `conxius-wallet`: wallet and user execution experience; no server custody.
- `conxian_market`: protocol/product documentation and market experience.
- `conxian_ui`: product experience surface.

## Removal policy

A service may move to `deprecated` or `archived` only after evidence shows no callers, no deployment references, an approved replacement, an owner, migration notes, and rollback evidence. The catalog validator intentionally reports missing or invalid lifecycle metadata rather than silently deleting code.

## Evidence limitations

GitHub repository, issue, and pull-request inventory was reviewed through the available read-only CLI. GitHub Projects could not be enumerated because the current token lacks access to `projectsV2`; this is recorded as an evidence gap. Docker/Compose runtime validation also requires a Docker-enabled runner.

## Recommended next actions

1. Add manifest and verification fixtures for Gateway, Core, Nexus, Orbit, Wallet, and Enclave.
2. Coordinate reusable workflow and service-catalog ingestion changes with the organization governance repository.
3. Confirm whether archived Orbit remains a supported compatibility surface before removing any references.
4. Obtain organization Projects access and attach lifecycle work to an approved roadmap.
