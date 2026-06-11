import os

engine_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
api_path = "services/lib-conxian-core/gateway/src/api/mod.rs"

def fix():
    with open(engine_path, "r") as f:
        content = f.read()

    # Fix struct fields for PartnerLeadCreateInput to match API usage
    content = content.replace("pub partner_name: String,", "pub partner_name: String,\n    pub contact_name: String,\n    pub contact_email: String,\n    pub company_name: Option<String>,\n    pub notes: Option<String>,")
    # Clean up the old single fields if they were added
    content = content.replace("pub name: String,", "")
    content = content.replace("pub email: String,", "")
    content = content.replace("pub organization: String,", "")
    content = content.replace("pub initial_note: Option<String>,", "")

    # Re-add AffiliateInfo and MarketingInfo if missing
    if "pub struct AffiliateInfo" not in content:
        extra = """
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
"""
        content = content.replace("pub struct ServiceStatus {", extra + "pub struct ServiceStatus {")

    with open(engine_path, "w") as f:
        f.write(content)

if __name__ == "__main__":
    fix()
