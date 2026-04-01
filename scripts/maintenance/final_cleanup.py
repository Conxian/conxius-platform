import re

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

# All structs that need derives
all_structs = [
    "RiskAssessment", "AiAllocation", "UbiIdentity", "RevenueIntelligence",
    "TablelandSyncStatus", "NexusState", "ServiceStatus", "ReserveAsset",
    "PriceInfo", "ComplianceStatus", "AffiliateInfo", "MarketingInfo"
]

# Remove all existing derives to avoid conflicts
content = re.sub(r'#\[derive\(Serialize, Deserialize, Clone, Debug\)\]\s*', '', content)

# Add them back correctly
for struct_name in all_structs:
    pattern = r'pub struct ' + struct_name + r' \{'
    replacement = '#[derive(Serialize, Deserialize, Clone, Debug)]\npub struct ' + struct_name + ' {'
    content = re.sub(pattern, replacement, content)

# Fix Engine::new() missing fields
# We'll replace the entire Engine::new() with a corrected version
engine_new_pattern = r'pub fn new\(\) -> Self \{[\s\S]+?\}'
engine_new_replacement = """pub fn new() -> Self {
        Self {
            version: "0.2.1".to_string(),
            start_time: Utc::now(),
            request_count: AtomicU64::new(0),
            total_tvl_usd: Arc::new(RwLock::new(0.0)),
            active_sovereign_nodes: AtomicU64::new(12),
            service_statuses: Arc::new(RwLock::new(HashMap::new())),
            reserves: Arc::new(RwLock::new(Vec::new())),
            prices: Arc::new(RwLock::new(HashMap::new())),
            compliance: Arc::new(RwLock::new(ComplianceStatus {
                status: "Operational".to_string(),
                last_audit: Utc::now(),
                rules_active: vec!["AML/KYC".to_string(), "CARF".to_string()],
                risk_score: 5,
                zkml_enabled: true,
            })),
            affiliates: Arc::new(RwLock::new(HashMap::new())),
            marketing: Arc::new(RwLock::new(Vec::new())),
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
        }
    }"""
content = re.sub(engine_new_pattern, engine_new_replacement, content)

with open(file_path, "w") as f:
    f.write(content)
