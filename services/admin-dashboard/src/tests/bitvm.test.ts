import { describe, it, expect } from 'vitest';
import { BitVMBridge } from '../lib/support/bitvm';

describe('BitVMBridge', () => {
  it('should initialize verification floor for a valid proof', async () => {
    const rawProof = 'a'.repeat(64); // Mock 64-char proof
    const result = await BitVMBridge.verifyFloor(rawProof, 'proof-123');

    expect(result.verified).toBe(true);
    expect(result.taps_generated).toBe(364);
    expect(result.proof_id).toBe('proof-123');
    expect(result.status).toBe('verified');
  });

  it('should fail verification for an invalid proof', async () => {
    const rawProof = 'short';
    const result = await BitVMBridge.verifyFloor(rawProof, 'proof-456');

    expect(result.verified).toBe(false);
    expect(result.status).toBe('pending');
    expect(result.error).toBe('Invalid proof format or length');
  });

  it('should challenge a specific tap', async () => {
    const success = await BitVMBridge.challengeTap('proof-789', 123);
    expect(success).toBe(true);
  });
});
