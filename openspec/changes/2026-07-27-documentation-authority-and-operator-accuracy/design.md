# Design: Documentation Authority and Operator Accuracy Alignment

## 1. Authority-preserving audit model

The implementation will classify a candidate document before changing it:

| Class | Examples | Change rule |
| --- | --- | --- |
| Governance/canonical | `GOVERNANCE.md`, `docs/INFORMATION_HIERARCHY.md`, canonical architecture documents | Correct only demonstrable current-state errors through this approved OpenSpec change; do not change authority or tier |
| Operational | `README.md`, active runbooks, deployment and development guidance | Correct executable facts and add minimal freshness metadata where current status is asserted |
| Evidence | Published readiness/audit evidence | Preserve immutable content; use a dated addendum or an active authority/operational correction instead of rewriting evidence |
| Historical | `docs/archived-*`, archived session material, `openspec/changes/archive/` | Read-only and excluded from repair |
| Live OpenSpec | Non-archived `openspec/changes/` artifacts | Repair local links and current process references without changing completed historical meaning |

Issue #1201 is the live execution reference. Issue #1167 is referenced only
where an authority choice would otherwise be implied. The change must not use
documentation cleanup to decide whether Protocol, Nexus, Gateway, or Platform
owns a domain.

## 2. Evidence standard for current-state corrections

A present-tense correction must cite or be directly checkable against at least
one of these sources:

1. a tracked implementation/configuration file such as `package.json`, a
   workspace manifest, `Makefile`, `docker-compose.yml`, or a script;
2. an executable local command whose result is recorded during validation;
3. a governance/canonical owner document that already has authority for the
   statement; or
4. an explicitly labeled external repository or target-state reference.

If the available evidence does not determine a current fact, the document must
say that the state is unknown, external, target, proposed, or deferred. It must
not infer production readiness from a roadmap, placeholder, Compose service,
or external repository capability.

## 3. Local development truth table

The implementation will make the following distinctions explicit:

| Surface | Verified local meaning |
| --- | --- |
| `pnpm --filter admin-dashboard dev` | Direct Admin Dashboard development server; defaults to host port `3001` unless `PORT` is set |
| Docker Compose `admin-dashboard` | Host port `3002` maps to container port `3001` |
| Docker Compose `grafana` | Host port `3001` maps to Grafana container port `3000`; it is not the direct dashboard process |
| Docker Compose `gateway` | External dependency slot whose default `nginx:1.27-alpine` image is a placeholder, not a Gateway implementation |
| Docker Compose `conxian-ui` | External dependency slot whose default `nginx:1.27-alpine` image is a placeholder, not the Conxian UI implementation |
| Optional `bisq`, `rgb`, `bitvm` profiles | Nginx-backed RPC stubs selected for local harness testing, not production protocol nodes |

Compose is therefore documented as a local control-plane/integration harness.
It does not prove that external services, protocol integrations, settlement,
or a production deployment are available.

## 4. `make auth` boundary

Documentation must describe the script that `make auth` actually invokes. For
the development profile, `scripts/provision-secrets.sh`:

- uses `.env.schema` and `.env` unless explicitly overridden;
- copies the schema only when the environment file does not exist;
- may generate `GATEWAY_JWT_SECRET`, `GATEWAY_ADMIN_API_KEY`,
  `POSTGRES_PASSWORD`, and `GRAFANA_PASSWORD` when absent;
- sets the supported Postgres defaults and can derive `CORE_DB_URI`;
- creates or validates the Prometheus scrape-password file with restrictive
  permissions;
- checks selected placeholder and credential-consistency conditions; and
- treats GitHub CLI authentication as optional rather than a secret source.

It does not fetch all dashboard, service, third-party, wallet, protocol, cloud,
or production credentials. Running it is not proof that M2M authentication is
complete, that the Compose stack will be healthy, or that production secrets
are provisioned. The production-profile target remains an operator-sensitive
local script, not a production deployment mechanism.

## 5. Deployment-surface wording

Deployment documentation will use three labels consistently:

- **Current local**: tracked code/configuration that can be executed from this
  repository and is validated as a local/reference surface.
- **External**: a service, image, manifest, or deployment owned in another
  repository/environment. Documentation must name the owner or state that it is
  operator supplied.
- **Target/proposed**: NixOS, Kubernetes, GitOps, cloud, or other future
  architecture that is not implemented as a supported local path here.

Nonexistent paths must be removed rather than replaced with guessed paths.
Target architecture can remain documented, but headings and prose must not say
that it is currently deployed or production ready. The platform remains a
routing/control-plane layer: it does not take custody, sign for users, execute
trades, or convert unavailable dependencies into successful settlement.

## 6. Freshness metadata

An operational document changed because it asserts time-sensitive status or
operator behavior will receive one minimal top-of-document line:

```text
Last verified: YYYY-MM-DD
```

The date records when the relevant commands/configuration were checked, not a
blanket certification of the whole document. Canonical, evidence, historical,
and timeless reference documents do not receive metadata solely for
uniformity. Existing stronger metadata formats are preserved rather than
duplicated.

## 7. Local Markdown-link validator

The implementation will add a repository-local, deterministic validator with
these properties:

- scans tracked Markdown in active documentation and non-archived OpenSpec
  paths selected by an explicit path policy;
- excludes `docs/archived-*`, `openspec/changes/archive/`, generated/vendor
  directories, and immutable history from the repair gate;
- parses inline links, reference-style links, and local image destinations;
- resolves relative paths from the source document, including URL-decoding and
  removal of query strings/fragments before filesystem checks;
- validates local file/directory targets and, where a local fragment is
  present, validates the corresponding Markdown/HTML anchor deterministically;
- ignores network-only schemes and does not make HTTP requests;
- reports the source file, line when available, destination, and reason; and
- exits non-zero on a broken in-scope local target.

The validator will be exposed through a root package script such as
`check:markdown-links`. It will have focused tests for valid links, missing
targets, reference links, images, encoded paths, fragments, archive exclusion,
and external URLs.

## 8. CI integration

Current general CI and hygiene workflows ignore Markdown/documentation-only
changes. The implementation must therefore wire the root link-check command to
a documentation-aware CI path whose triggers include at least:

- `README.md` and other root Markdown files;
- `docs/**/*.md` excluding immutable historical paths according to the same
  policy as the validator;
- `openspec/**/*.md` and `.openspec.yaml`; and
- the validator, its tests, package script, and workflow definition.

The workflow must use pinned actions consistent with repository policy and run
without secrets or network link crawling. CI integration must not weaken or
rename unrelated required checks.

## 9. Implementation sequence and review evidence

1. Produce a machine-readable or reviewable inventory of in-scope broken links
   and stale operator claims.
2. Correct active mutable documents only, preserving authority and production
   boundaries.
3. Add freshness metadata to relevant changed operational documents.
4. Add and test the local validator, root package command, and CI path.
5. Run targeted link validation, validator tests, package checks, OpenSpec
   validation, and diff hygiene.
6. Append one implementation session-log entry to `AGENTS.md`; do not rewrite
   earlier entries.

The proposal-only commit deliberately performs none of these implementation
edits.
