#!/bin/bash
# Conxian Platform: Automated Benchmark Suite (Phase 7 Remediated)

set -e

echo "📊 Starting Conxian Performance Benchmarks..."
echo "------------------------------------------"

# 1. Platform Service Build Performance
echo "Measuring Admin Dashboard Build Time..."
if command -v pnpm >/dev/null 2>&1; then
    cd services/admin-dashboard
    START_TIME=$(date +%s)
    pnpm install > /dev/null 2>&1
    pnpm build > /dev/null 2>&1
    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))
    echo "✅ Admin Dashboard Build: ${ELAPSED}s"
    cd - > /dev/null
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
