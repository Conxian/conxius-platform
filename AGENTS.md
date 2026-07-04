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


## Repository Knowledge Graph (Full Synthesis — July 2026)

This section is the canonical cross-reference of every system, type, API, document, and relationship in the repository. Generated from exhaustive deep-reads of all 150+ documentation files, 63 source files, 22 scripts, 19 CI workflows, and 7 specs.

### Complete Type System Map

**Governance Types:** Vote, Delegation, PolicyActivity, StewardProfile (6 roles), GovernanceBadge (10 badges, 4 categories, 4 tiers), ParticipationStreak, RecentVotingActivity, GovernanceParticipation

**Treasury Types:** FundingTier (3), AllocationCategory (4), OperationalUnit (4), FundedRoleDefinition (8 roles), FundedRoleAssignment, TreasuryFundedRoleProfile, PayoutRecord, ActivityRecord (7 activity types), FundedRoleHistory

**SIDL Types:** FarcasterFrameActionPayload, YieldSnapshot, VoteChoice/Receipt/Tally, SidlProposal, VoteEvent, CartItem/Mandate, X402PaymentRequired, CheckoutEvent/LifecycleState, ErpDashboardData, CrossChainEvent, EventBusState, OperatorEntry/Registry

**Steward Types:** PointsData, ReputationData, StakingData, StewardDashboard

**Launch Types:** MintedTokenEntry, ContributorProfile, ContributionData, CommunityStats, 6 ContributorLevels

### Complete API Surface (26 admin routes + 2 public frames)

All admin routes gated by validateAdminAuth(). Public: /frames/vote, /frames/sbtc (Farcaster).
Key routes: /api/v1/governance/funded-roles, /api/v1/governance/funded-roles/history, /api/v1/rewards/sources, /api/v1/steward/dashboard, /api/multidimensional/metrics, /api/v1/settlement-engine

### 8 Funded Roles (1M-25M sats/month range)

Protocol Operator (5M active), Frontend Operator (3M), Governance Delegate (4M), Policy Steward (4M), Community Steward (4M), Council Member (12M), Security Guardian (6M), Treasury Custodian (8M)

### 10 Governance Badges

first-vote, consistent-voter, vote-streak-10, vote-streak-25, delegate, policy-author, guardian, council, policy-shaper, community-pillar

### 6 Contributor Levels

Newcomer(0)→Contributor(1)→Regular(2)→Core(3)→Champion(4)→Steward(5)

### 19 CI Workflows

5 reusable: ci, dependency-review, hygiene, rust-ci, secret-scan. 14 entrypoint: ci, hygiene, hygiene-drift-guard, secret-scan, dependency-review, lifecycle-control-gates, bos-production-guard, cross-repo-integration-mvp, multi-env-test, synergy-test, release, stale-branch-review, action-version-audit

### Documentation Hierarchy (4 tiers)

Tier 0 Canonical (specs, schemas, GOVERNANCE) → Tier 1 Architectural (docs/architecture, AGENTS) → Tier 2 Operational (runbooks, GAPS, SCORING_MATRIX) → Tier 3 Historical (archived-*)

### Key Cross-References

- Funded Roles ↔ Rewards: allocation categories match (community/governance/operational/treasury-reserve)
- Funded Roles ↔ Steward: eligibility uses StewardProfile + badges + contributor level + votes
- Multidimensional ↔ Treasury: metrics API returns treasury dimension; history API adds TreasuryDataLink
- SIDL ↔ Governance: vote recording flows through stateStore → API routes → observability wrapper
- Bitcoin Stack: bip322, nwc, ark, bitvm/bitvm3/bitvmx, zkcp, dns-payments, solver — all in lib/support/

### 7 Reusable Patterns

1. Gateway-first with fallback 2. observeSidl wrapper 3. File-based state persistence 4. Weighted scoring 5. validateAdminAuth guard 6. Inline <a> tag navigation 7. Dual-module pattern (src/governance/ + lib/governance/)

