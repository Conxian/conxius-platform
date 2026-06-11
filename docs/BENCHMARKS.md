# Conxius Platform: Performance Benchmarks (Updated June 2026)

## 1. Gateway Latency (Production/GCP)
- **Endpoint**: /api/v1/status
- **Environment**: Production Rust (Actix-web)
- **Results**:
    - Average Latency: ~0.8ms (High-performance Actix-web)
    - Min: 0.5ms
    - Max: 1.2ms

## 2. Nexus Synchronization (Kwil Backend)
- **Merkle Root Generation**: <0.5ms
- **Leaf Insertion**: <0.1ms per leaf
- **ZKP Verification (IVC Mock)**: <1.0ms
- **Sync Status**: 100% (Real-time tracking enabled)

## 3. Build Performance (Local Context)
- **Admin Dashboard (Next.js 16)**:
    - Production Build: ~14s (Verified)
    - Dev Startup: ~2s
- **ElizaOS Plugin (TypeScript)**:
    - Build: ~5s

## 4. Resource Usage (Idle)
- **Gateway**: ~15MB RAM
- **Admin Dashboard**: ~150MB RAM
- **ElizaOS Plugin**: ~80MB RAM

## 5. Targets (2026 Roadmap)
- **Throughput**: 10,000 requests/sec per Gateway instance.
- **Latency**: <30ms P99 for sovereign node proxies.
- **Nexus Sync**: Handle 1M+ state updates per hour with <1s Merkle root propagation.
- **TVL Handling**: Scale to 0B+ TAM support.

## 6. Hiro API Compatibility Layer (Simulated)
- **Endpoint**: /v2/contracts/call-read
- **Results**:
    - Average Latency: ~1.5ms (Gateway overhead + mock response)
    - P95: 2.2ms
