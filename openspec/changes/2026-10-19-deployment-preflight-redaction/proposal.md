# Redact deployment environment diagnostics

Keep production-template validation fail-closed while ensuring invalid values and matched assignment values never appear in its diagnostic output. Report expected settings or variable names and line numbers instead. Preserve the existing NODE_ENV, Bitcoin network and forbidden-default checks and exit status.

Add black-box regression tests using synthetic canaries for valid input, incorrect required settings, forbidden values and absent files, and run them in path-scoped CI. This validates configuration text only; it does not provision secrets or establish runtime, database or deployment readiness.
