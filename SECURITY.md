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

- do not commit secrets, credentials, or production-sensitive configuration
- **Defense in Depth**: We maintain multi-layered `.gitignore` rules at both root and service levels to prevent accidental exposure of sensitive files (e.g., `.env`, `.DS_Store`).
- **Environment Hygiene**: Prefer templates and examples (e.g., `.env.example`, `.env.admin.example`) for local environment setup.
- rotate any exposed credentials immediately
