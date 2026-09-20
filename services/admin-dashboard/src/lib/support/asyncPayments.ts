/**
 * Async Lightning Payments Engine (G-53)
 *
 * Implements HTLC Hold Invoice management, async payment state transitions,
 * preimage verification, expiry enforcement, and fail-closed security invariants.
 *
 * @module services/admin-dashboard/src/lib/support/asyncPayments
 */

import { createHash, randomBytes } from 'crypto';
import { createLogger } from './logger';

const logger = createLogger('async-payments');

export type AsyncPaymentState =
  | 'created'
  | 'held'
  | 'settled'
  | 'canceled'
  | 'expired';

export interface AsyncPaymentInvoice {
  id: string;
  paymentHash: string;
  amountSat: number;
  memo: string;
  state: AsyncPaymentState;
  createdAtIso: string;
  expiresAtIso: string;
  heldAtIso?: string;
  settledAtIso?: string;
  canceledAtIso?: string;
  preimage?: string;
  failureReason?: string;
}

export interface CreateInvoiceOptions {
  amountSat: number;
  memo?: string;
  expirySeconds?: number;
  paymentPreimageHex?: string;
}

const DEFAULT_EXPIRY_SECONDS = 3600; // 1 hour
const MAX_ACTIVE_INVOICES = 5000;

class AsyncPaymentsEngine {
  private invoices: Map<string, AsyncPaymentInvoice> = new Map();

  /**
   * Creates a new HTLC Hold Invoice with a pre-generated or supplied preimage.
   */
  public createHoldInvoice(options: CreateInvoiceOptions): AsyncPaymentInvoice {
    if (this.invoices.size >= MAX_ACTIVE_INVOICES) {
      logger.warn('[AsyncPayments] Invoice capacity exceeded');
      throw new Error('Async payment engine capacity exceeded');
    }

    if (!options.amountSat || options.amountSat <= 0) {
      logger.warn('[AsyncPayments] Invalid amountSat specified', { amountSat: options.amountSat });
      throw new Error('Invalid amountSat: must be greater than zero');
    }

    let preimageHex: string;
    if (options.paymentPreimageHex) {
      if (!/^[0-9a-fA-F]{64}$/.test(options.paymentPreimageHex)) {
        throw new Error('Invalid paymentPreimageHex: must be a 32-byte hex string');
      }
      preimageHex = options.paymentPreimageHex.toLowerCase();
    } else {
      preimageHex = randomBytes(32).toString('hex');
    }

    const paymentHash = createHash('sha256')
      .update(Buffer.from(preimageHex, 'hex'))
      .digest('hex');

    const now = new Date();
    const expirySec = options.expirySeconds !== undefined
      ? options.expirySeconds
      : DEFAULT_EXPIRY_SECONDS;
    const expiresAt = new Date(now.getTime() + expirySec * 1000);

    const invoice: AsyncPaymentInvoice = {
      id: `async_pay_${randomBytes(8).toString('hex')}`,
      paymentHash,
      amountSat: options.amountSat,
      memo: options.memo || 'Async Lightning Payment',
      state: 'created',
      createdAtIso: now.toISOString(),
      expiresAtIso: expiresAt.toISOString(),
      preimage: preimageHex,
    };

    this.checkExpiry(invoice);
    this.invoices.set(paymentHash, invoice);
    logger.info('[AsyncPayments] Created hold invoice', { id: invoice.id, paymentHash, state: invoice.state });
    return { ...invoice };
  }

  /**
   * Simulates/processes an incoming HTLC hold notification.
   */
  public holdHTLC(paymentHash: string): AsyncPaymentInvoice {
    const invoice = this.invoices.get(paymentHash);
    if (!invoice) {
      logger.warn('[AsyncPayments] Hold HTLC failed: invoice not found', { paymentHash });
      throw new Error(`Invoice not found for paymentHash: ${paymentHash}`);
    }

    this.checkExpiry(invoice);

    if (invoice.state === 'expired') {
      throw new Error('Cannot hold HTLC on expired invoice');
    }

    if (invoice.state !== 'created') {
      logger.warn('[AsyncPayments] Cannot hold HTLC: invalid state transition', {
        id: invoice.id,
        currentState: invoice.state,
      });
      throw new Error(`Cannot hold HTLC in state: ${invoice.state}`);
    }

    invoice.state = 'held';
    invoice.heldAtIso = new Date().toISOString();
    logger.info('[AsyncPayments] HTLC held successfully', { id: invoice.id, paymentHash });
    return { ...invoice };
  }

