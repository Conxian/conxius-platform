# Admin Pulse (BOS)

The `admin-pulse-bos` service provides administrative components for the Conxian ecosystem, focusing on fiscal orchestration and symmetry management.

## Status

**Active development.** Designated as a dev-only/supporting service for platform operations. Versioning follows the platform root `0.2.5` baseline.

## Positioning

Internal dev-only supporting surface. This service provides non-custodial administrative components for fiscal coordination; it does not take possession of customer funds or store private keys.

## Purpose

Deliver specialized administrative components and command pulses for Bitcoin-native business intelligence, yield harvesting, and fiscal coordination.

## 🏛️ Sovereign Financial Office (SFO)

The core component, `SovereignFinancialOffice.tsx`, is a command pulse for:
- **SFO (Sovereign Financial Office)**: Primary fiscal orchestrator.
- **SBC (Sovereign Business Cells)**: Managing individual business unit statuses (e.g., Conxian-Core, Nexus-Labs).
- **SYI (Sovereign Yield Index)**: Tracking and harvesting yields across the ecosystem.

## Development

```bash
# Install dependencies
pnpm install

# Run typecheck
pnpm typecheck
```

## Testing

```bash
# Run unit tests
pnpm test
```

## 🎨 Design System

- **Earthy Corporate Finance**: Aligned design language utilizing a high-contrast dark mode aesthetic with Forest Green (#2E403B) and Nakamoto Gold (#D4A017) accents.

## Support Expectations

- **Classification**: Dev-Only Supporting Surface.
- **Support Policy**: Maintained for internal developer testing and fiscal coordination experiments. See [SUPPORT.md](../../SUPPORT.md) for details.
- **Security Reporting**: Report security issues to `security@conxian-labs.com` or via GitHub Private Vulnerability Reporting per [SECURITY.md](../../SECURITY.md).

## Release Posture

- Synchronized with the platform monorepo version standard (`0.2.5`).
- Governed by [RELEASE_POLICY.md](../../RELEASE_POLICY.md) and [RELEASING.md](../../RELEASING.md).

## Governance & License

- **Governance**: Follows global [SECURITY.md](../../SECURITY.md), [CONTRIBUTING.md](../../CONTRIBUTING.md), and [CODEOWNERS](../../CODEOWNERS).
- **License**: Released under the [MIT License](../../LICENSE).

---
© 2026 Conxian Labs. Sovereign Autonomous Business.
