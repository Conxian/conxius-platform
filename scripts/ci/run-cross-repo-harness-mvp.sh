#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
ARTIFACT_DIR="${ROOT_DIR}/test-results/cross-repo-harness-mvp"
mkdir -p "${ARTIFACT_DIR}"

GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:8080}"
START_GATEWAY="${START_GATEWAY:-1}"
GATEWAY_START_TIMEOUT_SECONDS="${GATEWAY_START_TIMEOUT_SECONDS:-900}"

log() {
  printf '[cross-repo-harness-mvp] %s\n' "$*"
}

fail() {
  printf '[cross-repo-harness-mvp] ERROR: %s\n' "$*" >&2
  return 1
}

require_command() {
  local name="$1"
  command -v "$name" >/dev/null 2>&1 || fail "Required command is missing: ${name}"
}

wait_for_http_200() {
  local url="$1"
  local timeout_seconds="$2"
  local output_file="$3"

  local elapsed=0
  while (( elapsed < timeout_seconds )); do
    local status
    status="$(curl -sS -o "${output_file}" -w "%{http_code}" "${url}" 2>/dev/null || true)"
    if [[ "${status}" == "200" ]]; then
      return 0
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  return 1
}

cleanup() {
  if [[ -n "${GATEWAY_PID:-}" ]] && kill -0 "${GATEWAY_PID}" >/dev/null 2>&1; then
    kill "${GATEWAY_PID}" >/dev/null 2>&1 || true
    wait "${GATEWAY_PID}" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

require_command curl
require_command pnpm
require_command cargo
require_command python3

if [[ "${START_GATEWAY}" == "1" ]]; then
  log "Starting gateway binary for readiness and endpoint checks"
  cargo run \
    --manifest-path "${ROOT_DIR}/services/lib-conxian-core/gateway/Cargo.toml" \
    --bin conxian-gateway \
    > "${ARTIFACT_DIR}/gateway.log" 2>&1 &
  GATEWAY_PID=$!
fi

log "Waiting for gateway health endpoint"
if ! wait_for_http_200 "${GATEWAY_URL}/api/v1/health" "${GATEWAY_START_TIMEOUT_SECONDS}" "${ARTIFACT_DIR}/gateway-health.json"; then
  fail "Gateway health endpoint did not become ready at ${GATEWAY_URL}/api/v1/health"
fi

log "Validating Phase 6 + Phase 7 endpoints"
NEXUS_STATUS="$(curl -sS -o "${ARTIFACT_DIR}/nexus-state-response.json" -w "%{http_code}" "${GATEWAY_URL}/api/v1/nexus/state" || true)"
NEXUS_MODE="native"

if [[ "${NEXUS_STATUS}" == "200" ]]; then
  STATUS_FOR_NEXUS_STATUS="$(curl -sS -o "${ARTIFACT_DIR}/status-for-nexus-fallback-response.json" -w "%{http_code}" "${GATEWAY_URL}/api/v1/status" || true)"

  python3 - "${ARTIFACT_DIR}/nexus-state-response.json" "${ARTIFACT_DIR}/status-for-nexus-fallback-response.json" "${STATUS_FOR_NEXUS_STATUS}" <<'PY_INNER'
import json
import sys

nexus_path, status_path, status_code = sys.argv[1:4]

with open(nexus_path, "r", encoding="utf-8") as f:
    nexus = json.load(f)

if not isinstance(nexus, dict):
    sys.exit("Expected JSON object from /api/v1/nexus/state")

status = {}
if status_code == "200":
    with open(status_path, "r", encoding="utf-8") as f:
        loaded = json.load(f)
    if isinstance(loaded, dict):
        status = loaded


def get_str(payload, key):
    value = payload.get(key)
    return value if isinstance(value, str) and value else None


def get_num(payload, key):
    value = payload.get(key)
    return value if isinstance(value, (int, float)) else None


merkle_root = get_str(nexus, "merkle_root") or get_str(status, "state_root") or get_str(status, "mmr_root")
leaf_count = get_num(nexus, "leaf_count")
if leaf_count is None:
    leaf_count = get_num(status, "processed_height")

sync_status = get_str(nexus, "sync_status")
if sync_status is None:
    drift = get_num(status, "drift")
    if drift is not None:
        sync_status = "synced" if drift == 0 else "syncing"

if merkle_root is None:
    sys.exit("Missing Nexus merkle_root and no valid fallback (state_root/mmr_root) in /api/v1/status")
if leaf_count is None:
    sys.exit("Missing Nexus leaf_count and no valid fallback (processed_height) in /api/v1/status")
if sync_status is None:
    sys.exit("Missing Nexus sync_status and no valid fallback (drift) in /api/v1/status")
PY_INNER

elif [[ "${NEXUS_STATUS}" == "404" ]]; then
  NEXUS_MODE="fallback-status"
  FALLBACK_STATUS="$(curl -sS -o "${ARTIFACT_DIR}/nexus-status-fallback-response.json" -w "%{http_code}" "${GATEWAY_URL}/api/v1/status" || true)"
  [[ "${FALLBACK_STATUS}" == "200" ]] || fail "Fallback endpoint /api/v1/status returned HTTP ${FALLBACK_STATUS}"

  python3 - "${ARTIFACT_DIR}/nexus-status-fallback-response.json" <<'PY_INNER'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    payload = json.load(f)

if not isinstance(payload, dict):
    sys.exit("Expected JSON object from /api/v1/status")


def get_str(key):
    value = payload.get(key)
    return value if isinstance(value, str) and value else None


def get_num(key):
    value = payload.get(key)
    return value if isinstance(value, (int, float)) else None


merkle_root = get_str("state_root") or get_str("mmr_root")
leaf_count = get_num("processed_height")
drift = get_num("drift")

if merkle_root is None:
    sys.exit("Fallback contract missing both state_root and mmr_root")
if leaf_count is None:
    sys.exit("Fallback contract missing processed_height")
if drift is None:
    sys.exit("Fallback contract missing drift for sync_status derivation")
PY_INNER
else
  fail "Unexpected HTTP ${NEXUS_STATUS} from /api/v1/nexus/state"
fi

log "Validating Phase 6 AI Allocation endpoint"
AI_STATUS="$(curl -sS -o "${ARTIFACT_DIR}/ai-allocation.json" -w "%{http_code}" "${GATEWAY_URL}/api/v1/ai/allocation" || true)"
[[ "${AI_STATUS}" == "200" ]] || fail "AI Allocation endpoint returned HTTP ${AI_STATUS}"

python3 - "${ARTIFACT_DIR}/ai-allocation.json" <<'PY_INNER'
import json
import math
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    payload = json.load(f)

if not isinstance(payload, dict):
    sys.exit("Expected JSON object from /api/v1/ai/allocation")

status = payload.get("status")
if not isinstance(status, str) or not status:
    sys.exit("Missing or invalid AI allocation status")

allocations = payload.get("allocations")
if not isinstance(allocations, list) or not allocations:
    sys.exit("Missing or invalid AI allocations list")

weight_sum = 0.0
for index, allocation in enumerate(allocations):
    if not isinstance(allocation, dict):
        sys.exit(f"Allocation at index {index} is not an object")

    agent = allocation.get("agent")
    weight = allocation.get("weight")

    if not isinstance(agent, str) or not agent:
        sys.exit(f"Allocation at index {index} has invalid agent")
    if not isinstance(weight, (int, float)):
        sys.exit(f"Allocation at index {index} has invalid weight type")
    if not (0 <= weight <= 1):
        sys.exit(f"Allocation at index {index} has out-of-bounds weight {weight}")

    weight_sum += float(weight)

if math.fabs(weight_sum - 1.0) > 0.001:
    sys.exit(f"Allocation weights sum violation: expected 1±0.001, got {weight_sum}")
PY_INNER

log "Probing AI Allocation fail-closed behavior for unknown profile"
AI_NEGATIVE_STATUS="$(curl -sS -o "${ARTIFACT_DIR}/ai-allocation-unknown-profile.json" -w "%{http_code}" "${GATEWAY_URL}/api/v1/ai/allocation?profile=phase6-sequence1-unknown" || true)"
if [[ ! "${AI_NEGATIVE_STATUS}" =~ ^4[0-9][0-9]$ ]]; then
  fail "AI Allocation unknown-profile probe expected fail-closed 4xx, got HTTP ${AI_NEGATIVE_STATUS}"
fi

log "Validating Phase 6 UBI Identity endpoint"
UBI_STATUS="$(curl -sS -o "${ARTIFACT_DIR}/ubi-identity.json" -w "%{http_code}" "${GATEWAY_URL}/api/v1/identity/ubi/SP1P72Z3704VXP3R85X60S9H6BA6H4Y9ZAXP0H9Z" || true)"
[[ "${UBI_STATUS}" == "200" ]] || fail "UBI Identity endpoint returned HTTP ${UBI_STATUS}"

python3 - "${ARTIFACT_DIR}/ubi-identity.json" <<'PY_INNER'
import json
import re
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    payload = json.load(f)

if not isinstance(payload, dict):
    sys.exit("Expected JSON object from /api/v1/identity/ubi/{address}")

identity_hash = payload.get("identity_hash")
if not isinstance(identity_hash, str):
    sys.exit("Missing identity_hash in UBI identity payload")

if not re.match(r"^ubi:btc:[^\s]+$", identity_hash):
    sys.exit(f"Invalid UBI identity_hash format: {identity_hash}")
PY_INNER

log "Validating Phase 7 PSBT Handshake Simulation (Mock)"
PSBT_STATUS="$(curl -sS -o "${ARTIFACT_DIR}/psbt-simulate.json" -w "%{http_code}" "${GATEWAY_URL}/api/v1/settlement/simulate" || true)"
[[ "${PSBT_STATUS}" == "200" ]] || log "Warning: Settlement simulation not yet fully wired (Phase 7)"

log "Running existing x402 + local-first + nexus contract tests"
pnpm --dir "${ROOT_DIR}/services/admin-dashboard" test -- src/tests/x402.test.ts src/tests/sidlPersistence.test.ts src/tests/nexusContract.test.ts \
  2>&1 | tee "${ARTIFACT_DIR}/admin-dashboard-contract-tests.log"

pnpm --dir "${ROOT_DIR}/services/elizaos-plugin-conxian" test -- src/tests/conxianClient.test.ts \
  2>&1 | tee "${ARTIFACT_DIR}/elizaos-plugin-contract-tests.log"

cat > "${ARTIFACT_DIR}/summary.md" <<EOF_SUMMARY
# Cross-Repo Integration Harness MVP Summary

- Gateway readiness: PASS (${GATEWAY_URL}/api/v1/health)
- Nexus contract mode: ${NEXUS_MODE} (/api/v1/nexus/state, fallback /api/v1/status when needed)
- Phase 6 AI allocation contract assertions: PASS (weights bounds + sum≈1)
- Phase 6 AI unknown-profile fail-closed probe: PASS (4xx)
- Phase 6 UBI contract assertions: PASS (identity_hash matches ubi:btc:{id})
- x402/payment-header contract tests: PASS (services/admin-dashboard, services/elizaos-plugin-conxian)
- local-first state transition tests: PASS (services/admin-dashboard/src/tests/sidlPersistence.test.ts)
- admin dashboard nexus parity normalization tests: PASS (services/admin-dashboard/src/tests/nexusContract.test.ts)
EOF_SUMMARY

log "Harness checks completed successfully"
