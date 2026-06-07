import "server-only";
import { ErpDashboardData } from "./types";

/**
 * ERP Data Access Layer (Placeholder for Neon Integration)
 * In a real scenario, this would use a PG client to query the Neon DB.
 * For this test, we simulate the fetch from the 'erp-test-v1' branch.
 */
export async function getErpDashboardData(): Promise<ErpDashboardData> {
  // Simulating data fetch from Neon
  return {
    treasury: [
      { id: "1", ticker: "BTC", balance: "125.50000000" },
      { id: "2", ticker: "sBTC", balance: "50.00000000" },
      { id: "3", ticker: "USDT", balance: "1000000.00000000" }
    ],
    employees: [
      { id: "1", name: "Alice Smith", ubi_id: "ubi:btc:MOCK_ADDRESS_ALICE_12345", base_salary_btc: "0.50000000" },
      { id: "2", name: "Bob Jones", ubi_id: "ubi:btc:MOCK_ADDRESS_BOB_67890", base_salary_btc: "0.45000000" }
    ],
    invoices: [
      { id: "1", customer_name: "Satoshi Corp", amount_btc: "2.50000000", status: "pending", created_at: new Date().toISOString() },
      { id: "2", customer_name: "Hal Finney Ltd", amount_btc: "1.20000000", status: "paid", created_at: new Date().toISOString() }
    ],
    computeLogs: [
      { id: "1", agent_id: "agent-alpha", tokens_allocated: "1000000", timestamp: new Date().toISOString() },
      { id: "2", agent_id: "agent-beta", tokens_allocated: "500000", timestamp: new Date().toISOString() }
    ]
  };
}
