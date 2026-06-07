import { describe, it, expect, vi } from 'vitest';
import { ImapWorker } from '../lib/support/imap-worker';

describe('ImapWorker', () => {
  const worker = new ImapWorker();

  it('should scrub sensitive content including Bitcoin data', () => {
    const raw = 'Email: test@example.com, Token: 1234567890abcdef1234567890abcdef, Invoice: INV-123, BTC: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa, WIF: 5Kb8kLf9zgWQioS6T6YUpX4G22h2f2EWDGWWB8fKSv3YfW23955, Bech32: bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
    const scrubbed = (worker as any).scrubContent(raw);
    expect(scrubbed).not.toContain('test@example.com');
    expect(scrubbed).not.toContain('1234567890abcdef1234567890abcdef');
    expect(scrubbed).not.toContain('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(scrubbed).not.toContain('5Kb8kLf9zgWQioS6T6YUpX4G22h2f2EWDGWWB8fKSv3YfW23955');
    expect(scrubbed).not.toContain('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');

    expect(scrubbed).toContain('[REDACTED-EMAIL]');
    expect(scrubbed).toContain('[REDACTED-TOKEN]');
    expect(scrubbed).toContain('[REDACTED-INVOICE]');
    expect(scrubbed).toContain('[REDACTED-BTC-ADDR]');
    expect(scrubbed).toContain('[REDACTED-BTC-KEY]');
  });

  it('should generate a valid ticket token', () => {
    const token = (worker as any).generateTicketToken();
    expect(token).toMatch(/^SUP-\d{8}-\d{4}$/);
  });
});
