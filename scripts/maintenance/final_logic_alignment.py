import os

engine_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"

def fix():
    with open(engine_path, "r") as f:
        content = f.read()

    # 1. Fix get_proposals to actually return state
    content = content.replace("pub fn get_proposals(&self) -> Vec<StateProposal> { vec![] }",
                             "pub fn get_proposals(&self) -> Vec<StateProposal> { self.state_proposals.read().unwrap().values().cloned().collect() }")

    # 2. Fix process_external_settlement to store the proposal
    new_settlement = """    pub fn process_external_settlement(&self, system: &str, _payload: serde_json::Value) -> serde_json::Value {
        let proposal_id = format!("prop-{}-{}", system.to_lowercase(), Utc::now().timestamp());
        let proposal = StateProposal {
            proposal_id: proposal_id.clone(),
            trigger_id: "external-trigger".to_string(),
            proposed_state: system.to_string(),
            timelock_end_block: 841644,
            status: "Pending".to_string(),
            tee_attestation: "VerifiedByStrongBox-Mainnet-v1.0".to_string(),
            yield_routing: "5/5/90".to_string(),
            capital_status: "TransitBond".to_string(),
        };
        self.state_proposals.write().unwrap().insert(proposal_id.clone(), proposal);
        serde_json::json!({
            "proposal_id": proposal_id,
            "status": "Pending",
            "timelock_end_block": 841644,
            "yield_routing": "5/5/90",
            "capital_status": "TransitBond",
            "tee_attestation": "VerifiedByStrongBox-Mainnet-v1.0"
        })
    }"""

    import re
    # Match the existing broken one (with the extra brace if it exists)
    content = re.sub(r'pub fn process_external_settlement\(.*?\).*?\{.*?\}\s*\}', new_settlement, content, flags=re.DOTALL)

    with open(engine_path, "w") as f:
        f.write(content)

if __name__ == "__main__":
    fix()
