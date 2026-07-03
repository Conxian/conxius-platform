# Conxian Labs: Agent Instructions (v2.0 - OpenSpec Aligned)

Welcome, Agent. You are tasked with maintaining and extending the Conxian DeFi ecosystem.

## Core Directives

1.  **OpenSpec First**: All changes must be preceded by an OpenSpec proposal or follow existing change artifacts in `openspec/changes/`.
2.  **Source of Truth**: The **Conxian Gateway** (`lib-conxian-core/gateway`) is the authoritative source for protocol state and business logic.
3.  **Bitcoin Native**: Always prioritize Bitcoin-anchored height (`burn-block-height`) and Nakamoto (Stacks 3.0/3.1) readiness.
4. **Sovereign Design Alignment**: Adhere strictly to the **Sovereign Earthy** branding (Forest Green `#2E403B`, Nakamoto Gold `#D4A017`). Follow the **Stitch Pattern** for UI/UX reviews as codified in `DESIGN.md`. All frontend changes must be "vibe-verified" for high-fidelity consistency within the Earthy Corporate identity.
5.  **Sentinel Security**: Follow zero-trust patterns. Never hardcode secrets. Use `provision-secrets.sh`.

## Implementation Patterns

- **Rust (Gateway)**: Use Actix-web for the API and `tokio` for background orchestration. Maintain modular module boundaries (Mesh, Nexus, Compliance).
- **TypeScript (UI)**: Use the consolidated `coreApi.ts` for all Gateway interactions. Ensure strict type safety and no `any` types.
- **Clarity (Contracts)**: Prioritize mathematical certainty and sBTC integration.
- **Orbit CLI (Python canonical, Node wrapper)**: The canonical CLI surface for `conxius-orbit` is Python (`conxius_orbit_cli.py`). The Node.js binary (`conxius-orbit`) is a wrapper that delegates core operations (deploy, monitor, verify, dashboard, diagnose, detect) to Python. The Node wrapper adds `config` and `wallet` commands not available in the Python surface. Automation and CI paths should target the Node binary entry point (`conxius-orbit`) as the stable user-facing contract; all deep deployment logic lives in Python.

## Documentation
Refer to `docs/architecture/ALIGNMENT.md` for strategy and `docs/architecture/SYNERGY.md` for inter-repo workflows.

### Information Hierarchy
All documentation in this repository follows a four-tier hierarchy defined in [`docs/INFORMATION_HIERARCHY.md`](./docs/INFORMATION_HIERARCHY.md). When reading or writing documentation:
- **Canonical** documents are authoritative truth sources (updated via OpenSpec proposals only).
- **Operational** documents track active execution (GAPS.md, SCORING_MATRIX.md, runbooks).
- **Evidence** documents are immutable verification artifacts.
- **Historical** documents are read-only archived materials.

Every decision area has exactly **one active reading chain** rooted in this file. Follow the chain; never short-circuit to historical or evidence layers for decision-making.

**Governance Lane Awareness**: The repository operates three governance lanes defined in [`GOVERNANCE.md`](./GOVERNANCE.md): governance baseline (policy rules), live issue-execution (active work), and historical context (read-only archive). When routing work or resolving conflicts:
- Governance baseline documents (GOVERNANCE.md, CODEOWNERS, SECURITY.md, etc.) are the final authority for policy and process questions.
- Live execution artifacts (issues, PRs, runbooks) are where you work; they derive authority from the baseline.
- Historical documents (archived-reports, archived-tasks, archived-scripts) are preserved for reference but have zero decision authority.
- If a live artifact appears to conflict with the governance baseline, the baseline wins — flag it for correction, don't work around it.

---
© 2026 Conxian Labs. Code is Law.

### Phase 6 Implementation Standards
- **AI Allocation**: Always consume `/api/v1/ai/allocation` for user-facing weightings.
- **UBI Identity**: Identity hashes must follow the `ubi:btc:{id}` format.
- **Nexus Sync**: Use `/api/v1/nexus/state` for all L1/L2 synchronization checks.

## Agent Learnings (July 2026)

### Protocol Revenue & Reward Architecture (Issue #1029)
The Conxian protocol economic model has four layers connecting revenue to reward distribution:

