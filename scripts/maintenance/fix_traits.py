import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

# Update ServiceStatus derive
content = content.replace("pub struct ServiceStatus {", "#[derive(Serialize, Deserialize, Clone, Debug)]\npub struct ServiceStatus {")

# Check other structs
for struct_name in ["ReserveAsset", "PriceInfo", "ComplianceStatus", "AffiliateInfo", "MarketingInfo"]:
    if f"pub struct {struct_name} {{" in content and f"#[derive(Serialize, Deserialize, Clone, Debug)]\npub struct {struct_name} {{" not in content:
        content = content.replace(f"pub struct {struct_name} {{", f"#[derive(Serialize, Deserialize, Clone, Debug)]\npub struct {struct_name} {{")

# Remove duplicate derives if any (just in case)
content = content.replace("#[derive(Serialize, Deserialize, Clone, Debug)]\n#[derive(Serialize, Deserialize, Clone, Debug)]", "#[derive(Serialize, Deserialize, Clone, Debug)]")

with open(file_path, "w") as f:
    f.write(content)
