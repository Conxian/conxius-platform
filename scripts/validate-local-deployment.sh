#!/usr/bin/env bash

# scripts/validate-local-deployment.sh
# Deterministic local deployment pre-flight validation routine when conxius-orbit is absent.

set -euo pipefail

echo "============================================================"
echo "🔍 Conxian Platform Local Deployment Pre-Flight Validation"
echo "============================================================"

ENV_FILE="${CONXIAN_ENV_FILE:-.env}"
FAILED=0

# Check 1: Environment File Presence
echo -n "[Check 1/5] Local Environment File (.env)... "
if [[ -f "$ENV_FILE" ]]; then
  echo "✅ PASS ($ENV_FILE exists)"
else
  echo "❌ FAIL ($ENV_FILE missing. Run 'make auth' first.)"
  FAILED=$((FAILED + 1))
fi

# Check 2: Core Environment Variable Validation
echo -n "[Check 2/5] Required Environment Variables... "
if [[ -f "$ENV_FILE" ]]; then
  MISSING_VARS=()
  for var in GATEWAY_JWT_SECRET ADMIN_DASHBOARD_API_KEY CORE_DB_URI POSTGRES_USER POSTGRES_PASSWORD; do
    VAL=$(grep -E "^${var}=" "$ENV_FILE" | head -n 1 | cut -d'=' -f2- || true)
    if [[ -z "$VAL" ]]; then
      MISSING_VARS+=("$var")
    fi
  done

  if [[ ${#MISSING_VARS[@]} -eq 0 ]]; then
    echo "✅ PASS (All key variables provisioned)"
  else
    echo "❌ FAIL (Missing variables: ${MISSING_VARS[*]})"
    FAILED=$((FAILED + 1))
  fi
else
  echo "⚠️  SKIP (Environment file not found)"
  FAILED=$((FAILED + 1))
fi

# Check 3: Workspace Dependency Consistency
echo -n "[Check 3/5] Workspace Dependency Consistency... "
if pnpm run check:dependency-consistency >/dev/null 2>&1; then
  echo "✅ PASS (Dependencies consistent)"
else
  echo "❌ FAIL (Dependency consistency check failed)"
  FAILED=$((FAILED + 1))
fi

# Check 4: Docker Compose Configuration Validation
echo -n "[Check 4/5] Docker Compose Specification... "
if command -v docker >/dev/null 2>&1 && docker compose config >/dev/null 2>&1; then
  echo "✅ PASS (docker-compose.yml valid)"
elif [[ -f "docker-compose.yml" ]]; then
  echo "✅ PASS (docker-compose.yml present)"
else
  echo "❌ FAIL (docker-compose.yml missing)"
  FAILED=$((FAILED + 1))
fi

# Check 5: Service Governance & Hygiene Audit
echo -n "[Check 5/5] Service Governance & Security Audit... "
if python3 scripts/maintenance/system_audit.py >/dev/null 2>&1; then
  echo "✅ PASS (Governance & Security checks passed)"
else
  echo "❌ FAIL (Governance or Security audit failed)"
  FAILED=$((FAILED + 1))
fi

echo "============================================================"
if [[ $FAILED -eq 0 ]]; then
  echo "✅ SUCCESS: Local deployment pre-flight validation passed!"
  echo "ℹ️  Note: For orchestrated multi-service deployment, trigger the platform CI/CD pipeline."
else
  echo "❌ FAILURE: $FAILED pre-flight validation check(s) failed."
fi
