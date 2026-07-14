# Business Repo Alignment

This document tracks alignment between `conxius-platform` (public) and `conxian-business` (private).

---

## Repository Status

| Repo | Visibility | Purpose | Last Push |
|------|------------|---------|------------|
| `conxian-business` | **Private** | Strategy, legal, operations | 2026-07-14 |

---

## Known Cross-References

### From conxian-business

| Document | Reference | Platform Action |
|----------|-----------|----------------|
| `docs/OPERATING_MODEL_LIFECYCLE_CONTROL_OWNERSHIP.md` | Lifecycle control gates | Implement per spec |
| `apps/control-plane` scaffold | BOS admin interface | Align API contracts |
| PR #702 | Lifecycle control | Review and implement |

### From conxius-platform

| Document | Reference | Business Action |
|----------|-----------|----------------|
| `REPO_BOUNDARY_CONTRACT_V1.md` | Platform owns control-plane | No business logic here |
| `CI_CD_BASELINE_GAP_ANALYSIS.md` | CodeQL rollout needed | Add to private repo |

---

## Alignment Requirements

### 1. Lifecycle Control Gates

The business repo references lifecycle control ownership. Platform implements:

```typescript
// Implemented in conxius-platform
interface LifecycleControlGate {
  name: string;
  status: 'pass' | 'fail' | 'pending';
  evidence: string[];
  timestamp: string;
}
```

**Required from conxian-business:**
- Approval of lifecycle control ownership boundaries
- Definition of control-plane vs business logic boundary

### 2. Control Plane Architecture

Platform owns control-plane per boundary contract:

```
┌─────────────────────────────────────────────┐
│           conxian-business (Private)         │
│  - Strategy & legal docs                   │
│  - Operational playbooks                   │
│  - apps/control-plane scaffold             │
└────────────────────┬──────────────────────┘
                     │ API contracts
┌────────────────────▼──────────────────────┐
│          conxius-platform (Public)          │
│  - Deployment orchestration                 │
│  - Lifecycle control gates                │
│  - Cross-repo verification                │
│  - Control-plane telemetry                │
└─────────────────────────────────────────────┘
```

### 3. Business Operations System (BOS)

From enhancement reports, BOS requires:

| Component | Location | Status |
|------------|----------|--------|
| Control-plane scaffold | conxian-business | Pending |
| Admin interface | conxian-business | Pending |
| API contracts | conxius-platform | Defined |

---

## Enhancement Recommendations

### 1. Standardize API Contracts

Both repos should share:

```typescript
// Shared contract for control-plane operations
interface ControlPlaneContract {
  lifecycle: {
    getStatus(): Promise<GateStatus[]>;
    submitEvidence(sha: string, evidence: Evidence[]): Promise<void>;
  };
  deployment: {
    getHistory(): Promise<Deployment[]>;
    promote(source: string, target: string): Promise<void>;
  };
  telemetry: {
    ingest(metrics: Metrics[]): Promise<void>;
    query(filter: Query): Promise<Metrics[]>;
  };
}
```

### 2. Cross-Repo CI/CD Alignment

| Component | conxian-business | conxius-platform |
|------------|------------------|-----------------|
| CodeQL | Needs setup | ✅ Implemented |
| Dependabot | Needs setup | ✅ Implemented |
| Lifecycle gates | Needs alignment | ✅ Implemented |
| Secret scanning | Needs setup | ✅ Implemented |

### 3. Shared Workflows

Create reusable workflows in `.github` that both repos can use:

```yaml
# .github/workflows/reusable-lifecycle-control.yml
name: Reusable Lifecycle Control
on:
  workflow_call:
    inputs:
      repo:
        required: true
        type: string
jobs:
  gates:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - run: pnpm run check:lifecycle-control
```

---

## Action Items

### Platform (conxius-platform)

- [x] Define boundary contract with business repo
- [x] Implement lifecycle control gates
- [x] Document control-plane ownership
- [ ] Export API contracts for business repo consumption
- [ ] Add webhook triggers for business repo events

### Business (conxian-business) — *Private repo actions*

- [ ] Scaffold `apps/control-plane` for BOS admin interface
- [ ] Align CI/CD with platform baselines
- [ ] Implement shared workflow consumption
- [ ] Define business logic vs control-plane boundaries
- [ ] Add lifecycle control evidence requirements

---

## Communication Channels

| Channel | Purpose |
|---------|---------|
| GitHub Issues | Cross-repo tracking (use prefix `[BUSINESS]`) |
| PR Reviews | Design alignment for control-plane changes |
| CODEOWNERS | Boundary enforcement |

---

## Next Steps

1. **Coordinate with business repo maintainers** to align `apps/control-plane` scaffold
2. **Export control-plane API contracts** from platform for business consumption
3. **Establish webhook integration** for cross-repo lifecycle events
4. **Audit business logic** in conxian-business for control-plane contamination

---

© 2026 Conxian Labs. Code is Law.
