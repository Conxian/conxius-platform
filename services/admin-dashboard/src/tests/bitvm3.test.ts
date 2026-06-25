import { describe, it, expect, beforeEach } from 'vitest';
import { BitVM3Orchestrator } from '../lib/support/bitvm3';

describe('BitVM3Orchestrator (G-20)', () => {
  let orchestrator: BitVM3Orchestrator;

  beforeEach(() => {
    orchestrator = new BitVM3Orchestrator();
  });

  it('should initialize and verify a recursive proof', async () => {
    const state = await orchestrator.verifyRecursive('recursive-1', 10);
    expect(state.isVerified).toBe(true);
    expect(state.recursiveHeight).toBe(10);
  });
});
