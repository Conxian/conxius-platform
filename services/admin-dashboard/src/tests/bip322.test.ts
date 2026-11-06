import { describe, it, expect, afterEach } from 'vitest';
import { Bip322Bridge, type Bip322Verifier } from '../lib/support/bip322';

const ADDRESS = 'bc1qztwy6xen3zdtt7z0vrgapmjtfz8acjkfp5fp7l';

describe('Bip322Bridge', () => {
  afterEach(() => {
    Bip322Bridge.configureVerifier(null);
  });

  it('fails closed when no verifier is configured', async () => {
    const result = await Bip322Bridge.verify(ADDRESS, 'Hello Conxian', 'smp:BASE64_SIGNATURE_HERE');
    expect(result.valid).toBe(false);
    expect(result.provenance).toBe('unavailable');
    expect(result.error).toContain('fail-closed');
  });

  it('rejects an invalid bitcoin address before consulting the verifier', async () => {
    const result = await Bip322Bridge.verify('invalid-address', 'Hello Conxian', 'smp:BASE64_SIGNATURE_HERE');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid Bitcoin address format');
  });

  it('rejects an empty signature', async () => {
    const result = await Bip322Bridge.verify(ADDRESS, 'Hello Conxian', '');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Malformed signature');
  });

  it('does not treat a long-but-unverified signature as valid', async () => {
    const result = await Bip322Bridge.verify(ADDRESS, 'Hello Conxian', 'x'.repeat(128));
    expect(result.valid).toBe(false);
    expect(result.provenance).toBe('unavailable');
  });

  it('returns valid only when an injected verifier confirms the signature', async () => {
    const verifier: Bip322Verifier = { verify: () => true };
    Bip322Bridge.configureVerifier(verifier);
    const result = await Bip322Bridge.verify(ADDRESS, JSON.stringify({ type: 'usi:settlement' }), 'smp:BASE64_SIGNATURE_HERE');
    expect(result.valid).toBe(true);
    expect(result.provenance).toBe('verified');
    expect(result.intent_type).toBe('usi:settlement');
  });

  it('fails closed when the injected verifier rejects the signature', async () => {
    Bip322Bridge.configureVerifier({ verify: () => false });
    const result = await Bip322Bridge.verify(ADDRESS, 'Hello Conxian', 'smp:BASE64_SIGNATURE_HERE');
    expect(result.valid).toBe(false);
    expect(result.provenance).toBe('rejected');
  });

  it('fails closed when the injected verifier throws', async () => {
    Bip322Bridge.configureVerifier({
      verify: () => {
        throw new Error('backend down');
      },
    });
    const result = await Bip322Bridge.verify(ADDRESS, 'Hello Conxian', 'smp:BASE64_SIGNATURE_HERE');
    expect(result.valid).toBe(false);
    expect(result.provenance).toBe('unavailable');
  });

  it('refuses to fabricate a to-sign transaction without a verifier', () => {
    expect(() => Bip322Bridge.constructToSign(ADDRESS, 'Hello Conxian')).toThrow(/fail-closed/);
  });
});
