# Gateway startup status mirror correction

Owners: Platform #1450/#1426, Gateway #466 and Business #1390/#1423. Phase R0/R1.

The convenience agent status table still treats a historical fixed owner-secret count as current Gateway deployment evidence. Remove that count and point to the Gateway-owned, revision-specific startup contract. An active registry entry does not establish a deployed/qualified operation. Preserve the registry and authority-coordination rules; no role reassignment or capability/provider change is included.

Acceptance: the active agent mirror no longer repeats the old count or infers hosted readiness. Runtime provisioning, provider evidence and normal promotion remain separate.
