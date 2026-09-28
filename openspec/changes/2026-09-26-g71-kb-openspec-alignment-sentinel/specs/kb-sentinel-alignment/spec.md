# Knowledge Store & OpenSpec Alignment Diagnostic Capability

## ADDED Requirements

### Requirement: Fail-Closed Input & Capacity Validation
The sentinel MUST enforce strict input validation on gap evaluations and OpenSpec change records, preventing corrupted runs and capacity exhaustion.

#### Scenario: Capacity limit exceeded
- **WHEN** more than 500 gap records are submitted to a single diagnostic run
- **THEN** the engine MUST throw a fail-closed error indicating capacity bounds exceeded.

#### Scenario: Invalid status or missing ID
- **WHEN** a gap evaluation record contains an empty ID or an unrecognized status string
- **THEN** the engine MUST reject the record and throw an input validation error.

### Requirement: Multidimensional Strategic Alignment Scoring
The engine MUST compute weighted candidate alignment scores based on gap coverage, implementation cost, risk, testability, and architecture alignment.

#### Scenario: Valid metric computation
- **WHEN** candidate metrics are supplied with valid 1-10 raw sub-scores
- **THEN** the engine MUST compute a normalized weighted score strictly bounded between 0.00 and 5.00.

### Requirement: Gap Register & OpenSpec Alignment Validation
The sentinel MUST cross-reference gap entries against registered OpenSpec proposals to ensure full documentation and spec traceability.

#### Scenario: Missing OpenSpec proposal for active gap
- **WHEN** a gap is marked as 'Implemented' or 'Active Scaffolding' but has no linked OpenSpec proposal
- **THEN** the sentinel MUST generate an alignment discrepancy alert.

#### Scenario: Unlinked OpenSpec proposal
- **WHEN** an OpenSpec proposal exists in the workspace without a corresponding gap entry
- **THEN** the sentinel MUST flag an unlinked proposal alert in the diagnostic report.

### Requirement: Diagnostic Health Report Generation
The engine MUST produce structured JSON diagnostic reports and Markdown summaries detailing platform alignment metrics.

#### Scenario: Report generation
- **WHEN** a diagnostic evaluation completes successfully
- **THEN** the engine MUST output structured summary counts, overall alignment averages, and actionable recommendations.
