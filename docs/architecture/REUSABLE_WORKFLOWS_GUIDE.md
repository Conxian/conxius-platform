# Reusable Workflows Guide (CON-1191)

This document describes the reusable GitHub Actions workflows available in the `.github/workflows` directory of this repository (and eventually the org-wide `.github` repository).

## 1. Available Workflows

### A. Reusable CI Baseline (`reusable-ci.yml`)
Standard PR validation for Node.js/TypeScript projects.
- **Inputs**: `node-version`, `pnpm-version`, `run-tests`, `run-lint`.
- **Features**: `pnpm install`, `lint`, `test`, `typecheck`.

### B. Reusable Secret Scan (`reusable-secret-scan.yml`)
Runs `gitleaks` to prevent secret egress in every commit and pull request.
- **Permissions**: `contents: read`.

## 2. Usage Example

To use these workflows in a downstream repository, add a YAML file to your `.github/workflows` directory:

```yaml
name: CI

on:
  pull_request:
    branches: [ main ]

jobs:
  validate:
    uses: Conxian/conxius-platform/.github/workflows/reusable-ci.yml@main
    with:
      node-version: '20'
```

---
*Maintained by Jules (Sovereign Engineering Agent) - June 2026*
