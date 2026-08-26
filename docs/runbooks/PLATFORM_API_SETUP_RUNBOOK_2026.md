# Platform API setup runbook

`conxius-platform` is the neutral PaaS control plane. It consumes approved upstream APIs; it does not own protocol state, custody, funds, or trading.

## Required first

Set `GATEWAY_URL` to the deployed Gateway base URL. The dashboard probes `${GATEWAY_URL}/api/v1/metrics` and fails closed with `503` when the source is unavailable. Gateway authentication is server-only and uses the configured M2M mode and credentials; never put service secrets in `NEXT_PUBLIC_*` variables.

## Optional adapters

Configure only endpoints the owning service supports: `STACKS_NODE_RPC_URL`, `ORACLE_ENDPOINT_URL`, `TABLELAND_BASE_URL`, `KWIL_PROVIDER_URL`, `SUPABASE_URL`, `UPSTASH_KV_KV_REST_API_URL`, and `NEXUS_ADMIN_API_TOKEN`. The readiness endpoint reports configuration and reachability without returning secret values.

## Verify

1. Open `GET /api/readiness` and inspect `status`, `upstreams`, `httpStatus`, `latencyMs`, and `observedAt`.
2. Open `GET /api/multidimensional/metrics`; expect `status: live` and `source: gateway`, or an explicit `503 unavailable`.
3. Confirm Gateway `/api/v1/metrics` returns JSON and accepts the dashboard's configured M2M authentication mode.
4. Review the browser dashboard for source and freshness metadata. Synthetic values are not valid production evidence.

## Troubleshooting

- `missing`: add the endpoint in the deployment environment and redeploy.
- `unreachable`: verify DNS, TLS, network policy, health endpoint, and service availability.
- `401/403`: verify M2M issuer, audience, scopes, service identity, and key generation; do not weaken route protection.
- `timeout`: inspect upstream latency and set `UPSTREAM_REQUEST_TIMEOUT_MS` only within the supported 500–30000 ms range.

All metrics must remain live or explicitly unavailable. Test fixtures belong under tests and must never be used as production fallbacks.
