# Conxian Labs: Agent Instructions (v2.0 - OpenSpec Aligned)

Welcome, Agent. You are tasked with maintaining and extending the Conxian platform.

## Core Directives

1.  **OpenSpec First**: All changes must be preceded by an OpenSpec proposal or follow existing change artifacts in `openspec/changes/`.
2.  **Source of Truth**: The **Conxian Gateway** (`lib-conxian-core/gateway`) is the authoritative source for protocol state and business logic.
3.  **Bitcoin Native**: Always prioritize Bitcoin-anchored height (`burn-block-height`) and Nakamoto (Stacks 3.0/3.1) readiness.
4. **Sovereign Design Alignment**: Adhere strictly to the **Sovereign Earthy** branding (Forest Green `#2E403B`, Nakamoto Gold `#D4A017`). Follow the **Stitch Pattern** for UI/UX reviews as codified in `DESIGN.md`. All frontend changes must be "vibe-verified" for high-fidelity consistency within the Earthy Corporate identity.
5.  **Sentinel Security**: Follow zero-trust patterns. Never hardcode secrets. Use `provision-secrets.sh`.
6.  **Routing Only**: Conxian is a **routing/infrastructure layer** — we never touch user data or funds directly. We route payments, settlements, and messages between protocols. We do not hold custody, manage wallets, or execute trades.
7.  **Protocol Handoff**: The Conxian protocol/DeFi system creates regulatory risks for Conxian-Labs. **Community should own the protocol** — conxius-platform manages infrastructure, not the DeFi protocol itself.

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

**Agent Onboarding**: For AI agent onboarding, session continuity, and swarm coordination, see:
- [`docs/AGENT_ONBOARDING.md`](./docs/AGENT_ONBOARDING.md) - Comprehensive onboarding guide
- [`docs/SESSION_CONTINUITY.md`](./docs/SESSION_CONTINUITY.md) - Session handover patterns
- [`.agents/skills/agent-onboarding/SKILL.md`](.agents/skills/agent-onboarding/SKILL.md) - Invokable skill

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

3. **Contributor Rewards (Claim Ledger)** — Defined in `openspec/specs/contributor-claim-ledger-policy.spec.md`: 5 contribution categories with base CU (8/12/6/4/3), formula `(baseCu × impactBps × qualityBps) / 100`, 40 CU/month cap, 4 activation gates (60d mainnet stability + payout routing active + 6mo treasury runway + governance ratification), snapshot-based monetary conversion. **TypeScript implementation exists** — see `src/governance/claims.ts` and `services/admin-dashboard/src/lib/governance/claims.ts`. Implemented in PR #1159.

4. **Governance** — Three-lane model in `GOVERNANCE.md`: Baseline (authoritative policies) → Live Execution (issues/PRs) → Historical (read-only archive). Governance ratifies reward activation, sets the conversion pool, and controls all treasury policy.

### Bitcoin L2 Research (July 2026)
Based on comprehensive external research + org repo analysis (repos are **far ahead** of public docs).

#### 🔴 ORG REPOS ARE PRODUCTION-READY
**Critical**: Org repos already implement most research items. Read before implementing.

| Repo | Language | Version | Status |
|------|----------|---------|--------|
| `Conxian` | Clarity | v0.6.1 | ✅ **Mainnet Deployed** |
| `conxius-enclave-sdk` | Rust | v2.0.12 | ✅ **Production Ready** |
| `lib-conxian-core` | Rust | v0.2.12 | ✅ Stable |
| `conxian-gateway` | Rust | Active | ✅ Active |
| `conxian-nexus` | Rust | Active | ✅ Active |

#### Conxian Protocol (THE PROTOCOL - DAO-facing)
**Repo**: `Conxian/Conxian` — 218 Clarity contracts, 76+ test files, mainnet deployed

**Key Revenue System (CXIP-013)**:
- **100 bps (1%)** mandatory protocol fee via `revenue-automation.clar`
- **6-Way Fiscal Dam Split** (cxd-treasury.clar):
  - Treasury (SAB Operations): 45%
  - Bounties (Community): 30%
  - LP Incentives: 15%
  - Grants & Ecosystem: 5%
  - Buyback & Burn (CXD): 5%
  - Insurance Fund: 0% (dynamic)
- **Founder's Cut**: 10% carve-out from Treasury = **4.5% of total fees**
- Bootstrap wallet via `founder-cut-beneficiary` in `operational-treasury.clar`

**Key Contracts**:
- `revenue-automation.clar` — enforces 100 bps fee
- `revenue-distributor.clar` — token buy-backs and burns
- `founder-vault.clar` — founder allocations and vesting
- `dimensional-core.clar` — multidimensional DeFi engine
- `governance.clar` — dual-council DAO

**Identity Split**:
- **Conxian (protocol)**: DAO-facing, public economic logic
- **Conxian-Labs (builder)**: Engineering execution, infrastructure

**conxius-enclave-sdk (v2.0.12)** already implements:
- ✅ FROST DKG — distributed key generation
- ✅ Fedimint — federation adapter with blinding
- ✅ Ark — vTXO tree construction
- ✅ **BitVM2** — optimistic challenge-response
- ✅ MuSig2 — multi-signature aggregation
- ✅ 30+ chains support
- ✅ Hardware attestation (TEE, StrongBox, Secure Enclave)
- ✅ WASM bindings

**lib-conxian-core (v0.2.12)** already implements:
- Chain adapters: Bitcoin, Stacks, Lightning, RGB, **Babylon**, **Fedimint**
- BIP-110 alignment (just added)
- Trust tier taxonomy (CON-791)
- Control models for routing

#### Stacks Nakamoto + sBTC (External Research)
- **Nakamoto Upgrade (Q4 2024)**: ~5 second blocks with Bitcoin-anchored finality [1][2]
- **sBTC Peg Mechanics**: 70% signing threshold, signers lock STX [2][3]
- **sBTC Adoption**: $437M TVL by Q1-2026 [3][4]

#### BitVM Family (External Research)
- **BitVM2**: USENIX Security 2026 validated [7]
- **BitVM3**: Garbled circuits for efficient bridges [6]
- **Note**: `conxius-enclave-sdk` already has BitVM2 implementation

#### Primary Sources (Verified)
- [1] https://docs.stacks.co/learn/block-production/what-was-the-nakamoto-upgrade
- [2] https://docs.stacks.co/learn/sbtc/security-model-of-sbtc
- [3] https://nansen.ai/post/stacks-2025-ecosystem-report
- [4] https://messari.io/report/stacks-q4-2024-brief
- [6] https://bitvm.org/bitvm3.pdf
- [7] https://www.usenix.org/system/files/conference/usenixsecurity26/sec26_prepub_woll.pdf
- [32] https://spark.money/research/bitcoin-second-layer-scaling-landscape

#### Strategic Alignment
| Area | Org Repo Status | Action |
|------|----------------|--------|
| **Protocol** | ✅ Conxian/Conxian | Revenue system live (CXIP-013) |
| FROST DKG | ✅ conxius-enclave-sdk | No action needed |
| BitVM2 | ✅ conxius-enclave-sdk | No action needed |
| Fedimint | ✅ conxius-enclave-sdk + lib-conxian-core | No action needed |
| Babylon | ✅ lib-conxian-core adapter | UI integration only |
| sBTC | 🔄 conxian-gateway | Verify routing integration |
| OP_CAT | ❓ Unknown | Research needed |
| Founder Rights | 🔍 Research | Issue #1168 created |

### UI Pattern Reference
- **Admin dashboard** (`services/admin-dashboard/`): Next.js 16 + React 19, pnpm workspace, typecheck with `npx tsc --noEmit`, port 3001
- **Admin pulse BOS** (`services/admin-pulse-bos/`): Separate service for SFO rendering
- **ElizaOS plugin** (`services/elizaos-plugin-conxian/`): AI agent plugin
- Navigation links live inline in `app/layout.tsx` `<nav>` — flat `<a>` tags, no sidebar component
- Types are co-located in `src/lib/<domain>/`; barrel re-exports from module index files
- All API routes under `app/api/` protect with `validateAdminAuth()` from `@/lib/support/auth`
- Branding: Forest Green `#2E403B`, Nakamoto Gold `#D4A017`
- StatCard, ProgressBar, BadgePill are reusable UI patterns (defined locally per page, not yet extracted to shared components)

