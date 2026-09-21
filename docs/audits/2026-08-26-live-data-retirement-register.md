# Live Data and Retirement Register

## Scope
This register records remediation performed in `conxius-platform` and non-destructive actions required across the organization. It does not delete or archive external repositories.

## Completed locally

- Removed hardcoded multidimensional metrics from the dashboard API.
- Routed metrics to the configured Gateway live contract at `/api/v1/metrics`.
- Added `GATEWAY_URL` as the preferred server-side Gateway source.
- Added explicit `live` and `unavailable` response states with source and observation timestamps.
- Removed the rendered usage simulator, synthetic identity, FDC3 console, and BOS stub from the multidimensional dashboard.
- Deleted unreferenced simulator/panel components.

## Organization retirement candidates

| Repository/surface | Proposed state | Required before retirement | Owner action |
|---|---|---|---|
| `Conxian/conxius-orbit` | Archived compatibility dependency | Confirm replacement CLI and migrate all automation | Open owner issue; preserve compatibility fixture until migrated |
| DeFi/protocol dashboard panels | Retire from platform UI | Verify no production route or consumer depends on panel | Platform PR plus consumer search evidence |
| Stacks/Orbit-specific adapters | Retire or isolate from neutral PaaS | Confirm Gateway/Nexus replacement contracts | Gateway/Nexus owners approve contract migration |
| `Conxian/conxian_market` protocol documentation | Preserve outside PaaS | Confirm documentation ownership transfer | Business/protocol owner decision |
| Wallet/protocol repositories | Preserve outside PaaS | Confirm platform has no runtime dependency | Repository owner and deployment inventory review |

## Live-data policy

Production views must show only upstream responses. Missing configuration, authentication failure, non-success responses, malformed payloads, or stale process-local data must be labeled unavailable; synthetic values must remain test-only.

## External coordination

Create or update one issue per repository with: owner, current callers, deployment references, replacement contract, migration PR, verification evidence, rollback plan, and target retirement state. No destructive action is authorized by this register alone.

## Evidence gaps

GitHub Projects enumeration requires a token with `projectsV2` access. Docker/Compose verification requires a Docker-enabled runner. Gateway contract compatibility and upstream payload freshness require live environment access.
