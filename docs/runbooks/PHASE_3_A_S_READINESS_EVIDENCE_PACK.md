# Phase 3 `A_S` Readiness Evidence Pack (Issue #700)

Refs #700

## 1) Gate definition and scope

This document defines the evidence bundle required to evaluate the Phase 3 `A_S` readiness gate for the SIDL reference implementation currently hosted in `services/admin-dashboard`.

### In-scope
- SIDL endpoint telemetry emitted by `services/admin-dashboard/src/lib/sidl/observability.ts`.
- Metric exposure at `services/admin-dashboard/src/app/api/metrics/route.ts` (`/api/metrics`).
- Prometheus scrape + alert rule wiring from `prometheus.yml` and `prometheus-alerts.yml`.
- Recovery drill evidence from existing runbooks under `docs/runbooks/`.

### Out of scope (for this pack)
- New instrumentation or alert implementation changes.
- Onchain settlement readiness (SIDL checkout is still documented as reference implementation).
- Cross-service SLO definition beyond the SIDL Admin Dashboard telemetry path.

### `A_S` mapping still requiring owner confirmation

`A_S` is not currently defined in a canonical spec file in this repository. This pack therefore treats `A_S` as a **Phase 3 readiness evidence gate** for the existing SIDL telemetry and drill surfaces, pending owner confirmation on the points below.

| Confirmation needed | Why it matters | Current state |
| --- | --- | --- |
| Canonical expansion of `A_S` acronym and policy intent | Determines whether this gate is release-blocking, advisory, or phase-only | Not defined in `openspec/specs/` or runbook corpus |
| Exact system boundary for Phase 3 gate | Confirms if gate applies only to `services/admin-dashboard` SIDL surfaces or broader platform services | Issue #700 scope is telemetry + runbook evidence, but not boundary-explicit |
| Severity semantics for gate failure | Determines if warning alerts (`SIDLAdminDashboardFailureBurst`, `SIDLAdminDashboardLatencyP95High`) are hard-fail or escalation-only | No owner-approved rule in current docs |
| Observation window required for sign-off | Needed to make pass/fail repeatable (for example, 24h pre-release window) | Not specified in issue/runbooks |

## 2) Telemetry threshold evidence table

The thresholds below are taken directly from `prometheus-alerts.yml`, with metric provenance linked to SIDL observability code and scrape wiring.

| Gate signal | Concrete threshold (as implemented) | Metric source | Required evidence artifact | Repo sources |
| --- | --- | --- | --- | --- |
| SIDL failure burst | `sum by (endpoint, method) (increase(admin_dashboard_sidl_failures_total[10m])) >= 5` for `10m` | `admin_dashboard_sidl_failures_total` counter (labels include `endpoint`, `method`, `category`) | Prometheus query export/screenshot showing rule state and evaluated value for each affected endpoint/method | `prometheus-alerts.yml`; `services/admin-dashboard/src/lib/sidl/observability.ts`; `services/admin-dashboard/src/app/api/metrics/route.ts` |
| SIDL p95 latency high | `histogram_quantile(0.95, sum by (le, endpoint, method) (rate(admin_dashboard_sidl_request_duration_seconds_bucket[10m]))) > 1` for `15m` | `admin_dashboard_sidl_request_duration_seconds` histogram (`DURATION_BUCKETS` includes `...0.5, 1, 2, 5`) | Prometheus query export/screenshot showing p95 by endpoint/method and alert state | `prometheus-alerts.yml`; `services/admin-dashboard/src/lib/sidl/observability.ts` |
| Invalid checkout payment header spike | `sum(increase(admin_dashboard_sidl_checkout_payment_header_total{category="invalid"}[10m])) >= 3` for `10m` | `admin_dashboard_sidl_checkout_payment_header_total` counter; `invalid` set when `PAYMENT-SIGNATURE` fails route validation | Alert evidence + sample request/response artifact proving invalid header classification path | `prometheus-alerts.yml`; `services/admin-dashboard/src/lib/sidl/observability.ts`; `services/admin-dashboard/src/app/api/cart/mandates/[id]/checkout/route.ts` |
| Telemetry scrape/eval cadence | `scrape_interval: 15s`, `evaluation_interval: 15s`; scrape job `conxian-admin-dashboard` uses `metrics_path: /api/metrics` | Prometheus scrape config + metrics endpoint | Config snapshot + successful `GET /api/metrics` payload capture | `prometheus.yml`; `services/admin-dashboard/src/app/api/metrics/route.ts` |

### Metric provenance map (code-level)

| Metric | Emitted from | Primary labels |
| --- | --- | --- |
| `admin_dashboard_sidl_requests_total` | `observe()` in `services/admin-dashboard/src/lib/sidl/observability.ts` | `endpoint`, `method`, `outcome`, `status_code` |
| `admin_dashboard_sidl_request_duration_seconds` | `observeHistogram()` path in same file | `endpoint`, `method`, `outcome` |
| `admin_dashboard_sidl_failures_total` | `observe()` when `errorCategory` is present | `endpoint`, `method`, `category` |
| `admin_dashboard_sidl_checkout_payment_header_total` | `observe()` when `paymentHeaderCategory` is present | `endpoint`, `category` |

## 3) Recovery drill / runbook evidence table

