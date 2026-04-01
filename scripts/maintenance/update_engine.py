import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

# Add necessary structs and imports if missing
if "AiAllocation" not in content:
    structs = """
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
    content = content.replace("pub struct ServiceStatus {", structs + "pub struct ServiceStatus {")

# Add methods to Engine impl
methods = """
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

if "pub fn get_ai_allocation" not in content:
    # Insert before the last closing brace of the Engine impl
    last_brace = content.rfind("}")
    content = content[:last_brace] + methods + "\n" + content[last_brace:]

with open(file_path, "w") as f:
    f.write(content)
