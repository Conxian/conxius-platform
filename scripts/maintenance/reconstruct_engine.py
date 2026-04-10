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
"""

with open(file_path, "r") as f:
    content = f.read()

# Replace top until ServiceStatus
start_idx = content.find("use actix_web")
end_idx = content.find("pub struct ReserveAsset")

if start_idx != -1 and end_idx != -1:
    new_content = header + "\n" + content[end_idx:]
    with open(file_path, "w") as f:
        f.write(new_content)
else:
    print("Failed to find replacement indices")