| Drill objective | Existing runbook source | Required evidence artifacts | Verifiable pass condition |
| --- | --- | --- | --- |
| Triage elevated failure/latency alerts | `docs/runbooks/SIDL_ENDPOINT_MONITORING_RUNBOOK.md` (`On-call Response`, `Evidence Requirements`) | 1) Dashboard/query export, 2) firing alert name + timestamp, 3) structured log sample with `event: "sidl.endpoint"`, endpoint, status, and optional error category | Artifacts show signal identification and documented triage action path for the triggered endpoint/method |
| Validate x402 challenge path (`402`) and settlement path (`200`) | `docs/runbooks/SIDL_RELEASE_READINESS_RUNBOOK.md` (`Verification Steps` 4 and 5) | Header/body captures for `402` and `200` checks, including decoded `PAYMENT-REQUIRED` payload | Both paths succeed with expected headers (`PAYMENT-REQUIRED`, `PAYMENT-RESPONSE`) and payload semantics |
| Exercise rollback readiness for failed verification | `docs/runbooks/SIDL_RELEASE_READINESS_RUNBOOK.md` (`Rollback Action`) | Rollback record containing trigger condition, timestamp, and owner plus rollback command/log references | Rollback steps are executable and recorded with ownership + timeline |
| Re-run cross-repo integration confidence lane after incident remediation | `docs/runbooks/CROSS_REPO_INTEGRATION_HARNESS_MVP.md` | Harness logs/artifacts under `test-results/cross-repo-harness-mvp/` | Harness completes all contract checks with pass status |

## 4) Pass/fail matrix (verifiable evidence pointers)

| Gate ID | Criterion | PASS when | FAIL when | Evidence pointers |
| --- | --- | --- | --- | --- |
| `A_S-01` | Gate mapping confirmation | Owner confirms canonical `A_S` meaning, scope boundary, and severity semantics for this gate | Any of the above remains undefined | Issue #700 decision comment + this document section `A_S mapping still requiring owner confirmation` |
| `A_S-02` | Telemetry path integrity | `/api/metrics` returns Prometheus payload and Prometheus is configured to scrape `conxian-admin-dashboard` on `/api/metrics` at 15s intervals | Metrics endpoint unreachable, payload malformed, or scrape path mismatch | `services/admin-dashboard/src/app/api/metrics/route.ts`; `prometheus.yml`; captured `/api/metrics` payload |
| `A_S-03` | Threshold rules present and evaluable | All three SIDL alert rules exist with expected expressions and metric names | Any rule or required metric reference is missing/drifted | `prometheus-alerts.yml`; `services/admin-dashboard/src/lib/sidl/observability.ts` |
| `A_S-04` | Recovery drill evidence completeness | Monitoring + readiness runbook artifacts are collected for alert triage and both checkout paths | Missing required drill artifacts or incomplete path coverage | `docs/runbooks/SIDL_ENDPOINT_MONITORING_RUNBOOK.md`; `docs/runbooks/SIDL_RELEASE_READINESS_RUNBOOK.md` |
| `A_S-05` | Regression confidence after drill/remediation | Cross-repo harness run completes and artifact set is preserved | Harness fails any contract check or artifacts missing | `docs/runbooks/CROSS_REPO_INTEGRATION_HARNESS_MVP.md`; `test-results/cross-repo-harness-mvp/` |
| `A_S-06` | Gap ownership captured | Missing instrumentation/documentation gaps are prioritized and assigned follow-up actions | Gaps are untracked or unowned | Section `Missing instrumentation/documentation register` below |

## 5) Missing instrumentation/documentation register

| Priority | Gap | Evidence in current repo | Risk to gate confidence | Recommended next action |
| --- | --- | --- | --- | --- |
| `P0` | `A_S` acronym, boundary, and severity semantics are not owner-confirmed in canonical spec docs | No canonical `A_S` definition in `openspec/specs/`; issue #700 provides scope but not policy semantics | Gate outcomes can be interpreted inconsistently across reviewers | Add owner decision note to issue #700 and update this pack with confirmed semantics |
| `P1` | Dashboard/query-as-code artifacts are not versioned in-repo | Monitoring runbook requires dashboard/query evidence, but no dashboard JSON/PromQL artifact file is committed | Evidence collection remains manual and potentially non-repeatable | Add versioned dashboard + query definitions (for example under `ops/monitoring/`) and link from runbook |
| `P1` | Metrics endpoint/payload lacks dedicated tests | Existing tests cover frames/x402/persistence, but no test references `sidlMetricsSnapshot` or `/api/metrics` route | Telemetry-format regressions may ship unnoticed | Add `services/admin-dashboard/src/tests/observability.test.ts` to assert metric names, labels, and content type |
| `P1` | Release readiness caveat appears stale vs persistence implementation | `SIDL_RELEASE_READINESS_RUNBOOK.md` says vote tallies reset on restart; state persistence is implemented in `stateStore.ts` and validated in `sidlPersistence.test.ts` | Operators may make incorrect recovery assumptions | Update release runbook limitations to reflect file-backed persistence behavior and remaining caveats |
| `P2` | No composite, machine-evaluable `A_S` gate rule | `prometheus-alerts.yml` contains individual signal alerts only | Gate review remains manual and error-prone | Add composite recording/alert rule or CI evidence checker that computes gate status |
| `P2` | No minimum traffic floor criterion before evaluating latency/failure alerts | Alert rules do not enforce request-volume minimums | Gate can appear healthy during low/zero traffic windows | Add request-volume threshold evidence requirement (for example, minimum request count over observation window) |

## 6) Recommended evidence bundle checklist for sign-off

Use this checklist when preparing a concrete gate decision:

- [ ] Owner-confirmed `A_S` mapping comment linked in issue #700.
- [ ] `/api/metrics` payload capture from active environment.
- [ ] Alert/query exports for all three threshold rules.
- [ ] Recovery drill artifacts (monitoring triage + 402/200 checkout paths + rollback record).
- [ ] Post-drill harness artifact bundle (`test-results/cross-repo-harness-mvp/`).
- [ ] Updated gap register with owners and target dates for any unresolved `P0/P1` item.
