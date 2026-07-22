import { describe, it, expect } from 'vitest';
import { FDC3Resolver, CJCSJob } from '../lib/fdc3/resolver';
import { UsageValidator, UsageEvent } from '../lib/sidl/usageValidation';
import { BitVMBridge, UnavailableBitVMVerifier } from '../lib/support/bitvm';
import { Bip322Bridge } from '../lib/support/bip322';
import { makeFloorRequest, makeVerifierRequest } from './fixtures/verifierFixtures';

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
  it('keeps the floor unavailable until a verifier backend is injected', async () => {
    const bridge = new BitVMBridge(new UnavailableBitVMVerifier());
    const result = await bridge.verifyFloor(makeFloorRequest(await makeVerifierRequest()));

    expect(result.verified).toBe(false);
    expect(result.failure_code).toBe('backend_unavailable');
    expect(result.status).toBe('unsupported');
  });

  it('rejects malformed proof bytes before backend dispatch', async () => {
    const verifierRequest = await makeVerifierRequest();
    const bridge = new BitVMBridge(new UnavailableBitVMVerifier());
    const result = await bridge.verifyFloor({
      ...makeFloorRequest(verifierRequest),
      verifier_request: {
        ...verifierRequest,
        proof: { ...verifierRequest.proof, bytes: 'short' },
      },
    });

    expect(result.verified).toBe(false);
    expect(result.failure_code).toBe('malformed_encoding');
  });

  it('rejects challenges without a verified floor', async () => {
    const bridge = new BitVMBridge(new UnavailableBitVMVerifier());
    const challenged = await bridge.challengeTap('proof-789', 42);

    expect(challenged.accepted).toBe(false);
    expect(challenged.failure_code).toBe('invalid_challenge');
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
  it('does not aggregate signatures without a verified backend result', async () => {
    const bridge = new BitVMBridge(new UnavailableBitVMVerifier());
    const result = await bridge.submitSignature('proof-agg-123', 'verifier-1', 'ab'.repeat(64));

    expect(result.accepted).toBe(false);
    expect(result.failure_code).toBe('aggregation_not_found');
  });

  it('rejects malformed signature encodings', async () => {
    const result = await new BitVMBridge(new UnavailableBitVMVerifier())
      .submitSignature('non-existent', 'v', 's');
    expect(result.accepted).toBe(false);
    expect(result.failure_code).toBe('invalid_signature');
  });
});
