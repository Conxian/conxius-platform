import { describe, it, expect } from 'vitest';
import { FDC3Resolver, CJCSJob } from '../lib/fdc3/resolver';
import { UsageValidator, UsageEvent } from '../lib/sidl/usageValidation';
import { BitVMBridge } from '../lib/support/bitvm';
import { Bip322Bridge } from '../lib/support/bip322';

describe('Phase 7 Alignment: FDC3 Resolver', () => {
  it('should map DEX_SWAP to fdc3.instrument', () => {
    const job: CJCSJob = { id: '1', type: 'DEX_SWAP', instrument: 'BTC/sBTC' };
    const context = FDC3Resolver.mapCJCSToFDC3(job);
    expect(context.type).toBe('fdc3.instrument');
    expect(context.name).toBe('BTC/sBTC');
  });

  it('should map SETTLEMENT to fdc3.contact', () => {
    const job: CJCSJob = { id: '2', type: 'SETTLEMENT', counterparty: 'ubi:btc:test' };
    const context = FDC3Resolver.mapCJCSToFDC3(job);
    expect(context.type).toBe('fdc3.contact');
    expect(context.id?.ubi).toBe('ubi:btc:test');
  });

  it('should resolve ViewInstrument intent', () => {
    const context = { type: 'fdc3.instrument' };
    const action = FDC3Resolver.resolveIntentToUSI('ViewInstrument', context);
    expect(action).toBe('usi:monitor_liquidity');
  });
});

describe('Phase 7 Alignment: Usage Validation', () => {
  it('should score strong signals higher than weak signals', () => {
    const strongEvent: UsageEvent = {
      event: 'FIRST_PROOF',
      strength: 'strong',
      identity_hash: 'test',
      metadata: {},
      timestamp: new Date().toISOString()
    };
    const weakEvent: UsageEvent = {
      event: 'DOCS_VIEW',
      strength: 'weak',
      identity_hash: 'test',
      metadata: {},
      timestamp: new Date().toISOString()
    };

    const strongScore = UsageValidator.scoreEvent(strongEvent);
    const weakScore = UsageValidator.scoreEvent(weakEvent);

    expect(strongScore).toBeGreaterThan(weakScore);
    expect(UsageValidator.warrantsTriage(strongScore)).toBe(true);
    expect(UsageValidator.warrantsTriage(weakScore)).toBe(false);
  });
});

describe('Phase 7 Alignment: BitVM2 Floor Manager', () => {
  it('should initialize verification floor and generate 364 taps', async () => {
    const proof = 'a'.repeat(64);
    const proofId = 'proof-123';
    const result = await BitVMBridge.verifyFloor(proof, proofId);

    expect(result.verified).toBe(true);
    expect(result.taps_generated).toBe(364);
    expect(result.status).toBe('verified');

    const state = BitVMBridge.getState(proofId);
    expect(state).toBeDefined();
    expect(state?.status).toBe('verified');
  });

  it('should handle invalid proofs', async () => {
    const result = await BitVMBridge.verifyFloor('short', 'proof-456');
    expect(result.verified).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should support challenging a tap', async () => {
    const proofId = 'proof-789';
    await BitVMBridge.verifyFloor('a'.repeat(64), proofId);
    const challenged = await BitVMBridge.challengeTap(proofId, 42);

    expect(challenged).toBe(true);
    const state = BitVMBridge.getState(proofId);
    expect(state?.status).toBe('challenged');
    expect(state?.activeChallenges).toContain(42);
  });
});

describe('Phase 7 Alignment: BIP-322 USI Intents', () => {
  it('should verify a valid USI intent signature', async () => {
    const address = 'bc1qtestaddress';
    const intent = { type: 'usi:settlement', amount: 1000 };
    const signature = 'base64signaturelongerthan10';

    const result = await Bip322Bridge.verify(address, JSON.stringify(intent), signature);
    expect(result.valid).toBe(true);
    expect(result.intent_type).toBe('usi:settlement');
  });

  it('should reject invalid address formats', async () => {
    const result = await Bip322Bridge.verify('invalid', 'msg', 'sig');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('address format');
  });
});

describe('Phase 7 Alignment: BitVM2 Multi-Party Aggregation (G-11)', () => {
  it('should collect and aggregate partial signatures', async () => {
    const proofId = 'proof-agg-123';
    await BitVMBridge.verifyFloor('a'.repeat(64), proofId);

    const agg1 = await BitVMBridge.submitSignature(proofId, 'verifier-1', 'sig-1');
    expect(agg1).toBeDefined();
    expect(agg1?.signatures.length).toBe(1);
    expect(agg1?.is_complete).toBe(true); // Since required defaults to 1

    const state = BitVMBridge.getAggregation(proofId);
    expect(state?.is_complete).toBe(true);
    expect(state?.signatures[0].verifier_id).toBe('verifier-1');
  });

  it('should handle missing aggregation requests', async () => {
    const result = await BitVMBridge.submitSignature('non-existent', 'v', 's');
    expect(result).toBeUndefined();
  });
});
