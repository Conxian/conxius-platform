import { describe, it, expect, beforeEach } from 'vitest';
import { CitreaAdapter } from '../lib/support/citrea';

describe('CitreaAdapter (G-08)', () => {
  let adapter: CitreaAdapter;

  beforeEach(() => {
    adapter = new CitreaAdapter();
  });

  it('should initiate a peg-in', async () => {
    const pegin = await adapter.initiatePegIn(50000, '0x123...abc');
    expect(pegin.status).toBe('pending');
    expect(pegin.amount).toBe(50000);
  });

  it('should advance status during sync', async () => {
    const pegin = await adapter.initiatePegIn(50000, '0x123...abc');
    await adapter.syncStatus(pegin.id);
    const synced = await adapter.syncStatus(pegin.id);
    expect(synced?.status).toBe('finalized');
  });
});
