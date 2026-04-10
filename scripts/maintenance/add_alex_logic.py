import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

# Add structs
structs = """
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AlexPool {
    pub id: String,
    pub token_x: String,
    pub token_y: String,
    pub liquidity_x: f64,
    pub liquidity_y: f64,
    pub status: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AlexReadiness {
    pub status: String,
    pub active_pools: Vec<AlexPool>,
    pub bridge_strategy: String,
    pub last_checked: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AlexTxPayload {
    pub contract_id: String,
    pub function_name: String,
    pub args: Vec<String>,
    pub post_conditions: Vec<String>,
}
"""

if "AlexReadiness" not in content:
    content = content.replace("pub struct AiAllocation {", structs + "pub struct AiAllocation {")

# Add methods
methods = """
    pub fn get_alex_readiness(&self) -> AlexReadiness {
        self.increment_requests();
        let pools = vec![
            AlexPool {
                id: "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0XBHT.pool-stx-alex".to_string(),
                token_x: "STX".to_string(),
                token_y: "ALEX".to_string(),
                liquidity_x: 1500000.0,
                liquidity_y: 4500000.0,
                status: "active".to_string(),
            },
            AlexPool {
                id: "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0XBHT.pool-stx-sbtc".to_string(),
                token_x: "STX".to_string(),
                token_y: "sBTC".to_string(),
                liquidity_x: 2500000.0,
                liquidity_y: 50.5,
                status: "active".to_string(),
            }
        ];

        AlexReadiness {
            status: "ready".to_string(),
            active_pools: pools,
            bridge_strategy: "ALEX-Fast-Path".to_string(),
            last_checked: Utc::now(),
        }
    }

    pub fn get_alex_quote(&self, from: &str, to: &str, amount: f64) -> serde_json::Value {
        self.increment_requests();
        // Simulated pricing logic (CON-136)
        let rate = if from == "STX" && to == "ALEX" { 3.0 } else { 0.33 };
        let estimated_out = amount * rate;

        serde_json::json!({
            "from": from,
            "to": to,
            "amount_in": amount,
            "estimated_out": estimated_out,
            "price_impact_pct": 0.05,
            "fee_asset": "STX",
            "fee_amount": 1.0,
            "route": ["ALEX-AMM-V1"]
        })
    }

    pub fn construct_alex_tx(&self, from: &str, to: &str, amount: u64, min_out: u64) -> AlexTxPayload {
        self.increment_requests();
        // Method B: Direct contract-call transaction construction
        AlexTxPayload {
            contract_id: "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0XBHT.swap-helper-v1-03".to_string(),
            function_name: "swap-helper".to_string(),
            args: vec![
                format!("0x{:02x}", 0x01), // uintCV(amount) placeholder
                format!("token-{}", from),
                format!("token-{}", to),
                format!("0x{:02x}", 0x01), // min_out
            ],
            post_conditions: vec![
                format!("transfer-{}", from),
            ],
        }
    }
"""

if "pub fn get_alex_readiness" not in content:
    last_brace = content.rfind("}")
    content = content[:last_brace] + methods + "\n" + content[last_brace:]

with open(file_path, "w") as f:
    f.write(content)
