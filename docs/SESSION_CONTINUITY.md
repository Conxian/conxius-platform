# Session Continuity Guide

This document helps agents maintain context across sessions and ensure smooth handover.

---

## Returning Agent Protocol

### Step 1: Pull Latest (Always First)

```bash
cd /workspace/project/conxius-platform
git fetch --all
git pull origin main
```

### Step 2: Read Session Log

```bash
# Get recent session entries
grep -A 30 "## Session Log" AGENTS.md | tail -35

# Find incomplete work
grep -B2 -A10 "in_progress\|TODO\|BLOCKED" AGENTS.md
```

### Step 3: Check Assigned Work

```bash
# Via GitHub CLI
gh issue list --assignee @me --state open

# Via API
curl -s -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/Conxian/conxius-platform/issues?assignee=@me&state=open"
```

### Step 4: Verify Working Tree

```bash
git status
# Should show: "nothing to commit, working tree clean"
# If not clean, complete or stash pending work
```

---

## Incomplete Work Tracking

### Format for Pending Work

At end of session log entry:

```markdown
**Pending for next session**:
- [ ] Task description (issue #N)
- [ ] Another task
```

### Issue-Based Tracking

For larger work, create or update an issue:

```markdown
## Status: In Progress

### Blocked By
- [ ] Dependency that must complete first

### Next Steps
- [ ] Step 1
- [ ] Step 2

### Notes for next session
- Discovered X during Y
- Need to research Z
```

---

## Handover Protocol

When transitioning between agents:

### Handover Document

```markdown
## Agent Handover: [Task Name]

**Session ID**: [unique identifier]
**Handed over by**: [agent identifier]
**Handed to**: [next agent or "pool"]

### Context
[Brief explanation of what this task is about]

### What Was Done
- Completed: [list]
- In progress: [list]

### What Remains
- [ ] Task 1
- [ ] Task 2

### Key Discoveries
- [Important findings]

### Files in Play
- `path/to/file1.ts`
- `path/to/file2.ts`

### Open Questions
- Question 1?
- Question 2?

### Suggested Next Agent Type
[`general-purpose` / `code-explorer` / `bash-runner`]
```

### Machine-readable handover (`conxian.swarm` `handover.v1`)

The Markdown handover remains the human-readable compatibility format. For automated resumption, create a `handover.v1` document with `createHandover(input, graph, { allowlist, discovery, trusted_discovery_anchor })` and validate it with `validateHandover(handover, { graph, allowlist, discovery, trusted_discovery_anchor })` or `assessHandoverResumability(handover, { graph, allowlist, discovery, trusted_discovery_anchor, now })`. When both formats are present, the machine-readable record is authoritative for lifecycle state, task status, digests, conflicts, risks, blockers, and resume actions; Markdown may explain those fields but must not override them.

The normative contract is defined in [`openspec/specs/swarm-coordination-v1.spec.md`](../openspec/specs/swarm-coordination-v1.spec.md), the machine contract is defined in [`schemas/agent-swarm.schema.json`](../schemas/agent-swarm.schema.json), and the implementation is [`scripts/agent-coordination.ts`](../scripts/agent-coordination.ts). A valid handover includes:

- **Linkage:** `handover_id`, `correlation_id`, `graph_id`, required `graph_digest` verified against the graph supplied to `createHandover()`/`validateHandover()`, optional source/target identities, and `links` to the graph, artifacts, or prior messages.
- **State:** `captured_at`, `expires_at`, `lifecycle_state`, and disjoint `completed_tasks`, `active_tasks`, `blocked_tasks`, and `pending_tasks`.
- **Integrity and provenance:** digest-only handover `integrity.digest`, artifact `digest` values, context `allowlist_digest`, and each context entry's `provenance_digest`. Every handover boundary also revalidates the derived #1162 `ContextAllowlist`, source `DiscoveryResult`, and versioned content-addressed trusted discovery anchor, then checks every embedded context source; a locally recomputed entry/snapshot/handover digest does not authorize an unallowlisted path. The anchor is delivered out of band by a trusted adapter/deployment boundary and is not authenticated by the pure coordination library. Authentication is an envelope-only concern; a handover authentication field is rejected.
- **Risks and blockers:** `risks_and_blockers`, `blocked_tasks`, and `unresolved_conflicts` with stable IDs and evidence digests.
- **Next steps:** ordered `resume_instructions` containing `instruction_id`, `sequence`, `task_id`, `action`, `depends_on`, and an explicit `acceptance` condition.
- **Context:** a bounded `context_snapshot`; missing, stale, expired, or unverifiable mandatory context makes the handover non-resumable rather than silently usable.

Migration from Markdown is direct: map **Context** to `correlation_id`/`graph_id` and the context snapshot, **What Was Done** to completed/active task references, **What Remains** to blocked/pending tasks and resume instructions, **Key Discoveries** to decisions/artifacts, and **Open Questions** to risks/blockers or unresolved conflicts. Do not put secrets or provider transcripts in either format.

---

## Context Preservation

### Minimum Context for Handover

| Item | Required | Notes |
|------|----------|-------|
| Issue/PR numbers | Yes | For traceability |
| Files modified | Yes | For review |
| Blockers | Yes | For unblocking |
| Key decisions | Yes | For alignment |
| Next steps | Yes | For continuity |
| Session log | Yes | In AGENTS.md |

