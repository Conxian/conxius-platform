# Conxius Platform: Information Hierarchy & Maintenance Rules

This document defines the four-tier information hierarchy for the Conxius Platform knowledge base and enforces maintenance rules that prevent canonical, operational, evidence, and historical materials from silently competing. It is the **authoritative rulebook** for how documentation is structured, updated, and archived.

---

## 1. The Four-Tier Hierarchy

```
┌─────────────────────────────────────────────┐
│  CANONICAL                                   │
│  Authoritative truth sources.                │
│  Updated only via formal OpenSpec proposals. │
├─────────────────────────────────────────────┤
│  OPERATIONAL                                 │
│  Active execution tracking and runbooks.     │
│  Updated as work progresses.                 │
├─────────────────────────────────────────────┤
│  EVIDENCE                                    │
│  Verification artifacts and audit trails.    │
│  Immutable after publication.                │
├─────────────────────────────────────────────┤
│  HISTORICAL                                  │
│  Superseded, archived, or deprecated docs.   │
│  Read-only. Never updated.                   │
└─────────────────────────────────────────────┘
```

### 1.1 Canonical Layer — Authoritative Truth

These documents define the current understanding of the system. They are the **final word** for any decision domain. Every decision area MUST resolve to exactly **one canonical document**.

| Document | Decision Domain | Reading Chain Root |
| :--- | :--- | :--- |
| [`CONXIAN_UNIFIED_THEORY_v2.md`](./CONXIAN_UNIFIED_THEORY_v2.md) | Canonical index and truth-source routing | Top-level index |
| [`architecture/SOVEREIGN_REPR_2026.md`](./architecture/SOVEREIGN_REPR_2026.md) | System architecture and Phase 7 redesign | Architecture |
| [`architecture/ALIGNMENT.md`](./architecture/ALIGNMENT.md) | Strategic alignment and ecosystem positioning | Strategy |
| [`architecture/SYNERGY.md`](./architecture/SYNERGY.md) | Inter-repo workflows and cross-cutting concerns | Integration |
| [`REPOSITORY_TAXONOMY.md`](./REPOSITORY_TAXONOMY.md) | Repository inventory, ownership, and boundaries | Repo inventory |
| [`GOVERNANCE.md`](../GOVERNANCE.md) | Platform governance and decision rights | Governance |
| [`WHITEPAPER.md`](./WHITEPAPER.md) | Project thesis and foundational vision | Vision |
| [`architecture/ARCHITECTURE_MODEL.md`](./architecture/ARCHITECTURE_MODEL.md) | Machine-readable architecture model (CON-1179) | Model |
| [`architecture/CONTROL_ASSURANCE_MAPPING.md`](./architecture/CONTROL_ASSURANCE_MAPPING.md) | Controls and assurance enforcement (CON-1180) | Assurance |
| [`architecture/SYSTEM_GRAPH.md`](./architecture/SYSTEM_GRAPH.md) | System architecture graph and topology | Graph |
| [`architecture/FULL_STACK_BITCOIN_RESEARCH.md`](./architecture/FULL_STACK_BITCOIN_RESEARCH.md) | Phase 7 Bitcoin-native research compendium | Research |
| [`architecture/SDKS_AND_VERSIONING.md`](./architecture/SDKS_AND_VERSIONING.md) | SDK versioning strategy | SDKs |

**Maintenance Rules for Canonical Documents:**

1. **Formal Update Path**: Changes to canonical documents MUST go through an OpenSpec proposal in `openspec/changes/`. No direct commits.
2. **Research Integration**: When new research from `FULL_STACK_BITCOIN_RESEARCH.md` matures into active scaffolding, the corresponding canonical document is updated via the OpenSpec workflow.
3. **Single Source**: Each decision domain has exactly **one active canonical document**. If a domain needs a new canonical source, the old one MUST be archived to the historical layer.
4. **Cross-Reference**: Canonical documents MUST cross-reference each other where domains overlap. The `CONXIAN_UNIFIED_THEORY_v2.md` index is the authoritative router.

