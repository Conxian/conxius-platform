import "server-only";
import { ErpDashboardData } from "./types";

/**
 * ERP Data Access Layer (Placeholder for Neon Integration)
 * In a real scenario, this would use a PG client to query the Neon DB.
 * For this test, we simulate the fetch from the 'erp-test-v1' branch.
 */
export async function getErpDashboardData(): Promise<ErpDashboardData> {
  // Simulating data fetch from Neon / ERP Virtualization
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
      ledgerEntries: [
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
      ]
    }
  };
}
