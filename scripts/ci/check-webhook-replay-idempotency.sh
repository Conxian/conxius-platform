#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
ARTIFACT_DIR="${WEBHOOK_REPLAY_ARTIFACT_DIR:-${ROOT_DIR}/test-results/cross-repo-harness-mvp}"
mkdir -p "${ARTIFACT_DIR}"

ENDPOINT_URL="${WEBHOOK_REPLAY_ENDPOINT_URL:-}"
FIXTURE_PATH="${WEBHOOK_REPLAY_FIXTURE_PATH:-}"
REQUEST_METHOD="${WEBHOOK_REPLAY_METHOD:-POST}"
CONTENT_TYPE="${WEBHOOK_REPLAY_CONTENT_TYPE:-application/json}"
AUTH_HEADER="${WEBHOOK_REPLAY_AUTH_HEADER:-}"
TIMEOUT_SECONDS="${WEBHOOK_REPLAY_TIMEOUT_SECONDS:-20}"
EXPECTED_FIRST_STATUS="${WEBHOOK_REPLAY_EXPECT_FIRST_STATUS:-}"
ALLOWED_REPLAY_STATUSES="${WEBHOOK_REPLAY_ALLOWED_REPLAY_STATUSES:-200,202,204,208,409}"

log() {
  printf '[webhook-replay-check] %s\n' "$*"
}

skip() {
  log "SKIP: $*"
  exit 0
}

fail() {
  printf '[webhook-replay-check] ERROR: %s\n' "$*" >&2
  exit 1
}

require_command() {
  local name="$1"
  command -v "${name}" >/dev/null 2>&1 || fail "Required command is missing: ${name}"
}

validate_status_code() {
  local status="$1"
  local label="$2"
  [[ "${status}" =~ ^[0-9]{3}$ ]] || fail "${label} probe did not return an HTTP status code (got '${status}')"
}

status_in_csv() {
  local target="$1"
  local csv="$2"
  local entry

  IFS=',' read -r -a entries <<<"${csv}"
  for entry in "${entries[@]}"; do
    entry="${entry// /}"
    if [[ "${entry}" == "${target}" ]]; then
      return 0
    fi
  done

  return 1
}

send_probe() {
  local body_file="$1"
  local headers_file="$2"
  local -a curl_args=(
    -sS
    -o "${body_file}"
    -D "${headers_file}"
    -w '%{http_code}'
    -X "${REQUEST_METHOD}"
    --max-time "${TIMEOUT_SECONDS}"
    -H "Content-Type: ${CONTENT_TYPE}"
    --data-binary "@${FIXTURE_PATH}"
    "${ENDPOINT_URL}"
  )

  if [[ -n "${AUTH_HEADER}" ]]; then
    curl_args+=( -H "Authorization: ${AUTH_HEADER}" )
  fi

  curl "${curl_args[@]}"
}

if [[ -z "${ENDPOINT_URL}" ]]; then
  skip "WEBHOOK_REPLAY_ENDPOINT_URL is not set; no replay probe was executed"
fi

require_command curl
require_command sha256sum

if [[ -z "${FIXTURE_PATH}" ]]; then
  skip "WEBHOOK_REPLAY_FIXTURE_PATH is not set; no replay probe was executed"
fi

if [[ ! -f "${FIXTURE_PATH}" ]]; then
  fail "Configured WEBHOOK_REPLAY_FIXTURE_PATH does not exist: ${FIXTURE_PATH}"
fi

if ! [[ "${TIMEOUT_SECONDS}" =~ ^[0-9]+$ ]]; then
  fail "WEBHOOK_REPLAY_TIMEOUT_SECONDS must be an integer (received '${TIMEOUT_SECONDS}')"
fi

if ! [[ "${REQUEST_METHOD}" =~ ^[A-Z]+$ ]]; then
  fail "WEBHOOK_REPLAY_METHOD must be uppercase HTTP method text (received '${REQUEST_METHOD}')"
fi

FIRST_BODY_FILE="${ARTIFACT_DIR}/webhook-replay-first-response.body"
SECOND_BODY_FILE="${ARTIFACT_DIR}/webhook-replay-second-response.body"
FIRST_HEADERS_FILE="${ARTIFACT_DIR}/webhook-replay-first-response.headers"
SECOND_HEADERS_FILE="${ARTIFACT_DIR}/webhook-replay-second-response.headers"
SUMMARY_FILE="${ARTIFACT_DIR}/webhook-replay-summary.md"

log "Sending initial webhook probe (${REQUEST_METHOD} ${ENDPOINT_URL})"
FIRST_STATUS="$(send_probe "${FIRST_BODY_FILE}" "${FIRST_HEADERS_FILE}")"
validate_status_code "${FIRST_STATUS}" "Initial"

log "Sending replay webhook probe (same payload)"
SECOND_STATUS="$(send_probe "${SECOND_BODY_FILE}" "${SECOND_HEADERS_FILE}")"
validate_status_code "${SECOND_STATUS}" "Replay"

if [[ -n "${EXPECTED_FIRST_STATUS}" && "${FIRST_STATUS}" != "${EXPECTED_FIRST_STATUS}" ]]; then
  fail "Initial probe HTTP status mismatch: expected ${EXPECTED_FIRST_STATUS}, got ${FIRST_STATUS}"
fi

if [[ ! "${FIRST_STATUS}" =~ ^2[0-9]{2}$ ]]; then
  fail "Initial probe must return 2xx to establish baseline delivery (got ${FIRST_STATUS})"
fi

if [[ "${SECOND_STATUS}" != "${FIRST_STATUS}" ]]; then
  if ! status_in_csv "${SECOND_STATUS}" "${ALLOWED_REPLAY_STATUSES}"; then
    fail "Replay probe HTTP ${SECOND_STATUS} is not accepted. Allowed replay statuses: ${ALLOWED_REPLAY_STATUSES}"
  fi
fi

FIRST_BODY_SHA="$(sha256sum "${FIRST_BODY_FILE}" | awk '{print $1}')"
SECOND_BODY_SHA="$(sha256sum "${SECOND_BODY_FILE}" | awk '{print $1}')"

cat > "${SUMMARY_FILE}" <<EOF_SUMMARY
# Webhook Replay Idempotency Probe Summary

- endpoint: ${ENDPOINT_URL}
- method: ${REQUEST_METHOD}
- fixture: ${FIXTURE_PATH}
- initial status: ${FIRST_STATUS}
- replay status: ${SECOND_STATUS}
- accepted replay statuses: ${ALLOWED_REPLAY_STATUSES}
- initial response sha256: ${FIRST_BODY_SHA}
- replay response sha256: ${SECOND_BODY_SHA}
EOF_SUMMARY

if [[ "${FIRST_BODY_SHA}" == "${SECOND_BODY_SHA}" ]]; then
  log "Replay body hash unchanged (${FIRST_BODY_SHA})"
else
  log "Replay body hash changed (${FIRST_BODY_SHA} -> ${SECOND_BODY_SHA})"
fi

log "Webhook replay probe completed successfully"
