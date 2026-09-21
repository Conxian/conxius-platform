# Authority Alignment Across Portfolio

## Decision
`conxian-business` is the portfolio governance authority. It owns doctrine, OpenSpec, approvals, evidence standards, and repository role policy. It does not own runtime execution, custody, treasury, pricing, yield, trading, or protocol economics.

## Runtime delegation
Runtime capabilities remain independently owned and evidence-scoped by their implementation repositories. Governance may approve or constrain a capability, but cannot grant production status that the implementation owner has not evidenced.

## Neutral platform boundary
`conxius-platform` remains provider- and protocol-agnostic. `conxian-market`, `Conxian/Conxian`, and Orbit are external or historical surfaces, not active platform dependencies.

## Status vocabulary
Use `Implemented`, `Evidence-scoped`, `Target-state`, `Unavailable`, or `Owner-action`; do not use unqualified `Production` for cross-repository capabilities.

## Safety
No portfolio governance or platform layer may custody assets, hold private keys, set market economics, execute discretionary trades, operate liquidity, or control treasury policy. Any such capability must be client/protocol-owned and independently governed.
