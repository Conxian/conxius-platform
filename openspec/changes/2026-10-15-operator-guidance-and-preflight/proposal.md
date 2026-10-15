# Operator guidance and local preflight reliability

## Why
PR #1425's README updates conflict with current dev and describe preflight success more strongly than the script supports. The script currently exits successfully after failed checks and treats a missing or failing Docker Compose executable as validated configuration.

## Changes
Preserve current dev and the PR's useful package commands. Describe the exact local preflight boundary and correct dashboard template paths. Return a failing exit status when any preflight check fails, including missing Docker or invalid Compose configuration. Add isolated fault tests using command shims; do not provision services or credentials.

## Acceptance
Repository documentation and lifecycle checks pass. Every preflight failure returns nonzero; all successful configuration checks return zero. Documentation does not claim deployment execution, service health, signing authority or production acceptance. No dependency, authorization or promotion policy changes.
