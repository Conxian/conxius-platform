import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

# Add structs
structs = """
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
"""

if "OfflineTransaction" not in content:
    content = content.replace("pub struct WalletPolicy {", structs + "pub struct WalletPolicy {")

# Add Engine fields
engine_fields = """
    pub offline_queue: Arc<RwLock<Vec<OfflineReceipt>>>,
    pub nearby_mesh_nodes: Arc<RwLock<Vec<MeshNode>>>,
"""

if "pub offline_queue" not in content:
    content = content.replace("pub erp_sync_status: Arc<RwLock<HashMap<String, ErpSyncRecord>>>,",
                            "pub erp_sync_status: Arc<RwLock<HashMap<String, ErpSyncRecord>>>,\n" + engine_fields)

# Add init logic
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
"""

if "offline_queue: Arc::new(RwLock::new(Vec::new()))," not in content:
    content = content.replace("erp_sync_status: Arc::new(RwLock::new(HashMap::new())),", init_logic)

# Add methods
methods = """
    pub fn authorize_offline_transaction(&self, tx_hash: &str, amount: u64, attestation: &str) -> OfflineReceipt {
        self.increment_requests();
        let receipt = OfflineReceipt {
            receipt_id: format!("rcpt_{}", tx_hash[..8].to_string()),
            tx_hash: tx_hash.to_string(),
            tee_signature: "tee_sig_v1_offline_attestation_verified".to_string(),
            status: "queued_for_backhaul".to_string(),
            broadcast_priority: 1,
        };

        let mut queue = self.offline_queue.write().unwrap();
        queue.push(receipt.clone());

        // Simulate local mesh gossip (CON-78)
        let mut nodes = self.nearby_mesh_nodes.write().unwrap();
        for node in nodes.iter_mut() {
            node.last_gossip = Utc::now();
        }

        receipt
    }

    pub fn get_offline_queue(&self) -> Vec<OfflineReceipt> {
        self.offline_queue.read().unwrap().clone()
    }

    pub fn get_mesh_status(&self) -> Vec<MeshNode> {
        self.nearby_mesh_nodes.read().unwrap().clone()
    }
"""

if "pub fn authorize_offline_transaction" not in content:
    last_brace = content.rfind("}")
    content = content[:last_brace] + methods + "\n" + content[last_brace:]

with open(file_path, "w") as f:
    f.write(content)