### Machine-readable context snapshots

Use `packageContext()` to build a snapshot from caller-supplied values and a versioned/digested allowlist derived from a validated #1162 discovery result plus its trusted discovery anchor, `validateContextSnapshot(snapshot, { allowlist, discovery, trusted_discovery_anchor })` for authoritative validation, `resolveContextSnapshot(snapshot, now, { allowlist, discovery, trusted_discovery_anchor })` to re-check freshness with provenance at a handover boundary, and `mergeContextSnapshots()` to combine same-provenance snapshots deterministically. Structural-only normalization is private and non-authoritative. `redactSensitiveFields()` is available when preparing non-sensitive task data. These helpers are pure and do not read the filesystem, environment, network, or provider transcript.

Allowed sources are explicit current-task inputs, governance/canonical sources, #1162-declared repository paths, validated artifact references, and explicitly marked assumptions. The precedence tiers are, from highest to lowest: task input; governance/canonical; architectural; operational; evidence; historical; assumption. Historical context is reference-only and assumptions are never authoritative. Conflicts retain selected and discarded context IDs with a machine-readable reason; they are not resolved by arrival order.

Each entry records classification, sensitivity, redaction, provenance, `captured_at`, snapshot `evaluated_at`, optional `stale_after`/`expires_at`, precedence, byte length, depth, and truncation metadata. Timestamps use the RFC 3339 millisecond profile: zero through three fractional digits normalize to UTC with exactly three fractional digits, while four through nine fractional digits are rejected. Freshness is evaluated against one effective `now`, not capture time; for `captured_at < stale_after < now`, required context is stale. Required context that is missing, stale, or expired cannot silently satisfy a current requirement; `allow_stale` only preserves stale evidence for explicit review, and `resolveContextSnapshot()` reports it as invalid. Sensitive values become typed redaction markers, including nested keys that resemble secrets or credentials.

Every snapshot enforces `max_items`, `max_total_bytes`, `max_entry_bytes`, and `max_depth`; when a graph is supplied, `max_context_bytes` is the effective minimum total budget. Bounds fail closed unless the caller explicitly enables truncation, in which case a truncation marker and original digest are retained. Repository paths must be traceable to #1162-declared sources. The coordination module accepts explicit `.agents/manifest.json`, `.agents/skills/registry.json`, and declared inert skill Markdown sources but does not read files or resolve symlinks; adapters own filesystem safety. The complete machine contract is in [`schemas/agent-swarm.schema.json`](../schemas/agent-swarm.schema.json); keep this guide to usage and migration rules rather than duplicating the schema.

### Session Log Search

```bash
# Find sessions by date range
grep -B1 "2026-07-14" AGENTS.md

# Find sessions by topic
grep -i "claims\|treasury\|governance" AGENTS.md | head -20

# Find all sessions this month
grep "^### 2026-07" AGENTS.md
```

---

## Self-Enhancement Triggers

Agents should proactively update knowledge when:

### Discovery Triggers

| Trigger | Update Location |
|---------|-----------------|
| New API pattern | AGENTS.md > Implementation Patterns |
| New workflow | AGENTS.md > CI Workflows |
| New test coverage | AGENTS.md > Test Coverage |
| New repo dependency | AGENTS.md > Cross-Repo |
| New gap | AGENTS.md > Key Gaps |
| New pattern | AGENTS.md > Agent Learnings |

### Update Frequency

| Item | Update Trigger | By Whom |
|------|----------------|----------|
| Session log | Every session | Active agent |
| KB corrections | On discovery | Active agent |
| New patterns | On first use | Active agent |
| Gap closure | On completion | Active agent |

---

## Emergency Continuity

### If AGENTS.md is Corrupted

1. Pull from origin/main to restore
2. Review recent commits for context
3. Rebuild session log from git history

```bash
# Restore AGENTS.md
git checkout origin/main -- AGENTS.md

# Review recent commits
git log --oneline -20

# Find session context
git log --all --oneline --source --remotes | head -10
```

### If Work Was Lost

1. Check git reflog
2. Identify last known good state
3. Recover via `git reset --hard <commit>`

```bash
git reflog | head -20
git reset --hard <commit-id>
```

---

## Session Metadata

Include at end of every session log:

```markdown
---
**Session ID**: [UUID or timestamp-based]
**Duration**: [approximate]
**Agent type used**: [general-purpose/bash-runner/code-explorer]
**Tools invoked**: [list of tools]
**Files examined**: [count]
**Tokens used**: [if available]
```

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────┐
│              SESSION CONTINUITY CHECKLIST                        │
├─────────────────────────────────────────────────────────────────┤
│ BEFORE ENDING SESSION:                                           │
│   [ ] Session log entry written                                 │
│   [ ] KB updated if needed                                      │
│   [ ] Working tree clean                                        │
│   [ ] Changes pushed to remote                                  │
│   [ ] Incomplete work documented                                │
│                                                                 │
│ ON RETURNING:                                                    │
│   [ ] git pull origin main                                      │
│   [ ] Read session log                                          │
│   [ ] Check assigned issues                                     │
│   [ ] Review pending work                                       │
│   [ ] Resume or start new                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

© 2026 Conxian Labs. Code is Law.
