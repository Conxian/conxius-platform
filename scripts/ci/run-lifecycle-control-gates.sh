#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
ARTIFACT_DIR="${ROOT_DIR}/test-results/lifecycle-control-gates"
LOG_FILE="${ARTIFACT_DIR}/lifecycle-control-gates.log"
SUMMARY_FILE="${ARTIFACT_DIR}/summary.md"

mkdir -p "${ARTIFACT_DIR}"
: > "${LOG_FILE}"

BRANCH_NAME="$(git branch --show-current)"
HEAD_SHA="$(git rev-parse HEAD)"
GENERATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

{
  echo "# Lifecycle/control gates summary"
  echo
  echo "- Branch: \`${BRANCH_NAME}\`"
  echo "- Head: \`${HEAD_SHA}\`"
  echo "- Generated (UTC): \`${GENERATED_AT}\`"
  echo
  echo "## Checks"
} > "${SUMMARY_FILE}"

failures=0

run_check() {
  local check_name="$1"
  shift

  echo "[lifecycle-control-gates] RUN ${check_name}" | tee -a "${LOG_FILE}"

  if "$@" >> "${LOG_FILE}" 2>&1; then
    echo "- PASS: \`${check_name}\`" >> "${SUMMARY_FILE}"
    echo "[lifecycle-control-gates] PASS ${check_name}" | tee -a "${LOG_FILE}"
  else
    local status=$?
    failures=$((failures + 1))
    echo "- FAIL(${status}): \`${check_name}\`" >> "${SUMMARY_FILE}"
    echo "[lifecycle-control-gates] FAIL ${check_name} (exit ${status})" | tee -a "${LOG_FILE}"
  fi
}

run_check "verify_service_catalog" python3 scripts/verify_service_catalog.py
run_check "verify_integrations_registry" python3 scripts/verify_integrations_registry.py
run_check "verify_lifecycle_control_gates" python3 scripts/verify_lifecycle_control_gates.py
run_check "verify_bos_production_boundary" python3 scripts/verify_bos_production_boundary.py
run_check "verify_submodule_integrity" python3 scripts/verify_submodule_integrity.py
run_check "verify_contamination_guard" python3 scripts/verify_contamination_guard.py

if (( failures > 0 )); then
  echo >> "${SUMMARY_FILE}"
  echo "**Result:** FAIL (${failures} check(s))" >> "${SUMMARY_FILE}"
  cat "${SUMMARY_FILE}"
  exit 1
fi

echo >> "${SUMMARY_FILE}"
echo "**Result:** PASS" >> "${SUMMARY_FILE}"

cat "${SUMMARY_FILE}"
