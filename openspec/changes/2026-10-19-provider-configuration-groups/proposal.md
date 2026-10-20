# Complete provider configuration before diagnostic requests

Platform's provider status currently treats any one declared environment key as a configured integration. Nexus and Upstash require both endpoint and credential, while Supabase requires an endpoint and one supported public API key. Partial configuration must not cause an anonymous diagnostic request or appear transport-reachable.

Declare required groups (all groups required, alternatives within each group), preserve existing status vocabulary, and report missing names only. Entirely absent integrations remain not-configured; partial integrations are degraded with configuration evidence and no request. Fully configured probes retain bounded no-store redirect-free reads and withhold values and bodies. Registration and operation qualification remain separate, and missing optional integrations do not change the existing M2M readiness endpoint.

Verify URL-only, token-only, whitespace-only, alternative-key, provider error and recovery cases. Test that unrelated configured providers still operate when another integration is incomplete. No dependency, pricing, entitlement, custody, production health or deployment configuration is changed. Refs Platform #1426, Business #1423/#1349.
