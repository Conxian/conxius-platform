# Conxius Admin Dashboard

This service is the internal backend/frontend orchestration layer for the Conxian platform.

## Proposed Structure

Since this is part of `conxius-platform` (the internal backend software), it should be structured as a dedicated service:

- `src/`: Backend logic (Node.js/Rust)
- `ui/`: Enterprise Management Console (Next.js/React)
- `Clarinet.toml`: If local contract testing is needed for this service specifically.

## Initialization Recommendations

1. **Option A: Mono-repo Membership**
   Keep it as a directory in `conxius-platform/services/ admin-dashboard`.
   Run `npm init` or `npx create-next-app` here to start the UI development.

2. **Option B: Separate Repo (Recommended for Security)**
   If the admin dashboard contains highly sensitive internal logic, isolate it into a separate Git repository and include it as a git-submodule in `conxius-platform`.

## Next Steps
- [ ] Initialize `package.json`
- [ ] Define RBAC (Role Based Access Control) integration with `conxian-access.clar`
- [ ] Implement secure gRPC/REST connection to the Gateway and Nexus
