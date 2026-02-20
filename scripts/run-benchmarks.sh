#!/bin/bash
# Conxian Platform: Automated Benchmark Suite

set -e

echo "📊 Starting Conxian Performance Benchmarks..."
echo "------------------------------------------"

# 1. Build Performance (Gateway)
echo "Measuring Gateway Build Time..."
cd services/lib-conxian-core/gateway
START_TIME=$(date +%s)
cargo build --quiet
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))
echo "✅ Gateway Build: ${ELAPSED}s"
cd - > /dev/null

# 2. Build Performance (UI)
echo "Checking UI Build capability (pnpm install)..."
cd services/conxian-ui
if command -v pnpm >/dev/null 2>&1; then
    START_TIME=$(date +%s)
    pnpm install > /dev/null 2>&1
    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))
    echo "✅ UI Dependency Install: ${ELAPSED}s"
else
    echo "⚠️  pnpm not found, skipping UI benchmark."
fi
cd - > /dev/null

# 3. Latency Check (Requires Gateway running)
echo "Checking Gateway Latency (requires service to be up)..."
if curl -s http://localhost:8080/api/v1/health > /dev/null 2>&1; then
    echo "Measuring latency to /api/v1/status..."
    for i in {1..5}; do
        curl -o /dev/null -s -w "Request $i: %{time_total}s\n" http://localhost:8080/api/v1/status
    done
else
    echo "⚠️  Gateway not running at http://localhost:8080. Skipping latency check."
    echo "   (Hint: run 'make start' first)"
fi

echo "------------------------------------------"
echo "✅ Benchmarks Complete."