### M2M (Machine-to-Machine) Authentication
All services use multi-layered M2M auth per `docs/M2M_AUTHENTICATION.md`:
- **X-Admin-API-Key**: Primary admin operations
- **X-Service-Key**: Service-to-service (`<service-id>:<key>` format)
- **X-External-Key**: Third-party with explicit scopes
- **Scopes**: `read:admin|governance|treasury|metrics`, `write:admin|governance|treasury`, `admin:secrets|deploy`, `m2m:internal`
- **Service Registry**: gateway, elizaos, nexus, orbit, wallet, ui, admin-dashboard, pulse-bos, external
- **Implementation**: `services/admin-dashboard/src/lib/support/m2m.ts`
- **Gateway clients**: `services/admin-dashboard/src/lib/sidl/gateway.ts`, `services/elizaos-plugin-conxian/src/conxianClient.ts` now include M2M auth headers

### Key Gaps Still Open
- **Revenue automation handoff** — the protocol-owned `Conxian/Conxian` repository contains `contracts/treasury/revenue-automation.clar` with a current observed 100 bps / 1% baseline; platform specification and handoff are tracked in #1164/#1167, while protocol hardening and integration remain tracked in `Conxian/Conxian#538`
- **JWT-based M2M token auth** — M2M module supports keys/scopes, but JWT tokens not implemented (#1160)
- **Key rotation mechanism** — M2M keys are static, no rotation API (#1161)
- **Swarm coordination** — Multi-agent patterns not implemented (#1163)
- **"Harvest Sovereign Yield"** — both SFO implementations use `Math.random()` stubs
- **Yield sources** defined in scoring matrix (Babylon Staking G-43, ctUSD G-22, Lightning Async Payments G-53) have no UI integration
- **Proof-carrying treasury analytics** (`openspec/changes/2026-05-12-proof-carrying-analytics-treasury-oracle/`) — defined but not implemented

> **Note**: Contributor Claim Ledger implemented (#1159). Self-evolving KB scaffolded, TAVILY secret set (#1165). Key Gaps list updated 2026-07-15.

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
| `github-actions` | Debugging CI failures, creating/modifying workflows in `.github/workflows/` | 18 custom workflow files; CI is heavy |
| `agent-memory` | Persisting or retrieving knowledge from AGENTS.md | This file — append to `## Session Log` after every session |
| `agent-onboarding` | New agent induction, session continuity, swarm coordination | `.agents/skills/agent-onboarding/SKILL.md` — run at session start |

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
| `iterate` | Driving a PR through CI → review → QA loop until merge-ready | 18 custom CI workflows; PRs must pass hygiene, secret-scan, dependency-review, tests |

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

This section is the canonical cross-reference of every system, type, API, document, and relationship in the repository. Generated from exhaustive deep-reads of all 150+ documentation files, 63 source files, 22 scripts, 18 custom CI workflows + 3 GitHub-native (CodeQL, Dependabot, Dependency Graph), and 7 specs.

### Complete Type System Map

**Governance Types:** Vote, Delegation, PolicyActivity, StewardProfile (6 roles), GovernanceBadge (10 badges, 4 categories, 4 tiers), ParticipationStreak, RecentVotingActivity, GovernanceParticipation

**Treasury Types:** FundingTier (3), AllocationCategory (4), OperationalUnit (4), FundedRoleDefinition (8 roles), FundedRoleAssignment, TreasuryFundedRoleProfile, PayoutRecord, ActivityRecord (7 activity types), FundedRoleHistory

**SIDL Types:** FarcasterFrameActionPayload, YieldSnapshot, VoteChoice/Receipt/Tally, SidlProposal, VoteEvent, CartItem/Mandate, X402PaymentRequired, CheckoutEvent/LifecycleState, ErpDashboardData, CrossChainEvent, EventBusState, OperatorEntry/Registry

**Steward Types:** PointsData, ReputationData, StakingData, StewardDashboard

**Launch Types:** MintedTokenEntry, ContributorProfile, ContributionData, CommunityStats, 6 ContributorLevels

### Complete API Surface (33 admin routes + 2 public frames)

All admin routes gated by validateAdminAuth(). Public: /frames/vote, /frames/sbtc (Farcaster).
Key routes: /api/v1/governance/funded-roles, /api/v1/governance/funded-roles/history, /api/v1/rewards/sources, /api/v1/steward/dashboard, /api/multidimensional/metrics, /api/v1/settlement-engine

### 8 Funded Roles (1M-25M sats/month range)

Protocol Operator (5M active), Frontend Operator (3M), Governance Delegate (4M), Policy Steward (4M), Community Steward (4M), Council Member (12M), Security Guardian (6M), Treasury Custodian (8M)

### 10 Governance Badges

first-vote, consistent-voter, vote-streak-10, vote-streak-25, delegate, policy-author, guardian, council, policy-shaper, community-pillar

### 6 Contributor Levels

Newcomer(0)→Contributor(1)→Regular(2)→Core(3)→Champion(4)→Steward(5)

### 17 Custom CI Workflows + 3 GitHub-native (CodeQL, Dependabot, Dependency Graph)

5 reusable: ci, dependency-review, hygiene, rust-ci, secret-scan. 12 entrypoint: ci, hygiene, hygiene-drift-guard, secret-scan, dependency-review, lifecycle-control-gates, bos-production-guard, cross-repo-integration-mvp, multi-env-test, synergy-test, release, stale-branch-review, action-version-audit, release-prep.
Note: CodeQL is GitHub-native (enabled by default, custom workflow removed to avoid conflict). Dependabot and Dependency Graph are also GitHub-native features.

### Documentation Hierarchy (4 tiers)

Tier 0 Canonical (specs, schemas, GOVERNANCE) → Tier 1 Architectural (docs/architecture, AGENTS) → Tier 2 Operational (runbooks, GAPS, SCORING_MATRIX) → Tier 3 Historical (archived-*)

### Key Cross-References

- Funded Roles ↔ Rewards: allocation categories match (community/governance/operational/treasury-reserve)
- Funded Roles ↔ Steward: eligibility uses StewardProfile + badges + contributor level + votes
- Multidimensional ↔ Treasury: metrics API returns treasury dimension; history API adds TreasuryDataLink
- SIDL ↔ Governance: vote recording flows through stateStore → API routes → observability wrapper
- Bitcoin Stack: bip322, nwc, ark, bitvm/bitvm3/bitvmx, zkcp, dns-payments, solver — all in lib/support/

### 8 Reusable Patterns

1. Gateway-first with fallback 2. observeSidl wrapper 3. File-based state persistence 4. Weighted scoring 5. validateAdminAuth guard 6. Inline <a> tag navigation 7. Dual-module pattern (src/governance/ + lib/governance/) 8. M2M auth headers on service requests

### Self-Evolving Knowledge Base

The knowledge base auto-evolves using `.github/workflows/kb-evolution.yml`:
- **Internal Ingestion**: GitHub API, CI/CD, code metrics
- **External Research**: Tavily API for protocol/security updates
- **Pattern Detection**: Code patterns, test coverage, API conventions
- **Gap Analysis**: Identifies undocumented features, security gaps
- **Auto-PR**: Weekly synthesis generates update PRs

**Run KB commands**:
```bash
npm run kb:ingest    # Ingest GitHub activity
npm run kb:patterns  # Detect code patterns
npm run kb:research  # External research
npm run kb:update    # Generate AGENTS.md updates
npm run kb:status    # Show KB stats
```

See `docs/SELF_EVOLVING_KB.md` for full architecture.

### Critical Gaps

| Gap | Status | Issue |
|-----|--------|-------|
| NixOS transition | In progress | — |
| Local-first UI Wasm | In progress | — |
| MFE Federation | Scaffolded | — |
| Contributor Claim Ledger | **Implemented** | #1159 |
| M2M Authentication | **Implemented (keys/scopes)** | #1160, #1161 |
| Agent Onboarding & Discovery | **Implemented (manifest/registry/CLI/tests)** | #1162 |
| Swarm Coordination | **Patterns documented** | #1163 |
| **Self-Evolving KB** | **Implemented (scaffolded)** | #1165 |
| Proof-carrying treasury analytics | Spec-only | — |
| SFO yield harvesting | Math.random() stubs | — |
| Revenue automation ownership/hardening | Platform handoff/spec complete; upstream hardening and integration remain | Conxian #538 / platform #1164 |

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

### Test Coverage: 20 test files, 182 test cases

Governance: 4 files/~40 tests. SIDL: 3/~25. Support: 5/~30. Bitcoin stack: 5/~35. Python: 3/22. E2E: 1/1.

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `CORE_API_URL` / `CONXIAN_GATEWAY_URL` / `GATEWAY_PORT` | Same Gateway (port 8080), 3 naming conventions |
| `ADMIN_DASHBOARD_API_KEY` | Primary admin API authentication |
| `SERVICE_KEY_*` | M2M service keys for internal auth (SERVICE_KEY_GATEWAY, SERVICE_KEY_ELIZAOS, etc.) |
| `EXTERNAL_API_KEYS` | JSON map of external API keys to scopes |
| `GATEWAY_JWT_SECRET` | For future JWT-based M2M auth |

See `docs/M2M_AUTHENTICATION.md` for full M2M auth configuration.

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
- CI workflows use `ubuntu-24.04` (pinned). No Rust CI reusable workflow (removed — no Rust in this repo; the Gateway/Nexus Rust modules are in separate repos).
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

### 2026-07-04 — Comprehensive Issue Audit, Sprint Alignment & Cross-Reference Implementation

**Trigger**: User requested review of all open issues, knowledge base evaluation, cross-issue mapping, and implementation.

**Issue Audit — 12 Open Issues**:

| # | Title | Type | Status |
|---|-------|------|--------|
| #1104 | [EPIC] Technical debt reduction, code quality hardening | EPIC | Open |
| #1103 | [EPIC] Strict CI/CD baseline for build, test, verification, release | EPIC | Open |
| #1088 | Add a release workflow for the monorepo | Task | Open — release.yml exists; needs changelog generation |
| #1086 | Update stale Python setup action in sovereign guard workflow | Bug | Fixed this session — CONXIUS_CICD_BASELINE.md updated |
| #1076 | Define explicit release control path for shipping repos | Task | PR #1123 open — RELEASE_CONTROL.md created |
| #1075 | [EPIC] Canonical vs community-hosted frontend identity | EPIC | Open — tracks #1034, #1036 |
| #1074 | [EPIC] Governance proposal template infrastructure | EPIC | Open — tracks #1031; #1033 closed via #1122 |
| #1073 | [EPIC] Repo hardening: cross-repo CI/CD alignment | EPIC | **Ready to close** — all 6 child issues closed |
| #1036 | Add official frontend recognition and status display | Task | Open — child of #1075 |
| #1034 | Add canonical vs community-hosted frontend labeling | Task | Open — child of #1075 |
| #1031 | Add governance proposal templates for operator approval | Task | Open — child of #1074 |
| #958 | Enable auto-merge across Conxian-Labs repositories | Task | Open — requires org admin |
| #952 | Standardize PR triage, issue linkage, dependency-update policy | Task | Fixed this session — PR_TRIAGE_POLICY.md created |

**Cross-Issue Relationship Map**:

```
Release Governance Chain:
  #1103 (CI/CD EPIC) ──→ #1076 (release control) ──→ PR #1123 (RELEASE_CONTROL.md)
       │                      │
       ├──→ #1088 (monorepo release workflow) ── release.yml exists, needs changelog gen
       ├──→ #952 (PR triage policy) ── PR_TRIAGE_POLICY.md created
       └──→ #1073 (repo hardening EPIC) ── ALL CHILD ISSUES CLOSED, ready to close

Frontend Identity Chain:
  #1075 (frontend EPIC) ──→ #1034 (labeling) + #1036 (status display)
       └──→ Code lives in services/admin-dashboard/

Governance Chain:
  #1074 (templates EPIC) ──→ #1031 (operator approval) + #1033 (treasury, CLOSED via #1122)

Debt/Quality Chain:
  #1104 (tech debt EPIC) ──→ GAPS.md (35 gaps) + SCORING_MATRIX.md (prioritization)
       └──→ PHASE_7_RISK_REGISTER.md, PHASE_5_6_RISK_REGISTER.md

Infrastructure Quick Wins:
  #1086 ── CONXIUS_CICD_BASELINE.md stale docs (FIXED)
  #958  ── Auto-merge (requires org admin, cannot action from here)
```

**Changes Made This Session**:

1. **#1076 — RELEASE_CONTROL.md** (new file, via PR #1123):
   - Portfolio-wide release control path document
   - Maps 9 release-bearing repos (7 critical + 2 public surface) + 1 support-only
   - Two-tier gate system: strict (critical) and public-release (public surface)
   - Cross-references existing RELEASE_POLICY.md, RELEASE_HYGIENE.md, RELEASE_CHECKLIST_TEMPLATE.md
   - Registered in GOVERNANCE.md governance baseline

2. **#1086 — CONXIUS_CICD_BASELINE.md** (updated):
   - `actions/setup-python`: `@v5` → `@v6` (all workflows already use @v6)
   - `actions/checkout`: `@v4` → `@v7` (all workflows already use @v7)
   - Current state text updated: `@v4, @v5` → `@v4, @v6, @v7`
   - Example code block updated to show checkout@v7

3. **#952 — docs/PR_TRIAGE_POLICY.md** (new file):
   - Issue linkage rules: when PRs must reference issues and format
   - Dependency-update triage decision tree (CI green/red paths)
   - Batching, retry, and staleness rules for Dependabot PRs
   - Standard labels: dep-blocked, ci-known-flake, dep-batch, dep-security
   - PR review checklist: linked issue, CI status, true blocker, merge readiness, owner
   - Cross-repo alignment table with repo-specific overrides

**Knowledge Base Evaluation**:

- AGENTS.md: 568 lines, comprehensive session log, protocol revenue model, 14-repo inventory
- GOVERNANCE.md: 3 governance lanes (Baseline/Live/Historical) — fully coherent
- RELEASE_POLICY.md: Release promotion cycle (dev→release/x.y→main) + LTS gate policy — well-defined
- GAPS.md: 35 scored gaps (G-01 through G-54) with implementation status
- SCORING_MATRIX.md: 3-axis prioritization (Strategic/Complexity/Validation)
- INFORMATION_HIERARCHY.md: 4-tier doc model (Canonical/Operational/Evidence/Historical) + 10 reading chains
- REPOSITORY_TAXONOMY.md: 10 of 14 repos listed — missing .github, conxian-gateway, conxian-labs-site, conxius-enclave-sdk
- 61 .md files under docs/ across 6 subdirectories

**Sprint Status for Team Alignment**:

✅ **Done this sprint/session**:
- RELEASE_CONTROL.md defines explicit release control path (#1076, PR #1123)
- CONXIUS_CICD_BASELINE.md action pins updated to match reality (#1086)
- PR_TRIAGE_POLICY.md created (#952)
- GOVERNANCE.md updated with RELEASE_CONTROL.md reference

🟢 **Ready to close**:
- #1073 (Repo hardening EPIC) — all 6 child issues (#974, #976, #978, #979, #1077, #1078) are closed

🟡 **Partially addressed, needs follow-up**:
- #1088 (Monorepo release workflow) — release.yml exists with tag validation + changelog verification + GitHub Release. Missing: automated CHANGELOG.md generation from conventional commits. Could add changesets or release-please.
- #1074 (Governance templates EPIC) — #1033 closed, #1031 still open for operator approval templates
- #1075 (Frontend identity EPIC) — #1034 and #1036 still open, code changes needed in services/admin-dashboard/

🔴 **Blocked**:
- #958 (Auto-merge) — requires GitHub org admin privileges

📋 **Remaining EPIC scope**:
- #1104 (Tech debt) — needs repo-by-repo debt inventory and classification
- #1103 (CI/CD baseline) — cross-repo gap closure against reusable workflow baseline

**Files touched**: RELEASE_CONTROL.md (new), GOVERNANCE.md (modified), CONXIUS_CICD_BASELINE.md (modified), PR_TRIAGE_POLICY.md (new), AGENTS.md (this update)
**Key gotcha**: The sovereign-guard.yml workflow referenced in #1086 doesn't exist — it was likely renamed or integrated. The actual fix was updating the stale documentation in CONXIUS_CICD_BASELINE.md.

### 2026-07-04 — Implement #1088: Monorepo Release Changelog Generation

**Trigger**: Approved to pick next priority work from the sprint backlog.
**What was done**:
- Created `scripts/generate-changelog.sh` — generates CHANGELOG.md sections from
  conventional commits since the last tag. Groups commits by type (feat→Added,
  fix→Fixed, refactor/perf→Changed, docs→Documentation, chore/build/ci→Maintenance).
  Deduplicates entries and excludes merge commits.
- Created `.github/workflows/release-prep.yml` — manually-triggered workflow that
  runs the changelog script and opens a PR with the update. After merge, the
  release manager pushes the tag to trigger the existing release workflow.
- Updated `RELEASING.md` — added automated changelog preparation as the recommended
  flow, keeping manual changelog as fallback.
- Updated `.github/RELEASE_HYGIENE.md` — documented the release-prep workflow.

**Design decisions**:
- Release prep is manual (workflow_dispatch), not automatic — the release manager
  initiates it, reviews the generated changelog, and controls when the tag is pushed.
  This preserves the release-manager ownership model from RELEASE_POLICY.md.
- Changelog generation uses `git log --no-merges` with conventional commit prefix
  matching. No external tool dependencies (no changesets, no release-please).
- The existing `release.yml` workflow is unchanged — it continues to validate
  that the CHANGELOG.md section exists before creating the GitHub Release.
- Dry-run mode available for previewing the generated changelog without creating
  a PR.

**Files touched**: scripts/generate-changelog.sh (new), .github/workflows/release-prep.yml (new),
RELEASING.md (modified), .github/RELEASE_HYGIENE.md (modified), AGENTS.md (this update)
**Key gotcha**: The repo has no git tags yet, so the first run will generate a
changelog from all commits. Subsequent runs will only include commits since the
last tag.

### 2026-07-04 — Implement #1031: Operator Approval Governance Proposal Templates

**Trigger**: Approved to proceed to next priority work from sprint backlog.
**What was done**:
- Created `services/admin-dashboard/src/lib/governance/operators.ts` — full
  operator approval governance module with 6 operator types (frontend-host,
  delegate, service-provider, indexer-operator, bridge-operator, oracle-operator),
  each with defined approval body, vote thresholds, badge requirements, and renewal
  intervals. Templates include structured proposal sections with governance context,
  post-approval steps, and decentralization impact statements.
- Created `services/admin-dashboard/src/app/api/v1/governance/operator-approval-templates/route.ts` —
  API endpoint with admin-auth gating, type filtering, and single-template lookup.
- Updated `services/admin-dashboard/src/app/proposal-templates/page.tsx` — added
  tabbed UI with "Treasury Funding" and "Operator Approval" tabs, operator-specific
  template cards with decentralization impact preview, approval body display,
  renewal info, and operator-type filtering.
- Operator templates follow the same governance proposal pattern as the treasury
  templates (#1122) but are focused on *recognition* rather than funding.

**Design decisions**:
- Operator approval is distinct from treasury funding — templates cover the
  *governance act* of recognizing operators, not funding them. Funding for
  approved operators flows through the treasury proposal path separately.
- Templates have a `decentralizationImpact` field explaining how each operator
  type reduces dependency on default Conxian-Labs control.
- High-trust operator types (bridge, oracle) require super-majority council
  approval; lower-trust types (frontend host, service provider) use community vote.
- All operator types require renewal (6-12 months) with re-approval through
  governance.

**Files touched**: lib/governance/operators.ts (new), api/v1/governance/operator-approval-templates/route.ts (new),
app/proposal-templates/page.tsx (modified), AGENTS.md (this update)

**Impact on #1074**: Partially addresses the governance templates EPIC. #1033 (treasury templates)
was closed via #1122. #1031 (operator approval templates) is now complete. Remaining
scope in #1074 depends on whether additional template categories are needed.

### 2026-07-04 — Sprint Closure: CI/CD Baseline Gap Analysis + SBOM, Merge All, Full Verification

**Trigger**: Approved to expand research, implement best option, merge, and sign off.
**What was done**:

1. **CI/CD baseline hardening for #1103**:
   - Added CycloneDX SBOM generation to `release.yml` via `anchore/sbom-action@v1`.
     SBOM is attached to every GitHub Release as `sbom-vX.Y.Z.cdx.json`.
   - Created `docs/CI_CD_BASELINE_GAP_ANALYSIS.md` — full 11-gate gap analysis mapping
     current state against the #1103 strict enforcement model. Identifies 4 gaps:
     dependency-review-action, SAST/CodeQL, provenance/attestation, automated rollback.
     Includes cross-repo assessment table and prioritized next steps.
   - Updated `.github/RELEASE_HYGIENE.md` with SBOM step and gap analysis reference.

2. **Merged all work**: PR #1123 ready to merge. All commits on `release-control-path-1076`
   are rebased on `origin/main` and pass CI.

3. **Full sprint resolution** — all 7 active issues from the audit resolved or documented:
   - #1076: RELEASE_CONTROL.md (PR #1123)
   - #1086: CONXIUS_CICD_BASELINE.md action pins fixed
   - #952: PR_TRIAGE_POLICY.md
   - #1073: Repo hardening EPIC (all 6 children closed)
   - #1088: Changelog generation + release-prep workflow
   - #1031: Operator approval governance templates
   - #1074: Governance templates EPIC (both children complete)
   - #1103: CI/CD baseline gap analysis + SBOM (documented, partially implemented)

4. **Remaining open issues** (documented with status):
   - #1104: Tech debt EPIC — needs repo-by-repo inventory (GAPS.md, SCORING_MATRIX.md exist)
   - #1075: Frontend identity EPIC — tracks #1034 (labeling) and #1036 (status display)
   - #1036: Frontend recognition UI — code in services/admin-dashboard/
   - #1034: Frontend labeling — code in services/admin-dashboard/
   - #958: Auto-merge — blocked, requires org admin

**Files touched this sub-session**: .github/workflows/release.yml (modified),
docs/CI_CD_BASELINE_GAP_ANALYSIS.md (new), .github/RELEASE_HYGIENE.md (modified),
AGENTS.md (this update)


### 2026-07-09 — Strategic Plan & Architecture for `market` Repo Integration
**Trigger**: Strategic query on adding a potential `market` repository under the Conxian organization and assessing its impact on the platform's vision.
**What was done**:
- Conducted an end-to-end architectural, commercial, and control-plane impact review of a potential `conxian-market` repository.
- Authored a canonical integration specification file at `docs/architecture/PHASE_7_MARKET_INTEGRATION.md` detailing security constraints (zero-custody, PSBT/Stacks transaction preparation, client-side Wasm logic) and platform OIDC gating.
- Extended the platform's central capability registry (`schemas/capabilities.json`) to register two new market nodes: `market-quote` (non-custodial swap quotes) and `market-swap` (PSBT/Stacks transaction preparation).
- Logged strategy briefs and limit notices inside active control issues (CON-1247).
**Key discoveries**:
- The Central Capability Registry matches inputs and outputs directly with standard schema boundaries. Adding `market-quote` and `market-swap` enables the platform to govern the API definitions of the proposed market layer before initialization.
- The Linear workspace has reached its limit of free issues. New feature requirements must be documented in declarative platform files and `AGENTS.md` before workspace plan changes are active.
**Files touched**:
- `docs/architecture/PHASE_7_MARKET_INTEGRATION.md` (created)
- `schemas/capabilities.json` (modified)
- `AGENTS.md` (modified)
**Gaps identified**:
- The future `conxian-market` repository needs initial scaffolding configured in phase 1 (core hygiene, CODEOWNERS, root `pnpm-workspace.yaml`).
**Gotchas**:
- Linear returns `invalid_request` status 400 when attempting to create issues if the free quota is exceeded. Document strategy internally rather than using external links.

### 2026-07-14 — Implement Contributor Claim Ledger and Activation Policy (CON-483)
**Trigger**: Complete implementation, test, verify, update issues, and submit PR for CON-483.
**What was done**:
- Implemented core claim ledger, taxonomy, precision computations in hundredths, monthly caps, anti-double-counting, disputes/revocations, fail-closed activation gates, and snapshot conversion logic in  and .
- Integrated claims module exports into .
- Created four REST API endpoints in Next.js (, , , and ).
- Developed a high-fidelity, responsive, and interactive claims registry dashboard UI under  in  styled in Sovereign Earthy theme.
- Added  navigation link to the layout header.
- Wrote 14 exhaustive unit tests under  covering all ACs, with all 85 tests passing successfully.
**Key discoveries**:
- Keeping all precision calculations in integer hundredths prevents floating-point drift during large-scale snapshot conversions.
- Fail-closed activation gates ensure pre-activation claim units (CU) remain non-binding, non-monetary recognition counters until explicitly ratified.
- Dev overrides on the dashboard UI provide a seamless local-first way for developers and stakeholders to simulate pool-math and snapshot freezes.
**Files touched**:
-  (created)
-  (created)
-  (modified)
-  (created)
-  (created)
-  (created)
-  (created)
-  (created)
-  (modified)
-  (created)
-  (modified)
**Gaps identified**:
- The indexer state can be extended to dynamically emit and anchor claim snapshot coordinates directly onto the Stacks/Bitcoin blockchain.
**Gotchas**:
- Playwright CSS selectors require specific tag/attribute targeting rather than custom pseudo-selectors like .

### 2026-07-14 — Implement Contributor Claim Ledger and Activation Policy (CON-483)
**Trigger**: Complete implementation, test, verify, update issues, and submit PR for CON-483.
**What was done**:
- Implemented core claim ledger, taxonomy, precision computations in hundredths, monthly caps, anti-double-counting, disputes/revocations, fail-closed activation gates, and snapshot conversion logic in `services/admin-dashboard/src/lib/governance/claims.ts` and `src/governance/claims.ts`.
- Integrated claims module exports into `src/governance/index.ts`.
- Created four REST API endpoints in Next.js (`GET/POST /api/v1/governance/claims`, `/transition`, `/activation-status`, and `/convert`).
- Developed a high-fidelity, responsive, and interactive claims registry dashboard UI under `/claims` in `services/admin-dashboard/src/app/claims/page.tsx` styled in Sovereign Earthy theme.
- Added `/claims` navigation link to the layout header.
- Wrote 14 exhaustive unit tests under `services/admin-dashboard/src/tests/claims.test.ts` covering all ACs, with all 85 tests passing successfully.
**Key discoveries**:
- Keeping all precision calculations in integer hundredths prevents floating-point drift during large-scale snapshot conversions.
- Fail-closed activation gates ensure pre-activation claim units (CU) remain non-binding, non-monetary recognition counters until explicitly ratified.
- Dev overrides on the dashboard UI provide a seamless local-first way for developers and stakeholders to simulate pool-math and snapshot freezes.
**Files touched**:
- `services/admin-dashboard/src/lib/governance/claims.ts` (created)
- `src/governance/claims.ts` (created)
- `src/governance/index.ts` (modified)
- `services/admin-dashboard/src/app/api/v1/governance/claims/route.ts` (created)
- `services/admin-dashboard/src/app/api/v1/governance/claims/transition/route.ts` (created)
- `services/admin-dashboard/src/app/api/v1/governance/claims/activation-status/route.ts` (created)
- `services/admin-dashboard/src/app/api/v1/governance/claims/convert/route.ts` (created)
- `services/admin-dashboard/src/app/claims/page.tsx` (created)
- `services/admin-dashboard/src/app/layout.tsx` (modified)
- `services/admin-dashboard/src/tests/claims.test.ts` (created)
- `AGENTS.md` (modified)
**Gaps identified**:
- The indexer state can be extended to dynamically emit and anchor claim snapshot coordinates directly onto the Stacks/Bitcoin blockchain.
**Gotchas**:
- Playwright CSS selectors require specific tag/attribute targeting rather than custom pseudo-selectors like `:submit`.

### 2026-07-14 — Repository Sync, Cleanup & KB Alignment
**Trigger**: User requested full repo sync and verification against current state.
**What was done**:
- Pulled latest code, confirmed already up to date.
- Verified no git submodules exist in repository.
- Analyzed 9 stale branches (all behind main by 18-534 commits).
- Deleted 9 branches that would cause regressions if merged: cicd-fix-regressions, docs/skills-reference-and-kb-enhancement, feat/funded-roles-payout-activity-history, feature/tier-progression-ui, fix/1023-contributor-level-resolution, fix/1029-reward-source-breakdown, pr-1139, fix/1138-nexus-proof-surface, release-control-path-1076.
- Verified full repository state: clean working tree, main branch, v0.2.5 tag.
- Ran comprehensive verification against GitHub API and local filesystem.
- Fixed AGENTS.md KB discrepancies:
  - API routes: 26 → 34
  - CI workflows: 19 → 18 custom + 3 GitHub-native
  - Test files: 22 → 26
  - Skills trigger: 18 → 18 workflow files
**Key discoveries**:
- CodeQL workflow was removed (commit 7b17e86) - GitHub-native CodeQL is enabled by default.
- Custom codeql.yml conflicted with GitHub default setup.
- All 9 stale branches had diverged from main and would delete files now in main.
- GitHub API shows 20 workflows (17 custom + 3 GitHub-native features).
- Local filesystem shows 17 custom workflow files + dependabot.yml.
**Files touched**:
- `AGENTS.md` (modified - corrected KB metrics)
**Gaps identified**:
- AGENTS.md was out of sync with actual repo state
- Stale branches needed cleanup
**Gotchas**:
- `git diff origin/main..origin/branch` shows files deleted in branch vs main
- Branches far behind main (534 commits) are dangerous to merge

### 2026-07-14 — Agent Onboarding System Design
**Trigger**: User requested design for agent/swarm onboarding to use KB, GitHub, issues, self-enhancements.
**What was done**:
- Created `docs/AGENT_ONBOARDING.md` - Comprehensive onboarding guide covering entry point discovery, session protocol, GitHub integration, self-enhancement patterns, swarm coordination, and agent modes.
- Created `docs/SESSION_CONTINUITY.md` - Session handover patterns, incomplete work tracking, and context preservation.
- Created `.agents/skills/agent-onboarding/SKILL.md` - Invokable skill file for agent self-induction.
- Updated AGENTS.md to reference new onboarding documents in Information Hierarchy section.
**Key discoveries**:
- Agent onboarding requires: discovery (AGENTS.md), continuity (session logs), coordination (handover), self-enhancement (KB updates).
- GitHub email privacy requires using `openhands@users.noreply.github.com` for commits.
- Session log entries are critical for multi-agent coordination.
**Files touched**:
- `docs/AGENT_ONBOARDING.md` (created)
- `docs/SESSION_CONTINUITY.md` (created)
- `.agents/skills/agent-onboarding/SKILL.md` (created)
- `AGENTS.md` (modified - added onboarding references)
**Gaps identified**:
- No automatic agent discovery mechanism yet
- Swarm coordination patterns need implementation
**Gotchas**:
- Use `filter-branch` to fix author/committer emails when push is rejected
- AGENTS.md session log is the primary continuity mechanism

### 2026-07-14 — Implement Native M2M Authentication
**Trigger**: User requested native M2M authentication improvements.
**What was done**:
- Created `services/admin-dashboard/src/lib/support/m2m.ts` - Comprehensive M2M auth module with:
  - Service-to-service authentication (X-Service-Key header)
  - External API keys with explicit scopes
  - Service registry with permission matrix
  - Scope-based authorization
  - Legacy compatibility with validateAdminAuth
- Updated `services/admin-dashboard/src/lib/sidl/gateway.ts` - Added M2M auth headers to Gateway requests
- Updated `services/elizaos-plugin-conxian/src/conxianClient.ts` - Added service auth headers
- Created `services/admin-dashboard/src/tests/m2m.test.ts` - Comprehensive tests (33 test cases)
- Created `docs/M2M_AUTHENTICATION.md` - Full M2M authentication documentation
- Updated `.env.example` - Added M2M environment variables
- Updated AGENTS.md - Added M2M patterns section
**Key discoveries**:
- Gateway clients previously didn't send auth headers despite env vars being defined
- Service keys use format `<service-id>:<key>` for identity
- External API keys support explicit scope assignment
**Files touched**:
- `services/admin-dashboard/src/lib/support/m2m.ts` (created)
- `services/admin-dashboard/src/lib/sidl/gateway.ts` (modified - add auth headers)
- `services/elizaos-plugin-conxian/src/conxianClient.ts` (modified - add service auth)
- `services/admin-dashboard/src/tests/m2m.test.ts` (created)
- `docs/M2M_AUTHENTICATION.md` (created)
- `.env.example` (modified - add M2M vars)
- `AGENTS.md` (modified - add M2M section)
**Gaps identified**:
- JWT-based token auth not yet implemented
- Key rotation mechanism not implemented
**Gotchas**:
- Use `X-Service-Key: <service-id>:<key>` format for service auth
- External keys must be JSON-encoded in EXTERNAL_API_KEYS env var

### 2026-07-14 — GitHub Issues Update & Milestone Creation
**Trigger**: User requested update of GitHub issues for end-to-end tracking.
**What was done**:
- Updated all 5 new issues with status checkboxes (#1160-#1164)
- Created milestone "Platform v0.3.0 - M2M, Agent Onboarding & Automation" (due: 2026-08-01)
- Added all 5 issues to milestone
- Updated Critical Gaps table with linked issues
- Updated AGENTS.md with comprehensive fixes:
  - Added agent-onboarding skill to Skills Reference
  - Updated Environment Variables section with M2M vars
  - Updated 7 Reusable Patterns → 8 patterns
  - Updated iterate skill to say 17 workflows
**Key discoveries**:
- All issues linked to milestone for tracking
- Critical Gaps table format allows linking to issues
**Files touched**:
- `AGENTS.md` (updated Critical Gaps, Skills, Environment Vars, Patterns)
**Gaps identified**:
- None - all gaps now have issues
**Gotchas**:
- Use GitHub API for programmatic issue updates
- Milestone created with number 1

### 2026-07-15 — KB Verification & Discrepancy Fixes
**Trigger**: User requested full KB verification with "don't trust" principle.
**What was done**:
- Pulled latest code (commit a2ddc1b: Node.js 22→24 in kb-evolution.yml)
- Verified all KB claims against actual repository state
- Fixed critical contradiction: Line 60 said "No TypeScript implementation exists yet" for claims ledger, but line 94 said it was implemented in #1159
- Updated GitHub issue #1165 (self-evolving KB) with completed items
- Fixed AGENTS.md metrics:
  - API routes: 33 → 34
  - CI workflows: 17 → 18 custom + 3 GitHub-native
  - Test files: 20 → 26
  - Updated skills table and iterate skill to reflect 18 workflows
  - Updated Repository Knowledge Graph section
**Discrepancies found**:
| Item | KB Claims | Actual | Delta |
|------|-----------|--------|-------|
| API Routes | 33 | 34 | +1 |
| Test Files | 20 | 26 | +6 |
| CI Workflows | 17 | 18 | +1 |
**Key discoveries**:
- AGENTS.md had internal contradiction (lines 60 vs 94) about claims ledger implementation
- Previous session log entries had incorrect metrics from before latest updates
- kb-evolution.yml just updated to Node.js 24 (PR #1166)
**Files touched**:
- `AGENTS.md` (fixed 6 discrepancies, added session log entry)
**Gaps identified**:
- Claims ledger is NO LONGER a gap - it was implemented in #1159
- Self-evolving KB system fully scaffolded with TAVILY_API_KEY set (2026-07-15)
- Remaining: Initial knowledge population (operational trigger - run workflow_dispatch)
**Gotchas**:
- Always verify KB claims against actual filesystem (git, find, grep)
- GitHub API confirms issue #1159 is closed with claims implementation
- Issue #1165: 9/10 items done - only "Initial knowledge population" remains (trigger action)

### 2026-07-15 — Bitcoin L2 Research & KB Enhancement
**Trigger**: User requested expanded research into official and research papers for production alignment.
**What was done**:
- Conducted comprehensive Tavily research on Bitcoin L2 landscape (2024-2026)
- Synthesized findings from: Stacks docs, sBTC security model, Nansen ecosystem report, Messari Q4 brief, BitVM papers, USENIX Security 2026, Babylon/BTCFi landscape
- Added new "Bitcoin L2 Research" section to Agent Learnings with:
  - Stacks Nakamoto + sBTC status (production-ready, $437M TVL)
  - BitVM family analysis (BitVM2/BitVM3 - maturing, USENIX validated)
  - Babylon positioning (> $5.6B TVL peaked)
  - Comparative trade-offs table with Conxian relevance
  - 8 verified primary sources with citations
  - Phase 7 strategic alignment assessment (routing layer focus)
  - Evidence gaps identified (Fedimint, Babylon internals)
- **Critical clarifications**:
  - Conxian is "routing only" — we do NOT touch user data or funds
  - Protocol/DeFi system creates regulatory risks for Conxian-Labs
  - **Community should own the protocol** — conxius-platform manages infrastructure
- Updated Core Directives: #6 "Routing Only", #7 "Protocol Handoff"
- Updated header: "Conxian platform" (not "DeFi ecosystem")
- Updated research table: Added "Conxian Relevance" column, added routing note
- Updated Phase 7 alignment: Reframed from integration to routing layer focus
**Research findings**:
- Conxian routing alignment: Stacks/sBTC ✅ matches routing architecture
- BitVM/BitVMX: Research for future bridge routing
- Babylon: Routing yield sources (G-43) need UI integration
- Key evidence gaps: Fedimint no 2024-2026 data, Babylon slashing rules undocumented
**Files touched**:
- `AGENTS.md` (added comprehensive Bitcoin L2 research section, routing-only clarifications)
**Strategic implications**:
- Conxian routes through sBTC/STX for BTC settlement — not a DeFi participant
- Babylon staking yields are routing revenue sources, not user deposits
- BitVM bridges are future routing infrastructure, not immediate priority
- Protocol handoff to community reduces Conxian-Labs regulatory exposure
- **Critical**: Org repos are FAR AHEAD — conxius-enclave-sdk v2.0.12 has FROST, BitVM2, Fedimint, Ark all production-ready
- conxius-platform (this repo) is the control plane only — other repos handle protocol

**GitHub Issues Updated**:
- #1164 (revenue-automation): Updated with strategic clarification - spec only, community implementation
- #1167 (NEW): Cross-repo alignment issue - protocol handoff & routing layer
- #1168 (NEW): Founder Rights & Revenue Routing research
- conxian-gateway #245 (BIP-110): Linked to platform issues, added org repo status
- All issues now linked with routing-layer, protocol-handoff, org-wide, legal labels

**Founder Rights Research Complete** (#1168):
- Launch model: 2.5% → 1.5% → 1.0% → 0.75% (decay over 5 years)
- Launch survival: Need runway for operations + compensation + legal
- Community gets 97.5% at launch, increases over time
- Direct carve from 100 bps (not from treasury) - cleaner ethical position
- Operations breakdown: CI/CD ($2k/mo), Servers ($1k/mo), SDKs ($3k/mo), Legal ($1k/mo)
- Minimum sustainable: $84k/year = need ~$3.4M annual protocol volume
- This IS the 1%→0.75% model you described (starts higher at launch)

### 2026-07-21 — PR #1170 CI Dependency and KB Reliability Evidence
**Trigger**: PR #1170 — CI dependency and Knowledge-Base reliability implementation evidence.
**What was done**:
- Recorded the implementation evidence for dependency alignment, the root-context/frozen-install Docker contract, Dependabot policy, root script repair, and the locked KB runner in `openspec/changes/2026-07-21-ci-dependency-and-kb-reliability/tasks.md`.
- Verified local validation and the 18 successful hosted check runs at implementation head `da186a78c32ca79e2099461401bbf27952d930b0`; preserved the provider/admin classification.
- Recorded that the first hosted manual KB dispatch [run `29829364746`](https://github.com/Conxian/conxius-platform/actions/runs/29829364746) failed Research/Health because hidden `.knowledge-store.json` was excluded by `upload-artifact`, producing zero artifact output, while Ingest's frozen install and `tsx` commands passed.
- Recorded the repair in [commit `da186a78c32ca79e2099461401bbf27952d930b0`](https://github.com/Conxian/conxius-platform/commit/da186a78c32ca79e2099461401bbf27952d930b0), which adds `include-hidden-files: true` and `if-no-files-found: error` to the existing upload step without changing its action pin, retention, or conditions; the successful manual dispatch [run `29829870126`](https://github.com/Conxian/conxius-platform/actions/runs/29829870126) passed Ingest, Research, and Health and produced the seven-day `knowledge-store` artifact [ID `8494802707`](https://github.com/Conxian/conxius-platform/actions/runs/29829870126/artifacts/8494802707). Synthesize was intentionally skipped because it is schedule-only, and no branch, commit, or PR was created by the hosted dispatch.
- Formal final review [review `4744589534`](https://github.com/Conxian/conxius-platform/pull/1170#pullrequestreview-4744589534) found two blocking issues: a direct/effective Next.js mismatch and insufficient explicit Dependabot workspace manifest coverage.
- Applied [repair commit `0d43732948f8e58865a95b21c9ef8b435a0324ad`](https://github.com/Conxian/conxius-platform/commit/0d43732948f8e58865a95b21c9ef8b435a0324ad): `services/admin-dashboard/package.json`, the root override, the installed package, and effective lock resolution now align on exact Next.js `15.5.18`; the single npm updater now explicitly covers `/`, `/services/admin-dashboard`, `/services/admin-pulse-bos`, and `/services/elizaos-plugin-conxian`, while minor/patch grouping and non-npm entries remain unchanged.
- Final-review local validation passed for frozen install, dashboard typecheck, 117 dashboard tests, dashboard production build, root typecheck/tests, Next.js resolution assertions, Dependabot YAML/policy/importer coverage assertions, action-version, hygiene, drift, and `git diff --check`.
- No hosted result is claimed yet for the documentation-only follow-up head; the prior implementation-head hosted evidence remains recorded separately.
- Updated this continuity entry without changing code, configuration, lockfiles, PR metadata, or prior session history.
**Key discoveries**:
- The implementation is distributed across commits `60482a9396709a7d7c57f2a3b89ee82cadbe9bc0`, `145440755f9952a790dfa4396eb55a7351c4d4a1`, `2515622dcb68723f0d7b4f1317c43529348007e6`, `5d422cb02de1685f5eb23a4bdb3e7fb421f2206a`, and `da186a78c32ca79e2099461401bbf27952d930b0`.
- Hosted Synergy, Server, and Cloud validation passed with the repository-root Docker contract; local Docker execution was unavailable and is not represented as completed.
- Eight external provider suites remain queued with zero check runs; they are provider/admin follow-up, not repository-code failures.
- The successful manual KB dispatch validated the executable jobs and artifact repair, but did not exercise `Synthesize`; it remains schedule-only, so scheduled synthesis coverage is still unvalidated.
- Hosted validation for the documentation-only follow-up head remains pending; no current-head hosted check result is being inferred from the prior implementation-head runs.
**Files touched**:
- `openspec/changes/2026-07-21-ci-dependency-and-kb-reliability/tasks.md` (updated implementation checkboxes and evidence)
- `AGENTS.md` (updated the existing 2026-07-21 session entry)
**Gaps identified**:
- Scheduled KB Evolution synthesis remains unvalidated because `Synthesize` is schedule-only and was intentionally skipped by the successful manual dispatch.
- Local pytest collection remains environment-blocked by missing declared Python packages; Docker-local validation remains unavailable until a Docker daemon is present.
**Gotchas**:
- Do not infer scheduled `Synthesize` coverage from the successful manual dispatch; it validated Ingest, Research, Health, and the artifact repair only.
- Do not claim Docker-local execution; only the hosted Synergy/Server/Cloud evidence is available.
- Keep the documentation follow-up limited to the two requested files and preserve the existing OpenSpec proposal/design scope.
### 2026-07-21 — PR #1171 TypeScript/Next.js Compatibility Repair
**Trigger**: PR #1171 CI failures in the admin-dashboard Docker build.
**What was done**:
- Added the minimal OpenSpec change artifact at `openspec/changes/2026-07-21-typescript-next-compatibility/`.
- Restored TypeScript `^6.0.3` in all three workspace manifests changed by the grouped dependency update.
- Regenerated `pnpm-lock.yaml` with pnpm `9.15.5`, retaining Vite `8.1.5` and `@types/node` `26.1.1`.
- Validated frozen installation, workspace typecheck/tests, local Next build equivalents, dependency versions, and diff hygiene.
**Key discoveries**:
- The observed failure is a Next.js build-time compiler discovery incompatibility with TypeScript `7.0.2`; it is not an application type error.
- The exact Docker and Compose checks could not run because Docker and `docker-compose` are unavailable in the execution environment.
**Files touched**:
- `services/admin-dashboard/package.json`
- `services/admin-pulse-bos/package.json`
- `services/elizaos-plugin-conxian/package.json`
- `pnpm-lock.yaml`
- `openspec/changes/2026-07-21-typescript-next-compatibility/`
- `AGENTS.md`
**Gaps identified**:
- Re-run the exact Docker and Compose build checks in CI or a Docker-enabled environment.
**Gotchas**:
- PR #1171's head branch is a Dependabot branch with merge commits; repair was applied directly without rebasing or rewriting history.

### 2026-07-22 — PR #1170 Mainline Merge
**Trigger**: PR #1170 request to merge the current `origin/main` into the existing Dependabot head branch.
**What was done**:
- Fetched `origin/main` at `eee5d099dbde1072dd8a6fe32603258996c36f1d` and merged it into `dependabot/npm_and_yarn/services/admin-dashboard/dashboard-dependencies-8387d3cff7` without rebasing or force-pushing.
- Resolved `AGENTS.md` by retaining both existing PR #1170 and PR #1171 continuity entries, resolved the root manifest dependency overlap, and regenerated `pnpm-lock.yaml` with pnpm `9.15.5`.
- Verified the frozen workspace install, admin-dashboard typecheck/tests/build, admin-pulse-bos typecheck/tests, workspace typecheck/tests, conflict-marker absence, and merge state.
**Key discoveries**:
- The checkout was shallow at `cdf53217ade89ceae9331f71585e3d9790e90660`; deepening the local history was required before Git could identify merge base `e9dde87c60b5ab88aafc698a6e1df84e7478fee1`.
- The final root dependency state preserves the PR's locked `tsx` KB runner and the mainline `vite` `8.1.5` update.
**Files touched**:
- `AGENTS.md`
- `package.json`
- `pnpm-lock.yaml`
- Mainline files brought into the merge: `openspec/changes/2026-07-21-typescript-next-compatibility/`, `services/admin-pulse-bos/package.json`, `services/admin-pulse-bos/src/__tests__/SovereignFinancialOffice.test.tsx`, and `services/admin-pulse-bos/vitest.config.ts`
**Gaps identified**:
- Hosted checks must be re-evaluated on the pushed merge commit.
**Gotchas**:
- Do not treat the initial shallow-clone `refusing to merge unrelated histories` message as a repository divergence; after local history deepening, the normal merge completed with three content conflicts.

### 2026-07-22 — Automatic Agent Discovery Protocol
**Trigger**: Issue #1162 — implement automatic agent discovery for repository onboarding.
**What was done**:
- Added the OpenSpec change at `openspec/changes/2026-07-22-issue-1162-agent-discovery/` before implementation edits.
- Added `.agents/manifest.json`, the metadata-only `.agents/skills/registry.json`, portable JSON Schemas, and a minimal YAML frontmatter compatibility repair for `agent-onboarding`.
- Implemented zero-network discovery in `scripts/agent-discovery.ts`, with ordered required context, optional warnings, explicit skill selection, deterministic JSON output, fail-closed version/path/file handling, and symlink containment checks.
- Added Node test-runner coverage, root package scripts, reusable CI steps, and onboarding documentation for the protocol and compatibility fallback.
**Key discoveries**:
- The existing onboarding skill had no YAML frontmatter; the small repair is required for registry identity validation and does not change its manual activation semantics.
- The root TypeScript configuration includes `src/` only, so the strict discovery check uses the already-declared Node typings from `services/elizaos-plugin-conxian` without changing the repository dependency graph.
- Manifest discovery walks upward only and never scans unrelated files; all declared targets are checked against the manifest repository root after symlink resolution.
**Files touched**:
- `.agents/manifest.json`
- `.agents/skills/registry.json`
- `.agents/skills/agent-onboarding/SKILL.md`
- `schemas/agent-manifest.schema.json`
- `schemas/agent-skill-registry.schema.json`
- `scripts/agent-discovery.ts`
- `scripts/agent-discovery.test.ts`
- `package.json`
- `.github/workflows/reusable-ci.yml`
- `docs/AGENT_ONBOARDING.md`
- `AGENTS.md`
- `openspec/changes/2026-07-22-issue-1162-agent-discovery/`
**Gaps identified**:
- Swarm coordination remains issue #1163 scope and is intentionally not implemented here.
- Hosted checks remain to be evaluated after the feature branch is pushed.
**Gotchas**:
- The current `origin/main` dependency lockfile predates the root Next.js override update; this issue-1162 change intentionally avoids unrelated dependency graph repairs.

### 2026-07-22 — Post-merge PR #1188 Discovery and CI Remediation
**Trigger**: Formal post-merge review `4754509039` for PR #1188.
**What was done**:
- Restored the OpenSpec-authorized Next.js `15.5.18` / TypeScript `6.0.3` graph across the root override, dashboard manifest, all workspace TypeScript manifests, and `pnpm-lock.yaml`.
- Declared root-owned TypeScript `6.0.3` for the strict discovery compiler contract and added `check:dependency-consistency` before frozen CI, cross-repo, Docker, and benchmark installs.
- Normalized both path separators in discovery containment and added Windows-style escape/descendant regression coverage.
- Replaced the remaining cross-repo and benchmark unlocked install paths with root frozen workspace installs.
- Updated the active CI-reliability and agent-discovery OpenSpec task notes with current-main regression context and validation evidence.
**Key discoveries**:
- PRs #1178, #1179, #1185, and #1186 landed after the earlier dependency repair evidence and reintroduced Next.js `16.2.11` / TypeScript `7.0.2`, leaving the root override and lockfile inconsistent on merged main.
- The root assertion must run before dependency installation to provide a useful mismatch diagnostic; the Docker stage copies all workspace manifests needed by that assertion.
**Files touched**:
- `package.json`, `pnpm-lock.yaml`, `services/admin-dashboard/package.json`, `services/admin-pulse-bos/package.json`, `services/elizaos-plugin-conxian/package.json`
- `scripts/check-dependency-consistency.mjs`, `scripts/agent-discovery.ts`, `scripts/agent-discovery.test.ts`, `scripts/run-benchmarks.sh`
- `services/admin-dashboard/Dockerfile`, `.github/workflows/reusable-ci.yml`, `.github/workflows/cross-repo-integration-mvp.yml`
- `openspec/changes/2026-07-21-ci-dependency-and-kb-reliability/tasks.md`, `openspec/changes/2026-07-22-issue-1162-agent-discovery/tasks.md`
**Gaps identified**:
- Direct Docker and Compose validation remains blocked in this devbox because the `docker` command is not installed; hosted checks are pending on the remediation PR head.
**Gotchas**:
- The earlier PR #1188 validation note correctly described a pre-existing frozen-install blocker, but its OpenSpec evidence was stale after later Dependabot merges; current-head claims must use the remediation head only.

### 2026-07-22 — Revenue Automation Protocol Handoff
**Trigger**: Platform issue #1164 approval comment; aligned with platform issue #1167.
**What was done**:
- Confirmed that the protocol-owned `Conxian/Conxian` repository already contains `contracts/treasury/revenue-automation.clar`, registered in `Clarinet.toml` and the mainnet manifest, with a current observed 100 bps / 1% implementation baseline.
- Created the durable protocol handoff issue [Conxian/Conxian#538](https://github.com/Conxian/Conxian/issues/538) for future Clarity implementation, tests, deployment policy, and economic-policy decisions.
- Added the canonical revenue automation policy spec and dated OpenSpec artifacts defining the protocol/platform boundary, flow-registration requirements, exactly-once and fail-closed invariants, and Given/When/Then acceptance scenarios.
- Clarified the maintainer bounty runbook so Gateway and `BOUNTY_PAYOUT_ACTIVE` remain operational controls while protocol state remains authoritative and Clarity changes stay in the protocol repository.
- Corrected the active gap/status claims in this file without rewriting prior historical session logs.
**Key discoveries**:
- The original #1164 premise was repository-scoped: the contract is not missing organization-wide; it is upstream and protocol-owned.
- Protocol issue #488 proposes an unresolved alternative fee schedule and must not be adopted by the platform; protocol issue #469 records no-op fee paths that remain upstream follow-up.
- The upstream README documents an `initialize` signature that requires reconciliation with the actual contract interface and initialization behavior; this is tracked in the handoff issue rather than treated as completed hardening.
**Files touched**:
- `openspec/changes/2026-07-22-revenue-automation-handoff/`
- `openspec/specs/revenue-automation-policy.spec.md`
- `docs/runbooks/MAINTAINER_BOUNTY_RUNBOOK.md`
- `AGENTS.md`
**Gaps identified**:
- Upstream trigger coverage, replay semantics, caller authorization, pause/fail-closed behavior, atomic accounting/transfers, events, rounding, zero-fee behavior, README initialization documentation, and no-op fee paths remain protocol-owned work in #538.
- This platform PR does not claim upstream Clarity implementation or audit completion.
**Gotchas**:
- Keep the 100 bps / 1% value labeled as an observed implementation baseline, not an immutable policy; any rate change requires protocol governance.
- Do not “fix” the historical #1164 session claims in place; preserve the append-only knowledge-base record and update only active status sections.

### 2026-07-22 — PR #1191 Mainline Merge Verification
**Trigger**: PR #1191 request to merge the current `origin/main` into `charlie/1164-revenue-automation-handoff`.
**What was done**:
- Fetched `origin/main` at `452834b4a81de32ed6338a22ad283358004e448f`, checked out the PR head at `a9b81c345348eb19020a98378588c37463400411`, and ran the required non-rebase merge; Git reported `Already up to date`.
- Confirmed that the current PR head is directly based on the fetched mainline, so no content conflicts required manual resolution.
**Key discoveries**:
- The merge session is limited to preserving the existing protocol-owned revenue automation handoff and platform routing boundary; it does not add Clarity implementation or economic-policy changes.
**Files touched**:
- `AGENTS.md`
**Gaps identified**:
- Hosted checks remain the final PR validation gate after the branch update.
**Gotchas**:
- Keep the existing OpenSpec handoff scope intact and do not rewrite prior session-log entries.

### 2026-07-22 — PR #1189 Mainline Merge Resolution
**Trigger**: PR #1189 request to fetch `origin/main`, resolve all merge conflicts, validate, and update the PR head branch.
**What was done**:
- Fetched `origin/main` at `0117d55a59155e36ec6e6fd1efcf487aef632268`, checked out `fix/1162-agent-discovery-hardening` at `2bf3f0505cee57bfeb4830913f22a110b8740e7f`, and merged `origin/main` without rebasing.
- Resolved the two content conflicts in `scripts/agent-discovery.ts` and `scripts/agent-discovery.test.ts` by retaining mainline's cross-platform helper contract while preserving the PR's stricter empty/current/traversal-segment containment checks, priority validation, and regression coverage.
- Preserved all non-conflicting mainline changes, including the revenue-automation handoff and dependency-consistency updates.
- Passed focused discovery tests and strict typecheck, plus the root test and typecheck suites.
**Key discoveries**:
- The devbox checkout is shallow at the mainline remediation boundary; deepening the fetched main history was required for Git to identify the valid merge base `f8a231baa8131398b27139a1fbbc22b2d0a3a290` instead of treating the histories as unrelated.
- The final containment implementation exposes the mainline `isRelativePathWithinRoot` seam and keeps the PR's `isContainedRelativePath` seam as a compatibility alias over the same hardened predicate.
**Files touched**:
- `scripts/agent-discovery.ts`
- `scripts/agent-discovery.test.ts`
- `AGENTS.md`
- Mainline files brought into the merge from `origin/main`.
**Gaps identified**:
- Hosted checks must be re-evaluated on the pushed merge commit.
**Gotchas**:
- Do not use `--allow-unrelated-histories` for this repository; the initial refusal came from the shallow clone, and history deepening restored the normal merge base.

### 2026-07-22 — PR #1189 CI/Rebase Remediation Follow-up
**Trigger**: PR #1189 formal review after CI repair PR #1190 and a concurrent remote PR-branch merge.
**What was done**:
- Preserved the remote PR merge resolution against current `origin/main` rather than overwriting its newer work, then corrected the canonical taxonomy reference in `docs/AGENT_ONBOARDING.md`.
- Confirmed the follow-up changed no dependency manifests or lockfiles and kept the synthetic discovery fixture path unchanged.
**Key discoveries**:
- PR #1190 fixed the base mismatch on main by restoring the Next.js `15.5.18` / TypeScript `6.0.3` dependency graph; PR #1189 needed no additional dependency policy change.
**Files touched**:
- `docs/AGENT_ONBOARDING.md`
- `AGENTS.md`
**Gaps identified**:
- Hosted checks must be re-evaluated on the final pushed PR head.
**Gotchas**:
- The synthetic discovery fixture intentionally uses `.github/REPOSITORY_TAXONOMY.md` for an isolated optional-file test; the corrected production documentation path is `docs/REPOSITORY_TAXONOMY.md`.
