#!/usr/bin/env -S pnpm exec tsx
/**
 * GitHub Activity Ingestion
 * 
 * Ingests commits, PRs, issues, and other GitHub activity
 * into the knowledge store.
 */

import { knowledgeStore, KnowledgeEntry, KnowledgeStore } from './knowledge-store';

interface GitHubEvent {
  type: string;
  repo: { name: string };
  payload: Record<string, unknown>;
  created_at: string;
}

interface Commit {
  sha: string;
  message: string;
  files_changed: number;
  additions: number;
  deletions: number;
  author: string;
}

async function fetchGitHubEvents(): Promise<GitHubEvent[]> {
  const response = await fetch(
    'https://api.github.com/repos/Conxian/conxius-platform/events?per_page=100',
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
      }
    }
  );
  
  if (!response.ok) {
    console.error(`GitHub API error: ${response.status}`);
    return [];
  }
  
  return response.json();
}

async function fetchRecentCommits(): Promise<Commit[]> {
  const response = await fetch(
    'https://api.github.com/repos/Conxian/conxius-platform/commits?per_page=50',
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
      }
    }
  );
  
  if (!response.ok) {
    console.error(`GitHub API error: ${response.status}`);
    return [];
  }
  
  const commits = await response.json();
  return commits.map((c: { sha: string; commit: { message: string; author: { name: string } }; stats?: { additions: number; deletions: number } }) => ({
    sha: c.sha,
    message: c.commit.message.split('\n')[0].substring(0, 100),
    files_changed: 0,
    additions: c.stats?.additions || 0,
    deletions: c.stats?.deletions || 0,
    author: c.commit.author.name
  }));
}

async function fetchOpenIssues(): Promise<number> {
  const response = await fetch(
    'https://api.github.com/repos/Conxian/conxius-platform/issues?state=open&per_page=1',
    {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
      }
    }
  );
  
  if (!response.ok) return 0;
  
  const data = await response.json();
  return Number(response.headers.get('link')?.match(/page=(\d+)/)?.[1] || data.length);
}

function detectPatternFromCommits(commits: Commit[]): KnowledgeEntry | null {
  const messages = commits.slice(0, 20).map(c => c.message);
  
  // Detect commit message patterns
  const conventionalCommits = messages.filter(m => 
    /^(feat|fix|docs|chore|refactor|perf|style|test):/.test(m)
  );
  
  const featCount = messages.filter(m => m.startsWith('feat:')).length;
  const fixCount = messages.filter(m => m.startsWith('fix:')).length;
  const docsCount = messages.filter(m => m.startsWith('docs:')).length;
  
  if (conventionalCommits.length / messages.length > 0.8) {
    return {
      id: KnowledgeStore.generateId('pattern', 'internal'),
      category: 'pattern',
      source: 'internal',
      data: {
        type: 'conventional-commits',
        coverage: conventionalCommits.length / messages.length,
        featRatio: featCount / messages.length,
        fixRatio: fixCount / messages.length,
        docsRatio: docsCount / messages.length
      },
      confidence: 0.9,
      lastUpdated: new Date().toISOString(),
      tags: ['commits', 'conventional', 'pattern'],
      evidence: ['Conventional commit format detected in >80% of recent commits']
    };
  }
  
  return null;
}

async function ingestGitHub(): Promise<void> {
  console.log('🔍 Ingesting GitHub activity...');
  
  // Fetch data
  const [events, commits, openIssues] = await Promise.all([
    fetchGitHubEvents(),
    fetchRecentCommits(),
    fetchOpenIssues()
  ]);
  
  console.log(`   - Fetched ${events.length} events`);
  console.log(`   - Fetched ${commits.length} commits`);
  console.log(`   - ${openIssues} open issues`);
  
  // Add metrics
  const metricsEntry: KnowledgeEntry = {
    id: KnowledgeStore.generateId('metric', 'internal'),
    category: 'metric',
    source: 'internal',
    data: {
      openIssues,
      recentCommits: commits.length,
      events,
      lastCommit: commits[0]?.sha || null,
      commitAuthors: [...new Set(commits.map(c => c.author))]
    },
    confidence: 0.95,
    lastUpdated: new Date().toISOString(),
    tags: ['github', 'metrics', 'activity'],
    evidence: [`${openIssues} open issues`, `${commits.length} recent commits`]
  };
  
  knowledgeStore.add(metricsEntry);
  
  // Detect patterns
  const pattern = detectPatternFromCommits(commits);
  if (pattern) {
    knowledgeStore.add(pattern);
    console.log(`   ✅ Pattern detected: ${pattern.data.type}`);
  }
  
  // Add recent commits as insight
  const commitInsight: KnowledgeEntry = {
    id: KnowledgeStore.generateId('insight', 'internal'),
    category: 'insight',
    source: 'synthesis',
    data: {
      recentCommits: commits.slice(0, 10).map(c => ({
        sha: c.sha.substring(0, 7),
        message: c.message,
        author: c.author
      })),
      summary: `${commits.length} commits analyzed`
    },
    confidence: 0.85,
    lastUpdated: new Date().toISOString(),
    tags: ['commits', 'recent', 'activity'],
    evidence: commits.slice(0, 5).map(c => c.message)
  };
  
  knowledgeStore.add(commitInsight);
  
  const stats = knowledgeStore.getStats();
  console.log(`\n📊 Knowledge Store Stats:`);
  console.log(`   Total entries: ${stats.total}`);
  console.log(`   By category:`, stats.byCategory);
  console.log(`   Last sync: ${stats.lastSync}`);
}

// Run if executed directly
if (require.main === module) {
  ingestGitHub().catch(console.error);
}

export { ingestGitHub };