1. **Treasury Structure** — BTC-standard multi-layer reserve: cold storage via MuSig2/Taproot multisig, active yield via sBTC/STX L2 instruments, managed by the SFO (Sovereign Financial Office) as a read-only, non-custodial observer. Located in `services/admin-pulse-bos/src/SovereignFinancialOffice.tsx` and the admin-dashboard stub at `services/admin-dashboard/src/app/pulse-bos-stub.tsx`.

2. **Revenue/Payment Rails** — Institutional-grade AP/AR execution per `openspec/specs/fail-closed-bos-payments-apar.spec.md`. Supports ON_CHAIN, ISO_20022, and PAPSS rails with deterministic T+0 settlement. Each `RailPlan` carries `planned_fees`, and liquidity reservations cover `amount + fees + policy_buffer`.

3. **Contributor Rewards (Claim Ledger)** — Defined in `openspec/specs/contributor-claim-ledger-policy.spec.md`: 5 contribution categories with base CU (8/12/6/4/3), formula `(baseCu × impactBps × qualityBps) / 100`, 40 CU/month cap, 4 activation gates (60d mainnet stability + payout routing active + 6mo treasury runway + governance ratification), snapshot-based monetary conversion. **No TypeScript implementation exists yet** — only OpenSpec specification.

4. **Governance** — Three-lane model in `GOVERNANCE.md`: Baseline (authoritative policies) → Live Execution (issues/PRs) → Historical (read-only archive). Governance ratifies reward activation, sets the conversion pool, and controls all treasury policy.

### UI Pattern Reference
- **Admin dashboard** (`services/admin-dashboard/`): Next.js 16 + React 19, pnpm workspace, typecheck with `npx tsc --noEmit`, port 3001
- **Admin pulse BOS** (`services/admin-pulse-bos/`): Separate service for SFO rendering
- **ElizaOS plugin** (`services/elizaos-plugin-conxian/`): AI agent plugin
- Navigation links live inline in `app/layout.tsx` `<nav>` — flat `<a>` tags, no sidebar component
- Types are co-located in `src/lib/<domain>/`; barrel re-exports from module index files
- All API routes under `app/api/` protect with `validateAdminAuth()` from `@/lib/support/auth`
- Branding: Forest Green `#2E403B`, Nakamoto Gold `#D4A017`
- StatCard, ProgressBar, BadgePill are reusable UI patterns (defined locally per page, not yet extracted to shared components)

### Key Gaps Still Open
- **`revenue-automation.clar`** — referenced in `docs/runbooks/MAINTAINER_BOUNTY_RUNBOOK.md` but does not exist in the repo
- **Contributor Claim Ledger** — full CU scoring, activation gates, and snapshot conversion are spec-only; no TypeScript implementation
- **"Harvest Sovereign Yield"** — both SFO implementations use `Math.random()` stubs
- **Yield sources** defined in scoring matrix (Babylon Staking G-43, ctUSD G-22, Lightning Async Payments G-53) have no UI integration
- **Proof-carrying treasury analytics** (`openspec/changes/2026-05-12-proof-carrying-analytics-treasury-oracle/`) — defined but not implemented

### Reward Source Breakdown (Merged in #1115)
- API: `GET /api/v1/rewards/sources` → 4 revenue sources (Protocol Fees 38%, Staking Yield 28%, Treasury Yield 20%, Service Revenue 14%) mapped to 4 allocation categories (Community 40%, Governance 25%, Operations 20%, Reserve 15%), each tagged with SFO operational units
- Page: `/rewards` with revenue cards, stacked allocation bar, per-category detail cards, Labs-to-Protocol transition explainer
- Connected from steward dashboard "Rewards Standing" section and overview page "Protocol Reward Allocation" widget

## Agent Learnings (June 2026)
- **BIP-353 Resolution**: Successfully prototyped BIP-353 resolution using a DNS-to-BIP21 mapping logic. This serves as a critical bridge for human-readable Bitcoin payments.
- **Phase 7 Research Expansion**: Identified FROST, OP_CAT, and Fedimint as high-priority strategic anchors for the "Full Bitcoin Stack" vision.
- **Scoring Discipline**: Maintaining a strict Gap-to-Research scoring matrix ensures that engineering effort is prioritized according to strategic alignment and implementation readiness.

