import re

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

# Remove the redundant impl Engine block at the end
content = re.sub(r'impl Engine \{[\s\S]+?\}', '', content, count=1, flags=re.M | re.S if 'impl Engine {' in content else 0)

# Actually, let's just rewrite the file one last time to be perfect.
new_content = """use reqwest;
use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};
use std::sync::atomic::{AtomicU64, Ordering};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tokio::time::sleep;
use actix_web::web;

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

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NexusState {
    pub merkle_root: String,
    pub last_sync_height: u64,
    pub sync_status: String,
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

pub struct Engine {
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
    pub revenue_intelligence: Arc<RwLock<RevenueIntelligence>>,
    pub tableland_sync: Arc<RwLock<TablelandSyncStatus>>,
}

impl Default for Engine {
    fn default() -> Self {
        Self::new()
    }
}

impl Engine {
    pub fn new() -> Self {
        let mut statuses = HashMap::new();
        let layers = vec!["stacks", "lightning", "liquid", "rootstock", "babylon", "bob", "merlin", "botanix", "b2network", "citrea", "bitlayer", "alpen", "mezo", "zulu", "bison", "hemi", "taproot-assets", "nubit", "lorenzo", "core-dao", "bisq", "rgb", "bitvm", "bitvm2"];

        for layer in layers {
            statuses.insert(layer.to_string(), ServiceStatus {
                name: layer.to_string(),
                status: "operational".to_string(),
                last_checked: Utc::now(),
                latency_ms: 10 + (layer.len() as u32 % 50),
                trust_model: "decentralized".to_string(),
                risk_level: "low".to_string(),
                risk_assessment: Some(RiskAssessment {
                    overall_level: "low".to_string(),
                    da_score: 95,
                    settlement_score: 98,
                    bridge_score: 92,
                    exit_mechanism_score: 90,
                    operators_score: 94,
                    decentralization_score: 88,
                }),
                data_availability: "On-chain".to_string(),
                settlement: "Bitcoin L1".to_string(),
                bridge_security: "Trustless".to_string(),
                tvl_usd: 1000000.0 + (layer.len() as f64 * 50000.0),
                version: Some("v1.0.0".to_string()),
                metadata: HashMap::new(),
            });
        }

        let reserves = vec![
            ReserveAsset { asset: "Bitcoin (BTC)".to_string(), total_supplied: 542.5, total_reserves: 542.5, collateral_ratio: 100.0, status: "Audited".to_string() },
            ReserveAsset { asset: "Stacks (sBTC)".to_string(), total_supplied: 281.2, total_reserves: 352.5, collateral_ratio: 125.3, status: "Audited".to_string() },
        ];

        let mut prices = HashMap::new();
        prices.insert("BTC".to_string(), PriceInfo { asset: "BTC".to_string(), price_usd: 65000.0, last_updated: Utc::now(), source: "Conxian Oracle".to_string() });

        Self {
            version: "0.2.1".to_string(),
            start_time: Utc::now(),
            request_count: AtomicU64::new(0),
            total_tvl_usd: Arc::new(RwLock::new(0.0)),
            active_sovereign_nodes: AtomicU64::new(12),
            service_statuses: Arc::new(RwLock::new(statuses)),
            reserves: Arc::new(RwLock::new(reserves)),
            prices: Arc::new(RwLock::new(prices)),
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
    }

    pub async fn start_monitoring(engine: web::Data<Engine>) {
        tokio::spawn(async move {
            loop {
                engine.update_dynamic_stats();
                sleep(Duration::from_secs(60)).await;
            }
        });
    }

    pub fn increment_requests(&self) {
        self.request_count.fetch_add(1, Ordering::SeqCst);
    }

    pub fn get_service_status(&self, service: &str) -> ServiceStatus {
        let statuses = self.service_statuses.read().unwrap();
        statuses.get(service).cloned().unwrap_or_else(|| ServiceStatus {
            name: service.to_string(),
            status: "unknown".to_string(),
            last_checked: Utc::now(),
            latency_ms: 0,
            trust_model: "unknown".to_string(),
            risk_level: "high".to_string(),
            risk_assessment: None,
            data_availability: "unknown".to_string(),
            settlement: "unknown".to_string(),
            bridge_security: "unknown".to_string(),
            tvl_usd: 0.0,
            version: None,
            metadata: HashMap::new(),
        })
    }

    pub fn get_all_service_statuses(&self) -> HashMap<String, ServiceStatus> {
        self.service_statuses.read().unwrap().clone()
    }

    pub fn get_reserves(&self) -> Vec<ReserveAsset> {
        self.reserves.read().unwrap().clone()
    }

    pub fn get_prices(&self) -> HashMap<String, PriceInfo> {
        self.prices.read().unwrap().clone()
    }

    pub fn get_compliance_status(&self) -> ComplianceStatus {
        self.compliance.read().unwrap().clone()
    }

    pub fn get_affiliates(&self) -> HashMap<String, AffiliateInfo> {
        self.affiliates.read().unwrap().clone()
    }

    pub fn get_marketing(&self) -> Vec<MarketingInfo> {
        self.marketing.read().unwrap().clone()
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

    pub fn get_pacs008_wrapper(&self, tx_id: &str) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({
            "message_id": format!("MSG-{}", tx_id),
            "creation_date_time": Utc::now(),
            "settlement_method": "CLRG",
            "clearing_system": "PACS",
            "instruction_id": format!("INST-{}", tx_id),
            "end_to_end_id": format!("E2E-{}", tx_id),
            "tx_id": tx_id,
            "currency": "USD",
            "amount": 1000.0,
            "status": "ready_for_gsib"
        })
    }

    pub fn sync_erp(&self, erp_type: &str) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({
            "erp": erp_type,
            "sync_status": "success",
            "odata_version": "v4.0",
            "records_synced": 42,
            "last_sync": Utc::now()
        })
    }

    pub fn get_hsm_status(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({
            "fips_level": "140-2 Level 3",
            "status": "operational",
            "hardware_version": "v2.1.0",
            "last_attestation": Utc::now()
        })
    }

    pub fn update_dynamic_stats(&self) {
        let statuses = self.service_statuses.read().unwrap();
        let mut total = 0.0;
        for status in statuses.values() {
            total += status.tvl_usd;
        }
        *self.total_tvl_usd.write().unwrap() = total;
    }

    pub fn get_liquid_peg(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "asset": "L-BTC", "status": "active", "peg_ratio": 1.0 })
    }

    pub fn get_rootstock_powpeg(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "asset": "RBTC", "status": "active", "peg_ratio": 1.0 })
    }

    pub fn get_babylon_staking(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "staked_btc": "1250.0", "active_validators": 125 })
    }

    pub fn get_bob_info(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "optimistic_bridge_status": "Active", "exit_period_blocks": 2016 })
    }

    pub fn get_merlin_stats(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "zk_proving_status": "Active", "sequencer_yield_pct": 12.5 })
    }

    pub fn get_botanix_stats(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "spiderchain_nodes": 144, "status": "Active" })
    }

    pub fn get_b2_status(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "proof_status": "Verified", "da_layer": "Bitcoin" })
    }

    pub fn get_citrea_proof(&self, id: &str) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "batch_id": id, "status": "Finalized" })
    }

    pub fn get_bitlayer_info(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "bitvm_challenge_status": "Healthy" })
    }

    pub fn get_alpen_stats(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "zk_proof_type": "SNARK", "finality_depth_bitcoin": 3 })
    }

    pub fn get_mezo_yield(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "current_yield_apy": 6.2 })
    }

    pub fn get_zulu_info(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "layer_type": "Multi-layer", "active_canals": 12 })
    }

    pub fn get_bison_stats(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "zk_roll_uptime_pct": 99.98 })
    }

    pub fn get_hemi_status(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "sequencer_status": "Active" })
    }

    pub fn get_taproot_assets_stats(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "lightning_integration": "Enabled" })
    }

    pub fn get_nubit_da_info(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "active_da_nodes": 450 })
    }

    pub fn get_lorenzo_staking(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "staked_btc": "150.0", "yield_apy": 4.5 })
    }

    pub fn get_core_dao_stats(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "total_staked_btc": 2500.0 })
    }

    pub fn create_lightning_invoice(&self, amount: u64, desc: &str) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "invoice": format!("lnbc{}", amount), "description": desc })
    }

    pub fn pay_lightning_invoice(&self, invoice: &str) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "status": "success", "invoice": invoice })
    }

    pub fn get_stacks_contract(&self, id: &str) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "contract_id": id, "status": "active" })
    }

    pub fn get_rgb_contract(&self, id: &str) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "contract_id": id, "status": "active" })
    }

    pub fn get_bitvm_proof(&self, id: &str) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "proof_id": id, "verified": true })
    }

    pub fn get_bitvm2_info(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "paradigm": "ZK-Fraud Proofs", "status": "Operational" })
    }

    pub fn get_risk_assessments(&self) -> HashMap<String, Option<RiskAssessment>> {
        let statuses = self.service_statuses.read().unwrap();
        let mut assessments = HashMap::new();
        for (name, status) in statuses.iter() {
            assessments.insert(name.clone(), status.risk_assessment.clone());
        }
        assessments
    }

    pub fn verify_zkml_proof(&self, proof: &str) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "proof_id": proof, "verified": true, "attestation_role": "Guardian" })
    }

    pub fn is_healthy(&self) -> bool {
        true
    }

    pub fn get_system_info(&self) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({
            "version": self.version,
            "uptime_seconds": Utc::now().signed_duration_since(self.start_time).num_seconds(),
            "processed_height": self.request_count.load(Ordering::SeqCst),
        })
    }

    pub fn check_compliance(&self, address: &str) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "address": address, "compliant": true, "risk_score": 5 })
    }

    pub fn get_exchange_rate(&self, from: &str, to: &str) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({ "from": from, "to": to, "rate": 65000.0 })
    }

    pub fn get_exchange_rate_v2(&self, from: &str, to: &str) -> serde_json::Value {
        self.get_exchange_rate(from, to)
    }
}
"""
with open(file_path, "w") as f:
    f.write(new_content)