### Critical Gaps

NixOS transition (in progress), Local-first UI Wasm (in progress), MFE Federation (scaffolded), Contributor Claim Ledger (spec-only), Proof-carrying treasury analytics (spec-only), SFO yield harvesting (Math.random() stubs)

### Cross-Repo Dependencies (Conxian Org — 14 repos total)

| Repo | Language | Role | Status |
|------|----------|------|--------|
| `conxian-gateway` | Rust | Gateway backend (CORE_API_URL target) — bitcoin, ISO 20022, rusqlite | Active |
| `Conxian` | Clarity | Smart contracts: DEX, vault, dimensional-core, oracle, circuit-breaker | Active |
| `conxian_ui` | TypeScript | dApp UI: Next.js + @stacks/auth, liquidity pools, swaps | Active |
| `conxian-nexus` | Rust | Glass Node: chain observation, sync, verification proofs | Active |
| `lib-conxian-core` | Rust | Shared protocol primitives (consumed by gateway + nexus) | Active |
| `conxius-enclave-sdk` | Rust | Hardware enclave SDK: musig2, bdk_wallet, bitcoin 0.33-beta | Active |
| `conxius-orbit` | Python | GUI/CLI deployment toolkit for Stacks contracts | Active |
| `conxius-wallet` | TypeScript | Android-first sovereign wallet (offline-first, Wormhole/NTT) | Active |
| `conxian-labs-site` | HTML | Marketing site at www.conxian-labs.com | Active |
| `conxian-business` | TypeScript | Private strategy/legal/ops vault | Private |
| `.github` | Python | Public defaults and documentation guidance | Active |
| `.github-private` | — | Internal engineering map/guide | Private |
| `demo-repository` | HTML | Investor demo | Private |

Note: conxian-labs is NOT a GitHub org — it only exists as conxian-labs.com. conxian.org is unreachable.

### Test Coverage: 22 test files, ~161 tests

Governance: 4 files/~40 tests. SIDL: 3/~25. Support: 5/~30. Bitcoin stack: 5/~35. Python: 3/22. E2E: 1/1.

### Environment Variables

CORE_API_URL / CONXIAN_GATEWAY_URL / GATEWAY_PORT (same Gateway, 3 names). ADMIN_DASHBOARD_API_KEY for auth. GATEWAY_JWT_SECRET + GATEWAY_ADMIN_API_KEY defined but unused by clients.

## Session Log

### 2026-07-04 — Funded Roles Payout & Activity History + Multidimensional Enhancement (#1035, #1121)

**Trigger**: Issue #1035 — "Add payout and activity history for funded community roles"
**What was done**:
- Added `PayoutRecord`, `ActivityRecord`, `FundedRoleHistory` types to `src/governance/treasury.ts` (source of truth + admin-dashboard lib copy)
- Added 5 historical payouts and 8 activity events as fixture data with `buildFundedRolesHistory()` helper
- Created `GET /api/v1/governance/funded-roles/history` API endpoint with grand total summary
- Created `/funded-roles/history` page with per-role tabbed timeline (payouts + activities), grand total summary card, and transparency disclosure
- Added "Funded Roles" nav link to admin dashboard layout and cross-link from funded-roles overview page
- Opened PR #1121 against main

**Key discoveries**:
- Treasury module (`src/governance/treasury.ts`) is duplicated verbatim in `services/admin-dashboard/src/lib/governance/treasury.ts` — any type addition must touch both files
- Funded roles page uses inline `<a>` tag navigation, not a component — adding nav links requires editing `layout.tsx` directly
- All API routes use `validateAdminAuth()` from `@/lib/support/auth` as guard
- The governance types module has 3 layers: `types.ts` (core governance), `treasury.ts` (funded roles + allocation), `badges.ts` (badge computation) — all barrel-exported through `index.ts`