---

## Skills & Tools Reference

This section maps the agent's available skills and tools to this repository's specific infrastructure. Invoke skills via `invoke_skill(name="<skill-name>")` when the trigger conditions match.

### Always-Applicable Skills

| Skill | When to Use | Repo Trigger |
|---|---|---|
| `github` | Any GitHub API operation (issues, PRs, workflows, repo metadata) | `GITHUB_TOKEN` is always available |
| `github-actions` | Debugging CI failures, creating/modifying workflows in `.github/workflows/` | 18 workflow files present; CI is heavy |
| `agent-memory` | Persisting or retrieving knowledge from AGENTS.md | This file — append to `## Session Log` after every session |

### Development & Quality Skills

| Skill | When to Use | Repo Trigger |
|---|---|---|
| `code-review` | Rigorous PR review with risk assessment | Before merging any PR; use on `fix/*` and `feature/*` branches |
| `code-simplifier` | Refining recently modified code for clarity and consistency | After any implementation session; catch duplication like steward types |
| `qa-changes` | Functional testing of PR changes before merge | Playwright E2E configured (`playwright.config.ts`); `scripts/frontend_test.spec.ts` |
| `frontend-design` | Building UI components, pages, dashboards | Admin dashboard is Next.js + React; `/rewards`, `/steward`, `/launch` pages |
| `npm` | Installing Node packages in non-interactive CI | pnpm monorepo with `pnpm-workspace.yaml`; use `pnpm` not `npm` |
| `security` | Security review for auth, secrets handling, API routes | `gitleaks.toml` + `secret-scan.yml` workflow; `validateAdminAuth()` pattern |

### Release & Changelog Skills

| Skill | When to Use | Repo Trigger |
|---|---|---|
| `release-notes` | Generating changelog entries from git history | `CHANGELOG.md` follows Keep a Changelog; `RELEASING.md` defines process |
| `github-pr-review` | Posting inline review comments with suggestions on PRs | When conducting code reviews on PRs |
| `iterate` | Driving a PR through CI → review → QA loop until merge-ready | 18 CI workflows; PRs must pass hygiene, secret-scan, dependency-review, tests |

### Infrastructure & Deploy Skills

| Skill | When to Use | Repo Trigger |
|---|---|---|
| `docker` | Managing Docker containers, building images | `docker-compose.yml` (195 lines, multi-service); `ci-runner/Dockerfile` |
| `ssh` | Connecting to remote servers for deployment | `docs/DEPLOYMENT.md`, `scripts/validate-production-env.sh` |
| `openhands-automation` | Creating scheduled tasks, cron jobs, webhook-triggered workflows | `stale-branch-review.yml` (scheduled); webhook idempotency scripts |

### Research & Documentation Skills

| Skill | When to Use | Repo Trigger |
|---|---|---|
| `prd` | Generating Product Requirements Documents for new features | OpenSpec-first workflow; use before creating `openspec/changes/` proposals |
| `plain-english-content` | Improving readability of docs, runbooks, governance files | 14+ docs in `docs/`; runbooks in `docs/runbooks/` |
| `evidence-based-citations` | Backing claims with official sources | `docs/BITCOIN_STANDARD_RESEARCH.md`, `docs/WHITEPAPER.md` |
| `theme-factory` | Applying consistent theming to slides, docs, HTML artifacts | Sovereign Earthy branding (Forest Green + Nakamoto Gold) |

### Integration & External Service Skills

