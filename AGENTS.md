# Agent Instructions: conxius-platform

## Operational Context
- This is a meta-repository. Most logic resides in submodules under `services/`.
- **Gateway**: The source of truth for the API is `services/lib-conxian-core/gateway`. Do NOT use the empty `services/gateway` directory.
- **Docker**: Always use `docker compose` (V2) as reflected in the `Makefile`.
- **Environment**: Use `make auth` to provision `.env` from `.env.schema`.

## Ecosystem Alignment
- **Vision**: Follow [ALIGNMENT.md](ALIGNMENT.md) and [SYNERGY.md](SYNERGY.md) for ecosystem-wide rules.
- **Theme**: "Earthy Corporate Finance" must be maintained across all UIs (Web, Mobile, TUI).
- **Bitcoin Ethos**: All work should be "Full Bitcoin Network Oriented". Prefer Bitcoin-anchored logic (burn-block-height).
- **Security**: Adhere to "Sentinel" (secret filtering) and "Fusion" (unified auth) patterns.

## Common Tasks
- **Running Tests**: Run `npm run test:run` in `services/conxian-ui` for frontend verification.
- **Gateway Dev**: Use `cargo run` in `services/lib-conxian-core/gateway`.
- **Submodule Updates**: Use `make update-all` to keep everything in sync.

## Strategic Assets
- **Contracts**: Located in the `Conxian` repository.
- **Wallet**: Located in the `conxius-wallet` repository.
- **TUI**: Located in the `stacksorbit` repository.

## Known Stubs
- Sovereign nodes (Bisq, RGB, BitVM) are currently placeholders in `docker-compose.yml`.
- Full Nexus "Glass Node" integration is in the roadmap.
