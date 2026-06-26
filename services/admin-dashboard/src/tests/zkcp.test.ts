import { describe, it, expect, beforeEach } from 'vitest';
import {
  ZKCPBridge,
  DefaultZKVerifier,
  DefaultOnChainMonitor,
  type ZKCPIntent
} from '../lib/support/zkcp';

function makeIntent(overrides: Partial<ZKCPIntent> = {}): Omit<ZKCPIntent, 'status' | 'round' | 'createdAt' | 'updatedAt'> {
  return {
    id: 'zkcp-test-1',
    amount: 1000,
    encryptedDataHash: 'hash-encrypted',
    proofHash: 'hash-proof',
    sellerAddress: 'bc1q-seller',
    buyerAddress: 'bc1q-buyer',
    ...overrides
  };
}

const validProof = '0'.repeat(128); // meets DefaultZKVerifier minimum length

describe('ZKCPBridge (G-50)', () => {
  let bridge: ZKCPBridge;

  beforeEach(() => {
    bridge = new ZKCPBridge();
  });

  it('should initialize a ZKCP intent', () => {
    const intent = bridge.initializeIntent(makeIntent());
    expect(intent.status).toBe('pending');
    expect(intent.id).toBe('zkcp-test-1');
    expect(intent.createdAt).toBeDefined();
    expect(intent.updatedAt).toBeDefined();
  });

  it('should verify a valid proof asynchronously', async () => {
    bridge.initializeIntent(makeIntent({ id: 'zkcp-test-2' }));
    const isValid = await bridge.verifyProof('zkcp-test-2', validProof);
    expect(isValid).toBe(true);
    expect(bridge.getIntent('zkcp-test-2')?.status).toBe('verified');
  });

  it('should reject an invalid proof', async () => {
    bridge.initializeIntent(makeIntent({ id: 'zkcp-test-invalid' }));
    const isValid = await bridge.verifyProof('zkcp-test-invalid', 'short');
    expect(isValid).toBe(false);
    expect(bridge.getIntent('zkcp-test-invalid')?.status).toBe('failed');
  });

  it('should throw when verifying an intent not in pending state', async () => {
    bridge.initializeIntent(makeIntent({ id: 'zkcp-test-3' }));
    await bridge.verifyProof('zkcp-test-3', validProof);
    await expect(
      bridge.verifyProof('zkcp-test-3', validProof)
    ).rejects.toThrow('not in pending state');
  });

  it('should finalize settlement after verification', async () => {
    bridge.initializeIntent(makeIntent({ id: 'zkcp-test-4' }));
    await bridge.verifyProof('zkcp-test-4', validProof);
    const key = bridge.finalizeSettlement('zkcp-test-4', 'txid-payment-confirmed');

    expect(key).toBe('key-zkcp-test-4-decrypted');
    expect(bridge.getIntent('zkcp-test-4')?.status).toBe('finalized');
  });

  it('should finalize settlement from paid state without paymentHash param', async () => {
    const monitor = new DefaultOnChainMonitor();
    // Override watchForPayment to simulate detection
    monitor.watchForPayment = async () => ({
      detected: true,
      txid: 'txid-auto-detected',
      confirmations: 3
    });

    const bridged = new ZKCPBridge(undefined, monitor);
    bridged.initializeIntent(makeIntent({ id: 'zkcp-test-5' }));
    await bridged.verifyProof('zkcp-test-5', validProof);

    const result = await bridged.watchForPayment('zkcp-test-5');
    expect(result.detected).toBe(true);
    expect(bridged.getIntent('zkcp-test-5')?.status).toBe('paid');

    const key = bridged.finalizeSettlement('zkcp-test-5');
    expect(key).toBe('key-zkcp-test-5-decrypted');
    expect(bridged.getIntent('zkcp-test-5')?.status).toBe('finalized');
  });

  it('should reject finalize settlement from pending state', () => {
    bridge.initializeIntent(makeIntent({ id: 'zkcp-test-6' }));
    expect(() => bridge.finalizeSettlement('zkcp-test-6'))
      .toThrow('Intent not ready for settlement');
  });

  it('should list intents and filter by status', async () => {
    bridge.initializeIntent(makeIntent({ id: 'zkcp-a' }));
    bridge.initializeIntent(makeIntent({ id: 'zkcp-b' }));
    await bridge.verifyProof('zkcp-a', validProof);

    expect(bridge.listIntents()).toHaveLength(2);
    expect(bridge.listIntentsByStatus('pending')).toHaveLength(1);
    expect(bridge.listIntentsByStatus('verified')).toHaveLength(1);
  });

  it('should emit lifecycle events', async () => {
    const events: string[] = [];
    bridge.onEvent((e) => events.push(e.type));

    bridge.initializeIntent(makeIntent({ id: 'zkcp-events' }));
    expect(events).toContain('intent_created');

    await bridge.verifyProof('zkcp-events', validProof);
    expect(events).toContain('proof_verified');
  });

  it('should throw for unknown intent id', async () => {
    await expect(bridge.verifyProof('nonexistent', validProof))
      .rejects.toThrow('Intent not found');
    expect(() => bridge.finalizeSettlement('nonexistent'))
      .toThrow('Intent not found');
  });

  it('should not detect payment when monitor returns no result', async () => {
    bridge.initializeIntent(makeIntent({ id: 'zkcp-nopay' }));
    await bridge.verifyProof('zkcp-nopay', validProof);

    const result = await bridge.watchForPayment('zkcp-nopay');
    expect(result.detected).toBe(false);
    expect(bridge.getIntent('zkcp-nopay')?.status).toBe('verified');
  });
});

describe('DefaultZKVerifier', () => {
  it('accepts proofs with length >= 128', async () => {
    const verifier = new DefaultZKVerifier();
    const result = await verifier.verify('0'.repeat(128), []);
    expect(result.valid).toBe(true);
    expect(result.proofSystem).toBe('groth16');
  });

  it('rejects proofs under 128 characters', async () => {
    const verifier = new DefaultZKVerifier();
    const result = await verifier.verify('short', []);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('DefaultOnChainMonitor', () => {
  it('returns not detected by default', async () => {
    const monitor = new DefaultOnChainMonitor();
    const result = await monitor.watchForPayment('bc1q-addr', 1000);
    expect(result.detected).toBe(false);
  });

  it('returns zero confirmations by default', async () => {
    const monitor = new DefaultOnChainMonitor();
    const confirmations = await monitor.getConfirmations('any-txid');
    expect(confirmations).toBe(0);
  });
});
