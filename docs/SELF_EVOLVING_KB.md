# Self-Evolving Knowledge Base

This document defines the architecture for a knowledge base that continuously learns, adapts, and self-evolves from internal repository activity and external research.

---

## Vision

The Conxian knowledge base (AGENTS.md) should be a **living system** that:
1. **Ingests** data from internal (GitHub, CI/CD, code) and external sources (research, news, protocols)
2. **Analyzes** patterns, gaps, and opportunities automatically
3. **Synthesizes** insights from accumulated data
4. **Updates** itself with minimal human intervention

---

## Data Sources

### Readiness rule: durable side effects

Knowledge-base entries about settlement authorization MUST distinguish local
orchestration state from externally durable authority. For ZKCP key release,
exactly-once is a backend contract: the selected backend must publish versioned
obligation/registry capability metadata, lookup-by-obligation and atomic claim
semantics, a pinned registry namespace, and an idempotent release guarantee.
The obligation id is derived from the canonical encrypted-data commitment plus
stable seller/buyer identity; mutable settlement terms use a separate bounded
binding digest/key and conflict rather than creating a second obligation. Key-
release evidence is recorded only as bounded canonical JSON with an exact flat
primitive schema. Process-local latches, caches, or evidence are optimization
signals only and must not be recorded as proof of cross-restart exactly-once
behavior. The checked-in unavailable adapter remains the source-of-truth
default until an external backend is independently accepted.

### Internal Sources (Repository)

| Source | Frequency | Data Points |
|--------|-----------|-------------|
| GitHub API | Real-time | Commits, PRs, issues, reviews, comments |
| CI/CD Pipelines | Per-run | Test results, coverage, build times |
| Code Metrics | Weekly | File counts, complexity, dependencies |
| API Routes | Per-change | New endpoints, deprecations |
| Test Coverage | Per-run | Files covered, lines covered, new tests |
| Security Scans | Weekly | Vulnerabilities, secrets, dependencies |

### External Sources (Research)

| Source | Frequency | Data Points |
|--------|-----------|-------------|
| Tavily Research | On-demand | Protocol updates, Bitcoin/Stacks news |
| GitHub Trending | Daily | New tools, libraries, patterns |
| Stacks/Bitcoin RSS | Daily | Protocol releases, BIPs |
| Security Advisories | Weekly | CVE notifications, patches |
| Competitor Analysis | Monthly | Platform comparisons, features |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SELF-EVOLVING KNOWLEDGE BASE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │   Internal   │    │  External   │    │   Agent     │                 │
│  │   Ingestion  │    │  Ingestion  │    │  Sessions  │                 │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                 │
│         │                   │                   │                        │
│         └───────────┬───────┴───────────────────┘                        │
│                     ▼                                                     │
│         ┌───────────────────────┐                                         │
│         │    Knowledge Store    │                                         │
│         │  (JSON/Graph DB)    │                                         │
│         └───────────┬───────────┘                                         │
│                     │                                                     │
│         ┌───────────┴───────────┐                                         │
│         ▼                       ▼                                         │
│  ┌─────────────┐    ┌─────────────────────┐                              │
│  │  Pattern    │    │   Gap Analysis       │                              │
│  │  Detection  │    │   & Intelligence    │                              │
│  └──────┬─────┘    └─────────┬───────────┘                              │
│         │                     │                                           │
│         └──────────┬──────────┘                                           │
│                    ▼                                                      │
│         ┌───────────────────────┐                                         │
│         │   Synthesis Engine   │                                         │
│         └───────────┬───────────┘                                         │
│                     │                                                     │
│         ┌───────────┴───────────┐                                         │
│         ▼                       ▼                                         │
│  ┌─────────────┐    ┌─────────────────────┐                              │
│  │  Update     │    │   Auto-PR           │                              │
│  │  Drafting   │    │   Generation        │                              │
│  └─────────────┘    └─────────────────────┘                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Components

### 1. Knowledge Store (`src/kb/knowledge-store.ts`)

