import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

# Add structs
structs = """
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
"""

if "SovereignWallet" not in content:
    content = content.replace("pub struct AlexPool {", structs + "pub struct AlexPool {")

# Add methods
methods = """
    pub fn get_sovereign_wallet(&self, address: &str) -> SovereignWallet {
        self.increment_requests();
        SovereignWallet {
            address: address.to_string(),
            policy: WalletPolicy {
                quorum: 3,
                signers: vec![
                    "SPSZXAKV7DWTDZN2601WR31BM51BD3YTQWE97VRM".to_string(),
                    "SP2ZNGJ85ENDY6QRHQ5P2D4FXKGZWCKTB2T0Z55KS".to_string(),
                    "SP2ZD731ANQZT6J4K3F5N8A40ZXWXC1XFXHVVQFKE".to_string(),
                ],
                spending_limit_btc: 1.5,
            },
            custody_type: "Sovereign-Enclave".to_string(),
            status: "ready".to_string(),
        }
    }

    pub fn execute_secure_alex_action(&self, address: &str, tx_id: &str) -> serde_json::Value {
        self.increment_requests();
        // Simulation of enclave verification and signing (CON-136)
        serde_json::json!({
            "wallet": address,
            "action_id": tx_id,
            "status": "Attestation-Verified",
            "signer_quorum_reached": true,
            "broadcast_tx": "0xabc123...",
            "confirmation_depth": 3,
            "finalized": false
        })
    }
"""

if "pub fn get_sovereign_wallet" not in content:
    last_brace = content.rfind("}")
    content = content[:last_brace] + methods + "\n" + content[last_brace:]

with open(file_path, "w") as f:
    f.write(content)
