import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

# Full structs block
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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AiAllocation {
    pub profile: String,
    pub weights: HashMap<String, f64>,
    pub optimized_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct UbiIdentity {
    pub id: String,
    pub status: String,
    pub btc_anchor_height: u64,
    pub verified: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NexusState {
    pub merkle_root: String,
    pub last_sync_height: u64,
    pub sync_status: String,
}
"""

if "AlexReadiness" not in content:
    content = content.replace("pub struct ServiceStatus {", structs + "pub struct ServiceStatus {")

# Ensure methods are inside Engine impl
if "pub fn get_alex_readiness" not in content:
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
        AlexTxPayload {
            contract_id: "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0XBHT.swap-helper-v1-03".to_string(),
            function_name: "swap-helper".to_string(),
            args: vec![
                format!("0x{:02x}", 0x01),
                format!("token-{}", from),
                format!("token-{}", to),
                format!("0x{:02x}", 0x01),
            ],
            post_conditions: vec![
                format!("transfer-{}", from),
            ],
        }
    }

    pub fn get_ai_allocation(&self, profile: &str) -> AiAllocation {
        self.increment_requests();
        let mut weights = HashMap::new();
        match profile {
            "aggressive" => {
                weights.insert("BTC".to_string(), 0.7);
                weights.insert("STX".to_string(), 0.2);
                weights.insert("sBTC".to_string(), 0.1);
            },
            "conservative" => {
                weights.insert("BTC".to_string(), 0.9);
                weights.insert("sBTC".to_string(), 0.1);
            },
            _ => {
                weights.insert("BTC".to_string(), 0.8);
                weights.insert("sBTC".to_string(), 0.1);
                weights.insert("STX".to_string(), 0.1);
            }
        }
        AiAllocation {
            profile: profile.to_string(),
            weights,
            optimized_at: Utc::now(),
        }
    }

    pub fn get_ubi_identity(&self, id: &str) -> UbiIdentity {
        self.increment_requests();
        UbiIdentity {
            id: format!("ubi:btc:{}", id),
            status: "active".to_string(),
            btc_anchor_height: 840000,
            verified: true,
        }
    }

    pub fn get_nexus_state(&self) -> NexusState {
        self.increment_requests();
        NexusState {
            merkle_root: "0x3f5b...e2a1".to_string(),
            last_sync_height: 840123,
            sync_status: "synced".to_string(),
        }
    }
"""
    last_brace = content.rfind("}")
    content = content[:last_brace] + methods + "\n" + content[last_brace:]

with open(file_path, "w") as f:
    f.write(content)
