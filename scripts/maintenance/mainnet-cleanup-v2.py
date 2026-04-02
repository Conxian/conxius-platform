import re

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

# Define the list of structs that need the derive attribute
structs = [
    "RiskAssessment", "AiAllocation", "UbiIdentity", "NexusState",
    "ServiceStatus", "ReserveAsset", "PriceInfo", "ComplianceStatus",
    "AffiliateInfo", "MarketingInfo"
]

# Remove all existing derive lines for these structs to start fresh
content = re.sub(r'#\[derive\(Serialize, Deserialize, Clone, Debug\)\]\s*', '', content)

# Add exactly one derive attribute before each struct definition
for struct_name in structs:
    pattern = r'pub struct ' + struct_name + r' \{'
    replacement = '#[derive(Serialize, Deserialize, Clone, Debug)]\npub struct ' + struct_name + ' {'
    content = re.sub(pattern, replacement, content)

# Clean up any potential double newlines or artifacts
content = re.sub(r'\n\n\n+', '\n\n', content)

with open(file_path, "w") as f:
    f.write(content)