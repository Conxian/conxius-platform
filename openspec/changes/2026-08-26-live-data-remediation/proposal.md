# Live Data Remediation

## Intent
Remove synthetic operational values from the neutral PaaS dashboard and expose only live upstream data or explicit unavailable states.

## Scope
- Route dashboard metrics through the configured Gateway live metrics contract.
- Use no-store requests and return source/freshness metadata.
- Preserve test fixtures only inside tests; remove simulator UI from rendered production surfaces.
- Record organization-wide retirement candidates without deleting external repositories.

## Non-goals
- No destructive external repository changes.
- No protocol, wallet, custody, trade, or signing authority.
- No fabricated fallback data.

## Acceptance criteria
- The metrics route contains no hardcoded business values.
- Missing or failed upstream data is represented as unavailable and returns an appropriate status.
- Live source and observed timestamp are rendered by the dashboard.
- Retirement candidates have owners, replacements, and evidence requirements.

## Governance
Follow `AGENTS.md`, the repository boundary contract, and the neutral PaaS blueprint.
