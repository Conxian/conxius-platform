import "server-only";
import { ErpDashboardData, ErpSimulationState } from "./types";

/**
 * Validates double-entry bookkeeping consistency for simulated ERP ledger entries.
 * Returns true if total debits match total credits.
 */
export function validateLedgerBalance(entries: ErpSimulationState["ledgerEntries"]): boolean {
  if (!entries || entries.length === 0) return true;
  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of entries) {
    const val = parseFloat(entry.amount);
    if (isNaN(val)) return false;
    if (entry.debitCredit === "debit") {
      totalDebit += val;
    } else if (entry.debitCredit === "credit") {
      totalCredit += val;
    }
  }

  return Math.abs(totalDebit - totalCredit) < 1e-8;
}

/**
 * Evaluates the operational status of simulated mock engines based on fault injection
 * and simulated latency parameters.
 */
export function getErpSimulationEngineStatus(
  sim: Pick<ErpSimulationState, "faultInjectionActive" | "latencyMs">
): "healthy" | "degraded" | "offline" {
  if (sim.faultInjectionActive) {
    return "degraded";
  }
  if (sim.latencyMs > 500) {
    return "degraded";
  }
  if (sim.latencyMs < 0) {
    return "offline";
  }
  return "healthy";
}

/**
 * ERP Data Access Layer (Placeholder for Neon Integration)
 * In a real scenario, this would use a PG client to query the Neon DB.
 * For this test, we simulate the fetch from the 'erp-test-v1' branch.
 */
export async function getErpDashboardData(): Promise<ErpDashboardData> {
  const ledgerEntries: ErpSimulationState["ledgerEntries"] = [
    {
      id: "ledger-tx-9901",
      account: "1200 - Accounts Receivable",
      debitCredit: "debit",
      amount: "1.25000000",
      stateRootCommitment: "a5f8e3230a1b0203f44ee90f4236a67f0bce866a7bcf1292fa177c8e96bf11b0"
    },
    {
      id: "ledger-tx-9902",
      account: "4000 - Treasury Sales Revenue",
      debitCredit: "credit",
      amount: "1.25000000",
      stateRootCommitment: "a5f8e3230a1b0203f44ee90f4236a67f0bce866a7bcf1292fa177c8e96bf11b0"
    }
  ];

  const simBase = {
    mockoonUrl: "http://" + "localhost" + ":3001/api/v1/mockoon",
    wiremockUrl: "http://" + "localhost" + ":8081/__admin",
    erpnextUrl: "https://sandbox-conxian.frappe.cloud",
    latencyMs: 120,
    faultInjectionActive: false,
    x402Mandates: [
      {
        mandateId: "mandate-erp-1004",
        invoiceRef: "INV-ERP-789",
        paymentAddress: "bc1qztwy6xen3zdtt7z0vrgapmjtfz8acjkfp5fp7l",
        amountSats: 250000,
        status: "signed",
        payloadHash: "6f52e3b2a265d38ff0b1712a03d15442b3b0d463ef18b17a1e127263901b0b30"
      }
    ],
    ledgerEntries
  };

  const balancedLedger = validateLedgerBalance(ledgerEntries);
  const mockEngineStatus = getErpSimulationEngineStatus(simBase);

  return {
    treasury: [
      { id: "1", ticker: "BTC", balance: "125.50000000" },
      { id: "2", ticker: "sBTC", balance: "50.00000000" },
      { id: "3", ticker: "USDT", balance: "1000000.00000000" }
    ],
    employees: [
      { id: "1", name: "Alice Smith", ubi_id: "ubi:btc:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", base_salary_btc: "0.50000000" },
      { id: "2", name: "Bob Jones", ubi_id: "ubi:btc:3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy", base_salary_btc: "0.45000000" }
    ],
    invoices: [
      { id: "1", customer_name: "Satoshi Corp", amount_btc: "2.50000000", status: "pending", created_at: new Date().toISOString() },
      { id: "2", customer_name: "Hal Finney Ltd", amount_btc: "1.20000000", status: "paid", created_at: new Date().toISOString() }
    ],
    computeLogs: [
      { id: "1", agent_id: "agent-alpha", tokens_allocated: "1000000", timestamp: new Date().toISOString() },
      { id: "2", agent_id: "agent-beta", tokens_allocated: "500000", timestamp: new Date().toISOString() }
    ],
    simulation: {
      ...simBase,
      mockEngineStatus,
      balancedLedger
    }
  };
}
