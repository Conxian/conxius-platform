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
  exit 1
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
  local exit_code=$?

  if [[ -n "${GATEWAY_PID:-}" ]] && kill -0 "${GATEWAY_PID}" >/dev/null 2>&1; then
    kill "${GATEWAY_PID}" >/dev/null 2>&1 || true
    wait "${GATEWAY_PID}" >/dev/null 2>&1 || true
  fi

  if (( exit_code != 0 )) && [[ -f "${ARTIFACT_DIR}/gateway.log" ]]; then
    log "Harness failed. Last gateway log lines:"
    tail -n 80 "${ARTIFACT_DIR}/gateway.log" || true
  fi

  exit "${exit_code}"
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

log "Validating Nexus state endpoint contract"
NEXUS_STATUS="$(curl -sS -o "${ARTIFACT_DIR}/nexus-state-response.json" -w "%{http_code}" "${GATEWAY_URL}/api/v1/nexus/state" || true)"
NEXUS_MODE="native"

if [[ "${NEXUS_STATUS}" == "200" ]]; then
  python3 - "${ARTIFACT_DIR}/nexus-state-response.json" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    payload = json.load(f)

if not isinstance(payload, dict):
    raise SystemExit("Expected JSON object from /api/v1/nexus/state")
PY
elif [[ "${NEXUS_STATUS}" == "404" ]]; then
  NEXUS_MODE="fallback-status"
  FALLBACK_STATUS="$(curl -sS -o "${ARTIFACT_DIR}/nexus-status-fallback-response.json" -w "%{http_code}" "${GATEWAY_URL}/api/v1/status" || true)"
  [[ "${FALLBACK_STATUS}" == "200" ]] || fail "Fallback endpoint /api/v1/status returned HTTP ${FALLBACK_STATUS}"

  python3 - "${ARTIFACT_DIR}/nexus-status-fallback-response.json" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as f:
    payload = json.load(f)

if not isinstance(payload, dict):
    raise SystemExit("Expected JSON object from /api/v1/status")

required_fields = ["status", "version", "active_nodes"]
missing = [field for field in required_fields if field not in payload]
if missing:
    raise SystemExit(f"Missing expected fallback fields: {', '.join(missing)}")
PY
else
  fail "Unexpected HTTP ${NEXUS_STATUS} from /api/v1/nexus/state"
fi

log "Running existing x402 + local-first contract tests"
pnpm --dir "${ROOT_DIR}/services/admin-dashboard" test -- src/tests/x402.test.ts src/tests/sidlPersistence.test.ts \
  2>&1 | tee "${ARTIFACT_DIR}/admin-dashboard-contract-tests.log"

pnpm --dir "${ROOT_DIR}/services/elizaos-plugin-conxian" test -- src/tests/conxianClient.test.ts \
  2>&1 | tee "${ARTIFACT_DIR}/elizaos-plugin-contract-tests.log"

cat > "${ARTIFACT_DIR}/summary.md" <<EOF_SUMMARY
# Cross-Repo Integration Harness MVP Summary

- Gateway readiness: PASS (${GATEWAY_URL}/api/v1/health)
- Nexus contract mode: ${NEXUS_MODE} (/api/v1/nexus/state, fallback /api/v1/status when needed)
- x402/payment-header contract tests: PASS (services/admin-dashboard, services/elizaos-plugin-conxian)
- local-first state transition tests: PASS (services/admin-dashboard/src/tests/sidlPersistence.test.ts)
EOF_SUMMARY

log "Harness checks completed successfully"
