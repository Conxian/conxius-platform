# Client Onboarding and Unified System Installer Specification

## Why
Client setup and deployment across Gateway, Nexus, Admin Dashboard, and Enclave SDKs currently require manual environment variable coordination and lack an automated pre-flight connectivity verification harness. To ensure institutional client onboarding is seamless, deterministic, and fail-closed, a unified system installer and connectivity diagnostic engine (`installer.ts`) is required.

## Scope
- Define the enterprise client purchase, onboarding, and setup lifecycle.
- Implement `services/admin-dashboard/src/lib/support/installer.ts` supporting declarative client configuration generation, environment validation, M2M token binding, and pre-flight connectivity diagnostics.
- Implement a 6-point diagnostic harness verifying connectivity across Database (Postgres/Neon), Gateway API, Nexus Glass Node, RPC nodes (Bitcoin L1 / Stacks L2), Cache (Upstash Redis), and Enclave KMS.
- Deprecate legacy archived CLI delegation in favor of a unified `@conxian/cli` installer engine.

## Non-goals
- No custody of client funds or private key storage.
- No direct remote mutation of external client cloud infrastructure without client authorization.

## Acceptance criteria
- Declarative client setup engine validates required inputs (`CORE_DB_URI`, `BITCOIN_RPC_URL`, `STACKS_RPC_URL`, `CONXIAN_API_TOKEN`).
- Diagnostic harness checks connectivity across all 6 asset links and returns a structured health report.
- Missing or unreachable endpoints trigger fail-closed initialization with explicit diagnostic remediation advice.
- Unit tests cover installer configuration creation, M2M token binding, connectivity diagnostics, and fail-closed error states.
- OpenSpec proposal strictly passes `openspec validate`.
