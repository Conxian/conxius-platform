# Evidence-scoped provider registration discovery

Platform #1426 tracks qualified operation-manifest ingestion. Gateway and Nexus now publish diagnostic registration manifests that explicitly carry unknown health and no qualified operations. The dashboard should ingest those bounded declarations without turning a registry count or reachable health endpoint into signing/execution support.

Scope: strict registration-schema validation, bounded authenticated no-store reads from configured provider URLs, and additive registration evidence beside existing health probes. Preserve existing health behavior, provider ownership, and all execution/custody gates. Qualified Core operation manifests, deployment automation, and SLA qualification remain follow-up work.

Acceptance: reject wrong owner/root/scope/version, duplicate or oversized registrations, asserted health/production qualification, nonempty qualified operations, redirect/authentication/parse failures, and oversized bodies. Missing configuration remains unavailable without inventory fallback. Tests must exercise these failure boundaries.
