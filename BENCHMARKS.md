# Conxian Platform: Performance Benchmarks

## 1. Gateway Latency (Localhost)
- **Endpoint**: `/extended/v1/status`
- **Environment**: Development (Rust Axum stub)
- **Method**: 10 consecutive `curl` requests.
- **Results**:
    - Average Latency: ~11ms
    - Min: 10ms
    - Max: 12ms

## 2. Build Performance
- **Gateway (Rust)**:
    - Initial Build: ~30s
    - Incremental Build: <2s
- **UI (Next.js)**:
    - Production Build: ~15s
    - Dev Startup: ~2s

## 3. Resource Usage (Idle)
- **Gateway**: ~10MB RAM
- **UI (Dev mode)**: ~200MB RAM

## 4. Targets (2026 Roadmap)
- **Throughput**: 5,000 requests/sec per Gateway instance.
- **Latency**: <50ms P99 for sovereign node proxies.
- **TVL Handling**: Scale to $1B+ TVL simulation.
