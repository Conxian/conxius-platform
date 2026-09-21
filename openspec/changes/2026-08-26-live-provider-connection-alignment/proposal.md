# Live Provider Connection Alignment

## Intent

Deduplicate provider configuration, make supported connectivity evidence live, and keep unsupported or owner-controlled services explicitly fail-closed.

## Scope

- Canonical provider aliases and ownership are documented.
- The status API performs bounded, no-store probes for configured HTTP endpoints.
- Non-HTTP stores and provider-owned services report evidence-only or unavailable states.
- No secret-writing UI, external mutation, custody, wallet execution, or protocol authority is added.

## Acceptance

- Status responses include safe state, timestamp, latency, and redacted detail.
- Credentials and response bodies never leave the server.
- Existing tests, typechecks, builds, and lifecycle gates remain green.
- Production deployment and external provider health remain separately verified.
