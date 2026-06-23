import { describe, it, expect } from 'vitest';
import { DnsPaymentResolver } from '../lib/support/dns-payments';

describe('DnsPaymentResolver (G-12)', () => {
  it('should resolve a valid BIP-353 handle', async () => {
    const handle = '₿user@conxius.com';
    const result = await DnsPaymentResolver.resolve(handle);

    expect(result.address).toBe(handle);
    expect(result.uri).toContain('bitcoin:');
    expect(result.dnssec).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should handle handles without the Bitcoin symbol', async () => {
    const handle = 'user@conxius.com';
    const result = await DnsPaymentResolver.resolve(handle);

    expect(result.address).toBe(handle);
    expect(result.uri).toContain('bitcoin:');
  });

  it('should return an error for invalid handle formats', async () => {
    const handle = 'invalid-handle';
    const result = await DnsPaymentResolver.resolve(handle);

    expect(result.error).toBe('Invalid BIP-353 handle format');
  });
});
