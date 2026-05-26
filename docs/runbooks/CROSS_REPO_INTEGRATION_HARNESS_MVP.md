# Cross-Repo Integration Harness MVP Runbook (Issue #591)

## Objective
Provide a single happy-path validation lane for Phase 7 MVP integration contracts across submodule-aware services and local-first client behaviors.

This harness verifies:
- service readiness for Gateway,
- Nexus state minimum contract fields (`merkle_root`, `leaf_count`, `sync_status`) with documented fallback to `/api/v1/status` fields when needed,
- AI allocation contract invariants (weight bounds + sum ≈ 1) and unknown-profile fail-closed probe,
- UBI identity hash format contract (`identity_hash` matches `ubi:btc:{id}`),
- x402/payment-header transmission behavior,
- local-first state transition assertions.

## CI entrypoint
- Workflow: `.github/workflows/cross-repo-integration-mvp.yml`
- Harness script: `scripts/ci/run-cross-repo-harness-mvp.sh`

## Local execution
1. Initialize submodules:
   ```bash
   git submodule update --init --recursive
   ```
2. Install dependencies:
   ```bash
   pnpm install --frozen-lockfile
   ```
3. Start compose dependencies (same pattern as CI):
   ```bash
   docker compose up -d db redis
   ```
4. Run the harness:
   ```bash
   pnpm run check:phase6:sequence1
   ```
   (Equivalent direct entrypoint: `bash scripts/ci/run-cross-repo-harness-mvp.sh`.)
5. Tear down dependencies:
   ```bash
   docker compose down -v
   ```

Artifacts are written to: `test-results/cross-repo-harness-mvp/`.

## Pass/fail contract

The harness **passes** only when all checks succeed:
1. `GET /api/v1/health` returns HTTP 200.
2. Nexus path contract succeeds:
   - preferred: `GET /api/v1/nexus/state` returns HTTP 200 JSON with `merkle_root`, `leaf_count`, and `sync_status` (or valid documented fallback values from `/api/v1/status`), or
   - fallback: when `/api/v1/nexus/state` returns 404 in this repo checkout, `GET /api/v1/status` must provide fallback-equivalent fields (`state_root` or `mmr_root`, `processed_height`, `drift`).
3. `GET /api/v1/ai/allocation` returns HTTP 200 and contract assertions pass:
   - every `allocations[].weight` is within `[0, 1]`,
   - total weight sum is within `1 ± 0.001`,
   - unknown-profile probe (`?profile=phase6-sequence1-unknown`) fails closed with HTTP 4xx.
4. `GET /api/v1/identity/ubi/{address}` returns HTTP 200 and `identity_hash` matches `ubi:btc:{id}`.
5. x402/payment-header checks pass via existing tests:
   - `services/admin-dashboard/src/tests/x402.test.ts`
   - `services/elizaos-plugin-conxian/src/tests/conxianClient.test.ts`
6. local-first transition assertions pass via existing test:
   - `services/admin-dashboard/src/tests/sidlPersistence.test.ts`
7. admin dashboard nexus parity normalization tests pass:
   - `services/admin-dashboard/src/tests/nexusContract.test.ts`

The harness **fails fast** on any contract violation and preserves logs in the artifact directory.

## Notes
- This is intentionally MVP-scoped for Phase 7 happy-path coverage.
- The harness reuses existing tests/assertions rather than introducing synthetic mocks.
