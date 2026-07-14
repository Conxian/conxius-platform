# Admin Pulse (BOS)

The `admin-pulse-bos` service provides administrative components for the Conxian ecosystem, focusing on fiscal orchestration and symmetry management.

## Status

**Active development.** Designated as a dev-only/supporting service for platform operations. Versioning follows the platform root `0.2.5` standard.

## Positioning

Internal dev-only exception. This service provides non-custodial administrative components for fiscal coordination; it does not take possession of customer funds.

## Purpose

Deliver specialized administrative components and command pulses for Bitcoin-native business intelligence and fiscal coordination.

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
# Run tests (when configured)
pnpm test
```

## 🎨 Theme & Governance

- **Earthy Corporate Finance**: Aligned design language utilizing a high-contrast dark mode aesthetic with Forest Green (#2E403B) and Gold (#D4A017) accents.
- **Governance**: Follows global [SECURITY.md](../../SECURITY.md) and [CONTRIBUTING.md](../../CONTRIBUTING.md) guidelines.