### 1.2 Operational Layer — Active Execution

These documents track **in-progress work**, **current status**, and **day-to-day operations**. They change frequently and reflect the live state of the project.

| Document | Purpose | Updates |
| :--- | :--- | :--- |
| [`GAPS.md`](./GAPS.md) | Gap analysis, technical debt, Phase 6→7 transition | Updated as gaps are resolved or discovered |
| [`SCORING_MATRIX.md`](./SCORING_MATRIX.md) | Gap-to-research prioritization scoring | Updated as scores change or new gaps are scored |
| [`CHANGELOG.md`](../CHANGELOG.md) | Versioned release history | Updated on every release |
| [`RELEASING.md`](../RELEASING.md) | Release process and versioning rules | Updated when process changes |
| [`REVIEWS.md`](../REVIEWS.md) | Code review guidelines | Updated as review standards evolve |
| `runbooks/*.md` | Operational runbooks and checklists | Updated as procedures change |
| [`architecture/REPO_EVOLUTION_PLAN.md`](./architecture/REPO_EVOLUTION_PLAN.md) | Repository evolution roadmap | Updated as evolution milestones shift |
| [`architecture/ALIGNMENT_BLUEPRINT_2026.md`](./architecture/ALIGNMENT_BLUEPRINT_2026.md) | 2026 alignment blueprint | Updated as alignment targets move |
| [`architecture/PHASE_7_BFF_TOPOLOGY.md`](./architecture/PHASE_7_BFF_TOPOLOGY.md) | BFF topology design | Updated as topology evolves |
| [`architecture/PHASE_7_PROPOSAL_UNIVERSAL_SETTLEMENT.md`](./architecture/PHASE_7_PROPOSAL_UNIVERSAL_SETTLEMENT.md) | Universal Settlement Interface proposal | Updated as USI design matures |
| [`architecture/FDC3_INTEROPERABILITY.md`](./architecture/FDC3_INTEROPERABILITY.md) | FDC3 interoperability specifications | Updated as interop standards evolve |
| [`REPOSITORY_TAXONOMY.md`](./REPOSITORY_TAXONOMY.md) | Repository inventory (operational mapping) | Updated as repos are added or archived |

**Maintenance Rules for Operational Documents:**

1. **Read from Canonical, Write to Operational**: Operational documents derive their authority from canonical documents. They must cite which canonical source they extend.
2. **Single Active Reading Chain**: For any decision area (e.g., "what should I prioritize"), there is exactly **one** operational document that provides the current answer. The reading chain is:
   - `AGENTS.md` → `GAPS.md` → `SCORING_MATRIX.md` (for prioritization)
   - `AGENTS.md` → runbooks (for procedures)
   - `AGENTS.md` → `CHANGELOG.md` (for release history)
3. **Status must be dated**: Every operational status entry must carry the date of last update.
4. **No Duplication**: Operational documents must not restate canonical content. Link to the canonical source instead.

### 1.3 Evidence Layer — Verification Artifacts

These are **immutable or append-only** records of verification, audit, and compliance activities. They prove that processes were followed.

| Location | Content | Immutability |
| :--- | :--- | :--- |
| `docs/runbooks/*_EVIDENCE*.md` | Lifecycle control verification evidence | Append-only |
| `docs/runbooks/*_READINESS*.md` | Phase readiness evidence packs | Append-only |
| `docs/runbooks/ATS_EXECUTION_REPORT_JUNE_2026.md` | Automated test suite execution reports | Immutable after publication |
| `docs/runbooks/BITCOIN_SANDBOX_PRODUCTION_PARITY_MATRIX.md` | Sandbox/production parity verification | Append-only |
| `docs/runbooks/GITHUB_PRIVATE_CONTROL_SNAPSHOT.md` | GitHub private control snapshot | Point-in-time snapshot |
| `docs/runbooks/SIDL_*.md` | SIDL endpoint monitoring and release readiness | Append-only |
| `test-results/lifecycle-control-gates/` | CI-generated lifecycle control gate results | Immutable (CI-generated) |
| `docs/architecture/CONTROL_ASSURANCE_MAPPING.md` | Control-to-repo assurance mapping | Updated sparingly |

