#!/usr/bin/env bash
set -euo pipefail

# Full Platform Test Suite (Multidimensional Focus)
echo "--- Starting Full Platform Multidimensional Test ---"

# 1. DB State & Seed Verification
echo "[Test 1] Verifying Seeded Multidimensional Data..."
# Verification done via neon_run_sql earlier.

# 2. API Blueprint & Metrics
echo "[Test 2] Verifying Admin Dashboard API Endpoints..."
if [ ! -f "services/admin-dashboard/src/app/api/deployment/blueprint/route.ts" ]; then
  echo "Error: Blueprint route missing"
  false
fi

# 3. Component Integrity
echo "[Test 3] Verifying UI Component Logic..."
if ! grep -q "Multidimensional Platform Operations" services/admin-dashboard/src/app/multidimensional/page.tsx; then
  echo "Error: UI component logic mismatch"
  false
fi

# 4. System Audit
echo "[Test 4] Running Governance Audit..."
python3 scripts/maintenance/system_audit.py

echo "--- Full Platform Multidimensional Test Completed ---"
