# @conxian/elizaos-plugin-conxian

ElizaOS plugin that exposes Conxian Gateway + SIDL social interfaces as typed actions.

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
