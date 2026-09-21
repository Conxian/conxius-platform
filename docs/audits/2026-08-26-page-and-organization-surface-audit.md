# Page and Organization Surface Audit — 2026-08-26

## Scope

Audited every Next.js page route in `services/admin-dashboard/src/app`, the shared layout, the local platform contracts, and all visible Conxian organization repositories. This is an evidence audit; no remote repository or GitHub setting was mutated.

## Page route results

All 15 page routes returned HTTP 200 in the local preview:

- `/`
- `/multidimensional`
- `/multidimensional/telemetry`
- `/launch`
- `/steward`
- `/claims`
- `/funded-roles`
- `/funded-roles/history`
- `/proposal-templates`
- `/rewards`
- `/operators`
- `/frontends`
- `/tiers`
- `/support`
- `/settings`

Browser verification confirmed the shared navigation and footer render on the tested routes. The metrics route correctly fails closed with `Live platform metrics unavailable` rather than displaying synthetic data. The launch route correctly surfaces a `503` contributor-profile dependency failure and an empty-state explanation.

## Findings

### P1 — Shared layout is not responsive

The header uses a single inline navigation row with many links. At the audited 1012px desktop viewport it wraps into a visually crowded two-line cluster; no mobile navigation or responsive breakpoint was observed. The layout also uses inline hard-coded colors and typography rather than the repository's documented design-token approach. This is platform-owned and should be remediated in a follow-up UI change.

### P1 — High-privilege settings surface lacks visible operational state

The settings page renders secret inputs and a save action, but the browser audit did not find an explicit success/error status region, last-updated state, or confirmation flow in the visible surface. This needs a security-focused interaction review before treating settings as production-ready.

### P1 — Dependency failures are clear but not actionable enough

`/launch` exposes HTTP 503 in the user-facing error text. `/multidimensional` gives a retry action but does not identify the configured source or observation timestamp. These are honest fail-closed states, but should include correlation/request context and operator-facing remediation guidance without revealing secrets.

### P2 — Accessibility and semantics need a full pass

The shared layout has semantic `header`, `nav`, `main`, and `footer`, but the audit found a hidden duplicate settings link and no visible active-navigation state. Each page needs keyboard/focus, heading hierarchy, form-label, status-live-region, and responsive overflow verification.

### P2 — Page-specific headings are inconsistent

Several routes use an `h2` or content-specific heading rather than a consistent page-level `h1`; `/claims` and `/frontends` did not expose a `main h1` in the quick route sample. Full heading-tree checks should be added to the browser test suite.

## Organization repository evidence

The visible organization inventory contains 15 repositories: 14 active repositories and archived `conxius-orbit`. The local platform repository has service catalog, onboarding/discovery, OpenSpec, dependency, security, and lifecycle controls. Cross-repository readiness remains unverified for GitHub branch protection/rulesets, deployment health, Docker/Compose runtime, reusable workflow adoption, compatibility manifests, GitHub Projects access, and the Orbit replacement decision.

## Remediation disposition

- Local page/layout UX and accessibility findings: remediate in a dedicated OpenSpec UI change.
- Remote GitHub controls: require organization-owner/admin evidence or authorized remote changes.
- Live services and Docker: require configured endpoints and Docker-enabled runner.
- Data correctness: retain fail-closed unavailable states; do not add synthetic values.
- Security: do not expose or persist secret values in audit artifacts.

## Evidence

- Local route HTTP checks: all 15 returned `200`.
- Browser screenshots: `/tmp/agent-browser/dashboard-home.png`, `/tmp/agent-browser/multidimensional.png`, `/tmp/agent-browser/settings.png`, `/tmp/agent-browser/launch.png`.
- Organization inventory: `gh repo list Conxian --limit 100`.
- Related controls: `scripts/verify_org_readiness.py`, `platform/services.catalog.json`, `docs/audits/2026-08-26-platform-readiness-audit.md`.
