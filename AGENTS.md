# Agent Instructions: conxius-platform

## Operational Context
- This is a meta-repository. Most logic resides in submodules under `services/`.
- **Gateway**: The source of truth for the API is `services/lib-conxian-core/gateway`. Do NOT use the empty `services/gateway` directory.
- **Docker**: Always use `docker compose` (V2) as reflected in the `Makefile`.
- **Environment**: Use `make auth` to provision `.env` from `.env.schema`.

## Common Tasks
- **Running Tests**: Run `npm run test:run` in `services/conxian-ui` for frontend verification.
- **Gateway Dev**: Use `cargo run` in `services/lib-conxian-core/gateway`.
- **Submodule Updates**: Use `make update-all` to keep everything in sync.

## Known Stubs
- Sovereign nodes (Bisq, RGB, BitVM) are currently placeholders in `docker-compose.yml`.
- Admin Dashboard is a placeholder.

## Design Tokens
- Follow `ALIGNMENT.md` for color palette and typography.
- UI theme tokens are defined in `services/conxian-ui/src/app/globals.css`.