```typescript
interface KnowledgeEntry {
  id: string;
  category: 'pattern' | 'gap' | 'insight' | 'metric' | 'research';
  source: 'internal' | 'external' | 'agent' | 'synthesis';
  data: Record<string, unknown>;
  confidence: number; // 0-1
  lastUpdated: Date;
  tags: string[];
  evidence: string[];
}

interface KnowledgeGraph {
  entries: Map<string, KnowledgeEntry>;
  relationships: Map<string, string[]>; // entryId -> related entryIds
  version: number;
}
```

### 2. Internal Ingestion Service

```typescript
// Ingest from GitHub
async function ingestGitHubActivity() {
  const events = await fetchGitHubEvents();
  for (const event of events) {
    const entry = transformEventToEntry(event);
    await knowledgeStore.add(entry);
  }
}

// Ingest from CI/CD
async function ingestCIResults() {
  const runs = await fetchWorkflowRuns();
  for (const run of runs) {
    const metrics = extractMetrics(run);
    await updateMetricEntry('ci', metrics);
  }
}
```

### 3. External Research Agent

```typescript
// Weekly research synthesis
async function runWeeklyResearch() {
  const queries = [
    'Stacks Nakamoto upgrade 2024',
    'Bitcoin L2 developments',
    'DeFi protocol releases',
    'Security vulnerabilities in web3'
  ];
  
  for (const query of queries) {
    const results = await tavilyResearch(query);
    const insights = synthesizeExternalResearch(results);
    await knowledgeStore.addAll(insights);
  }
}
```

### 4. Pattern Detection Engine

```typescript
// Detect patterns from commit history
function detectPatterns(entries: KnowledgeEntry[]): Pattern[] {
  const commits = entries.filter(e => e.category === 'metric' && e.source === 'internal');
  
  return [
    // Code growth patterns
    detectCodeGrowth(commits),
    // Test coverage trends
    detectCoverageTrend(commits),
    // Issue resolution patterns
    detectIssuePatterns(commits),
    // Dependency updates
    detectDependencyPatterns(commits),
  ];
}
```

### 5. Gap Analysis Intelligence

```typescript
interface GapAnalysis {
  identified: Gap[];
  resolved: Gap[];
  emerging: Gap[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// Continuous gap scanning
function analyzeGaps(knowledge: KnowledgeGraph): GapAnalysis {
  const gaps = [];
  
  // Check for undocumented features
  for (const file of getSourceFiles()) {
    if (!isDocumented(file)) {
      gaps.push({ type: 'undocumented', file });
    }
  }
  
  // Check for outdated patterns
  for (const pattern of getPatterns()) {
    if (isOutdated(pattern)) {
      gaps.push({ type: 'outdated', pattern });
    }
  }
  
  // Check for security gaps
  for (const vulnerability of getVulnerabilities()) {
    gaps.push({ type: 'security', vulnerability });
  }
  
  return { identified: gaps, resolved: [], emerging: [], priority: 'medium' };
}
```

### 6. Synthesis Engine

```typescript
interface SynthesisReport {
  period: string;
  insights: Insight[];
  recommendations: Recommendation[];
  kbUpdates: KBUpdate[];
}

// Monthly synthesis
async function synthesizeKnowledge(period: { start: Date; end: Date }) {
  const data = await knowledgeStore.query({
    dateRange: period,
    categories: ['pattern', 'gap', 'metric', 'research']
  });
  
  return {
    insights: generateInsights(data),
    recommendations: generateRecommendations(data),
    kbUpdates: generateUpdates(data),
  };
}
```

### 7. Auto-Update Generator

```typescript
interface KBUpdate {
  section: string;
  current: string;
  proposed: string;
  evidence: string[];
  confidence: number;
}

// Generate AGENTS.md updates
function generateUpdate(entry: KnowledgeEntry): KBUpdate | null {
  switch (entry.category) {
    case 'pattern':
      return updatePatternSection(entry);
    case 'gap':
      return updateGapsSection(entry);
    case 'metric':
      return updateMetricsSection(entry);
    case 'research':
      return updateDiscoveriesSection(entry);
  }
}

// Create PR with updates
async function createUpdatePR(updates: KBUpdate[]) {
  const diff = generateDiff(updates);
  await createPR({
    title: 'chore(kb): auto-evolution updates',
    body: generateUpdateBody(updates),
    changes: diff
  });
}
```

---

## Automation Triggers

