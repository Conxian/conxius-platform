#!/usr/bin/env npx ts-node
/**
 * External Research Agent
 * 
 * Performs external research using Tavily and other sources
 * to keep the knowledge base updated with external intelligence.
 */

import { knowledgeStore, KnowledgeEntry, KnowledgeStore } from './knowledge-store';

interface ResearchQuery {
  topic: string;
  query: string;
  tags: string[];
}

const RESEARCH_QUERIES: ResearchQuery[] = [
  {
    topic: 'Stacks Protocol',
    query: 'Stacks Nakamoto upgrade Bitcoin L2 developments 2024',
    tags: ['stacks', 'bitcoin', 'l2', 'protocol']
  },
  {
    topic: 'DeFi Security',
    query: 'DeFi protocol vulnerabilities security best practices 2024',
    tags: ['security', 'defi', 'vulnerabilities']
  },
  {
    topic: 'AI Agents',
    query: 'AI agents DeFi blockchain automation tools 2024',
    tags: ['ai', 'agents', 'automation']
  },
  {
    topic: 'Bitcoin Standards',
    query: 'Bitcoin BIP proposals standards BRC-20 ordinals 2024',
    tags: ['bitcoin', 'bip', 'standards']
  }
];

async function tavilySearch(query: string): Promise<unknown[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    console.log('   ⚠️ TAVILY_API_KEY not set, skipping research');
    return [];
  }
  
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        max_results: 5
      })
    });
    
    if (!response.ok) {
      console.error(`   ❌ Tavily API error: ${response.status}`);
      return [];
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (e) {
    console.error(`   ❌ Research error:`, e);
    return [];
  }
}

function synthesizeResearch(results: unknown[], query: ResearchQuery): KnowledgeEntry {
  const articles = results as Array<{
    title: string;
    url: string;
    content: string;
  }>;
  
  // Extract key themes
  const themes = new Set<string>();
  const urls: string[] = [];
  
  for (const article of articles) {
    urls.push(article.url);
    // Simple theme extraction (would be ML-powered in production)
    const words = article.content.split(/\s+/).filter(w => w.length > 5);
    words.slice(0, 50).forEach(w => themes.add(w.toLowerCase()));
  }
  
  return {
    id: KnowledgeStore.generateId('research', 'external'),
    category: 'research',
    source: 'external',
    data: {
      topic: query.topic,
      query: query.query,
      articles: articles.map(a => ({
        title: a.title,
        url: a.url
      })),
      themes: Array.from(themes).slice(0, 20),
      summary: articles[0]?.content?.substring(0, 500) || 'No results'
    },
    confidence: articles.length > 0 ? 0.75 : 0.3,
    lastUpdated: new Date().toISOString(),
    tags: query.tags,
    evidence: urls.slice(0, 3)
  };
}

async function runExternalResearch(): Promise<void> {
  console.log('🔬 Running external research...\n');
  
  const results: KnowledgeEntry[] = [];
  
  for (const query of RESEARCH_QUERIES) {
    console.log(`   📚 Researching: ${query.topic}`);
    
    const searchResults = await tavilySearch(query.query);
    console.log(`      - Found ${searchResults.length} results`);
    
    if (searchResults.length > 0) {
      const entry = synthesizeResearch(searchResults, query);
      results.push(entry);
      knowledgeStore.add(entry);
      console.log(`      ✅ Added research entry`);
    }
  }
  
  console.log(`\n📊 Research Summary:`);
  console.log(`   Topics researched: ${RESEARCH_QUERIES.length}`);
  console.log(`   Entries added: ${results.length}`);
  
  // Add synthesis insight
  if (results.length > 0) {
    const synthesis: KnowledgeEntry = {
      id: KnowledgeStore.generateId('insight', 'external'),
      category: 'insight',
      source: 'synthesis',
      data: {
        type: 'external-research',
        topics: results.map(r => (r.data as Record<string, unknown>).topic),
        coverage: results.length / RESEARCH_QUERIES.length
      },
      confidence: 0.8,
      lastUpdated: new Date().toISOString(),
      tags: ['research', 'external', 'synthesis'],
      evidence: results.map(r => r.evidence[0]).filter(Boolean)
    };
    
    knowledgeStore.add(synthesis);
    console.log(`   ✅ Added synthesis insight`);
  }
}

if (require.main === module) {
  runExternalResearch().catch(console.error);
}

export { runExternalResearch };
