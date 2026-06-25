import { describe, it, expect } from 'vitest';
import { BitVMXBridge } from '../lib/support/bitvmx';

describe('BitVMXBridge (G-44)', () => {
  it('should initialize a BitVMX intent', async () => {
    const intent = await BitVMXBridge.initializeIntent('hash-123', 'data-input');
    expect(intent.id).toContain('bitvmx-');
    expect(intent.state).toBe('executing');
    expect(intent.programHash).toBe('hash-123');
  });

  it('should transition to proving state when proof is submitted', async () => {
    const intent = await BitVMXBridge.initializeIntent('hash-456', 'input');
    const success = await BitVMXBridge.submitProof(intent.id, 'proof-data', 'output');

    expect(success).toBe(true);
    const updated = BitVMXBridge.getIntent(intent.id);
    expect(updated?.state).toBe('proving');
    expect(updated?.outputData).toBe('output');
  });

  it('should support adaptive challenges', async () => {
    const intent = await BitVMXBridge.initializeIntent('hash-789', 'input');
    await BitVMXBridge.submitProof(intent.id, 'proof', 'output');

    const round1 = await BitVMXBridge.initiateChallenge(intent.id);
    expect(round1).toBe(1);

    const updated = BitVMXBridge.getIntent(intent.id);
    expect(updated?.state).toBe('challenged');

    const round2 = await BitVMXBridge.advanceChallenge(intent.id);
    expect(round2).toBe(2);
  });

  it('should result in disproved state after 32 rounds', async () => {
    const intent = await BitVMXBridge.initializeIntent('hash-fail', 'input');
    await BitVMXBridge.submitProof(intent.id, 'proof', 'output');
    await BitVMXBridge.initiateChallenge(intent.id);

    let currentRound = 1;
    while (currentRound < 32) {
      currentRound = await BitVMXBridge.advanceChallenge(intent.id);
    }

    const updated = BitVMXBridge.getIntent(intent.id);
    expect(updated?.state).toBe('disproved');
  });
});
