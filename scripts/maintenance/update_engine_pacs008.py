import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

methods = """
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
"""

if "pub fn get_pacs008_wrapper" not in content:
    last_brace = content.rfind("}")
    content = content[:last_brace] + methods + "\n" + content[last_brace:]

with open(file_path, "w") as f:
    f.write(content)
