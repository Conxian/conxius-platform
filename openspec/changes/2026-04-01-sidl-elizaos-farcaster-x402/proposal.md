# Proposal: SIDL Social Interfaces (ElizaOS + Farcaster Frames + x402)

## 1. Problem Statement
Conxian currently exposes institutional Gateway state via HTTP (`/api/v1/*`) and operational dashboards (Admin + UI), but there is no canonical, code-backed integration layer that:

- Lets ElizaOS agents query Conxian Gateway state as first-class tools.
- Exposes Farcaster Frames that surface sBTC yield signals and allow low-friction vote capture.
- Implements an x402-aligned “Cart Mandate” surface for pay-per-action social commerce.

This blocks SIDL from embedding governance and payments into community interfaces.

## 2. Proposed Solution
Implement a small, end-to-end “SIDL social surface” that attaches to existing stack components without requiring new infrastructure:

1. **ElizaOS plugin** (`services/elizaos-plugin-conxian`)
   - Provide typed actions for Gateway status, sBTC yield, vote submission, and Cart Mandate lookup/checkout.

2. **Farcaster Frames** (hosted on `services/admin-dashboard`)
   - Add two frame endpoints:
     - `/frames/sbtc` for sBTC yield monitoring.
     - `/frames/vote` for one-click voting.
   - Use Next.js `ImageResponse` to render dynamic frame images.

3. **Cart Mandates + x402 paywall** (hosted on `services/admin-dashboard`)
   - Expose a deterministic Cart Mandate JSON surface.
   - Implement an HTTP 402 flow using `PAYMENT-REQUIRED` and `PAYMENT-SIGNATURE` headers for a single checkout endpoint.

## 3. Goals
- Ship a working, locally runnable reference implementation for SIDL.
- Maintain strict type safety for new code (no `any` in new modules).
- Keep the integration modular so it can later be moved from Admin to user-facing surfaces without changing protocol semantics.

## 4. Non-goals
- Onchain settlement or production facilitator integration for x402.
- Cryptographic verification of Farcaster Frame payloads.
- External state commitments for SIDL persistence (local file-backed audit persistence is supported; Gateway/onchain commitments remain future work).

## 5. Risks & Mitigations
- **Risk**: Frames may evolve (Frames v1 vs Mini Apps v2).
  - **Mitigation**: Use standard `fc:frame:*` tags and serve `og:image` via `ImageResponse` so the endpoint remains compatible with existing clients.
- **Risk**: x402 header expectations vary by client.
  - **Mitigation**: Return a simple, documented base64 JSON `PAYMENT-REQUIRED` payload and accept `PAYMENT-SIGNATURE` as an opaque proof for local testing.
