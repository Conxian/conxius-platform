import { describe, it, expect, beforeEach } from 'vitest';
import { ZKCPBridge } from '../lib/support/zkcp';

describe('ZKCPBridge (G-50)', () => {
  let bridge: ZKCPBridge;

  beforeEach(() => {
    bridge = new ZKCPBridge();
  });

  it('should initialize a ZKCP intent', () => {
    const intent = bridge.initializeIntent({
      id: 'zkcp-test-1',
      amount: 1000,
      encryptedDataHash: 'hash-encrypted',
      proofHash: 'hash-proof',
      sellerAddress: 'bc1q-seller',
      buyerAddress: 'bc1q-buyer'
    });

    expect(intent.status).toBe('pending');
    expect(intent.id).toBe('zkcp-test-1');
  });

  it('should verify a valid proof', () => {
    bridge.initializeIntent({
      id: 'zkcp-test-2',
      amount: 1000,
      encryptedDataHash: 'hash-encrypted',
      proofHash: 'hash-proof',
      sellerAddress: 'bc1q-seller',
      buyerAddress: 'bc1q-buyer'
    });

    const isValid = bridge.verifyProof('zkcp-test-2', 'proof-123');
    expect(isValid).toBe(true);
    expect(bridge.getIntent('zkcp-test-2')?.status).toBe('verified');
  });

  it('should finalize settlement after verification', () => {
    bridge.initializeIntent({
      id: 'zkcp-test-3',
      amount: 1000,
      encryptedDataHash: 'hash-encrypted',
      proofHash: 'hash-proof',
      sellerAddress: 'bc1q-seller',
      buyerAddress: 'bc1q-buyer'
    });

    bridge.verifyProof('zkcp-test-3', 'proof-123');
    const key = bridge.finalizeSettlement('zkcp-test-3', 'txid-payment-confirmed');

    expect(key).toBe('key-zkcp-test-3-decrypted');
    expect(bridge.getIntent('zkcp-test-3')?.status).toBe('finalized');
  });
});
