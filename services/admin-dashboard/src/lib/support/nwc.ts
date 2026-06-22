import * as nostr from 'nostr-tools';

/**
 * G-07: Nostr Wallet Connect (NWC) Transport
 * Implements NIP-47 for non-custodial Lightning payment authorization.
 */
export class NWCTransport {
  private nPool: nostr.SimplePool;

  constructor() {
    this.nPool = new nostr.SimplePool();
  }

  /**
   * Send a payment request via NWC.
   * @param connectionString The NWC connection string (nostr+walletconnect://...)
   * @param invoice The BOLT-11 Lightning invoice to pay.
   */
  public async payInvoice(connectionString: string, invoice: string): Promise<string> {
    const conn = nostr.nip47.parseConnectionString(connectionString);
    const secretKey = nostr.generateSecretKey();

    // Create the NIP-47 request event
    const payEvent = await nostr.nip47.makeNwcRequestEvent(
      conn.pubkey,
      secretKey,
      invoice
    );

    // Publish to the first relay specified in the connection string
    await this.nPool.publish([conn.relays[0]], payEvent);

    return payEvent.id;
  }

  /**
   * Cleanup resources.
   */
  public close() {
    this.nPool.destroy();
  }
}
