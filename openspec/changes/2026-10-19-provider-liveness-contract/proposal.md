# Provider liveness contract alignment

Owners: Platform #1426/#1450 and Business #1423/#1390. Phase R1.

The runtime graph review found the Platform Gateway probe still uses the historical /health route although Gateway serves /api/v1/health. The probe also follows redirects and can classify non-success redirect responses as reachable. Match the owning route, normalize origin/API-base configuration, reject ambiguous credential-bearing URLs, reject redirects and retain explicit configuration/liveness/operation-qualification distinctions. Never consume or expose provider bodies or exception details.

Acceptance: unit tests cover origin and API base, negative status/redirect/input, unavailable and configuration-only states, timeout/error redaction and separate registration evidence. Preserve real adapters, operation gates, provider ownership, runtime source identities and existing public response fields. No provider resources, secrets, custody, financial policy or service-level commitments change.
