import { describe, it, expect } from 'vitest';
import { FDC3Resolver, CJCSJob } from '../lib/fdc3/resolver';
import { UsageValidator, UsageEvent } from '../lib/sidl/usageValidation';

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
