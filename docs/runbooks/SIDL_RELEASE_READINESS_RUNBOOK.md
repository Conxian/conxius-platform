# SIDL Release Readiness Runbook

## Objective
Define the maintainer steps required to roll out and verify the SIDL social interfaces as a **reference implementation**: Farcaster Frames, ElizaOS plugin actions, and x402 Cart Mandate checkout.

## Prerequisites
- Access to the deployment/environment hosting `services/admin-dashboard`.
- Access to the release channel used for maintainer updates.
- CLI tools available: `curl`, `jq`, and `python3` (or equivalent base64 decoder).
- Social surface base URL identified:
  - Local default for Admin Dashboard: `http://localhost:3001`
  - If using ElizaOS plugin defaults, set `CONXIAN_SOCIAL_URL` explicitly when not running on `http://localhost:3002`.
- If validating live APY in the sBTC frame, ensure `CORE_API_URL` (or `NEXT_PUBLIC_CORE_API_URL`) can reach Gateway `/api/v1/lorenzo/stats`.

## Rollout Steps
1. **Confirm Scope**: Confirm this release follows the OpenSpec change at `openspec/changes/2026-04-01-sidl-elizaos-farcaster-x402/proposal.md`.
2. **Deploy Social Surface**: Deploy/restart the `services/admin-dashboard` version that includes:
   - `/frames/sbtc`
   - `/frames/vote`
   - `/api/cart/mandates/[id]`
   - `/api/cart/mandates/[id]/checkout`
3. **Align Plugin Configuration**: Point ElizaOS plugin social base URL to the same environment (`CONXIAN_SOCIAL_URL=<social-base-url>`).
4. **Publish Readiness Posture**: Communicate that SIDL is a locally runnable reference implementation and not a production settlement rollout.

## Verification Steps
Set base URL once for checks:

```bash
export SIDL_SOCIAL_BASE_URL="http://localhost:3001"
```

1. **Frame Route: sBTC Snapshot**
   - Run:
     ```bash
     curl -sS -D /tmp/sidl-frames-sbtc.headers "$SIDL_SOCIAL_BASE_URL/frames/sbtc" -o /tmp/sidl-frames-sbtc.html
     grep -E "HTTP/|Content-Type" /tmp/sidl-frames-sbtc.headers
     grep -E "fc:frame|/frames/vote|/api/cart/mandates/sbtc-yield-frame" /tmp/sidl-frames-sbtc.html
     ```
   - Expect:
     - HTTP `200`
     - HTML response with `fc:frame` metadata
     - Links to `/frames/vote` and `/api/cart/mandates/sbtc-yield-frame`

2. **Frame Route: Vote**
   - Run:
     ```bash
     curl -sS -D /tmp/sidl-frames-vote.headers "$SIDL_SOCIAL_BASE_URL/frames/vote" -o /tmp/sidl-frames-vote.html
     grep -E "HTTP/|Content-Type" /tmp/sidl-frames-vote.headers
     grep -E "Vote YES|Vote NO|/api/governance/votes/conxian-sbtc-yield-policy" /tmp/sidl-frames-vote.html
     ```
   - Expect:
     - HTTP `200`
     - Vote buttons rendered and tally link targeting `conxian-sbtc-yield-policy`

3. **Cart Mandate Retrieval**
   - Run:
     ```bash
     curl -sS "$SIDL_SOCIAL_BASE_URL/api/cart/mandates/sbtc-yield-frame" | jq .
     ```
   - Expect:
     - JSON response with `ok: true`
     - `mandate.id` equals `sbtc-yield-frame`

4. **x402 Checkout Without Payment Signature (Expected 402 Path)**
   - Run:
     ```bash
     curl -sS -D /tmp/sidl-checkout-402.headers \
       "$SIDL_SOCIAL_BASE_URL/api/cart/mandates/sbtc-yield-frame/checkout" \
       -o /tmp/sidl-checkout-402.json

     grep -E "HTTP/|PAYMENT-REQUIRED" /tmp/sidl-checkout-402.headers
     cat /tmp/sidl-checkout-402.json | jq .
     ```
   - Expect:
     - HTTP `402`
     - `PAYMENT-REQUIRED` response header present
     - body contains `error: "payment-required"` and a `paymentRequired` payload
   - Decode header payload (optional but recommended):
     ```bash
     python3 - <<'PY'
import base64, json
from pathlib import Path

header_line = next(
    line for line in Path('/tmp/sidl-checkout-402.headers').read_text().splitlines()
    if line.lower().startswith('payment-required:')
)
encoded = header_line.split(':', 1)[1].strip()
print(json.dumps(json.loads(base64.b64decode(encoded)), indent=2))
PY
     ```

5. **x402 Checkout With Payment Signature (Expected Settlement Path)**
   - Run:
     ```bash
     curl -sS -D /tmp/sidl-checkout-200.headers \
       -H "PAYMENT-SIGNATURE: local-test-signature" \
       "$SIDL_SOCIAL_BASE_URL/api/cart/mandates/sbtc-yield-frame/checkout" \
       -o /tmp/sidl-checkout-200.json

     grep -E "HTTP/|PAYMENT-RESPONSE" /tmp/sidl-checkout-200.headers
     cat /tmp/sidl-checkout-200.json | jq .
     ```
   - Expect:
     - HTTP `200`
     - `PAYMENT-RESPONSE` response header present
     - body contains `ok: true` and note `Payment signature accepted (reference implementation).`

## Rollback Action
If verification fails or user-facing regressions are detected:
1. Roll back `services/admin-dashboard` to the previous stable release.
2. Revert `CONXIAN_SOCIAL_URL` for ElizaOS consumers to the last known-good social surface.
3. Remove/disable release-facing references to SIDL checkout and frame routes until checks pass.
4. Record rollback timestamp, trigger condition, and owner in the release log.

## Support Guidance
- **Frames show incomplete or stale yield context**: validate Gateway reachability for `/api/v1/lorenzo/stats`; frame image may show `unavailable` APY when Gateway data is missing.
- **Checkout always returns 402**: confirm client sends `PAYMENT-SIGNATURE` for settlement-path tests.
- **ElizaOS cannot reach social endpoints**: verify `CONXIAN_SOCIAL_URL` points to the active Admin Dashboard host/port.
- **Vote counts reset unexpectedly**: this is expected after process restart because tally storage is in-memory.

## Evidence Requirements
- Saved request/response artifacts for all verification checks (headers + body), including both 402 and 200 checkout paths.
- Decoded `PAYMENT-REQUIRED` payload demonstrating `resource`, `maxAmountRequired`, `payTo`, `asset`, and `network` fields.
- Snapshot of final route health (HTTP 200 for `/frames/sbtc`, `/frames/vote`, and cart mandate retrieval).
- Release note/update link that explicitly states reference-implementation readiness posture.

## Known Limitations / Readiness Caveats
- SIDL is currently a **working, locally runnable reference implementation**.
- There is **no onchain settlement** or production facilitator integration in the x402 flow.
- `PAYMENT-SIGNATURE` is treated as an opaque input for local testing (not a production-grade settlement proof).
- Farcaster frame payloads are not cryptographically verified in this implementation.
- Vote tally state is in-memory and not long-lived across restarts.