| Skill | When to Use | Repo Trigger |
|---|---|---|
| `linear` | Querying/updating Linear issues, sprints | Issues are linked from Linear (CON-#### references in issue bodies) |
| `datadog` | Querying logs, metrics, APM traces | Prometheus metrics at `/api/metrics`; alert rules in `prometheus-alerts.yml` |
| `discord` | Building Discord bots, webhooks, slash commands | Community coordination referenced in `SUPPORT.md` |
| `notion` | Creating/updating Notion pages and databases | Documentation workflows |
| `gitlab` | GitLab API interactions | `GITLAB_TOKEN` available if needed |
| `bitbucket` | Bitbucket API interactions | Auto-detects Cloud vs Data Center |

### Specialized Technical Skills

| Skill | When to Use | Repo Trigger |
|---|---|---|
| `kubernetes` | Setting up KIND clusters for local K8s testing | No existing K8s config; use only if adding K8s support |
| `jupyter` | Working with `.ipynb` notebooks for data analysis | No existing notebooks; use for treasury analytics prototyping |
| `pdflatex` | Compiling LaTeX to PDF | `docs/WHITEPAPER.md` and research docs |
| `spark-version-upgrade` | Upgrading Apache Spark between major versions | Not currently in use |
| `swift-linux` | Swift development on Linux | Not currently in use |
| `deno` | Deno runtime projects | Not currently in use |
| `uv` | Python project management with uv | Python scripts in `scripts/`; `requirements.txt` and `pyproject.toml` present |

### Sub-Agent Types (via `task` tool)

| Type | When to Use | Example |
|---|---|---|
| `code-explorer` | Understanding unfamiliar code, tracing call paths, finding all references | "Find every file that imports from @/lib/launch and trace the call chain" |
| `bash-runner` | Running tests, builds, linters, git operations, dependency installs | "Run `npx tsc --noEmit` in admin-dashboard and report any errors" |
| `general-purpose` | Multi-step tasks mixing code edits, shell commands, and tracking | "Refactor StatCard into a shared component and update all 4 pages" |
| `web-researcher` | Researching external docs, APIs, changelogs | "Research Stacks Nakamoto Release API changes for Gateway migration" |

### External Tools

| Tool | When to Use |
|---|---|
| `tavily_tavily_search` | Web search for current information — Bitcoin L2 updates, Stacks releases, BIP proposals |
| `tavily_tavily_extract` | Extracting content from specific URLs — docs, specs, RFCs |
| `tavily_tavily_research` | Comprehensive multi-source research on a topic |
| `browser_*` | Last resort for JS-required pages; prefer curl/API calls first |
| `switch_llm` | Switch to a different LLM profile for heavy reasoning or code generation tasks |

---

## Self-Enhancing Knowledge Base

This file is a **living knowledge base** that grows with every agent session. Each session appends to the `## Session Log` below.

### How agents should use this file

1. **On session start**: Read the full file. `Agent Learnings`, `Skills & Tools Reference`, and `Session Log` contain accumulated context.
2. **During session**: Reference specific sections (e.g., "per the Protocol Revenue model, allocation is 40/25/20/15").
3. **On session end**: Append a new entry to `## Session Log`. This is mandatory — it ensures the next agent starts with everything you discovered.

### Session log entry template

```
### YYYY-MM-DD — Brief Session Title
**Trigger**: (issue #, PR #, or task)
**What was done**: (concrete changes, bulleted)
**Key discoveries**: (files found, patterns uncovered, constraints)
**Files touched**: (paths modified or created)
**Gaps identified**: (what's still missing)
**Gotchas**: (anything that tripped you up)
```

### Rules
- Never summarize old logs into condensed "learnings" and delete raw entries
- Always append after every session, even small ones
- Focus on new information — don't restate the Core Directives or file structure

---

## Session Log

### 2026-07-03 — Deep Exploration: Full Repository Topography

**Trigger**: Systematic exploration of all services, workflows, and configuration
**What was done**:
- Explored all 3 services: admin-dashboard (Next.js 16), admin-pulse-bos (React 19, single component), elizaos-plugin-conxian (ElizaOS v2 plugin)
- Explored Python backend: conxian_nexus library (9 source files, adapter/SDK pattern, no web server)
- Read all 18 GitHub Actions workflows covering CI baseline, secret scanning, dependency review, hygiene guards, lifecycle gates, cross-repo integration, synergy testing, multi-env validation, release automation, stale branch review
- Read all 36 OpenSpec change proposals documenting the full history of platform evolution
- Read all Python tests (22 tests across test_citrea_adapter, test_strata_adapter, test_shadow_monitor)
- Read all 3 .env files (schema, example, production schema)
- Read Makefile (9 targets), CI runner scripts, verification scripts, NixOS flake

**Key discoveries**:

*Python backend (`conxian_nexus`)*:
- Library-only package (v0.1.0, Python >=3.11) — no CLI, no web server, no database
- Single dependency: `aiohttp>=3.9` for async JSON-RPC calls to EVM-compatible rollup nodes
- Architecture: `BaseAdapter` → `_EVMAdapterBase` (JSON-RPC over HTTP) → `CitreaAdapter` (Clementine bridge) + `StrataAdapter` (Strata Bridge)
- Shadow monitor (`ShadowMonitor`) polls multiple adapters for block/tx events with deduplication
- Types: 4 enums (RollupType, NetworkMode, MonitorMode, UndefinedEnum) + 5 dataclasses (BlockData, TransactionData, BridgeStatus, NetworkStatus, ShadowEvent)
- Bridge health is stub-based: Citrea returns 15 operators/0 locked BTC, Strata returns 8 operators
- Tests use `unittest.mock.AsyncMock` — no real RPC calls

*admin-pulse-bos service*:
- Single source file (`SovereignFinancialOffice.tsx`), React 19, lucide-react for icons
- Updated per CON-776: "Operational Units" naming (not SBCs/Cells), "totalLiquidity" (not globalSymmetry), "yieldIndexBps" (not syi), v4.2.5
- The stub in admin-dashboard (`pulse-bos-stub.tsx`) is the OLDER pre-CON-776 version — they are out of sync
- Package has `noEmit: true` — consumed as source by admin-dashboard directly
- No tests, no linting configured

*elizaos-plugin-conxian plugin*:
- @elizaos/core v2.0.0-beta.1 + zod v4, 8 typed actions
- API client wraps 8 Gateway endpoints (status, sBTC yield, AI allocation, UBI identity, cart mandates, x402 checkout, governance votes, multidimensional metrics)
- Validation features: AI allocation weights validated to sum 1.0±0.001, UBI identity validated against `/^ubi:btc:[^\s]+$/`
- Build pipeline: `tsc` with `"type": "module"` ESM output
- Tests with vitest, 3 client functions tested with mocked fetch

*CI Pipeline Architecture*:
- Reusable workflow pattern: 5 reusable workflows called by 13 entrypoint workflows
- Security: gitleaks v8.18.2 with SHA256 checksum verification, dependency-review-action@v5, pinned action versions audited weekly
- Lifecycle gates: 4 Python verification scripts run per PR (lifecycle_control_gates, bos_production_boundary, submodule_integrity, contamination_guard)
- Python 3.10/3.11, Node 22, pnpm, Rust stable toolchain
- Cross-repo MVP: Docker Compose starts db+redis, runs admin-dashboard + elizaos tests
- Synergy testing: full Docker build, health-check on port 3002, benchmark script, nightly cron
- Multi-env: 3 parallel jobs (server full-stack, cloud blueprint validation, summary aggregation)
- Release: SemVer tag validation, conventional commit changelog generation

*OpenSpec Changes (36 proposals)*:
- Templates always include: `proposal.md` (required), `tasks.md` (common), `design.md` (complex), `spec-delta.md` (spec changes), `.openspec.yaml` (config)
- Most active areas: Sovereign Computing (6 proposals), Phase 6 alignment (5 proposals), BitVM/BitVMX research (2 proposals), lifecycle/control gates (4 proposals)
- Notable unimplemented specs: BitVM2 multi-party aggregation, BitVMX high-efficiency computation, micro-frontend federation for admin dashboard
- Archive contains only 1 proposal: system-alignment-v2 from 2026-03-08

*.env files*:
- Development: 55+ vars across 8 categories (Global, Gateway, Rust Engine, Frontend, Node Services, Databases, Monitoring, CI/CD, Admin Dashboard secrets)
- Production: same structure but fail-closed defaults (lifecycle flags all `false`/`shadow`, mainnet Bitcoin)
- Admin Dashboard secrets scoped to `services/admin-dashboard/.env.admin` with `ADMIN_` prefix

**Files touched**: (read-only exploration — no code changes)

**Gaps identified**:
- `reusable-rust-ci.yml` exists but no Rust code in this repo (the Gateway/Nexus Rust modules are in separate repos)
- NixOS flake has inputs (nix-bitcoin, sops-nix) but no `nixosConfigurations` defined (all commented out)
- `admin-pulse-bos` has no tests, no linting, no build — pure source-consumed package
- SFO stub in admin-dashboard is out of sync with the canonical source in admin-pulse-bos (pre-CON-776 vs post-CON-776)
- JSON schemas in `/schemas/` have no consumers visible in this repo
- 36 OpenSpec proposals but only 1 archived — many completed proposals remain in active `changes/` directory

**Gotchas**:
- `conxian_nexus` is misspelled as package name (should be `conxian_nexus` per the git module name `conxian-nexus` in `.gitmodules`)
- CI workflows use `ubuntu-latest` (floating tag) — not pinned to a specific Ubuntu version
- Docker Compose references `conxian-ui`, `bisq`, `RGB`, `BitVM` services that are not in this repository (they're in separate repos per `REPOSITORY_TAXONOMY.md`)
- The two SFO implementations (stub vs actual) have diverged — if someone edits the stub, they're editing old code
- ElizaOS plugin has `pnpm-lock.yaml` in its own directory but the repo root also has one — potential lockfile drift

### 2026-07-03 — Reward Source Breakdown (Issue #1029)
**Trigger**: Issue #1029 — "Show reward source breakdown from protocol revenue"
**What was done**:
- Created `GET /api/v1/rewards/sources` API endpoint with 4 revenue sources and 4 allocation categories, all mapped to SFO operational units
- Created `/rewards` page with revenue source cards, stacked allocation bar, per-category detail cards, and Labs-to-Protocol transition explainer
- Added "Rewards" nav link to admin dashboard layout
- Extracted duplicated steward types into shared `lib/steward/types.ts`
- Added "View Reward Source Breakdown" link from steward dashboard Rewards Standing section
- Added Protocol Reward Allocation summary widget to overview page
- Updated AGENTS.md with protocol revenue model, skills reference, and self-enhancing KB framework
**Key discoveries**:
- Admin dashboard: Next.js 16 + React 19, pnpm workspace, inline `<a>` tag navigation, `validateAdminAuth()` on all API routes
- Types are co-located in `src/lib/<domain>/`; no centralized types directory
- Two SFO implementations use different naming conventions (OPERATIONAL_UNITS vs SBC_LIST, yieldIndexBps vs syi)
- Contributor Claim Ledger spec defines full CU scoring, activation gates, and snapshot conversion — all spec-only, no TypeScript implementation
- `revenue-automation.clar` is referenced in runbooks but does not exist in the repo
- SFO "Harvest Sovereign Yield" buttons use `Math.random()` stubs in both implementations
- Proof-carrying treasury analytics oracle is spec'd but unimplemented
**Files touched**:
- `services/admin-dashboard/src/app/api/v1/rewards/sources/route.ts` (created)
- `services/admin-dashboard/src/app/rewards/page.tsx` (created)
- `services/admin-dashboard/src/app/layout.tsx` (modified — added Rewards nav)
- `services/admin-dashboard/src/app/steward/page.tsx` (modified — shared types + Rewards link)
- `services/admin-dashboard/src/app/page.tsx` (modified — Rewards widget)
- `services/admin-dashboard/src/app/api/v1/steward/dashboard/route.ts` (modified — shared types)
- `services/admin-dashboard/src/lib/steward/types.ts` (created)
- `AGENTS.md` (comprehensive rewrite)
**Gaps identified**:
- Contributor Claim Ledger needs TypeScript implementation
- `revenue-automation.clar` needs to be created
- SFO yield harvesting needs real implementation
- All reward API data is hardcoded mock — needs on-chain treasury state integration
- Proof-carrying treasury analytics oracle needs implementation
- StatCard/ProgressBar/BadgePill could be extracted to shared components
**Gotchas**:
- Steward page and API route had fully duplicated type definitions — always check for this pattern
- Navigation is inline `<a>` tags, not a component — adding a page requires editing layout.tsx directly
- Both SFO files use different naming conventions — verify the target context before referencing units
