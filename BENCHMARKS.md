# Conxian Platform: Performance Benchmarks

## 1. Gateway Latency (Localhost)
- **Endpoint**: `/api/v1/status`
- **Environment**: Production Rust (Actix-web)
- **Method**: 10 consecutive `curl` requests.
- **Results (Post-Repair)**:
    - Average Latency: ~0.8ms (High-performance Actix-web)
    - Min: 0.5ms
    - Max: 1.2ms

## 2. Build Performance
- **Gateway (Rust)**:
    - Initial Build: ~45s
    - Incremental Build: <1.5s
- **UI (Next.js)**:
    - Production Build: ~25s
    - Dev Startup: ~3s

## 3. Resource Usage (Idle)
- **Gateway**: ~12MB RAM
- **UI (Dev mode)**: ~350MB RAM (with submodules initialized)
- **Admin Dashboard**: ~150MB RAM

## 4. Targets (2026 Roadmap)
- **Throughput**: 10,000 requests/sec per Gateway instance.
- **Latency**: <30ms P99 for sovereign node proxies.
- **Nexus Sync**: Handle 1M+ state updates per hour with <1s Merkle root propagation.
- **TVL Handling**: Scale to $10B+ TAM support.