**Maintenance Rules for Evidence Documents:**

1. **Immutable After Publication**: Once an evidence document is published, its content must not be altered. Corrections require a new dated addendum.
2. **Point Upward**: Evidence documents must reference the operational runbook or canonical control they verify.
3. **Temporal Anchoring**: Every evidence artifact must carry a publication date and the git commit hash of the state it verifies.

### 1.4 Historical Layer — Archived & Superseded

These documents are **read-only**. They preserve institutional memory but must not influence current decisions. Any attempt to cite a historical document as authority for a current decision is a process violation.

| Location | Content |
| :--- | :--- |
| `docs/archived-reports/` | Superseded alignment reports, phase reviews, scorecards |
| `docs/archived-tasks/` | Completed enhancement plans, task summaries, bounty docs |
| `docs/archive/` | Archived agent instructions and session logs |
| `openspec/changes/archive/` | Archived OpenSpec change proposals |

**Maintenance Rules for Historical Documents:**

1. **Strictly Read-Only**: Historical documents must never be edited. If content in a historical document needs revision, create a new document in the appropriate layer.
2. **Archival Trigger**: A document moves to the historical layer when:
   - A newer version of the same content exists in the canonical layer
   - The phase or milestone it describes is fully closed
   - It has been explicitly superseded by an OpenSpec change
3. **Archival Process**: Moving a document to the historical layer requires:
   - A clearly dated deprecation notice at the top of the archived document
   - A pointer to its canonical replacement
   - Removal from active reading chains
4. **Distortion Prevention**: Active reading chains (in `AGENTS.md`, `README.md`, `CONXIAN_UNIFIED_THEORY_v2.md`) must never link into the historical layer. Historical documents may only be discovered via `docs/archived-*/` directory listings.

---

## 2. Reading Chains

A **reading chain** is the directed path from a decision question to its authoritative answer. Every decision area has exactly **one active reading chain**.

### 2.1 Defined Reading Chains

| Decision Area | Reading Chain |
| :--- | :--- |
| **What is the current architecture?** | `AGENTS.md` → `CONXIAN_UNIFIED_THEORY_v2.md` → `architecture/SOVEREIGN_REPR_2026.md` |
| **What should I prioritize?** | `AGENTS.md` → `GAPS.md` → `SCORING_MATRIX.md` |
| **How do I release?** | `AGENTS.md` → `RELEASING.md` → runbooks (`RELEASE_CHECKLIST_TEMPLATE.md`) |
| **Who owns this repo?** | `README.md` → `REPOSITORY_TAXONOMY.md` → `CODEOWNERS` |
| **What is the strategic direction?** | `AGENTS.md` → `architecture/ALIGNMENT.md` → `architecture/ALIGNMENT_BLUEPRINT_2026.md` |
| **How do I contribute?** | `README.md` → `CONTRIBUTING.md` → `REVIEWS.md` |
| **What controls are enforced?** | `architecture/CONTROL_ASSURANCE_MAPPING.md` → runbooks (`LIFECYCLE_CONTROL_GATE_OPERATIONS.md`) |
| **What Bitcoin research is active?** | `AGENTS.md` → `architecture/FULL_STACK_BITCOIN_RESEARCH.md` → `GAPS.md` (§4 Mapping) |
| **How is inter-repo integration managed?** | `architecture/SYNERGY.md` → `architecture/SYSTEM_GRAPH.md` → runbooks (`CROSS_REPO_INTEGRATION_HARNESS_MVP.md`) |
| **What OpenSpec changes are active?** | `AGENTS.md` → `openspec/changes/` → individual `proposal.md` |

