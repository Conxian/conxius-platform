# @conxian/elizaos-plugin-conxian

ElizaOS plugin that exposes Conxian Gateway + SIDL social interfaces as typed actions.

## Status

**Active development.** Integrated with the Conxian Multidimensional Pulse and Gateway Engine. Versioning follows the platform root `0.2.5` standard.

## Positioning

AI agent developers and integrators. This plugin enables non-custodial interaction with Conxian protocol states and governance; it does not take possession of customer funds.

## Purpose

Enable AI agents within the ElizaOS ecosystem to interact with Conxian protocol states, treasury metrics, and governance flows.

## Config

Environment variables (or plugin `config` keys):

- `CONXIAN_GATEWAY_URL` (default: `http://localhost:8080`)
- `CONXIAN_SOCIAL_URL` (default: `http://localhost:3002`)

## Actions

- `CONXIAN_GATEWAY_STATUS`
- `CONXIAN_SBTC_YIELD`
- `CONXIAN_GET_CART_MANDATE`
- `CONXIAN_X402_CHECKOUT_CART`
- `CONXIAN_SUBMIT_VOTE`
- `CONXIAN_MULTIDIMENSIONAL_METRICS`

## Development

```bash
# Install dependencies
pnpm install

# Build plugin
pnpm build

# Typecheck
pnpm typecheck
```

## Testing

```bash
# Run tests
pnpm test
```
