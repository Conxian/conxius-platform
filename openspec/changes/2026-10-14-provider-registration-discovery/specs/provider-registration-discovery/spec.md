## ADDED Requirements

### Requirement: Diagnostic registrations remain non-authoritative
The platform SHALL validate provider registration manifests independently of health and SHALL NOT infer production support or value-operation authorization from registration counts.

#### Scenario: Registration declares qualified operations
- **WHEN** a registration manifest asserts healthy/production-supported state or nonempty qualified operations
- **THEN** diagnostic ingestion SHALL reject it as incompatible

### Requirement: Bound configured provider reads
The platform SHALL use configured HTTPS endpoints and explicit server-side bearer credentials, refuse redirects, enforce a five-second request timeout and 32 KiB response bound, and return unavailable evidence on failure.

#### Scenario: Upstream is missing or incompatible
- **WHEN** configuration, authentication, exact owner/schema/root/scope, or bounded response validation fails
- **THEN** the platform SHALL expose unavailability with no registry fallback or production qualification
