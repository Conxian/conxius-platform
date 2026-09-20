# @conxian/elizaos-plugin-conxian

ElizaOS plugin that exposes Conxian Gateway + SIDL social interfaces as typed actions for AI agents.

## Status

**Active development.** Integrated with the Conxian Multidimensional Pulse and Gateway Engine. Versioning follows the platform root `0.2.5` baseline.

## Positioning

AI agent developers and ecosystem integrators. This plugin enables non-custodial interaction with Conxian protocol states, governance proposals, and settlement metrics; it does not take possession of customer funds or store private keys.

## Purpose

Enable AI agents within the ElizaOS ecosystem to query Gateway health, inspect sBTC treasury yield metrics, retrieve cart mandates, execute x402 checkout intents, submit governance votes, and read multidimensional telemetry.

## Configuration

Environment variables (or plugin `config` keys):

- `CONXIAN_GATEWAY_URL` (default: `http://localhost:8080`): URL of the Conxian Gateway API.
- `CONXIAN_SOCIAL_URL` (default: `http://localhost:3002`): URL of the social/SIDL coordination surface.

## Exposed Actions

- `CONXIAN_GATEWAY_STATUS`: Queries real-time operational status and version of the Conxian Gateway.
- `CONXIAN_SBTC_YIELD`: Fetches current sBTC yield metrics and treasury allocations.
- `CONXIAN_GET_CART_MANDATE`: Retrieves active cart mandate details for autonomous checkout flows.
- `CONXIAN_X402_CHECKOUT_CART`: Triggers x402-compliant settlement checkout for a cart mandate.
- `CONXIAN_SUBMIT_VOTE`: Submits a cryptographic governance vote tally on active proposals.
- `CONXIAN_MULTIDIMENSIONAL_METRICS`: Fetches cross-dimensional telemetry (BTC/sBTC, L2 settlement, UBI distribution).

## Usage

Import `conxianPlugin` and register it with your ElizaOS agent instance:

```typescript
import { conxianPlugin } from "@conxian/elizaos-plugin-conxian";
import { AgentRuntime } from "@elizaos/core";

const runtime = new AgentRuntime({
  plugins: [conxianPlugin],
  // ... runtime configuration
});
```

## Development

```bash
# Install dependencies
pnpm install

# Build plugin distribution
pnpm build

# Run type checking
pnpm typecheck
```

## Testing

```bash
# Run unit tests
pnpm test
```

## Support Expectations

- **Classification**: Integration Surface (Ecosystem Tooling).
- **Support Policy**: Supported for AI agent developers and integrators. See [SUPPORT.md](../../SUPPORT.md) for SLAs, issue routing, and communication channels.
- **Security Reporting**: Report vulnerabilities to `security@conxian-labs.com` or via GitHub Private Vulnerability Reporting per [SECURITY.md](../../SECURITY.md).

## Release Posture

- Synchronized with the platform monorepo version standard (`0.2.5`).
- Formal release promotion follows [RELEASE_POLICY.md](../../RELEASE_POLICY.md) and [RELEASING.md](../../RELEASING.md).

## Governance & License

- **Governance**: Complies with monorepo [CONTRIBUTING.md](../../CONTRIBUTING.md) and [CODEOWNERS](../../CODEOWNERS).
- **Security**: Follows global [SECURITY.md](../../SECURITY.md).
- **License**: Released under the [MIT License](../../LICENSE).

---
© 2026 Conxian Labs. Sovereign Autonomous Business.
