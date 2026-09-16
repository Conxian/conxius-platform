import { describe, it, expect, beforeEach } from 'vitest';
import { asyncPaymentsEngine } from '../lib/support/asyncPayments';

describe('Async Payments Engine (G-53)', () => {
  beforeEach(() => {
    asyncPaymentsEngine.clearInvoices();
  });

  it('should successfully create an HTLC hold invoice', () => {
    const invoice = asyncPaymentsEngine.createHoldInvoice({
      amountSat: 10000,
      memo: 'Test Async Payment',
      expirySeconds: 600,
    });

    expect(invoice.id).toMatch(/^async_pay_/);
    expect(invoice.amountSat).toBe(10000);
    expect(invoice.memo).toBe('Test Async Payment');
    expect(invoice.state).toBe('created');
    expect(invoice.paymentHash).toHaveLength(64);
    expect(invoice.preimage).toHaveLength(64);
  });

  it('should fail to create invoice with invalid amountSat', () => {
    expect(() =>
      asyncPaymentsEngine.createHoldInvoice({ amountSat: 0 })
    ).toThrow('Invalid amountSat: must be greater than zero');

    expect(() =>
      asyncPaymentsEngine.createHoldInvoice({ amountSat: -500 })
    ).toThrow('Invalid amountSat: must be greater than zero');
  });

  it('should handle hold, settle, and preimage validation lifecycle', () => {
    const preimageHex = 'a'.repeat(64);
    const invoice = asyncPaymentsEngine.createHoldInvoice({
      amountSat: 5000,
      paymentPreimageHex: preimageHex,
    });

    // 1. Hold HTLC
    const heldInvoice = asyncPaymentsEngine.holdHTLC(invoice.paymentHash);
    expect(heldInvoice.state).toBe('held');
    expect(heldInvoice.heldAtIso).toBeDefined();

    // 2. Settle HTLC with correct preimage
    const settledInvoice = asyncPaymentsEngine.settleHoldInvoice(
      invoice.paymentHash,
      preimageHex
    );
    expect(settledInvoice.state).toBe('settled');
    expect(settledInvoice.settledAtIso).toBeDefined();
    expect(settledInvoice.preimage).toBe(preimageHex);
  });

  it('should reject settlement with invalid or mismatched preimage', () => {
    const preimageHex = 'b'.repeat(64);
    const invoice = asyncPaymentsEngine.createHoldInvoice({
      amountSat: 5000,
      paymentPreimageHex: preimageHex,
    });

    asyncPaymentsEngine.holdHTLC(invoice.paymentHash);

    // Invalid format
    expect(() =>
      asyncPaymentsEngine.settleHoldInvoice(invoice.paymentHash, 'short')
    ).toThrow('Invalid preimage format');

    // Mismatched preimage
    const wrongPreimage = 'c'.repeat(64);
    expect(() =>
      asyncPaymentsEngine.settleHoldInvoice(invoice.paymentHash, wrongPreimage)
    ).toThrow('Preimage mismatch');
  });

  it('should support canceling held HTLC invoice', () => {
    const invoice = asyncPaymentsEngine.createHoldInvoice({
      amountSat: 2000,
    });

    asyncPaymentsEngine.holdHTLC(invoice.paymentHash);

    const canceledInvoice = asyncPaymentsEngine.cancelHoldInvoice(
      invoice.paymentHash,
      'Slippage threshold reached'
    );

    expect(canceledInvoice.state).toBe('canceled');
    expect(canceledInvoice.failureReason).toBe('Slippage threshold reached');
  });

  it('should enforce auto-expiry for past-due invoices', () => {
    const invoice = asyncPaymentsEngine.createHoldInvoice({
      amountSat: 1000,
      expirySeconds: -10, // Already expired
    });

    const retrieved = asyncPaymentsEngine.getInvoice(invoice.paymentHash);
    expect(retrieved?.state).toBe('expired');
    expect(retrieved?.failureReason).toBe('Invoice expired prior to settlement');
  });
});
