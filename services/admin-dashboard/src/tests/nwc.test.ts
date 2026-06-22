import { describe, it, expect, vi } from 'vitest';
import { NWCTransport } from '../lib/support/nwc';

// Mock nostr-tools
vi.mock('nostr-tools', () => {
  return {
    nip47: {
      parseConnectionString: vi.fn().mockReturnValue({
        pubkey: 'test-pubkey',
        relays: ['wss://test-relay']
      }),
      makeNwcRequestEvent: vi.fn().mockResolvedValue({
        id: 'test-event-id',
        kind: 23194,
        content: 'encrypted-payload'
      })
    },
    SimplePool: class {
      publish = vi.fn().mockReturnValue(Promise.resolve());
      destroy = vi.fn();
    },
    generateSecretKey: vi.fn().mockReturnValue(new Uint8Array(32))
  };
});

describe('NWCTransport', () => {
  it('should initialize and send a payment request', async () => {
    const transport = new NWCTransport();
    const eventId = await transport.payInvoice(
      'nostr+walletconnect://test-pubkey?relay=wss://test-relay',
      'lnbc100n1...'
    );

    expect(eventId).toBe('test-event-id');
    transport.close();
  });
});
