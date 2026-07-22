#!/bin/bash
# Conxian Platform: Automated Benchmark Suite (Phase 7 Remediated)

set -e

REPOSITORY_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "📊 Starting Conxian Performance Benchmarks..."
echo "------------------------------------------"

# 1. Platform Service Build Performance
echo "Measuring Admin Dashboard Build Time..."
if command -v pnpm >/dev/null 2>&1; then
    cd "$REPOSITORY_ROOT"
    START_TIME=$(date +%s)
    pnpm run check:dependency-consistency
    pnpm install --frozen-lockfile > /dev/null 2>&1
    pnpm --filter admin-dashboard build > /dev/null 2>&1
    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))
    echo "✅ Admin Dashboard Build: ${ELAPSED}s"
else
    echo "⚠️  pnpm not found on host, skipping build benchmark."
fi

# 2. Gateway/UI Latency (Internal stubs)
echo "Checking Platform Service Latency..."
if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "Measuring latency to /api/health..."
    for i in {1..5}; do
        curl -o /dev/null -s -w "Request $i: %{time_total}s\n" http://localhost:3002/api/health
    done
else
    echo "⚠️  Platform services not running at http://localhost:3002. Skipping latency check."
fi

echo "------------------------------------------"
echo "✅ Benchmarks Complete."