### Real-Time (Webhook-Driven)

| Trigger | Action |
|---------|--------|
| Push to main | Ingest commits, detect patterns |
| PR merged | Update patterns, resolve gaps |
| Issue created | Add to gap analysis |
| Issue closed | Mark gap as resolved |
| Workflow completed | Ingest metrics, coverage |

### Scheduled (Cron Jobs)

| Schedule | Task |
|----------|------|
| Every hour | GitHub activity sync |
| Daily (02:00 UTC) | External research run |
| Daily (04:00 UTC) | Pattern detection |
| Weekly (Monday 06:00 UTC) | Full synthesis + KB update |
| Monthly (1st, 06:00 UTC) | Comprehensive review + auto-PR |

---

## GitHub Actions Workflow

```yaml
# .github/workflows/kb-evolution.yml
name: Knowledge Base Evolution

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday at 06:00 UTC
  workflow_dispatch:

jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Ingest GitHub Data
        run: node scripts/kb/ingest-github.ts
      
      - name: Ingest CI Metrics
        run: node scripts/kb/ingest-ci.ts
      
      - name: Run Pattern Detection
        run: node scripts/kb/detect-patterns.ts
      
      - name: Gap Analysis
        run: node scripts/kb/analyze-gaps.ts

  research:
    runs-on: ubuntu-latest
    needs: ingest
    steps:
      - uses: actions/checkout@v4
      
      - name: External Research
        run: node scripts/kb/external-research.ts
      
      - name: Synthesis
        run: node scripts/kb/synthesize.ts

  update:
    runs-on: ubuntu-latest
    needs: research
    if: github.event_name == 'schedule'
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate KB Updates
        run: node scripts/kb/generate-updates.ts
      
      - name: Create Update PR
        run: node scripts/kb/create-pr.ts
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Knowledge Categories

### 1. Patterns (auto-detected)
- Code patterns (imports, exports, types)
- Testing patterns
- Deployment patterns
- API patterns

### 2. Gaps (auto-identified)
- Undocumented features
- Missing tests
- Security vulnerabilities
- Dependency updates needed
- Outdated patterns

### 3. Metrics (auto-tracked)
- Test coverage %
- API route count
- Workflow count
- File counts
- Dependency versions

### 4. Research (external synthesis)
- Protocol updates
- Security advisories
- Best practices
- Tool recommendations

### 5. Insights (synthesized)
- Trend analysis
- Risk assessments
- Optimization recommendations
- Architecture suggestions

---

## Quality Gates

Before any auto-update PR is merged:

1. **Confidence Threshold**: Updates must have ≥0.8 confidence
2. **Human Review**: Required for critical/high priority updates
3. **Validation**: Must pass `npx tsc --noEmit` and tests
4. **No Regression**: Cannot remove existing documented patterns without evidence

---

## Fallback Mechanisms

If auto-evolution fails:

1. **Partial Ingestion**: Continue with available data
2. **Conservative Updates**: Only update metrics, not patterns
3. **Alert**: Notify via GitHub issue if KB is stale >7 days
4. **Manual Override**: Always allow manual updates via PR

---

## Metrics for KB Health

| Metric | Target | Action if Missed |
|--------|--------|------------------|
| Update frequency | Weekly | Run emergency synthesis |
| Pattern coverage | >90% | Audit undocumented code |
| Gap resolution time | <14 days | Escalate to team |
| Research currency | <7 days | Trigger external research |
| Confidence average | >0.7 | Improve evidence collection |

---

## Future Enhancements

1. **Graph Database**: Move from JSON store to Neo4j for relationship mapping
2. **ML Classification**: Use embeddings for semantic pattern matching
3. **Predictive Gaps**: AI predicts gaps before they become issues
4. **Cross-Repo Learning**: Share patterns across Conxian org repos
5. **Natural Language Updates**: Auto-generate prose for KB updates

---

## Quick Start

To enable self-evolution:

1. Add `GITHUB_TOKEN` secret (already available)
2. Merge this workflow into `.github/workflows/`
3. Adjust confidence thresholds in `scripts/kb/config.ts`
4. Review first auto-PR within 7 days

---

© 2026 Conxian Labs. Code is Law.
