/**
 * Knowledge Store - Self-Evolving Knowledge Base
 * 
 * Provides persistent storage for knowledge entries with
 * versioning, relationships, and query capabilities.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

export interface KnowledgeEntry {
  id: string;
  category: 'pattern' | 'gap' | 'insight' | 'metric' | 'research';
  source: 'internal' | 'external' | 'agent' | 'synthesis';
  data: Record<string, unknown>;
  confidence: number;
  lastUpdated: string;
  tags: string[];
  evidence: string[];
}

export interface KnowledgeGraph {
  entries: Record<string, KnowledgeEntry>;
  relationships: Record<string, string[]>;
  version: number;
  lastSync: string;
}

const STORE_PATH = '.knowledge-store.json';

export class KnowledgeStore {
  private graph: KnowledgeGraph;

  constructor() {
    this.graph = this.load();
  }

  private load(): KnowledgeGraph {
    if (existsSync(STORE_PATH)) {
      try {
        const data = readFileSync(STORE_PATH, 'utf-8');
        return JSON.parse(data);
      } catch {
        return this.createEmpty();
      }
    }
    return this.createEmpty();
  }

  private createEmpty(): KnowledgeGraph {
    return {
      entries: {},
      relationships: {},
      version: 1,
      lastSync: new Date().toISOString()
    };
  }

  private save(): void {
    this.graph.lastSync = new Date().toISOString();
    writeFileSync(STORE_PATH, JSON.stringify(this.graph, null, 2));
  }

  add(entry: KnowledgeEntry): void {
    entry.lastUpdated = new Date().toISOString();
    this.graph.entries[entry.id] = entry;
    this.graph.relationships[entry.id] = [];
    this.graph.version++;
    this.save();
  }

  addWithRelation(entry: KnowledgeEntry, relatedIds: string[]): void {
    this.add(entry);
    this.graph.relationships[entry.id] = relatedIds;
    // Add reverse relationships
    for (const relatedId of relatedIds) {
      if (!this.graph.relationships[relatedId]) {
        this.graph.relationships[relatedId] = [];
      }
      if (!this.graph.relationships[relatedId].includes(entry.id)) {
        this.graph.relationships[relatedId].push(entry.id);
      }
    }
    this.save();
  }

  get(id: string): KnowledgeEntry | null {
    return this.graph.entries[id] || null;
  }

  query(filter: {
    category?: KnowledgeEntry['category'];
    source?: KnowledgeEntry['source'];
    tags?: string[];
    minConfidence?: number;
    since?: string;
  }): KnowledgeEntry[] {
    return Object.values(this.graph.entries).filter(entry => {
      if (filter.category && entry.category !== filter.category) return false;
      if (filter.source && entry.source !== filter.source) return false;
      if (filter.minConfidence && entry.confidence < filter.minConfidence) return false;
      if (filter.since && entry.lastUpdated < filter.since) return false;
      if (filter.tags && !filter.tags.some(tag => entry.tags.includes(tag))) return false;
      return true;
    });
  }

  getRelated(id: string): KnowledgeEntry[] {
    const relatedIds = this.graph.relationships[id] || [];
    return relatedIds.map(id => this.graph.entries[id]).filter(Boolean);
  }

  update(id: string, updates: Partial<KnowledgeEntry>): void {
    const entry = this.graph.entries[id];
    if (entry) {
      Object.assign(entry, updates, { lastUpdated: new Date().toISOString() });
      this.graph.version++;
      this.save();
    }
  }

  remove(id: string): void {
    delete this.graph.entries[id];
    delete this.graph.relationships[id];
    // Remove from all relationships
    for (const relatedIds of Object.values(this.graph.relationships)) {
      const index = relatedIds.indexOf(id);
      if (index > -1) relatedIds.splice(index, 1);
    }
    this.graph.version++;
    this.save();
  }

  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    bySource: Record<string, number>;
    avgConfidence: number;
    lastSync: string;
  } {
    const entries = Object.values(this.graph.entries);
    const byCategory: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let totalConfidence = 0;

    for (const entry of entries) {
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
      bySource[entry.source] = (bySource[entry.source] || 0) + 1;
      totalConfidence += entry.confidence;
    }

    return {
      total: entries.length,
      byCategory,
      bySource,
      avgConfidence: entries.length ? totalConfidence / entries.length : 0,
      lastSync: this.graph.lastSync
    };
  }

  export(): KnowledgeGraph {
    return this.graph;
  }

  import(graph: KnowledgeGraph): void {
    this.graph = graph;
    this.save();
  }

  // Utility: Generate unique ID
  static generateId(category: string, source: string): string {
    const timestamp = Date.now().toString(36);
    const hash = Math.random().toString(36).substring(2, 8);
    return `${category}-${source}-${timestamp}-${hash}`;
  }
}

export const knowledgeStore = new KnowledgeStore();
