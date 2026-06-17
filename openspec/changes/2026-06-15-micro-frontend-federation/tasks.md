# Tasks: Phase 7 Micro-Frontend Federation

## Implementation checklist

- [x] Define MFE decomposition strategy (Core-Shell, Liquidity-Pulse, Settlement-Engine, Governance-Console).
- [x] Scaffold BFF API routes for `settlement-engine` and `governance-console`.
- [x] Update `telemetry` route with MFE and USI readiness signals.
- [ ] Implement Next.js Multi-Zones for route-based isolation.
- [ ] Configure Webpack/Rspack Module Federation for shared components.
- [ ] Transition `lib-conxian-core` to a shared federated module.

## Acceptance criteria (testable)

- [x] **AC-1 (BFF Scaffolding):** New BFF routes return valid JSON responses for Phase 7 modules.
- [x] **AC-2 (Readiness Signals):** Telemetry API includes `mfe_federation: "Scaffolded"` marker.
- [ ] **AC-3 (Runtime Isolation):** Different MFE zones can be deployed independently without side effects.
