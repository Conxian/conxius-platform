import { describe, it, expect, vi } from 'vitest';
import { ImapWorker } from '../lib/support/imap-worker';

describe('ImapWorker', () => {
  const worker = new ImapWorker();

  it('should scrub sensitive content', () => {
    const raw = 'Hello, my email is test@example.com and my secret is 1234567890abcdef1234567890abcdef. Please check invoice INV-123.';
    const scrubbed = (worker as any).scrubContent(raw);
    expect(scrubbed).not.toContain('test@example.com');
    expect(scrubbed).not.toContain('1234567890abcdef1234567890abcdef');
    expect(scrubbed).toContain('[REDACTED-EMAIL]');
    expect(scrubbed).toContain('[REDACTED-TOKEN]');
    expect(scrubbed).toContain('[REDACTED-INVOICE]');
  });

  it('should generate a valid ticket token', () => {
    const token = (worker as any).generateTicketToken();
    expect(token).toMatch(/^SUP-\d{8}-\d{4}$/);
  });
});