**Files touched**:
- `src/governance/treasury.ts` (modified — new types, fixture data, build function)
- `src/governance/index.ts` (modified — new exports)
- `services/admin-dashboard/src/lib/governance/treasury.ts` (modified — synced from source)
- `services/admin-dashboard/src/app/api/v1/governance/funded-roles/history/route.ts` (created)
- `services/admin-dashboard/src/app/funded-roles/history/page.tsx` (created)
- `services/admin-dashboard/src/app/funded-roles/page.tsx` (modified — added history CTA)
- `services/admin-dashboard/src/app/layout.tsx` (modified — added Funded Roles nav)

**Gaps identified**:
- No shared chart/visualization component exists — each page builds SVG/div charts inline
- History data is hardcoded fixture — needs on-chain treasury state integration
- No query/filter capabilities on history API — no date range, role, or category filtering
- No data linking between payout history and treasury metrics (multidimensional dimension)

### 2026-07-04 — Multidimensional Architecture Deep-Dive & Knowledge Base Enhancement

**Trigger**: Research expansion into data linking, dynamic graphing, and query techniques
**What was done**:
- Explored full multidimensional architecture: 4 data dimensions (Treasury, AI Agents, L2 Settlements, UBI Distribution)
- Traced data flow: Gateway/Nexus/Stacks/Bitcoin → SIDL layer → API routes → Frontend
- Analyzed scoring/linking patterns: ERC-7683 solver ranking (Reputation 40%/Fee 40%/Latency 20%), usage event scoring (strong/weak signals), platform metrics (C_R, O_C, V_X, A_S, N_E)
- Mapped FDC3 interoperability: CJCS→FDC3 context mapping, intent resolution → USI actions

**Key discoveries**:
- The multidimensional pulse merges 4 independent data sources into a unified real-time dashboard at `/multidimensional`
- Platform metrics spec defines 5 canonical metrics: C_R (Correctness Rate), O_C (Operational Capacity), V_X (Variability Index), A_S (Availability Score), N_E (Normalized Efficiency)
- 54 tracked gaps (G-01 through G-54) in `docs/SCORING_MATRIX.md` with readiness tiers
- Phase 7 BFF topology has 5 specialized BFFs: UI-BFF, Wallet-BFF, Settlement-Engine-BFF, Governance-Console-BFF, Nostr-Proxy
- SIDL observability wraps every API handler with latency/error metrics collection
- FDC3 console maps CJCS job types (DEX_SWAP→instrument, SETTLEMENT→contact) to FDC3 contexts and intents
- `scripts/verify_multidimensional_alignment.py` validates route existence and ElizaOS integration

**Data linking patterns identified for reuse**:
- **Gateway-first with fallback**: `fetchGateway<T>(path)` attempts Gateway API, falls back to hardcoded data — used in rewards API, applicable to history
- **Cross-dimensional correlation**: Multidimensional metrics aggregate 4 dimensions; history data can be enriched with treasury metrics for payout-to-budget ratios
- **Observability chaining**: `observeSidl(fn, context)` pattern can wrap history queries for latency/error tracking
- **Score-based triage**: Usage validation scores events to determine triage eligibility — applicable to activity significance ranking

**Gaps identified**:
- No shared SVG/Canvas chart component — every visualization is built inline
- History API has no filtering (date range, role, category, activity type)
- No time-series aggregation (payout trends over months, activity volume by week)
- No cross-referencing between payout data and treasury reserves/multidimensional metrics



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

