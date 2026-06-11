# Conxius Platform: Enhancement Research & Recommendations (June 2026)

This report documents the research into the Render deployment surface, repository usage, and identified enhancements needed to align with the Phase 7 Sovereign Redesign and resolve existing operational issues.

## 1. Render Deployment Surface Analysis

### conxian-ui (srv-d7b0el3uibrs73b2qjg0)
- **Current Status**: Failing deployments due to port binding errors.
- **Identified Issue**: Logged error `Error: Unknown --listen endpoint scheme (protocol): 0.0.0.0:` suggests a misconfiguration in how the `PORT` or host is passed to the `serve` or `next start` command.
- **Recommendation**: Update the start command in Render to explicitly use the `PORT` environment variable without a colon prefix if using `serve`, or ensure `pnpm start` correctly binds. Ref: CON-761 completed similar work but the UI still seems to struggle.

### conxian-labs-site (srv-d8fmkcd8nd3s738pmbgg)
- **Current Status**: Active, but configured as a static site with a build command `Npm run dev` which is likely incorrect for a production build.
- **Recommendation**: Correct the build and start commands to reflect a production build (`pnpm build`) and serving the static output.

## 2. Repository Usage & Ownership Boundaries

The repository taxonomy has evolved significantly:
- **conxius-platform**: Authoritative orchestration and composition layer.
- **Externalized Services**: `conxian-ui`, `conxian-gateway`, and `conxian-nexus` are now external repositories, no longer tracked as submodules.
- **Private Ops**: `conxian-business` remains the private vault for strategy and the new `apps/control-plane` scaffold.

### Gap: Implementation Drift
- **system_audit.py** is currently broken as it expects local `services/conxian-ui` and `services/lib-conxian-core` directories.
- **Recommendation**: Refactor `system_audit.py` into a cross-repo auditor that uses GitHub APIs or cloned shallow copies to verify alignment, or move the specific logic tests into the respective service repositories.

## 3. Targeted Enhancements

### Control Plane Scaffolding (CON-770, CON-769)
- **Status**: Triage.
- **Enhancement**: Scaffold `apps/control-plane` (Next.js + TS) inside the appropriate repository (likely `conxian-business` or a new `apps/` directory here) to provide the administrative interface for the BOS (Business Operations System).

### Admin API v1 Skeleton (CON-775)
- **Status**: Triage.
- **Enhancement**: Implement the Axum-based admin API in `conxian-nexus` to support release approvals and governance decisions initiated from the control plane.

### Phase 7: Declarative NixOS Migration
- **Status**: Initial `flake.nix` and `nixos/` structure exists.
- **Enhancement**: Complete the transition from imperative secret provisioning (`provision-secrets.sh`) to declarative `sops-nix` or similar. Map current Render/GCP services into NixOS configurations for potential self-hosting on sovereign hardware.

### ZSE (Zero Secret Egress) Hardening
- **Status**: Active checks in `system_audit.py`.
- **Enhancement**: Extend ZSE checks to include automated scanning of Render environment variables and build logs to ensure no leakage of institutional secrets.

## 4. Relevant Issues for Follow-up
- **CON-735**: Remediate GitHub CI Billing (Critical for automation).
- **CON-778**: Canonical Naming Standard (Needed for repo-role clarity).
- **CON-772**: Design Admin API Contracts.
