# SIDL Endpoint Monitoring Runbook

## Objective
Provide baseline monitoring and on-call guidance for SIDL endpoints served by `services/admin-dashboard`.

## Covered Endpoints
- `/frames/sbtc` (`GET`, `POST`)
- `/frames/vote` (`GET`, `POST`)
- `/api/governance/votes` (`POST`)
- `/api/governance/votes/[proposalId]` (`GET`)
- `/api/cart/mandates/[id]` (`GET`)
- `/api/cart/mandates/[id]/checkout` (`GET`)

## Metrics Source
- Scrape target: `admin-dashboard:3001`
- Metrics path: `/api/metrics`
- Core metrics:
  - `admin_dashboard_sidl_requests_total`
  - `admin_dashboard_sidl_request_duration_seconds`
  - `admin_dashboard_sidl_failures_total`
  - `admin_dashboard_sidl_checkout_payment_header_total`

## Dashboard Expectations
1. **Traffic panel**: request rate by `endpoint` + `method` from `admin_dashboard_sidl_requests_total`.
2. **Latency panel**: p95 latency by `endpoint` + `method` using `admin_dashboard_sidl_request_duration_seconds`.
3. **Failure panel**: failures by `category` from `admin_dashboard_sidl_failures_total`.
4. **Checkout header panel**: `missing` / `invalid` / `accepted` from `admin_dashboard_sidl_checkout_payment_header_total`.

## Alert Expectations
Prometheus rules in `prometheus-alerts.yml` should stay enabled:
- `SIDLAdminDashboardFailureBurst` (warning)
- `SIDLAdminDashboardLatencyP95High` (warning)
- `SIDLCheckoutInvalidPaymentHeaderSpike` (critical)

## On-call Response
1. Confirm active alert and affected `endpoint`/`method` labels in Prometheus.
2. Check structured logs for `event: "sidl.endpoint"` and matching labels.
3. For checkout alerts, inspect payment header category trend:
   - `missing` growth usually signals clients not attaching signature yet.
   - `invalid` growth signals malformed or unexpected signature format.
   - `accepted` drop with high traffic indicates degraded checkout path.
4. If failure/latency persists for more than 15 minutes, escalate to backend + product on-call and add incident notes to the issue timeline.

## Evidence Requirements
- Screenshot (or query export) of impacted dashboard panels.
- Alert firing timestamp and rule name.
- Sample structured log line showing `endpoint`, `status`, and `errorCategory` (if present).