  /**
   * Settles an HTLC hold invoice by revealing and validating the preimage.
   */
  public settleHoldInvoice(paymentHash: string, preimageHex: string): AsyncPaymentInvoice {
    const invoice = this.invoices.get(paymentHash);
    if (!invoice) {
      logger.warn('[AsyncPayments] Settle failed: invoice not found', { paymentHash });
      throw new Error(`Invoice not found for paymentHash: ${paymentHash}`);
    }

    this.checkExpiry(invoice);

    if (invoice.state === 'expired') {
      throw new Error('Cannot settle expired invoice');
    }

    if (invoice.state !== 'held') {
      logger.warn('[AsyncPayments] Cannot settle: HTLC is not in held state', {
        id: invoice.id,
        currentState: invoice.state,
      });
      throw new Error(`Cannot settle invoice in state: ${invoice.state}`);
    }

    if (!/^[0-9a-fA-F]{64}$/.test(preimageHex)) {
      throw new Error('Invalid preimage format: must be a 32-byte hex string');
    }

    const calculatedHash = createHash('sha256')
      .update(Buffer.from(preimageHex, 'hex'))
      .digest('hex');

    if (calculatedHash.toLowerCase() !== paymentHash.toLowerCase()) {
      logger.warn('[AsyncPayments] Preimage mismatch during settlement', { paymentHash });
      throw new Error('Preimage mismatch: computed hash does not match invoice paymentHash');
    }

    invoice.state = 'settled';
    invoice.settledAtIso = new Date().toISOString();
    invoice.preimage = preimageHex.toLowerCase();
    logger.info('[AsyncPayments] HTLC settled successfully', { id: invoice.id, paymentHash });
    return { ...invoice };
  }

  /**
   * Cancels a held HTLC invoice and releases HTLC back to sender.
   */
  public cancelHoldInvoice(paymentHash: string, reason?: string): AsyncPaymentInvoice {
    const invoice = this.invoices.get(paymentHash);
    if (!invoice) {
      logger.warn('[AsyncPayments] Cancel failed: invoice not found', { paymentHash });
      throw new Error(`Invoice not found for paymentHash: ${paymentHash}`);
    }

    if (invoice.state === 'settled') {
      throw new Error('Cannot cancel a settled invoice');
    }

    if (invoice.state === 'canceled' || invoice.state === 'expired') {
      return { ...invoice };
    }

    invoice.state = 'canceled';
    invoice.canceledAtIso = new Date().toISOString();
    invoice.failureReason = reason || 'Canceled by user or gateway';
    logger.info('[AsyncPayments] HTLC invoice canceled', { id: invoice.id, paymentHash });
    return { ...invoice };
  }

  /**
   * Retrieves an invoice by paymentHash, auto-enforcing expiry.
   */
  public getInvoice(paymentHash: string): AsyncPaymentInvoice | undefined {
    const invoice = this.invoices.get(paymentHash);
    if (!invoice) return undefined;
    this.checkExpiry(invoice);
    return { ...invoice };
  }

  /**
   * Helper to evaluate and transition expired invoices.
   */
  private checkExpiry(invoice: AsyncPaymentInvoice): void {
    if (invoice.state === 'settled' || invoice.state === 'canceled' || invoice.state === 'expired') {
      return;
    }

    if (new Date(invoice.expiresAtIso) <= new Date()) {
      invoice.state = 'expired';
      invoice.failureReason = 'Invoice expired prior to settlement';
      logger.info('[AsyncPayments] Invoice auto-expired', { id: invoice.id, paymentHash: invoice.paymentHash });
    }
  }

  /**
   * Clears internal state (primarily for test environments).
   */
  public clearInvoices(): void {
    this.invoices.clear();
  }
}

export const asyncPaymentsEngine = new AsyncPaymentsEngine();
