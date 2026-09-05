import { vi, describe, test, expect } from "vitest";

// Mock server-only to allow importing server component files in vitest test runner
vi.mock("server-only", () => ({}));

import {
  getErpDashboardData,
  validateLedgerBalance,
  getErpSimulationEngineStatus
} from "../lib/sidl/erp";

describe("Enterprise ERP Simulation and Programmable Mock Engines (G-55 / CON-1320)", () => {
  test("should return comprehensive simulated ERP data including Mockoon and WireMock configurations", async () => {
    const data = await getErpDashboardData();

    // Assert base ERP dashboard data structures
    expect(data.treasury).toBeInstanceOf(Array);
    expect(data.employees).toBeInstanceOf(Array);
    expect(data.invoices).toBeInstanceOf(Array);
    expect(data.computeLogs).toBeInstanceOf(Array);

    // Assert the new high-fidelity simulation model is defined
    expect(data.simulation).toBeDefined();
    const sim = data.simulation!;

    // Verify programmable mock endpoints
    expect(sim.mockoonUrl).toContain("mockoon");
    expect(sim.wiremockUrl).toContain("8081");
    expect(sim.erpnextUrl).toContain("frappe.cloud");

    // Verify latency and fault injection settings
    expect(typeof sim.latencyMs).toBe("number");
    expect(sim.latencyMs).toBeGreaterThan(0);
    expect(typeof sim.faultInjectionActive).toBe("boolean");
    expect(sim.mockEngineStatus).toBe("healthy");
    expect(sim.balancedLedger).toBe(true);

    // Verify simulated x402 payment mandate
    expect(sim.x402Mandates).toBeInstanceOf(Array);
    expect(sim.x402Mandates.length).toBeGreaterThan(0);
    const mandate = sim.x402Mandates[0];
    expect(mandate.mandateId).toBe("mandate-erp-1004");
    expect(mandate.invoiceRef).toBe("INV-ERP-789");
    expect(mandate.paymentAddress).toBe("bc1qztwy6xen3zdtt7z0vrgapmjtfz8acjkfp5fp7l");
    expect(mandate.amountSats).toBe(250000);
    expect(mandate.status).toBe("signed");
    expect(mandate.payloadHash).toBe("6f52e3b2a265d38ff0b1712a03d15442b3b0d463ef18b17a1e127263901b0b30");

    // Verify simulated ledger entries
    expect(sim.ledgerEntries).toBeInstanceOf(Array);
    expect(sim.ledgerEntries.length).toBe(2);

    const debitEntry = sim.ledgerEntries[0];
    expect(debitEntry.id).toBe("ledger-tx-9901");
    expect(debitEntry.debitCredit).toBe("debit");
    expect(debitEntry.account).toBe("1200 - Accounts Receivable");
    expect(debitEntry.stateRootCommitment).toBe("a5f8e3230a1b0203f44ee90f4236a67f0bce866a7bcf1292fa177c8e96bf11b0");

    const creditEntry = sim.ledgerEntries[1];
    expect(creditEntry.id).toBe("ledger-tx-9902");
    expect(creditEntry.debitCredit).toBe("credit");
    expect(creditEntry.account).toBe("4000 - Treasury Sales Revenue");
    expect(creditEntry.stateRootCommitment).toBe("a5f8e3230a1b0203f44ee90f4236a67f0bce866a7bcf1292fa177c8e96bf11b0");
  });

  test("should correctly validate double-entry ledger balancing", () => {
    const balancedEntries = [
      { id: "1", account: "Cash", debitCredit: "debit" as const, amount: "100.00", stateRootCommitment: "hash1" },
      { id: "2", account: "Revenue", debitCredit: "credit" as const, amount: "100.00", stateRootCommitment: "hash1" }
    ];
    expect(validateLedgerBalance(balancedEntries)).toBe(true);

    const unbalancedEntries = [
      { id: "1", account: "Cash", debitCredit: "debit" as const, amount: "100.00", stateRootCommitment: "hash1" },
      { id: "2", account: "Revenue", debitCredit: "credit" as const, amount: "50.00", stateRootCommitment: "hash1" }
    ];
    expect(validateLedgerBalance(unbalancedEntries)).toBe(false);
  });

  test("should evaluate mock engine operational status based on latency and fault injection", () => {
    expect(getErpSimulationEngineStatus({ faultInjectionActive: false, latencyMs: 100 })).toBe("healthy");
    expect(getErpSimulationEngineStatus({ faultInjectionActive: true, latencyMs: 100 })).toBe("degraded");
    expect(getErpSimulationEngineStatus({ faultInjectionActive: false, latencyMs: 600 })).toBe("degraded");
    expect(getErpSimulationEngineStatus({ faultInjectionActive: false, latencyMs: -1 })).toBe("offline");
  });
});
