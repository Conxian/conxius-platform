import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

# Add RevenueIntelligence and Tableland structs
extra_structs = """
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RevenueIntelligence {
    pub total_mrr: f64,
    pub churn_rate: f64,
    pub protocol_fees_24h: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TablelandSyncStatus {
    pub table_id: String,
    pub last_anchor_tx: String,
    pub sync_latency_ms: u64,
}
"""
if "struct RevenueIntelligence" not in content:
    content = content.replace("pub struct NexusState {", extra_structs + "pub struct NexusState {")

# Update Engine struct to include them
if "revenue_intelligence: Arc<RwLock<RevenueIntelligence>>," not in content:
    content = content.replace("pub marketing: Arc<RwLock<Vec<MarketingInfo>>>,",
                             "pub marketing: Arc<RwLock<Vec<MarketingInfo>>>,\n    pub revenue_intelligence: Arc<RwLock<RevenueIntelligence>>,\n    pub tableland_sync: Arc<RwLock<TablelandSyncStatus>>,")

# Update Engine::new()
if "revenue_intelligence: Arc::new(RwLock::new(RevenueIntelligence {" not in content:
    new_init = """
            revenue_intelligence: Arc::new(RwLock::new(RevenueIntelligence {
                total_mrr: 125000.0,
                churn_rate: 0.02,
                protocol_fees_24h: 450.0,
            })),
            tableland_sync: Arc::new(RwLock::new(TablelandSyncStatus {
                table_id: "cxn_state_mainnet_1".to_string(),
                last_anchor_tx: "0xabc...123".to_string(),
                sync_latency_ms: 150,
            })),
"""
    content = content.replace("marketing: Arc::new(RwLock::new(Vec::new())),",
                             "marketing: Arc::new(RwLock::new(Vec::new())),\n" + new_init)

with open(file_path, "w") as f:
    f.write(content)
