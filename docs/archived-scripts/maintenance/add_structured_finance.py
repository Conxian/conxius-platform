import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

# Add structs
structs = """
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LoanTranche {
    pub name: String,
    pub seniority: u8,
    pub interest_rate_apr: f64,
    pub current_principal_usd: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OpsLoan {
    pub id: String,
    pub status: String,
    pub tranches: Vec<LoanTranche>,
    pub guardian_verification: bool,
    pub erp_invoice_linked: Option<String>,
}
"""

if "OpsLoan" not in content:
    content = content.replace("pub struct SovereignWallet {", structs + "pub struct SovereignWallet {")

# Add methods
methods = """
    pub fn get_ops_loans(&self) -> Vec<OpsLoan> {
        self.increment_requests();
        vec![
            OpsLoan {
                id: "loan-2026-001".to_string(),
                status: "active".to_string(),
                tranches: vec![
                    LoanTranche { name: "Senior".to_string(), seniority: 1, interest_rate_apr: 4.5, current_principal_usd: 500000.0 },
                    LoanTranche { name: "Junior".to_string(), seniority: 2, interest_rate_apr: 8.2, current_principal_usd: 150000.0 },
                ],
                guardian_verification: true,
                erp_invoice_linked: Some("INV-ERP-789".to_string()),
            }
        ]
    }

    pub fn verify_loan_intent(&self, loan_id: &str, guardian_address: &str) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({
            "loan_id": loan_id,
            "guardian": guardian_address,
            "intent_verified": true,
            "policy_match": "Strict-ERP-Invoice",
            "timestamp": Utc::now()
        })
    }
"""

if "pub fn get_ops_loans" not in content:
    last_brace = content.rfind("}")
    content = content[:last_brace] + methods + "\n" + content[last_brace:]

with open(file_path, "w") as f:
    f.write(content)