### 2.2 Reading Chain Enforcement

1. **Unidirectional**: Reading chains flow downward (canonical → operational → evidence). Operational documents must never be cited as authority in canonical documents. Evidence documents must never be cited as authority in operational documents (they verify, they do not direct).
2. **No Back-References**: Historical documents must not appear in any active reading chain. If a reading chain points to a historical document, the chain is broken and must be repaired.
3. **One Chain Per Domain**: A decision area must have exactly one reading chain. If two documents appear to answer the same question, the conflict must be resolved by designating one as canonical and archiving the other.
4. **Chain Validation**: Reading chains listed in §2.1 are validated via the `AGENTS.md` directive. Agents following the AGENTS.md workflow automatically follow the correct chain.

---

## 3. Research Integration Protocol

New research (from `FULL_STACK_BITCOIN_RESEARCH.md` or external sources) enters the knowledge base through a defined pipeline:

```
Research Discovery
    │
    ▼
Operational Layer (GAPS.md / SCORING_MATRIX.md)
    │  Gap scored, implementation path assigned
    ▼
Active Scaffolding (openspec/changes/)
    │  OpenSpec proposal created, design explored
    ▼
Canonical Layer (SOVEREIGN_REPR_2026.md, etc.)
    │  Architectural integration approved and documented
    ▼
Evidence Layer (readiness packs, verification)
    │  Implementation verified and attested
    ▼
Historical Layer (openspec/changes/archive/)
       Change archived after completion
```

**Rules:**
1. Research MUST enter at the operational layer (Gap with score) before any canonical document is touched.
2. A gap scored below the current prioritization threshold (see `SCORING_MATRIX.md`) must not update canonical documents.
3. When research matures into implementation, the canonical architecture document is updated via a formal OpenSpec `proposal.md` that cites the gap ID and score.
4. Once a research gap is fully resolved and archived, the historical record is preserved in `openspec/changes/archive/` but removed from active operational tracking.

---

## 4. Distortion Prevention

Older materials can distort current prioritization when they remain in active reading chains or are cited without deprecation context. The following rules prevent this:

1. **No Historical in Active Chains**: `AGENTS.md`, `README.md`, and `CONXIAN_UNIFIED_THEORY_v2.md` must never link into `docs/archived-*/` or `openspec/changes/archive/`.
2. **Deprecation Markers**: Any document superseded by a newer version must carry a prominent deprecation notice at the top linking to its replacement.
3. **Dated Snapshot Rule**: Operational documents that contain time-sensitive data (e.g., `GAPS.md` status) must carry a "last updated" date. Data older than 90 days without an update is considered stale and must be re-validated or archived.
4. **Prioritization Gate**: The `SCORING_MATRIX.md` is the sole prioritization gate. No operational or evidence document may independently reorder or override the scoring matrix's prioritization.
5. **AGENTS.md Bootstrap**: The `AGENTS.md` file is the single entry point for AI agents. It encodes the root of every reading chain. If a document is not reachable from `AGENTS.md` via a defined reading chain, it has no authority.

---

## 5. Hierarchy Compliance Checklist

The following is checked during the `lifecycle-control-gates` CI workflow:

- [ ] No historical documents linked from active reading chains
- [ ] All canonical documents have a corresponding entry in `CONXIAN_UNIFIED_THEORY_v2.md`
- [ ] All operational documents cite their canonical source
- [ ] Evidence documents are immutable (no modifications to published evidence without dated addenda)
- [ ] `AGENTS.md` reading chains are intact (all links resolve)

---

## 6. Amendment Process

This document itself is canonical. Amendments require:

1. An OpenSpec proposal in `openspec/changes/` with a `proposal.md` describing the change
2. A `tasks.md` listing the documents to update
3. Approval via the standard PR review process defined in `REVIEWS.md`

---

*Adopted 2026-06-26 per [Issue #1009](https://github.com/Conxian/conxius-platform/issues/1009). Maintained by Conxian Labs.*
