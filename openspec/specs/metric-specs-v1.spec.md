# Specification: Metric Specs v1 (Ownership and Data Contracts)

## 1. Overview

This specification defines the canonical v1 semantics for the platform metrics `C_R`, `O_C`, `V_X`, `A_S`, and `N_E`.

Implementations that compute, review, or operationalize these metrics MUST use this specification as the source of truth for definitions, formulas, function ownership, source datasets/queries, refresh cadence, and required data contracts/dependencies.

## 2. Normative terms

The key words **MUST**, **MUST NOT**, **SHOULD**, and **MAY** are to be interpreted as normative requirements.

## 3. Provenance and governance

Canonical semantics in this spec are derived from:

- https://github.com/Conxian/conxian-business/issues/692
- https://github.com/Conxian/conxian-business/issues/692#issuecomment-4452181363

Owner assignment in v1 MUST remain at function level. Named individual DRIs SHOULD be assigned in a follow-up governance artifact and MUST NOT silently replace function ownership in this v1 specification.

## 4. Cross-metric requirements

For each metric defined in Section 5, implementations MUST capture and maintain the following fields:

1. Metric definition.
2. Formula.
3. Owner function.
4. Data source/query.
5. Refresh cadence.
6. Required data contracts/dependencies.

Refresh schedules MUST be interpreted in UTC where explicit timestamps are provided.

## 5. Metric specifications

### 5.1 `C_R` — Cost of Reproduction

**Definition:** `C_R` measures defensibility via weighted architecture moat components.

**Formula (MUST):**

`C_R = 0.35*TEE + 0.25*Clarity + 0.20*Compliance + 0.20*IntegrationStickiness`

`TEE`, `Clarity`, `Compliance`, and `IntegrationStickiness` component scores MUST each be in the `0-100` range, and computed `C_R` output MUST be in the `0-100` range.

**Owner function (MUST):** `Architecture`

**Data source/query (MUST):** weekly snapshot from `architecture_moat_scorecard` using fields `tee_score`, `clarity_score`, `compliance_score`, and `integration_stickiness_score`.

**Refresh cadence (MUST):** weekly at Monday `00:00 UTC`.

**Required data contracts/dependencies (MUST):**

- Weekly scorecard publish MUST include all four component scores.
- Weekly scorecard publish MUST include evidence links for the components.
- Integration registry MUST be current for the same week as the score snapshot.

### 5.2 `O_C` — Opportunity Cost

**Definition:** `O_C` measures founder manual effort consumed by critical-path workflows during the reporting period.

**Formula (MUST):**

`O_C = SUM(manual_hours)` for founder-owned critical-path workflows in period.

**Owner function (MUST):** `Ops`

**Data source/query (MUST):** `founder_worklog` plus Linear tasks tagged `critical-path`, using a weekly rollup query.

**Refresh cadence (MUST):** daily refresh with weekly review.

**Required data contracts/dependencies (MUST):**

- Founder-critical workflows MUST log duration and `critical_path=true`.
- Linear workflow-state mapping MUST remain stable for rollup interpretation.

### 5.3 `V_X` — Execution Velocity

**Definition:** `V_X` measures completed weighted scope normalized by recent median cycle time.

**Formula (MUST):**

`V_X = completed_weighted_scope_7d / NULLIF(median_cycle_time_days_7d, 0)`

**Owner function (MUST):** `Engineering`

**Data source/query (MUST):** `engineering_flow_metrics` derived from GitHub PR merges plus Linear completed scope and lead time.

**Refresh cadence (MUST):** daily refresh with weekly review.

**Required data contracts/dependencies (MUST):**

- Every merged PR MUST map to a Linear work item.
- Completed Linear items MUST include the scope weighting field.

### 5.4 `A_S` — System Autonomy

**Definition:** `A_S` measures the share of recurring runs executed autonomously.

**Formula (MUST):**

`A_S = automated_recurring_runs_7d / total_recurring_runs_7d`

**Owner function (MUST):** `BOS/Automation`

**Data source/query (MUST):** `automation_run_events` with fields `workflow_id`, `run_mode`, `status`, and `recovery_minutes`.

**Refresh cadence (MUST):** daily refresh with weekly review.

**Required data contracts/dependencies (MUST):**

- `automation_run_events` schema MUST include `workflow_id`, `run_mode`, `status`, and `recovery_minutes`.
- Gate dependencies MUST enforce `>=99.5%` reconciliation.
- Gate dependencies MUST enforce autonomous recovery time `<=15m`.

### 5.5 `N_E` — Network Effects

**Definition:** `N_E` measures average uplift for enterprises onboarded in the trailing 30-day window, based on participant outcome improvements.

**Formula (MUST):**

`N_E = AVG(existing_participant_uplift_pct)` over enterprises onboarded in trailing 30d, where:

`uplift_pct = max(cost_reduction_pct, liquidity_depth_increase_pct)`

**Owner function (MUST):** `Growth/Protocol`

**Data source/query (MUST):** `network_outcomes` plus enterprise onboarding registry and jurisdiction dimension.

**Refresh cadence (MUST):** weekly using a trailing 30-day window.

**Required data contracts/dependencies (MUST):**

- Active enterprise-node registry MUST be maintained by jurisdiction.
- Attributable participant-outcome dataset MUST be available for onboarded enterprises.
- Thresholds MUST include at least `>=5` active enterprise nodes across `>=2` jurisdictions.
- Per-enterprise uplift threshold MUST be either `>=3%` cost reduction or `>=5%` liquidity depth over the trailing 30-day window.
