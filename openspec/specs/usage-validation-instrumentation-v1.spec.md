# OpenSpec: Usage Validation Instrumentation (v1)

## 1. Status
**Draft** (June 20, 2026) - Aligned with CON-1263.

## 2. Context
Conxian requires a concrete usage-validation layer to separate external demand signals from internal assumptions. Currently, validation relies on legacy package activity and market research. This specification defines a telemetry model to capture meaningful use events across SDKs, documentation, and application entry points.

## 3. Event Model

### A. Weak Signals (Discovery)
- **Docs Page View**: Path, Referrer, User-Agent (Anonymized).
- **Package Download**: npm/crates.io registry metadata.
- **Website Interaction**: CTA clicks (e.g., "Request Pilot").

### B. Strong Signals (Activation)
- **SDK Initialization**: Version, Environment (Dev/Prod), Feature Flags.
- **First Verifiable Proof**: Successful ZK/Merkle proof generation via `lib-conxian-core`.
- **Wallet Connection**: Linking a hardware signer to the reference client.
- **BFF Call**: Usage of authenticated `/api/v1/` endpoints.

## 4. Instrumentation Logic

### SDK (TypeScript/Rust)
- Emit a `CONXIAN_ACTIVATE` event on first valid protocol interaction.
- Payload includes a cryptographic hash of the user-provided identity (to prevent PII leakage).

### Documentation (Next.js)
- Track "Time on Page" and "Code Snippet Copy" events to measure technical depth.

### Admin Dashboard / Wallet
- Heartbeat telemetry for active sessions, including "Settlement Initiated" vs "Settlement Broadcast".

## 5. Security & Privacy
- **Zero-PII**: No email, IP address, or private keys are transmitted.
- **Opt-out**: All telemetry must respect a `CONXIAN_TELEMETRY_DISABLED=1` environment variable.
- **Sentinel-Compliant**: Telemetry data is signed by the emitting service to prevent spoofing.

## 6. Routing (Linear)
- Events with high activation scores (e.g., repeating BFF calls from a new identity) are automatically routed to the Linear `CON` workspace as a **Triage** issue for partner discovery.

---
*Authored by Jules (Sovereign Engineering Agent) - June 20, 2026*
