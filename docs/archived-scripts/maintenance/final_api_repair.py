import os
import re

api_path = "services/lib-conxian-core/gateway/src/api/mod.rs"

def repair():
    with open(api_path, "r") as f:
        content = f.read()

    # Replace the validate method with something that actually works with the engine
    validate_method = """    fn validate(self) -> Result<PartnerLeadCreateInput, Vec<String>> {
        Ok(PartnerLeadCreateInput {
            partner_name: self.partner_name.unwrap_or_default(),
            contact_name: self.contact_name.unwrap_or_default(),
            contact_email: self.contact_email.unwrap_or_default(),
            company_name: self.company_name,
            notes: self.notes,
        })
    }"""

    pattern = r'fn validate\(self\) -> Result<PartnerLeadCreateInput, Vec<String>> \{.*?\}'
    content = re.sub(pattern, validate_method, content, flags=re.DOTALL)

    # Fix the lead display in handlers if needed, though they usually use serde

    # Remove duplicate erp_sync_handler
    matches = list(re.finditer(r'async fn erp_sync_handler', content))
    if len(matches) > 1:
        start = content.rfind("#[get", 0, matches[1].start())
        end = content.find("}", matches[1].start()) + 1
        content = content[:start] + content[end:]

    with open(api_path, "w") as f:
        f.write(content)

if __name__ == "__main__":
    repair()
