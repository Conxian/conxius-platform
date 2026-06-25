import { describe, it, expect, beforeEach } from 'vitest';
import { ArkAdapter } from '../lib/support/ark';

describe('ArkAdapter (G-23)', () => {
  let adapter: ArkAdapter;

  beforeEach(() => {
    adapter = new ArkAdapter();
  });

  it('should receive a V-UTXO', async () => {
    const vutxo = await adapter.receiveVUTXO(10000, 'bc1q-owner');
    expect(vutxo.status).toBe('available');
    expect(vutxo.amount).toBe(10000);
  });

  it('should spend an available V-UTXO', async () => {
    const vutxo = await adapter.receiveVUTXO(10000, 'bc1q-owner');
    const success = await adapter.spendVUTXO(vutxo.id);
    expect(success).toBe(true);
    expect(vutxo.status).toBe('spent');
  });
});
