import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"

header = """use actix_web::web;
use chrono::{DateTime, Utc};
use reqwest;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tokio::time::sleep;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OfflineTransaction {
    pub tx_hash: String,
    pub amount_msat: u64,
    pub biometric_attestation: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct OfflineReceipt {
    pub receipt_id: String,
    pub tx_hash: String,
    pub tee_signature: String,
    pub status: String,
    pub broadcast_priority: u8,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MeshNode {
    pub node_id: String,
    pub protocol: String,
    pub signal_strength: i8,
    pub last_gossip: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct WalletPolicy {
    pub quorum: u8,
    pub signers: Vec<String>,
    pub spending_limit_btc: f64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SovereignWallet {
    pub address: String,
    pub policy: WalletPolicy,
    pub custody_type: String,
    pub status: String,
}

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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RiskAssessment {
    pub overall_level: String,
    pub da_score: u32,
    pub settlement_score: u32,
    pub bridge_score: u32,
    pub exit_mechanism_score: u32,
    pub operators_score: u32,
    pub decentralization_score: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ServiceStatus {
    pub name: String,
    pub status: String,
    pub last_checked: DateTime<Utc>,
    pub latency_ms: u32,
    pub trust_model: String,
    pub risk_level: String,
    pub risk_assessment: Option<RiskAssessment>,
    pub data_availability: String,
    pub settlement: String,
    pub bridge_security: String,
    pub tvl_usd: f64,
    pub version: Option<String>,
    pub metadata: HashMap<String, String>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ReserveAsset {
    pub asset: String,
    pub total_supplied: f64,
    pub total_reserves: f64,
    pub collateral_ratio: f64,
    pub status: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PriceInfo {
    pub asset: String,
    pub price_usd: f64,
    pub last_updated: DateTime<Utc>,
    pub source: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ComplianceStatus {
    pub status: String,
    pub last_audit: DateTime<Utc>,
    pub rules_active: Vec<String>,
    pub risk_score: u32,
    pub zkml_enabled: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AffiliateInfo {
    pub partner_id: String,
    pub status: String,
    pub commission_rate: f64,
    pub active_campaigns: u32,
    pub total_referrals: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MarketingInfo {
    pub channel: String,
    pub status: String,
    pub active_offers: Vec<String>,
    pub reach: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct FinancialMetrics {
    pub mrr_usd: f64,
    pub arr_usd: f64,
    pub churn_rate_pct: f64,
    pub protocol_fees_collected_usd: f64,
    pub last_updated: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct IdentityRecord {
    pub address: String,
    pub ens_name: Option<String>,
    pub bns_name: Option<String>,
    pub world_id_verified: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct ErpSyncRecord {
    pub erp_system: String,
    pub last_sync: DateTime<Utc>,
    pub total_transactions_synced: u64,
    pub status: String,
}
"""

with open(file_path, "r") as f:
    content = f.read()

# Replace all structs
start_idx = content.find("use actix_web")
end_idx = content.find("pub struct Engine {")

if start_idx != -1 and end_idx != -1:
    new_content = header + "\n" + content[end_idx:]

    # Correct Engine struct fields
    engine_struct = """pub struct Engine {
    pub version: String,
    pub start_time: DateTime<Utc>,
    pub request_count: AtomicU64,
    pub total_tvl_usd: Arc<RwLock<f64>>,
    pub active_sovereign_nodes: AtomicU64,
    pub service_statuses: Arc<RwLock<HashMap<String, ServiceStatus>>>,
    pub reserves: Arc<RwLock<Vec<ReserveAsset>>>,
    pub prices: Arc<RwLock<HashMap<String, PriceInfo>>>,
    pub compliance: Arc<RwLock<ComplianceStatus>>,
    pub affiliates: Arc<RwLock<HashMap<String, AffiliateInfo>>>,
    pub marketing: Arc<RwLock<Vec<MarketingInfo>>>,
    pub financial_metrics: Arc<RwLock<FinancialMetrics>>,
    pub identity_records: Arc<RwLock<HashMap<String, IdentityRecord>>>,
    pub erp_sync_status: Arc<RwLock<HashMap<String, ErpSyncRecord>>>,
    pub offline_queue: Arc<RwLock<Vec<OfflineReceipt>>>,
    pub nearby_mesh_nodes: Arc<RwLock<Vec<MeshNode>>>,
}"""

    e_start = new_content.find("pub struct Engine {")
    e_end = new_content.find("}", e_start) + 1
    new_content = new_content[:e_start] + engine_struct + new_content[e_end:]

    # Correct Engine::new fields
    init_logic = """
            erp_sync_status: Arc::new(RwLock::new(HashMap::new())),
            offline_queue: Arc::new(RwLock::new(Vec::new())),
            nearby_mesh_nodes: Arc::new(RwLock::new(vec![
                MeshNode {
                    node_id: "spaza-gate-001".to_string(),
                    protocol: "Bluetooth LE".to_string(),
                    signal_strength: -65,
                    last_gossip: Utc::now(),
                },
                MeshNode {
                    node_id: "spaza-gate-002".to_string(),
                    protocol: "WiFi Direct".to_string(),
                    signal_strength: -42,
                    last_gossip: Utc::now(),
                }
            ])),
        }"""

    i_start = new_content.find("erp_sync_status: Arc::new(RwLock::new(HashMap::new())),")
    i_end = new_content.find("}", i_start) + 1
    new_content = new_content[:i_start] + init_logic + new_content[i_end:]

    # Final cleanup of any duplicated #derive
    lines = new_content.split("\n")
    final_lines = []
    for i in range(len(lines)):
        if lines[i].strip().startswith("#[derive") and i+1 < len(lines) and lines[i+1].strip().startswith("#[derive"):
            continue
        final_lines.append(lines[i])

    with open(file_path, "w") as f:
        f.write("\n".join(final_lines))
else:
    print("Failed reconstruction")
