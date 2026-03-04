# Conxian Platform: Performance Benchmarks

## 1. Gateway Latency (Localhost)
- **Endpoint**: /api/v1/status
- **Environment**: Production Rust (Actix-web)
- **Method**: 10 consecutive curl requests.
- **Results (Post-Repair)**:
    - Average Latency: ~0.8ms (High-performance Actix-web)
    - Min: 0.5ms
    - Max: 1.2ms

## 2. Nexus Synchronization (Simulated)
- **Merkle Root Generation**: <0.5ms
- **Leaf Insertion**: <0.1ms per leaf
- **ZKP Verification (Mock)**: <1.0ms
- **Sync Status**: 100% (Real-time tracking enabled)

## 3. Build Performance
- **Gateway (Rust)**:
    - Initial Build: ~45s
    - Incremental Build: <1.5s
- **UI (Next.js)**:
    - Production Build: ~25s
    - Dev Startup: ~3s

## 4. Resource Usage (Idle)
- **Gateway**: ~15MB RAM (with Nexus state)
- **UI (Dev mode)**: ~350MB RAM (with submodules initialized)
- **Admin Dashboard**: ~150MB RAM

## 5. Targets (2026 Roadmap)
- **Throughput**: 10,000 requests/sec per Gateway instance.
- **Latency**: <30ms P99 for sovereign node proxies.
- **Nexus Sync**: Handle 1M+ state updates per hour with <1s Merkle root propagation.
- **TVL Handling**: Scale to $10B+ TAM support.

## 6. Hiro API Compatibility Layer (Simulated)
- **Endpoint**: /v2/contracts/call-read
- **Results**:
    - Average Latency: ~1.5ms (Gateway overhead + mock response)
    - P95: 2.2ms
