#!/usr/bin/env -S pnpm exec tsx
/**
 * KB Update Generator
 * 
 * Generates proposed updates to AGENTS.md based on
 * accumulated knowledge entries.
 */

import { knowledgeStore, KnowledgeEntry, KnowledgeStore } from './knowledge-store';

export interface KBUpdate {
  section: string;
  current: string;
  proposed: string;
  evidence: string[];
  confidence: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

function generateMetricUpdates(): KBUpdate[] {
  const updates: KBUpdate[] = [];
  
  // Get latest metrics
  const metricEntries = knowledgeStore.query({ 
    category: 'metric',
    minConfidence: 0.8
  });
  
  if (metricEntries.length === 0) return updates;
  
  const latest = metricEntries.sort((a, b) => 
    b.lastUpdated.localeCompare(a.lastUpdated)
  )[0];
  
  const data = latest.data as Record<string, unknown>;
  
  // API Routes update
  if (data.apiRoutes !== undefined) {
    updates.push({
      section: 'Complete API Surface',
      current: `(${data.apiRoutes as number} admin routes + 2 public frames)`,
      proposed: `(~${data.apiRoutes} admin routes + 2 public frames)`,
      evidence: [`Auto-detected: ${data.apiRoutes} API routes`],
      confidence: latest.confidence,
      priority: 'low'
    });
  }
  
  // Workflows update
  if (data.workflows !== undefined) {
    updates.push({
      section: 'CI Workflows',
      current: `17 custom`,
      proposed: `~${data.workflows} custom`,
      evidence: [`Auto-detected: ${data.workflows} workflow files`],
      confidence: latest.confidence,
      priority: 'low'
    });
  }
  
  // Test files update
  if (typeof data.testFiles === 'number' && typeof data.tsFiles === 'number') {
    updates.push({
      section: 'Test Coverage',
      current: `20 test files`,
      proposed: `~${data.testFiles} test files`,
      evidence: [`Auto-detected: ${data.testFiles} test files, ${data.tsFiles} TS files`],
      confidence: latest.confidence,
      priority: 'low'
    });
  }
  
  return updates;
}

function generateGapUpdates(): KBUpdate[] {
  const updates: KBUpdate[] = [];
  
  const gapEntries = knowledgeStore.query({ 
    category: 'gap',
    minConfidence: 0.8
  });
  
  for (const entry of gapEntries) {
    const data = entry.data as Record<string, unknown>;
    
    updates.push({
      section: 'Key Gaps Still Open',
      current: 'Add entry if new critical gap found',
      proposed: `- **${data.type}**: ${data.recommendation || 'Detected gap'}`,
      evidence: entry.evidence,
      confidence: entry.confidence,
      priority: data.type === 'security' ? 'critical' : 'medium'
    });
  }
  
  return updates;
}

function generatePatternUpdates(): KBUpdate[] {
  const updates: KBUpdate[] = [];
  
  const patternEntries = knowledgeStore.query({ 
    category: 'pattern',
    minConfidence: 0.85
  });
  
  for (const entry of patternEntries) {
    const data = entry.data as Record<string, unknown>;
    
    updates.push({
      section: 'Reusable Patterns',
      current: 'Add pattern if new significant pattern detected',
      proposed: `${data.type}: ${data.description || data.convention || 'Detected pattern'}`,
      evidence: entry.evidence,
      confidence: entry.confidence,
      priority: 'low'
    });
  }
  
  return updates;
}

function generateInsightUpdates(): KBUpdate[] {
  const updates: KBUpdate[] = [];
  
  const insightEntries = knowledgeStore.query({ 
    category: 'insight',
    minConfidence: 0.8
  });
  
  // Get recent insights
  const recent = insightEntries
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
    .slice(0, 3);
  
  for (const entry of recent) {
    const data = entry.data as Record<string, unknown>;
    
    updates.push({
      section: 'Agent Learnings',
      current: 'Add learning if significant discovery',
      proposed: `- **Auto-detected**: ${data.summary || JSON.stringify(data).substring(0, 100)}`,
      evidence: entry.evidence,
      confidence: entry.confidence,
      priority: 'medium'
    });
  }
  
  return updates;
}

function generateAllUpdates(): KBUpdate[] {
  return [
    ...generateMetricUpdates(),
    ...generateGapUpdates(),
    ...generatePatternUpdates(),
    ...generateInsightUpdates()
  ].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function formatUpdatePR(): string {
  const updates = generateAllUpdates();
  
  if (updates.length === 0) {
    return '## Knowledge Base Update\n\nNo significant updates detected this cycle.';
  }
  
  const highPriority = updates.filter(u => u.priority === 'critical' || u.priority === 'high');
  const mediumPriority = updates.filter(u => u.priority === 'medium');
  const lowPriority = updates.filter(u => u.priority === 'low');
  
  let body = '## Knowledge Base Self-Evolution Update\n\n';
  body += `Generated: ${new Date().toISOString()}\n\n`;
  body += `Total updates: ${updates.length}\n\n`;
  
  if (highPriority.length > 0) {
    body += '### 🔴 Critical/High Priority\n\n';
    for (const update of highPriority) {
      body += `#### ${update.section}\n`;
      body += `- **Current**: ${update.current}\n`;
      body += `- **Proposed**: ${update.proposed}\n`;
      body += `- **Confidence**: ${(update.confidence * 100).toFixed(0)}%\n`;
      body += `- **Evidence**: ${update.evidence.join(', ')}\n\n`;
    }
  }
  
  if (mediumPriority.length > 0) {
    body += '### 🟡 Medium Priority\n\n';
    for (const update of mediumPriority) {
      body += `- **${update.section}**: ${update.proposed}\n`;
    }
    body += '\n';
  }
  
  if (lowPriority.length > 0) {
    body += '### 🟢 Low Priority (Info Only)\n\n';
    for (const update of lowPriority) {
      body += `- ${update.section}: ${update.proposed}\n`;
    }
    body += '\n';
  }
  
  body += '---\n\n';
  body += 'This PR was auto-generated by the self-evolving knowledge base system.\n';
  body += 'Review changes before merging.\n';
  
  return body;
}

async function generateUpdates(): Promise<void> {
  console.log('🔄 Generating KB updates...');
  
  const updates = generateAllUpdates();
  
  console.log(`\n📊 Update Summary:`);
  console.log(`   Total updates: ${updates.length}`);
  console.log(`   Critical/High: ${updates.filter(u => u.priority === 'critical' || u.priority === 'high').length}`);
  console.log(`   Medium: ${updates.filter(u => u.priority === 'medium').length}`);
  console.log(`   Low: ${updates.filter(u => u.priority === 'low').length}`);
  
  if (updates.length > 0) {
    console.log('\n📝 PR Body Preview:');
    console.log('─'.repeat(50));
    console.log(formatUpdatePR().substring(0, 500) + '...');
  }
  
  // Store updates for PR creation
  const updatesJson = JSON.stringify(updates, null, 2);
  const { writeFileSync } = await import('fs');
  writeFileSync('.kb-updates.json', updatesJson);
  
  console.log('\n✅ Updates written to .kb-updates.json');
}

if (require.main === module) {
  generateUpdates().catch(console.error);
}

export { generateAllUpdates, formatUpdatePR, generateUpdates };
