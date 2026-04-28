import os
import re

engine_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
api_path = "services/lib-conxian-core/gateway/src/api/mod.rs"

def fix():
    # 1. Fix Engine implementation to ensure get_service_status exists and is correct
    with open(engine_path, "r") as f:
        content = f.read()

    # Ensure get_service_status is present and standard
    if "pub fn get_service_status" not in content:
        # This is a critical method used everywhere
        method = """
    pub fn get_service_status(&self, name: &str) -> ServiceStatus {
        let statuses = self.service_statuses.read().unwrap();
        statuses.get(name).cloned().unwrap_or_else(|| ServiceStatus {
            name: name.to_string(),
            status: "unknown".to_string(),
            last_checked: Utc::now(),
            latency_ms: 0,
            trust_model: "unknown".to_string(),
            risk_level: "High".to_string(),
            risk_assessment: None,
            data_availability: "unknown".to_string(),
            settlement: "unknown".to_string(),
            bridge_security: "unknown".to_string(),
            tvl_usd: 0.0,
            version: None,
            metadata: HashMap::new(),
        })
    }
"""
        # Insert after Engine impl start
        content = content.replace("impl Engine {", "impl Engine {" + method)

    # Fix the handle_nostr_telemetry duplication/missing
    if "pub fn handle_nostr_telemetry" not in content:
        method = """
    pub fn handle_nostr_telemetry(&self, event: serde_json::Value) -> serde_json::Value {
        self.increment_requests();
        serde_json::json!({
            "status": "Accepted",
            "event_id": event.get("id").and_then(|v| v.as_str()).unwrap_or("unknown"),
            "bridge": "Nostr-Kind-20626",
            "timestamp": Utc::now()
        })
    }
"""
        last_brace = content.rfind("}")
        content = content[:last_brace] + method + "\n" + content[last_brace:]

    with open(engine_path, "w") as f:
        f.write(content)

    # 2. Fix API duplication
    with open(api_path, "r") as f:
        api_content = f.read()

    # Remove duplicate erp_sync_handler
    # We find the lines for erp_sync_handler and remove the second occurrence
    matches = list(re.finditer(r'async fn erp_sync_handler', api_content))
    if len(matches) > 1:
        # Remove from the second match to its end of block
        second_start = matches[1].start()
        # Find start of attribute macro before it
        attr_start = api_content.rfind("#[get", 0, second_start)
        # Find end of function block
        block_end = api_content.find("}", second_start) + 1
        api_content = api_content[:attr_start] + api_content[block_end:]

    with open(api_path, "w") as f:
        f.write(api_content)

if __name__ == "__main__":
    fix()
