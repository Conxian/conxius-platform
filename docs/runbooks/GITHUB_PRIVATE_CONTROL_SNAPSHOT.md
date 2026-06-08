# Conxian/.github-private Current-State Governance & Control Snapshot

- Repository: [`Conxian/.github-private`](https://github.com/Conxian/.github-private)
- Tracking parent: [conxius-platform#776](https://github.com/Conxian/conxius-platform/issues/776) (Linear: [CON-742](https://linear.app/conxian-labs/issue/CON-742))
- Snapshot timestamp (UTC): `2026-06-08T05:10:07Z`
- Evidence mode: GitHub read-only API snapshot with partial permission coverage.

## 1) Repository purpose, owner, and access expectations

**Purpose (observed):**
- Private organization-governance repository for internal policy defaults, automation, and templates.
- Metadata: `private=true`, `default_branch=main`, `archived=false`.
- Lifecycle: created `2025-03-22T02:58:41Z`, updated `2026-03-30T10:06:52Z`, pushed `2026-06-08T04:59:46Z`.

**Ownership/access evidence (observed):**
- Direct admin collaborators observed: `@botshelomokoka`, `@CharlieHelps`, `@admin-conxian-labs` (count: 3).
- Team access mapping: **Unknown (permission-limited)** — team access endpoint returned `403`.
- `CODEOWNERS`-derived owner for this repo: **Unknown** in current snapshot.

**Access expectation baseline (target):**
- Access should be limited to organization admins/security maintainers under least privilege.
- Write access should require explicit business/security justification and periodic review.

## 2) Governance baseline for a private internal governance repo

For this repository class, baseline controls are:

1. Protected default branch (or equivalent ruleset) with PR-only merges.
2. Required reviewer approvals and required status checks on `main`.
3. Secret-safe content controls (no plaintext credentials; secret scanning enabled where available).
4. Auditable change records linked to tracked work items.
5. Recurring anti-drift evidence capture (control snapshot refresh on a defined cadence).

## 3) Control status snapshot (as observed)

| Control area | Observed state | Status |
| :--- | :--- | :--- |
| Default branch enforcement | `main` currently `protected=false`; required status checks enforcement `off`. | **Gap** |
| Branch protection details | Branch protection details endpoint returned `403` (missing `administration=read`). | **Unknown (permission-limited)** |
| Rulesets | Rulesets endpoints returned `403` with a plan/feature limitation message. | **Unknown / not verifiable with current access** |
| Security alerts - Dependabot | Dependabot alerts endpoint indicates alerts are disabled. | **Gap** |
| Security alerts - Code scanning | Code scanning endpoint indicates GHAS/code scanning not enabled. | **Gap** |
| Security settings (vulnerability alerts, automated fixes, secret scanning) | Endpoints inaccessible with current permissions. | **Unknown (permission-limited)** |
| Workflow automation footprint | No tracked `.github/workflows/*` files in snapshot. | **Observed** |
| Releases/tags | No releases and no tags found. | **Observed** |

## 4) Secret-handling expectations and anti-drift controls

**Secret-handling expectations (policy target):**
- Do not commit plaintext secrets, credentials, tokens, or key material.
- Store automation credentials in GitHub Actions/org secrets (or external secret manager), not repository files.
- Enable secret-scanning coverage where plan/licensing and permissions allow.

**Anti-drift controls (required):**
- Keep this snapshot document current and linked from `docs/REPOSITORY_TAXONOMY.md`.
- Re-verify branch controls, access, and security settings on a recurring cadence (recommended: monthly for governance repos).
- Treat unresolved `Unknown (permission-limited)` fields as open control risks until confirmed.

## 5) Release/change-management applicability

- **Release artifact process:** Explicitly excluded for now — no releases/tags exist in `.github-private`.
- **Change-management controls:** Still fully applicable.
  - Changes should be PR-based and linked to tracked issues.
  - Governance-impacting changes should include reviewer accountability and control-evidence updates.
  - This snapshot is the current required evidence artifact for control reviews.

## 6) Verified gaps and recommended remediations

| Gap ID | Verified gap | Recommended remediation | Follow-up placeholder (parent tracking) |
| :--- | :--- | :--- | :--- |
| `GHPRIV-01` | `main` is unprotected and required checks are off. | Enable branch protection or repository rulesets for `main`: require PRs, at least one approval, and required status checks. | [Create child issue under #776: Branch protection hardening](https://github.com/Conxian/conxius-platform/issues/776) |
| `GHPRIV-02` | Dependabot alerts disabled; code scanning/GHAS not enabled. | Enable available security alerting; document explicit exceptions where licensing/plan blocks enforcement. | [Create child issue under #776: Security feature baseline](https://github.com/Conxian/conxius-platform/issues/776) |
| `GHPRIV-03` | Team access and several security settings are not observable with current permissions. | Run an admin-scoped review (`administration=read`) and record definitive values in this snapshot. | [Create child issue under #776: Admin-scope evidence refresh](https://github.com/Conxian/conxius-platform/issues/776) |
| `GHPRIV-04` | No documented anti-drift execution cadence for this repository's controls. | Add scheduled control review cadence and checklist owner in governance operations docs. | [Create child issue under #776: Anti-drift cadence + owner](https://github.com/Conxian/conxius-platform/issues/776) |

## 7) Evidence commands / API endpoints used

Evidence captured from the GitHub read snapshot at `2026-06-08T05:10:07Z`:

```bash
gh api repos/Conxian/.github-private
gh api repos/Conxian/.github-private/branches/main
gh api repos/Conxian/.github-private/branches/main/protection
gh api repos/Conxian/.github-private/rulesets
gh api repos/Conxian/.github-private/dependabot/alerts
gh api repos/Conxian/.github-private/code-scanning/alerts
gh api repos/Conxian/.github-private/vulnerability-alerts
gh api repos/Conxian/.github-private/automated-security-fixes
gh api repos/Conxian/.github-private/secret-scanning/alerts
gh api repos/Conxian/.github-private/collaborators
gh api repos/Conxian/.github-private/teams
gh api repos/Conxian/.github-private/releases
gh api repos/Conxian/.github-private/tags
gh api repos/Conxian/.github-private/git/trees/main?recursive=1
```

Permission/plan limitations in this snapshot are intentionally preserved as `Unknown (permission-limited)` rather than inferred.