### 2026-07-03 — Gap Audit Remediation: Immediate + Short-Term Fixes
**Trigger**: Executed the plan from `.agents_tmp/PLAN.md` gap audit
**What was done**:
- **T3-1**: Synced SFO stub (`pulse-bos-stub.tsx`) with canonical source (`SovereignFinancialOffice.tsx` v4.2.5). Updated naming: `SBC_LIST` → `OPERATIONAL_UNITS`, `selectedSBC` → `selectedUnit`, `syi` → `yieldIndexBps`, `globalSymmetry` → `totalLiquidity`, `Cell Intel` → `Unit Intelligence`, `Harvest Sovereign Yield` → `Harvest Yield`, `Deploy Symmetry` → `Rebalance Assets`, subtitle and header labels updated.
- **T3-4**: Archived 20 completed OpenSpec proposals from `changes/` to `changes/archive/`. 16 active + 21 archived (was 35 active + 1 archived).
- **T4-4**: Pinned all 18 `ubuntu-latest` occurrences across 16 CI workflow files to `ubuntu-24.04`. Verified zero remaining floating tags.
- **T1-1**: Fixed `MAINTAINER_BOUNTY_RUNBOOK.md` — removed references to non-existent `revenue-automation.clar` contract. Updated to reference `BOUNTY_PAYOUT_ACTIVE` env var and Gateway admin API.
- **T2-2**: Extended `gateway.ts` with reusable `fetchGateway<T>()` helper and `getTreasuryRevenue()` function targeting `GET /api/v1/treasury/revenue`. Updated rewards API route to fetch from Gateway with hardcoded fallback. Added `data_source` field (`"gateway" | "fallback"`) to response.
- **T2-7**: Replaced simulated `dns-payments.ts` with real DNS-over-HTTPS implementation. Queries Cloudflare DoH for TXT records at `_bitcoin-payment.{user}._at.{domain}` with DNSSEC validation (AD flag). Updated tests from 3 to 9 cases covering: valid BIP-353, NXDOMAIN, no TXT, invalid URI, HTTP failure, network failure, lightning: URI support.
**Key discoveries**:
- Three different env var naming conventions for same Gateway (port 8080): `CORE_API_URL` (admin dashboard), `CONXIAN_GATEWAY_URL` (ElizaOS), `GATEWAY_PORT` (platform config)
- Gateway clients don't send auth headers despite `GATEWAY_JWT_SECRET` and `GATEWAY_ADMIN_API_KEY` being defined in schema
- No `.env.admin` file exists on disk despite being referenced in `.env.schema`
- Only 4 Gateway API endpoints are consumed by clients: status, lorenzo/stats, ai/allocation, identity/ubi
**Files touched**:
- `services/admin-dashboard/src/app/pulse-bos-stub.tsx` (modified — synced to v4.2.5)
- `services/admin-dashboard/src/lib/support/dns-payments.ts` (modified — real DoH implementation)
- `services/admin-dashboard/src/tests/dnsPayments.test.ts` (modified — 9 tests covering all paths)
- `services/admin-dashboard/src/lib/sidl/gateway.ts` (modified — added fetchGateway helper + getTreasuryRevenue)
- `services/admin-dashboard/src/app/api/v1/rewards/sources/route.ts` (modified — gateway-first with fallback)
- `docs/runbooks/MAINTAINER_BOUNTY_RUNBOOK.md` (modified — removed revenue-automation.clar refs)
- `.github/workflows/*.yml` (16 files modified — ubuntu-latest → ubuntu-24.04)
- `openspec/changes/archive/` (20 new archived proposal directories)
**Gaps identified**:
- Gateway `GET /api/v1/treasury/revenue` endpoint doesn't exist yet — rewards API uses fallback until it's implemented
- DNS resolver has no integration/E2E test with a real BIP-353-enabled domain
- 15 OpenSpec proposals remain active — 7 have zero tasks completed (still planning stage)
**Gotchas**:
- The `sed -i` replacement for ubuntu-latest had to be verified separately (grep confirmed zero remaining)
- The rollback action in the runbook initially had a duplicated sentence due to edit overlap — caught and fixed
- All DNS tests require `vi.spyOn(globalThis, 'fetch')` mocks since we can't control public DNS records — this is a justified use of mocks

### 2026-07-04 — Complete Conxian Org Inventory & Cross-Repo Verification

**Trigger**: User asked to verify all repos under conxian-labs and conxian.org
**What was done**:
- Queried GitHub API for all repos under Conxian org: 14 repos total
- Verified conxian-labs is NOT a GitHub org or user — only exists as domain conxian-labs.com
- Checked conxian.org — unreachable (HTTP 000)
- Cross-referenced all repos against REPOSITORY_TAXONOMY.md — found 4 missing repos

