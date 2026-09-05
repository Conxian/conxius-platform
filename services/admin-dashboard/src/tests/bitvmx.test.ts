import { describe, it, expect, beforeEach } from 'vitest';
import { BitVMXBridge } from '../lib/support/bitvmx';

describe('BitVMXBridge Engine & Fail-Closed Bounds (G-44 & G-64)', () => {
  beforeEach(() => {
    BitVMXBridge.resetEngine();
  });

  it('should initialize a valid BitVMX intent', async () => {
    const intent = await BitVMXBridge.initializeIntent('hash-123', 'data-input');
    expect(intent.id).toContain('bitvmx-');
    expect(intent.state).toBe('executing');
    expect(intent.programHash).toBe('hash-123');
    expect(intent.createdAtIso).toBeDefined();
  });

  it('should fail-closed on invalid programHash or empty inputData', async () => {
    await expect(BitVMXBridge.initializeIntent('', 'data')).rejects.toThrow('Invalid programHash');
    await expect(BitVMXBridge.initializeIntent('hash', '   ')).rejects.toThrow('Invalid programHash');
  });

  it('should reject proof submission when intent is not in executing state or payload is invalid', async () => {
    const intent = await BitVMXBridge.initializeIntent('hash-456', 'input');

    // Invalid payload
    const invalidProof = await BitVMXBridge.submitProof(intent.id, '', 'output');
    expect(invalidProof).toBe(false);

    // Valid proof submission
    const success = await BitVMXBridge.submitProof(intent.id, 'proof-data', 'output');
    expect(success).toBe(true);

    // Submitting again when state is already 'proving' should fail
    const duplicateSubmission = await BitVMXBridge.submitProof(intent.id, 'proof-data-2', 'output-2');
    expect(duplicateSubmission).toBe(false);
  });

  it('should finalize proof when valid and proving', async () => {
    const intent = await BitVMXBridge.initializeIntent('hash-fin', 'input');
    await BitVMXBridge.submitProof(intent.id, 'proof', 'output');

    const finalized = await BitVMXBridge.finalizeProof(intent.id);
    expect(finalized).toBe(true);

    const updated = BitVMXBridge.getIntent(intent.id);
    expect(updated?.state).toBe('finalized');
    expect(updated?.finalizedAtIso).toBeDefined();
  });

  it('should support adaptive challenges and advance until max challenge depth', async () => {
    const intent = await BitVMXBridge.initializeIntent('hash-789', 'input');
    await BitVMXBridge.submitProof(intent.id, 'proof', 'output');

    const round1 = await BitVMXBridge.initiateChallenge(intent.id);
    expect(round1).toBe(1);

    const updated = BitVMXBridge.getIntent(intent.id);
    expect(updated?.state).toBe('challenged');

    const round2 = await BitVMXBridge.advanceChallenge(intent.id);
    expect(round2).toBe(2);
  });

  it('should result in disproved state after reaching 32 rounds', async () => {
    const intent = await BitVMXBridge.initializeIntent('hash-fail', 'input');
    await BitVMXBridge.submitProof(intent.id, 'proof', 'output');
    await BitVMXBridge.initiateChallenge(intent.id);

    let currentRound = 1;
    while (currentRound < 32) {
      currentRound = await BitVMXBridge.advanceChallenge(intent.id);
    }

    const updated = BitVMXBridge.getIntent(intent.id);
    expect(updated?.state).toBe('disproved');
    expect(updated?.finalizedAtIso).toBeDefined();
  });

  it('should enforce maximum active capacity limits', async () => {
    BitVMXBridge.setConfig({ maxActiveIntents: 2 });

    await BitVMXBridge.initializeIntent('hash-1', 'input-1');
    await BitVMXBridge.initializeIntent('hash-2', 'input-2');

    await expect(BitVMXBridge.initializeIntent('hash-3', 'input-3')).rejects.toThrow('Maximum active engine intent capacity exceeded');
  });

  it('should tombstone expired terminal intents during pruning', async () => {
    BitVMXBridge.setConfig({ retentionTtlMs: 100 });

    const intent = await BitVMXBridge.initializeIntent('hash-term', 'input');
    await BitVMXBridge.submitProof(intent.id, 'proof', 'output');
    await BitVMXBridge.finalizeProof(intent.id);

    // Wait for TTL expiration
    await new Promise((res) => setTimeout(res, 150));

    // Initializing a new intent triggers pruning
    await BitVMXBridge.initializeIntent('hash-new', 'input-new');

    expect(BitVMXBridge.getIntent(intent.id)).toBeUndefined();
  });
});
