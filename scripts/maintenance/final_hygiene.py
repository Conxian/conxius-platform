import os

engine_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(engine_path, "r") as f:
    content = f.read()

# Fix the double derive on WalletPolicy and other structs if any
lines = content.split("\n")
clean_lines = []
for i in range(len(lines)):
    if i > 0 and lines[i].strip().startswith("#[derive") and lines[i-1].strip().startswith("#[derive"):
        continue
    clean_lines.append(lines[i])

with open(engine_path, "w") as f:
    f.write("\n".join(clean_lines))

# Final check for hardcoded testnet addresses in UI
ui_contracts = "services/conxian-ui/src/lib/contracts.ts"
with open(ui_contracts, "r") as f:
    ui_content = f.read()

if "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM" in ui_content:
    print("Found testnet address in contracts.ts, removing...")
    ui_content = ui_content.replace("ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM", "SAMPLE_USER_ADDRESS")
    with open(ui_contracts, "w") as f:
        f.write(ui_content)