**Complete Conxian Org Inventory (14 repos)**:

| # | Repo | Language | Size | Description |
|---|------|----------|------|-------------|
| 1 | .github | Python | 120KB | Public defaults and documentation guidance |
| 2 | .github-private | — | 67KB | Internal engineering map/guide (PRIVATE) |
| 3 | Conxian | Clarity | 85MB | Smart contracts: DEX factory, vault, dimensional core, oracle, circuit breaker |
| 4 | conxian-business | TypeScript | 3.4MB | Private strategy/legal/ops vault (PRIVATE) |
| 5 | conxian-gateway | Rust | 1.2MB | THE Gateway: Rust middleware (ISO 20022), bitcoin 0.32, secp256k1, rusqlite |
| 6 | conxian-labs-site | HTML | 13MB | Marketing site at www.conxian-labs.com |
| 7 | conxian-nexus | Rust | 6.3MB | Glass Node proof layer for Tier 1 chain observation/sync/verification |
| 8 | conxian_ui | TypeScript | 15MB | dApp UI: Next.js + @stacks/auth, DEX/liquidity pools/vault |
| 9 | conxius-enclave-sdk | Rust | 709KB | Hardware enclave SDK: musig2, bdk_wallet 3.1, bitcoin 0.33-beta |
| 10 | conxius-orbit | Python | 1.3MB | GUI/CLI deployment toolkit for Stacks contracts |
| 11 | conxius-platform | TypeScript | 1.9MB | THIS REPO: control plane |
| 12 | conxius-wallet | TypeScript | 5.5MB | Android-first sovereign wallet (offline-first, Wormhole/NTT) |
| 13 | demo-repository | HTML | 2KB | Investor demo (PRIVATE) |
| 14 | lib-conxian-core | Rust | 673KB | Shared protocol primitives |

**conxian-gateway internal structure** (the backend CORE_API_URL points to):
- cmd/gateway — binary entrypoint
- internal/engine — core engine
- internal/api — API layer
- internal/compliance — ISO 20022 compliance
- pkg/conxian-core — shared protocol types
- Dependencies: bitcoin 0.32, secp256k1 0.29, rusqlite, aes-gcm, actix-web, tokio

**conxian_ui architecture** (the dApp frontend):
- Next.js app, Stacks blockchain via Hiro API
- Smart contracts: dex-factory-v2, dex-router, vault, dimensional-core, oracle-aggregator, circuit-breaker
- Key libs: contracts.ts, core-api.ts, contract-interactions.ts, api-client.ts
- Production: static export served via 'serve' (not next start)

**conxius-enclave-sdk** (hardware enclave):
- Cargo package name: lib-conclave-sdk v0.2.0 (different from repo name!)
- Features: mock-cloud-enclave, dev-attestation-bypass
- Rust edition 2024, key deps: musig2 0.4.1, bdk_wallet 3.1, bitcoin 0.33-beta

**Taxonomy Discrepancies Found**:
- REPOSITORY_TAXONOMY.md lists 10 repos but org has 14 — missing: .github, conxian-gateway, conxian-labs-site, conxius-enclave-sdk
- conxian-ui (taxonomy) → actual name is conxian_ui (underscore not hyphen)
- Conxian (taxonomy, smart contracts) → actual name is Conxian/Conxian
- conxian-labs is NOT a GitHub org — it is a domain (conxian-labs.com)
- conxian.org is unreachable

**Domains**:
- www.conxian-labs.com — marketing site (CNAME in conxian-labs-site repo)
- conxian.org — unreachable (HTTP 000)

**Key Gotchas**:
- The Gateway (conxian-gateway) was entirely missing from the taxonomy — this is the Rust backend the platform talks to
- enclave-sdk uses lib-conclave-sdk as Cargo package name — different from repo name
- conxian_ui uses static export + serve for production, not next start
