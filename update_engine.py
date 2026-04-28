import os

path = 'services/lib-conxian-core/gateway/src/engine/mod.rs'
with open(path, 'r') as f:
    lines = f.read().splitlines()

new_lines = []
in_structs = True
for line in lines:
    if 'pub struct Engine {' in line:
        # Before Engine struct, insert Phase 6 structs
        new_lines.append("""#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NexusState {
    pub merkle_root: String,
    pub block_height: u64,
    pub sync_status: String,
    pub last_checkpoint: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AgentIntent {
    pub intent_id: String,
    pub target: String,
    pub payload: Value,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AlexTxPayload {
    pub tx_id: String,
    pub raw_tx: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum RpcStrategy {
    Performance,
    Redundancy,
    Balanced,
    Decentralized,
}
""")

    if 'pub sab_wallets: Arc<RwLock<Vec<SabWallet>>>,' in line:
        new_lines.append(line)
        new_lines.append("    pub rpc_strategy: Arc<RwLock<RpcStrategy>>,")
        continue

    if 'sab_wallets: Arc::new(RwLock::new(Vec::new())),' in line and 'Engine {' in "".join(new_lines[-20:]):
         new_lines.append(line)
         new_lines.append("            rpc_strategy: Arc::new(RwLock::new(RpcStrategy::Balanced)),")
         continue

    new_lines.append(line)

# Add methods to Engine impl
final_lines = []
skip = False
for line in new_lines:
    if 'pub fn initialize(&self) {' in line:
        final_lines.append(line)
        final_lines.append("""        let mut statuses = self.service_statuses.write().unwrap();
        statuses.insert(
            "nexus-glass-node".to_string(),
            ServiceStatus {
                name: "Nexus Glass Node".to_string(),
                status: "Operational".to_string(),
                last_checked: Utc::now(),
                latency_ms: 12,
                trust_model: "Sovereign".to_string(),
                risk_level: "Low".to_string(),
                risk_assessment: Some(RiskAssessment {
                    overall_level: "Secure".to_string(),
                    da_score: 98,
                    settlement_score: 99,
                    bridge_score: 100,
                    exit_mechanism_score: 100,
                    operators_score: 95,
                    decentralization_score: 90,
                }),
                data_availability: "On-chain (Bitcoin)".to_string(),
                settlement: "Finalized".to_string(),
                bridge_security: "Multi-sig + TEE".to_string(),
                tvl_usd: 12500000.0,
                version: Some("v1.2.0".to_string()),
                metadata: HashMap::new(),
            },
        );

        let mut wallets = self.sab_wallets.write().unwrap();
        wallets.push(SabWallet {
            address: "SPSZXAKV7DWTDZN2601WR31BM51BD3YTQWE97VRM".to_string(),
            role: "Operator".to_string(),
            owner: "conxian-labs".to_string(),
            status: "Active".to_string(),
            quorum: Some("2/3".to_string()),
            spending_limit_usd: Some(1000000.0),
        });""")
        skip = True
        continue
    if skip and line.strip() == 'self.initialize_services();':
        continue
    if skip and line.strip() == '}':
        final_lines.append(line)
        skip = False
        continue

    if not skip:
        final_lines.append(line)

# Append new methods before the last } of impl Engine
if final_lines[-1].strip() == '}':
    final_lines.pop()

final_lines.append("""
    pub fn get_ai_allocation(&self) -> Value {
        self.increment_requests();
        serde_json::json!({
            "status": "Healthy",
            "compute_weight": 0.85,
            "last_updated": Utc::now(),
            "allocations": [
                {"agent": "Nexus-1", "weight": 0.4},
                {"agent": "Nexus-2", "weight": 0.6}
            ]
        })
    }

    pub fn get_ubi_identity(&self, address: &str) -> Value {
        self.increment_requests();
        serde_json::json!({
            "identity_hash": format!("ubi:btc:{}", address),
            "status": "Verified",
            "last_attestation": Utc::now(),
            "is_sovereign": true
        })
    }

    pub fn get_nexus_state(&self) -> NexusState {
        self.increment_requests();
        NexusState {
            merkle_root: "0xabc...123".to_string(),
            block_height: 840000,
            sync_status: "Synced".to_string(),
            last_checkpoint: Utc::now(),
        }
    }

    pub fn handle_nostr_telemetry(&self, event: Value) -> Value {
        self.increment_requests();
        serde_json::json!({
            "event_id": event["id"],
            "status": "Ingested",
            "kind": 20626,
            "timestamp": Utc::now()
        })
    }

    pub fn construct_alex_tx(&self, _payload: Value) -> AlexTxPayload {
        self.increment_requests();
        AlexTxPayload {
            tx_id: format!("alex-tx-{}", Utc::now().timestamp()),
            raw_tx: "0x000...alex".to_string(),
        }
    }

    pub fn simulate_settlement(&self, _payload: Value) -> Value {
        self.increment_requests();
        serde_json::json!({
            "estimated_fee_usd": 12.50,
            "policy_status": "Valid",
            "settlement_rail": "sBTC",
            "simulation_result": "Success"
        })
    }

    pub fn get_unified_balances(&self, address: &str) -> Value {
        self.increment_requests();
        serde_json::json!({
            "address": address,
            "assets": [
                {"chain": "Bitcoin", "asset": "BTC", "balance": 1.25},
                {"chain": "Stacks", "asset": "STX", "balance": 5400.0},
                {"chain": "Stacks", "asset": "sBTC", "balance": 0.45},
                {"chain": "Liquid", "asset": "L-BTC", "balance": 0.12}
            ],
            "total_usd": 115400.0
        })
    }

    pub fn set_rpc_strategy(&self, strategy: RpcStrategy) {
        let mut s = self.rpc_strategy.write().unwrap();
        *s = strategy;
    }

    pub fn get_rpc_config(&self) -> Value {
        let strategy = self.rpc_strategy.read().unwrap();
        serde_json::json!({
            "strategy": *strategy,
            "pocket_network_enabled": *strategy == RpcStrategy::Decentralized,
            "fallback_enabled": true,
            "active_endpoints": 3
        })
    }
}
""")

with open(path, 'w') as f:
    f.write('\n'.join(final_lines))
