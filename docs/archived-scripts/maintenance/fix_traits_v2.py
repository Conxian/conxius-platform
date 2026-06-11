import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

# Add Serialize, Deserialize, Clone to all structs that might need it
content = content.replace("pub struct ReserveAsset {", "#[derive(Serialize, Deserialize, Clone, Debug)]\npub struct ReserveAsset {")
content = content.replace("pub struct PriceInfo {", "#[derive(Serialize, Deserialize, Clone, Debug)]\npub struct PriceInfo {")
content = content.replace("pub struct ComplianceStatus {", "#[derive(Serialize, Deserialize, Clone, Debug)]\npub struct ComplianceStatus {")
content = content.replace("pub struct AffiliateInfo {", "#[derive(Serialize, Deserialize, Clone, Debug)]\npub struct AffiliateInfo {")
content = content.replace("pub struct MarketingInfo {", "#[derive(Serialize, Deserialize, Clone, Debug)]\npub struct MarketingInfo {")
content = content.replace("pub struct FinancialMetrics {", "#[derive(Serialize, Deserialize, Clone, Debug)]\npub struct FinancialMetrics {")
content = content.replace("pub struct IdentityRecord {", "#[derive(Serialize, Deserialize, Clone, Debug)]\npub struct IdentityRecord {")
content = content.replace("pub struct ErpSyncRecord {", "#[derive(Serialize, Deserialize, Clone, Debug)]\npub struct ErpSyncRecord {")

with open(file_path, "w") as f:
    f.write(content)
