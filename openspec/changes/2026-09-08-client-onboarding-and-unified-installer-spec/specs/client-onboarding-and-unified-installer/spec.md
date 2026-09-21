# Client Onboarding and Unified Installer Capability

## ADDED Requirements

### Requirement: Enterprise Client System Configuration
The platform MUST provide a declarative client installer configuration generator and validator (`installer.ts`) that validates client inputs and generates aligned deployment parameters.

#### Scenario: Validating client installer configuration
- **Given** valid client infrastructure inputs including database URI, RPC endpoints, and M2M API token
- **When** the installer configuration is generated
- **Then** the configuration MUST pass validation and bind the client M2M token with required operational scopes.

#### Scenario: Rejecting invalid client installer inputs
- **Given** missing or invalid database URI or RPC endpoints
- **When** installer configuration validation is invoked
- **Then** the installer MUST fail-closed and return actionable validation error diagnostics.

### Requirement: Pre-Flight Inter-Service Connectivity Diagnostics
The platform MUST provide an automated 6-point pre-flight diagnostic harness that checks asset links across Gateway, Nexus, Database, RPC nodes, Cache, and Enclave surfaces before system boot.

#### Scenario: Executing connectivity diagnostic harness
- **Given** configured endpoints for Gateway, Nexus, Database, and RPC nodes
- **When** pre-flight diagnostics are executed
- **Then** the diagnostic harness MUST probe all asset links and emit a structured health report with connectivity status per component.

#### Scenario: Halting deployment on unreachable asset links
- **Given** an unreachable Gateway API endpoint or invalid M2M token
- **When** pre-flight diagnostics are executed
- **Then** the diagnostic harness MUST flag the failure and advise the operator on remediation steps before boot.
