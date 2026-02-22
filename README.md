# Conxian Platform: Master Orchestrator

The `conxius-platform` repository is the central point of orchestration for the Conxian ecosystem. It manages submodules, environment secrets, and Docker-based local development.

## 🚀 Quick Start

Ensure you have Docker and Git installed.

```bash
make init           # Initialize and update all submodules
make auth           # Provision .env with secure random secrets
make start          # Build and start the entire stack
make bench          # Run performance benchmarks
```

## 📂 Repository Structure

- **services/lib-conxian-core**: Shared Rust/TS libraries and the **Conxian Gateway**.
- **services/conxian-ui**: The primary Next.js dashboard for users.
- **services/admin-dashboard**: Internal telemetry and system monitoring.
- **ci-runner**: Infrastructure for self-hosted CI/CD runners.

## 🛠️ Management Commands

| Command | Description |
| :--- | :--- |
| `make init` | Clones and updates all submodules recursively. |
| `make auth` | Generates a `.env` file from `.env.schema` with secure keys. |
| `make start` | Starts Gateway, UI, Admin, DB, Redis, and Prometheus. |
| `make stop` | Stops and removes all containers. |
| `make update-all` | Pulls the latest `main` branches for all submodules. |
| `make logs` | Tails logs for the entire stack. |
| `make bench` | Runs the `scripts/run-benchmarks.sh` suite. |
| `make deploy` | Triggers the deployment workflow (StacksOrbit/GCP/Render). |

## 📊 Monitoring & Observability

- **Gateway API**: [http://localhost:8080/api/v1/status](http://localhost:8080/api/v1/status)
- **Conxian UI**: [http://localhost:3000](http://localhost:3000)
- **Admin Dashboard**: [http://localhost:3002](http://localhost:3002)
- **Prometheus**: [http://localhost:9090](http://localhost:9090)
- **Grafana**: [http://localhost:3001](http://localhost:3001)

## 📖 Key Documentation

- [SYSTEM_GRAPH.md](SYSTEM_GRAPH.md): Holistic architectural view.
- [SYNERGY.md](SYNERGY.md): Cross-repo workflow details.
- [ALIGNMENT.md](ALIGNMENT.md): Authority, design, and business logic standards.
- [BENCHMARKS.md](BENCHMARKS.md): Current performance metrics and targets.
- [DEPLOYMENT.md](DEPLOYMENT.md): Production deployment guide.
- [GAPS.md](GAPS.md): Analysis of technical debt and upcoming features.

## 🛡️ Security (Sentinel & Fusion)

Conxian adheres to strict security patterns:
- **Sentinel**: Automated filtering and management of secrets in CI/CD.
- **Fusion**: Unified JWT and Enclave-based authentication across all layers.

---
© 2026 Conxian Labs. Sovereign Autonomous Business.
