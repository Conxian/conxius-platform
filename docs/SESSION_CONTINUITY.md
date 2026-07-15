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
