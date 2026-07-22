# Spec Delta: Automatic Agent Discovery Protocol v1

This change introduces the repository-local agent discovery contracts:

- `.agents/manifest.json`
- `.agents/skills/registry.json`
- `schemas/agent-manifest.schema.json`
- `schemas/agent-skill-registry.schema.json`
- `scripts/agent-discovery.ts`

## Normative additions

1. A repository participating in this protocol MUST expose a versioned manifest at `.agents/manifest.json`.
2. Manifest context entries MUST be explicit, repository-relative, unique, and declared with unique priorities in strict ascending order across required entries followed by optional entries.
3. The required context allowlist MUST include `AGENTS.md`, `GOVERNANCE.md`, `docs/AGENT_ONBOARDING.md`, and `docs/SESSION_CONTINUITY.md` for this repository.
4. A manifest MUST reference a versioned metadata-only skill registry. Registry entries MUST not define automatic execution commands or hooks.
5. Discovery implementations MUST reject unsupported protocol major versions and unsafe paths, including paths that resolve through symlinks outside the repository root.
6. Required context and selected/default active skills MUST fail closed when missing or invalid. Optional context MAY be absent and MUST produce a warning; its content is loaded only when explicitly requested.
7. Discovery MUST be zero-network, deterministic by default, and limited to declared files; it MUST NOT scan unrelated repository content or execute skill content.
8. The `agent-onboarding` skill MUST be discoverable as metadata plus inert content and MUST remain manually activated.

Issue #1163 swarm coordination remains a separate follow-up and is not implemented by this delta.
