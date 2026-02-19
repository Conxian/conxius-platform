# conxius-platform

The master control center and operational engine for the Conxian DeFi sovereign autonomous system.

## Alignment & Status

- **Strategy**: See [ALIGNMENT.md](ALIGNMENT.md) for business logic and design authority.
- **Operational Status**: See [GAPS.md](GAPS.md) for current stubs and known issues.
- **Performance**: See [BENCHMARKS.md](BENCHMARKS.md) for latency and build metrics.

## Overview

This meta-repository orchestrates the Conxian ecosystem using Git submodules and Docker Compose. It serves as the home for centralized configuration and self-hosted CI/CD infrastructure.

## Getting Started

### Prerequisites

- Docker (with Compose V2)
- GitHub CLI (`gh`)
- Git

### Quick Start

1.  **Clone the repository with submodules:**
    ```bash
    git clone --recursive https://github.com/Conxian/conxius-platform.git
    cd conxius-platform
    ```

2.  **Initialize environment and authenticate:**
    ```bash
    make init
    make auth
    ```
    *Note: `make auth` will prompt you to log in via GitHub CLI to fetch organization secrets and generate local secure keys.*

3.  **Start the platform:**
    ```bash
    make start
    ```

## Service Architecture

- **Gateway**: Unified API and Auth entry point (Rust/Axum). Located in `services/lib-conxian-core/gateway`.
- **Lib-Conxian-Core**: Shared Rust primitives and TypeScript libraries.
- **Conxian UI**: Primary Next.js dashboard.
- **Sovereign Nodes**: Integrated Bisq, RGB, and BitVM nodes (Placeholders).

## CI/CD Runner

The `ci-runner/` directory contains the configuration for deploying a self-hosted GitHub Actions runner capable of orchestrating the entire stack via Docker-in-Docker.

## Maintenance

- Update all services: `make update-all`
- Stop the stack: `make stop`
- View logs: `make logs`

## Security

This repository enforces a Zero-Trust local development flow. Secrets are never committed to Git. The `scripts/provision-secrets.sh` script ensures that every developer has a secure, authenticated environment.
