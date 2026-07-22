---
name: agent-onboarding
description: "Inducts AI agents into the Conxian ecosystem with repository context and session continuity guidance."
license: MIT
compatibility: "Repository-local; content is inert until a human or agent explicitly activates it."
metadata:
  version: "1.0.0"
  execution: "manual"
---

# Agent Onboarding Skill

## Purpose

Inducts AI agents into the Conxian ecosystem with full knowledge base access, GitHub integration, and self-enhancement patterns.

## Trigger Conditions

Invoke this skill when:
- Starting a new session in this repository
- Agent requests onboarding guidance
- Task involves multi-agent coordination
- Session continuity is needed

## Skill Content

### 1. Entry Point Discovery

When the versioned discovery protocol is available, treat `.agents/manifest.json` and the discovery CLI output as the source of truth for repository root, context order, optional files, and skill selection. Do not infer or maintain a separate context allowlist in this skill.

For this repository, the manifest currently requires these four context files in order:
1. `AGENTS.md` - Primary knowledge base
2. `GOVERNANCE.md` - Governance rules
3. `docs/AGENT_ONBOARDING.md` - Comprehensive guide
4. `docs/SESSION_CONTINUITY.md` - Session handover and continuity requirements

Use the repository-local CLI to resolve the active contract:

```bash
pnpm --silent agent-discovery --json
```

If a repository does not provide a valid manifest, use the compatibility fallback in its onboarding documentation rather than silently treating this list as an executable discovery mechanism.

### 2. Session Start Protocol

```bash
# Verify repo state
git status && git pull origin main

# Check open issues
gh issue list --state open --limit 10

# Check open PRs
gh pr list --state open --limit 10

# Read recent session log
tail -50 AGENTS.md | head -30
```

### 3. Core Directives (From AGENTS.md)

1. **OpenSpec First**: All changes require proposal or change artifact
2. **Gateway Truth**: `lib-conxian-core/gateway` is authoritative
3. **Bitcoin Native**: Use `burn-block-height` for anchoring
4. **Sovereign Design**: Forest Green `#2E403B`, Nakamoto Gold `#D4A017`
5. **Sentinel Security**: Never hardcode secrets

### 4. Commit Convention

```
<type>(<scope>): <description>

Types: feat, fix, docs, chore, refactor, perf
Example: feat(governance): add funded roles history endpoint
```

### 5. Session Log Template

After every session, append to AGENTS.md Session Log:

```markdown
### YYYY-MM-DD — Brief Session Title
**Trigger**: (issue #, PR #, or task)

**What was done**:
- Concrete bullet points

**Key discoveries**:
- Patterns found

**Files touched**: (paths)

**Gaps identified**: (missing items)

**Gotchas**: (issues encountered)
```

### 6. Knowledge Update Triggers

Update AGENTS.md when:
- New API endpoint added → Update API Surface count
- New workflow file → Update CI Workflows count
- New test file → Update Test Coverage count
- New pattern discovered → Add to Agent Learnings
- New repo dependency → Update Cross-Repo Dependencies

### 7. Agent Types and Tools

| Type | When to Use | Tools |
|------|-------------|-------|
| `bash-runner` | Tests, builds, CLI | terminal |
| `code-explorer` | Understanding code | terminal |
| `general-purpose` | Multi-step tasks | terminal, file_editor, task_tracker |
| `web-researcher` | External research | browser_tool_set |

### 8. Security Checklist

- [ ] No secrets in code
- [ ] API routes use `validateAdminAuth()`
- [ ] Secrets via `provision-secrets.sh`
- [ ] Auth headers validated

### 9. Push Protocol

```bash
# Commit with noreply email if needed
GIT_AUTHOR_EMAIL="openhands@users.noreply.github.com" git commit

# Push
git push origin <branch>
```

### 10. Emergency Procedures

| Situation | Action |
|-----------|--------|
| Regressions | `git revert <commit>` |
| Blocked | Document in issue, skip |
| Security incident | Follow SECURITY.md |

## Files Modified by This Skill

This skill may modify:
- `AGENTS.md` - Session logs, KB updates
- `GOVERNANCE.md` - If governance changes discovered
- `.github/workflows/` - CI improvements

## Related Skills

- `github` - GitHub API operations
- `agent-memory` - Persisting knowledge
- `code-review` - Review patterns
- `iterate` - PR iteration

---

Last Updated: 2026-07-14
