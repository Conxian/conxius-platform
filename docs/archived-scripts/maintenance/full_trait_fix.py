import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    lines = f.readlines()

new_lines = []
for line in lines:
    if line.strip().startswith("pub struct") and "Engine" not in line:
        new_lines.append("#[derive(Serialize, Deserialize, Clone, Debug)]\n")
    if not line.strip().startswith("#[derive(Serialize, Deserialize, Clone, Debug)]"):
        new_lines.append(line)

with open(file_path, "w") as f:
    f.writelines(new_lines)
