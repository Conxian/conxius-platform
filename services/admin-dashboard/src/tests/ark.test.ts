import { describe, it, expect, beforeEach } from 'vitest';
import { ArkAdapter, MAX_VUTXO_CAPACITY } from '../lib/support/ark';

describe('ArkAdapter (G-23)', () => {
  let adapter: ArkAdapter;

  beforeEach(() => {
    adapter = new ArkAdapter();
  });

  it('should receive / board a V-UTXO', async () => {
    const vutxo = await adapter.receiveVUTXO(10000, 'bc1q-owner');
    expect(vutxo.status).toBe('available');
    expect(vutxo.amountSat).toBe(10000);
    expect(vutxo.ownerAddress).toBe('bc1q-owner');
    expect(vutxo.aspId).toBe('asp-default-01');
    expect(adapter.getVUTXOCount()).toBe(1);
  });

  it('should reject invalid boarding requests', async () => {
    await expect(adapter.boardVUTXO({ amountSat: 0, ownerAddress: 'bc1q-owner' })).rejects.toThrow(
      'Invalid V-UTXO amount'
    );
    await expect(adapter.boardVUTXO({ amountSat: 5000, ownerAddress: '' })).rejects.toThrow(
      'Invalid owner address'
    );
  });

  it('should enforce capacity limits (MAX_VUTXO_CAPACITY)', async () => {
    for (let i = 0; i < MAX_VUTXO_CAPACITY; i++) {
      await adapter.boardVUTXO({ amountSat: 1000, ownerAddress: `bc1q-owner-${i}` });
    }
    expect(adapter.getVUTXOCount()).toBe(MAX_VUTXO_CAPACITY);

    await expect(adapter.boardVUTXO({ amountSat: 1000, ownerAddress: 'bc1q-overflow' })).rejects.toThrow(
      'Ark capacity exceeded'
    );
  });

  it('should spend an available V-UTXO', async () => {
    const vutxo = await adapter.receiveVUTXO(10000, 'bc1q-owner');
    const success = await adapter.spendVUTXO(vutxo.id);
    expect(success).toBe(true);

    const updated = adapter.getVUTXO(vutxo.id);
    expect(updated?.status).toBe('spent');

    // Second spend must fail
    const secondSpend = await adapter.spendVUTXO(vutxo.id);
    expect(secondSpend).toBe(false);
  });

  it('should register and claim a forfeit transaction', async () => {
    const vutxo = await adapter.receiveVUTXO(50000, 'bc1q-owner');
    adapter.registerForfeitTx(vutxo.id, '3045022100...', '02abc...', 800000);

    const updated = adapter.getVUTXO(vutxo.id);
    expect(updated?.forfeitTx?.signed).toBe(true);

    const claimed = adapter.claimForfeit(vutxo.id);
    expect(claimed).toBe(true);
    expect(adapter.getVUTXO(vutxo.id)?.status).toBe('forfeited');
  });

  it('should handle collaborative unboarding', async () => {
    const vutxo = await adapter.receiveVUTXO(25000, 'bc1q-owner');
    const unboarded = await adapter.unboardVUTXO({
      vutxoId: vutxo.id,
      destinationAddress: 'bc1q-l1-dest',
      currentBlockHeight: 800100,
      isCollaborative: true,
    });

    expect(unboarded.status).toBe('unboarded');
    expect(unboarded.unboardTxid).toBeDefined();
  });

  it('should enforce timelocks for unilateral unboarding', async () => {
    const vutxo = await adapter.receiveVUTXO(25000, 'bc1q-owner');
    adapter.registerForfeitTx(vutxo.id, '3045...', '02abc...', 800000);

    // Block height offset 50 < 144 exit timelock -> fail
    await expect(
      adapter.unboardVUTXO({
        vutxoId: vutxo.id,
        destinationAddress: 'bc1q-l1-dest',
        currentBlockHeight: 800050,
        isCollaborative: false,
      })
    ).rejects.toThrow('Unilateral exit timelock active');

    // Block height offset 150 >= 144 exit timelock -> success
    const unboarded = await adapter.unboardVUTXO({
      vutxoId: vutxo.id,
      destinationAddress: 'bc1q-l1-dest',
      currentBlockHeight: 800150,
      isCollaborative: false,
    });
    expect(unboarded.status).toBe('unboarded');
  });

  it('should sweep expired V-UTXOs and support tombstoning', async () => {
    const vutxo = await adapter.boardVUTXO({
      amountSat: 10000,
      ownerAddress: 'bc1q-owner',
      ttlSeconds: 10, // Expires in 10 seconds
    });

    // Before expiration
    let swept = adapter.sweepExpiredVUTXOs(Date.now());
    expect(swept).toBe(0);

    // After expiration
    swept = adapter.sweepExpiredVUTXOs(Date.now() + 20000);
    expect(swept).toBe(1);
    expect(adapter.getVUTXO(vutxo.id)?.status).toBe('expired');

    // Tombstone
    const tombstoned = adapter.tombstoneVUTXO(vutxo.id, 'Expired and archived');
    expect(tombstoned).toBe(true);
    expect(adapter.getVUTXO(vutxo.id)?.status).toBe('tombstoned');
  });
});
