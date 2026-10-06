# Security Policy

## Supported Versions

Only the latest maintained release line is supported for security updates.

| Version | Supported |
| ------- | --------- |
| latest | ✅ |

## Reporting a Vulnerability

Do **not** use public issues for security reports.

Report privately using one of these channels:

1. GitHub private vulnerability reporting for the affected repository.
2. Email [security@conxian-labs.com](mailto:security@conxian-labs.com).

Please include:

- affected repository and branch
- description of the issue
- reproduction steps or proof of concept
- likely impact
- suggested mitigation if known

We will acknowledge receipt and coordinate remediation privately.

## Security expectations

- Do not commit secrets, credentials, or production-sensitive configuration.
- **Defense in Depth**: We maintain multi-layered `.gitignore` rules at both root and service levels to prevent accidental exposure of sensitive files (e.g., `.env`, `.env*.local`, `.env.admin`, `.DS_Store`, `.m2m/`, `.secrets/`, `service-key-registry.json*`).
- **Private Key & Certificate Hardening**: Private keys (`*.key`, `*.pem`, `*.p12`, `*.pfx`, `*.keystore`) and certificates (`*.crt`, `*.cer`) are strictly excluded in root and service `.gitignore` configurations and verified by automated audit tooling (`system_audit.py`).
- **M2M Key Store & Artifact Boundary**: Machine-to-machine key registries and transaction/secret stores (`.m2m/`, `.secrets/`, `service-key-registry.json*`) must never be committed to Git and are enforced recursively across root and service-level `.gitignore` rules and automated audit checks (`system_audit.py`).
- **Runtime State & Generated Artifacts Boundary**: Local runtime state files (`.sidl-state.json`, `.claims-state.json`, `.action-version-cache.json`) and build/test outputs (`node_modules/`, `dist/`, `build/`, `.next/`, `test-results/`, `playwright-report/`, `blob-report/`) are strictly excluded across all service-level `.gitignore` configurations and validated by `scripts/verify_tracked_artifacts.py` and `scripts/maintenance/system_audit.py`.
- **Environment Hygiene & Schema Preservation**: Environment template files (`.env.example`, `.env*.example`, `.env.schema`, `.env*.schema`, `.env.admin.example`) are explicitly unignored so configuration templates remain tracked without exposing live secrets.
- Rotate any exposed credentials immediately.
