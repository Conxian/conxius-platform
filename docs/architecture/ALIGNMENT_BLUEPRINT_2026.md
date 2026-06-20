# Conxius Platform: Alignment & Enhancement Blueprint (Phase 7 Transition)

This blueprint synthesizes investigation findings from Linear and Render to align the Conxius Platform with the Phase 7 Sovereign Redesign goals.

## 1. Executive Summary of Alignment Findings
The platform has successfully moved the Conxian Gateway, UI, and Nexus into externalized repositories, positioning this repository (`conxius-platform`) as the **Declarative Control Plane**. However, several operational and naming drifts persist that must be remediated to achieve institutional-grade readiness.

## 2. Render Deployment Remediation
Based on logs from the **Conxian-Business** workspace:

- **conxian-ui (srv-d7b0el3uibrs73b2qjg0)**: Currently failing with `Port scan timeout`. The start command must be hardened to ensure the Next.js/serve process binds correctly to `0.0.0.0:${PORT}`.
- **conxian-labs-site (srv-d8fmr7v40ujc73b7ba8g)**: Deployment is active but uses `npm run build` (with a capitalized 'N'), leading to `command not found` errors in build logs.
- **Recommended Action**: Update Render blueprints to use `pnpm build && pnpm start` with explicit port binding.

## 3. Repository Topology & Boundaries
Aligned with **CON-769** and **CON-770**:

- **Control Plane (`conxius-platform`)**: Owns orchestration, NixOS configurations, and the local-first composition harness.
- **Runtime Middleware (`conxian-gateway`)**: Owns the BFF topology (UI-BFF, Wallet-BFF).
- **State Layer (`conxian-nexus`)**: Transitioning to Nexus OS with IVC-verifiable computation.
- **Business Ops (`conxian-business`)**: Private repository for strategic docs and the new `apps/control-plane` administrative UI.

## 4. Required Enhancements (12-Month Roadmap)
Aligned with **CON-774**:

### Q2 2026: Foundation & Boundary Hardening
- **Usage Validation Instrumentation**: Implement the first usage-validation layer across packages, docs, and app entry points (CON-1263).
- **Customer Request Intake**: Stand up the routing workflow for external signals in Linear (CON-1261).
- **Governance Lane Disambiguation**: Finalize the separation of historical context from live execution truth (CON-1258).
- **Refactor `system_audit.py`**: Transition from local file checks to a cross-repo auditor using shallow clones or GitHub APIs to verify alignment across external repositories.
- **Scaffold `apps/control-plane`**: Implement the Next.js scaffold for the internal BOS interface (CON-770).
- **Admin API Skeleton**: Add `/admin/v1` handlers to Nexus for release and governance approvals (CON-775).

### Q3 2026: Sovereign Redesign (Phase 7)
- **NixOS Migration**: Fully deprecate `provision-secrets.sh` in favor of `sops-nix` and declarative node states.
- **Local-First UI**: Port core protocol state transitions from Rust to Wasm (`lib-conxian-core`) for client-side execution.
- **Micro-Frontend Federation**: Decompose the monolithic UI into independent modules (DEX, BitVM, sBTC).

### Q4 2026 - Q1 2027: Productization & Auditing
- **Zero Secret Egress (ZSE) 2.0**: Automated scanning of cloud environment variables and build artifacts.
- **Canonical Naming Standard**: Complete the renaming of institutional jargon on public UI surfaces to standard DeFi terminology (CON-776).
- **Audit Readiness**: Finalize the Root-to-Leaf KPI Scorecard and Risk Register for partner review.

## 5. Strategic Alignment (Sovereign Earthy v4)
All future enhancements must adhere to:
- **Branding**: Forest Green (#2E403B) and Nakamoto Gold (#D4A017).
- **Authority**: Anchored to Bitcoin `burn-block-height`.
- **Trust**: Local-first, client-side validation, and PSBT hand-offs.

---
*Prepared by Jules (Sovereign Computing Agent) - June 20, 2026*
