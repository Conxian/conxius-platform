# Bitcoin Sandbox Production Parity Matrix (CON-690 Phase 1)

Refs #712

## Purpose
Define the first scoped, low-risk production-parity scaffold for the cross-repo Bitcoin sandbox harness without changing default CI behavior.

This matrix maps each parity area to concrete repo files, execution checks, and the immediate follow-up expected after Phase 1.

## Production-parity matrix

| Target area | Phase 1 scaffold in this repo | Concrete files | Execution checks (scoped) | Phase 1 status / next step |
| --- | --- | --- | --- | --- |
| Networks (`testnet` / `signet` / `regtest`) | Harness preflight validates `CORE_BITCOIN_NETWORK` and fails fast only on invalid values; unset env preserves default behavior (`testnet`) | `.env.schema`<br>`scripts/ci/run-cross-repo-harness-mvp.sh` | Invalid-value preflight check (expected fail-fast):<br>`CORE_BITCOIN_NETWORK=invalid-network START_GATEWAY=0 bash scripts/ci/run-cross-repo-harness-mvp.sh` | **Scaffolded**. Add explicit signet/regtest lanes once sandbox endpoints are pinned for each network. |
| Routing + settlement parity | Existing harness endpoint contract checks remain source of truth for gateway health, nexus contract shape, AI allocation, UBI format, and settlement simulation probe | `scripts/ci/run-cross-repo-harness-mvp.sh` | `pnpm run check:phase6:sequence1` | **Unchanged by default**. Expand assertions from MVP/happy-path toward production routing outcomes per network. |
| Deterministic fixtures | Replay probe consumes env-configured fixture payload path so sandbox teams can lock deterministic webhook payloads per integration | `scripts/ci/check-webhook-replay-idempotency.sh` | Dry-run preconditions:<br>`WEBHOOK_REPLAY_FIXTURE_PATH=/abs/path/to/fixture.json ENABLE_WEBHOOK_REPLAY_CHECK=1 bash scripts/ci/run-cross-repo-harness-mvp.sh` | **Scaffolded**. Add committed fixture corpus and endpoint-specific fixture contracts in follow-up phases. |
| Failure injection | Network preflight + replay status policy (`WEBHOOK_REPLAY_ALLOWED_REPLAY_STATUSES`) provide initial failure-injection controls without changing default harness outcomes | `scripts/ci/run-cross-repo-harness-mvp.sh`<br>`scripts/ci/check-webhook-replay-idempotency.sh` | Replay policy check with strict replay code set:<br>`ENABLE_WEBHOOK_REPLAY_CHECK=1 WEBHOOK_REPLAY_ALLOWED_REPLAY_STATUSES=409 ... bash scripts/ci/run-cross-repo-harness-mvp.sh` | **Scaffolded**. Add deterministic negative fixtures and transport fault simulation per provider. |
| Webhook replay / idempotency | New opt-in replay probe sends identical payload twice to an env-configured webhook endpoint and validates replay status policy | `scripts/ci/check-webhook-replay-idempotency.sh`<br>`scripts/ci/run-cross-repo-harness-mvp.sh` | Opt-in execution:<br>`ENABLE_WEBHOOK_REPLAY_CHECK=1 WEBHOOK_REPLAY_ENDPOINT_URL=<url> WEBHOOK_REPLAY_FIXTURE_PATH=<fixture> bash scripts/ci/run-cross-repo-harness-mvp.sh` | **Scaffolded (opt-in)**. Promote to required CI gate only after endpoint ownership + baseline statuses are agreed. |
| CI + runbook integration | Harness default path remains unchanged because replay checks are guarded behind `ENABLE_WEBHOOK_REPLAY_CHECK=1`; docs now include local parity-scaffold commands | `.github/workflows/cross-repo-integration-mvp.yml`<br>`docs/runbooks/CROSS_REPO_INTEGRATION_HARNESS_MVP.md`<br>`docs/runbooks/BITCOIN_SANDBOX_PRODUCTION_PARITY_MATRIX.md` | Default CI command (unchanged):<br>`pnpm run check:phase6:sequence1` | **Scaffolded**. Add dedicated CI job/flag only after webhook endpoint + fixtures are available in CI secrets/artifacts. |

## Local parity scaffold quick start

1. Keep default harness behavior (same as current CI):
   ```bash
   pnpm run check:phase6:sequence1
   ```
2. Validate network preflight only (fail-fast on invalid value):
   ```bash
   CORE_BITCOIN_NETWORK=invalid-network START_GATEWAY=0 bash scripts/ci/run-cross-repo-harness-mvp.sh
   ```
3. Run opt-in webhook replay scaffold:
   ```bash
   ENABLE_WEBHOOK_REPLAY_CHECK=1 \
   WEBHOOK_REPLAY_ENDPOINT_URL=http://127.0.0.1:8080/api/v1/webhooks/sandbox \
   WEBHOOK_REPLAY_FIXTURE_PATH=/absolute/path/to/webhook-fixture.json \
   bash scripts/ci/run-cross-repo-harness-mvp.sh
   ```

## Notes
- `ENABLE_WEBHOOK_REPLAY_CHECK` defaults to `0` and is intentionally opt-in.
- If webhook replay env vars are missing, the replay script reports an explicit skip reason and exits `0`.
- Replay artifacts are written under `test-results/cross-repo-harness-mvp/` when enabled.
