# Conxian Repository Taxonomy & Ownership Map

This document is the **canonical source of truth** for Conxian repository inventory, ownership, and classification.

> [!NOTE]
> Keep repository inventory updates in this file first. Other docs (for example `README.md` and `SYSTEM_GRAPH.md`) should link here rather than duplicate the full inventory.

## Canonical repository inventory

| Repository | Intended audience | Visibility | Owner | Primary classification | Public purpose | Current status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| [`Conxian/.github-private`](https://github.com/Conxian/.github-private) | Internal organization administrators and security maintainers | Private | TBD (owner confirmation required; `CODEOWNERS` not found) | Organization governance (private) | Hosts private organization defaults, policy automation, and internal templates | Active (not archived; last push 2026-03-30) |
| [`Conxian/.github`](https://github.com/Conxian/.github) | Conxian maintainers and external contributors using shared templates | Public | `@Conxian/Admins` | Organization governance (public) | Provides shared community health files, issue templates, and contribution defaults | Active (not archived; last push 2026-04-18) |
| [`Conxian/Conxian`](https://github.com/Conxian/Conxian) | Protocol engineers, integrators, and auditors | Public | `@botshelomokoka`, `@admin-conxian-labs` | Flagship protocol/contracts | Implements the Stacks-native automated monetary platform core | Active (not archived; last push 2026-05-04) |
| [`Conxian/conxian_ui`](https://github.com/Conxian/conxian_ui) | Institutional dashboard users and frontend engineers | Public | `@botshelomokoka`, `@admin-conxian-labs` | Product UI | Delivers the primary web dashboard/user interface surface | Active (not archived; last push 2026-05-03) |
| [`Conxian/conxius-orbit`](https://github.com/Conxian/conxius-orbit) | DevOps engineers and release operators | Public | `@botshelomokoka`, `@admin-conxian-labs` | Deployment tooling (GUI/CLI) | Provides contract deployment and operator tooling for the ecosystem | Active (not archived; last push 2026-05-04) |
| [`Conxian/conxius-wallet`](https://github.com/Conxian/conxius-wallet) | Wallet users plus mobile/security engineers | Public | `@botshelomokoka`, `@admin-conxian-labs` | Product wallet client | Delivers sovereign wallet functionality with secure enclave signing flows | Active (not archived; last push 2026-05-05) |
| [`Conxian/conxian-labs-site`](https://github.com/Conxian/conxian-labs-site) | Public ecosystem audience, partners, and communications team | Public | `@botshelomokoka`, `@admin-conxian-labs` | Public website | Publishes Conxian Labs web presence and public-facing messaging | Active (not archived; last push 2026-05-05) |
| [`Conxian/conxian-gateway`](https://github.com/Conxian/conxian-gateway) | Backend/API engineers and integration partners | Public | `@botshelomokoka`, `@admin-conxian-labs` | Middleware/API service | Exposes middleware bridging Bitcoin/Stacks flows with institutional interfaces | Active (not archived; last push 2026-05-03) |
| [`Conxian/lib-conxian-core`](https://github.com/Conxian/lib-conxian-core) | Core protocol developers and SDK consumers | Public | `@botshelomokoka`, `@admin-conxian-labs`, `@Conxian/mobile` | Shared core library/SDK | Provides shared protocol primitives and reusable core logic | Active (not archived; last push 2026-05-03) |
| [`Conxian/conxius-platform`](https://github.com/Conxian/conxius-platform) | Platform/infrastructure engineers and operators | Public | `@conxian/core-devs` | Control plane/orchestration | Operates the local-first control plane, orchestration, and operational topology | Active (not archived; last push 2026-05-04) |
| [`Conxian/conxian-nexus`](https://github.com/Conxian/conxian-nexus) | State/indexing engineers and backend maintainers | Public | `@Conxian/core-devs`, `@botshelomokoka`, `@admin-conxian-labs` | State/indexing service | Maintains the Nexus/Glass Node API bridge and state synchronization surface | Active (not archived; last push 2026-05-03) |
| [`Conxian/conxian-business`](https://github.com/Conxian/conxian-business) | Internal leadership, strategy, legal, and operations teams | Private | `@botshelomokoka`, `@admin-conxian-labs` | Business operations (private) | Stores non-public strategic, legal, and operational documentation | Active (not archived; last push 2026-05-05) |
| [`Conxian/conxius-enclave-sdk`](https://github.com/Conxian/conxius-enclave-sdk) | Security/mobile engineers integrating hardware enclave capabilities | Public | `@botshelomokoka`, `@admin-conxian-labs` | Security/enclave SDK | Provides cross-platform enclave abstractions for sovereign computing | Active (not archived; last push 2026-05-04) |

## Narrative taxonomy (summary)

### 1. Platform, product, and protocol surfaces
- `Conxian/Conxian`
- `Conxian/conxius-platform`
- `Conxian/conxian_ui`
- `Conxian/conxius-wallet`

### 2. Infrastructure, middleware, and shared runtime
- `Conxian/conxian-gateway`
- `Conxian/conxian-nexus`
- `Conxian/lib-conxian-core`
- `Conxian/conxius-enclave-sdk`
- `Conxian/conxius-orbit`

### 3. Organization governance and operations
- `Conxian/.github`
- `Conxian/.github-private`
- `Conxian/conxian-business`

### 4. Public communications surface
- `Conxian/conxian-labs-site`

## Maintenance notes

- Visibility and activity status are based on current GitHub repository metadata.
- Owner values are taken from each repository's root `CODEOWNERS` (or `.github/CODEOWNERS`) when available.
- If ownership/classification cannot be verified confidently, use explicit conservative wording: `TBD (owner confirmation required)`.
