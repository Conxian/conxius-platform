import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DnsPaymentResolver } from '../lib/support/dns-payments';

function mockDohResponse(
  status: number,
  ad: boolean,
  answers?: { name: string; type: number; data: string }[],
) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ Status: status, AD: ad, Answer: answers }),
  };
}

function mockDohError(status: number) {
  return { ok: false, status };
}

describe('DnsPaymentResolver (G-12)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return an error for invalid handle formats', async () => {
    const handle = 'invalid-handle';
    const result = await DnsPaymentResolver.resolve(handle);

    expect(result.error).toBe('Invalid BIP-353 handle format');
    expect(result.uri).toBe('');
    expect(result.dnssec).toBe(false);
  });

  it('should resolve a valid BIP-353 handle via DoH', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockDohResponse(0, true, [
        {
          name: '_bitcoin-payment.user._at.conxius.com',
          type: 16,
          data: '"bitcoin:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh?label=user"',
        },
      ]) as unknown as Response,
    );

    const handle = '₿user@conxius.com';
    const result = await DnsPaymentResolver.resolve(handle);

    expect(result.address).toBe(handle);
    expect(result.uri).toBe('bitcoin:bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh?label=user');
    expect(result.dnssec).toBe(true);
    expect(result.error).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle handles without the Bitcoin symbol', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockDohResponse(0, true, [
        {
          name: '_bitcoin-payment.alice._at.example.com',
          type: 16,
          data: '"bitcoin:bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq"',
        },
      ]) as unknown as Response,
    );

    const handle = 'alice@example.com';
    const result = await DnsPaymentResolver.resolve(handle);

    expect(result.address).toBe(handle);
    expect(result.uri).toContain('bitcoin:');
    expect(result.dnssec).toBe(true);
  });

  it('should return error on NXDOMAIN (status 3)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockDohResponse(3, false) as unknown as Response,
    );

    const handle = 'nobody@nonexistent.example';
    const result = await DnsPaymentResolver.resolve(handle);

    expect(result.error).toContain('NXDOMAIN');
    expect(result.uri).toBe('');
  });

  it('should return error when no TXT record exists', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockDohResponse(0, true, []) as unknown as Response,
    );

    const handle = 'user@no-txt.example.com';
    const result = await DnsPaymentResolver.resolve(handle);

    expect(result.error).toContain('No TXT record found');
    expect(result.dnssec).toBe(true);
  });

  it('should return error when TXT record is not a BIP-21 URI', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockDohResponse(0, true, [
        {
          name: '_bitcoin-payment.user._at.bad.example.com',
          type: 16,
          data: '"not-a-bitcoin-uri"',
        },
      ]) as unknown as Response,
    );

    const handle = 'user@bad.example.com';
    const result = await DnsPaymentResolver.resolve(handle);

    expect(result.error).toContain('valid BIP-21 URI');
    expect(result.uri).toBe('not-a-bitcoin-uri');
  });

  it('should return error on HTTP failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockDohError(500) as unknown as Response,
    );

    const handle = 'user@http-fail.example.com';
    const result = await DnsPaymentResolver.resolve(handle);

    expect(result.error).toContain('HTTP 500');
    expect(result.dnssec).toBe(false);
  });

  it('should return error on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

    const handle = 'user@network-fail.example.com';
    const result = await DnsPaymentResolver.resolve(handle);

    expect(result.error).toContain('Network error');
    expect(result.dnssec).toBe(false);
  });

  it('should support lightning: URIs', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockDohResponse(0, true, [
        {
          name: '_bitcoin-payment.ln._at.lightning.example.com',
          type: 16,
          data: '"lightning:lnbc1..."',
        },
      ]) as unknown as Response,
    );

    const handle = 'ln@lightning.example.com';
    const result = await DnsPaymentResolver.resolve(handle);

    expect(result.uri).toBe('lightning:lnbc1...');
    expect(result.error).toBeUndefined();
  });
});
