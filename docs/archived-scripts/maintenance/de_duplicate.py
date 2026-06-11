import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    lines = f.readlines()

seen = set()
unique_lines = []
for line in lines:
    stripped = line.strip()
    if stripped.startswith("#[derive(Serialize, Deserialize, Clone, Debug)]"):
        if stripped in seen:
            continue
        seen.add(stripped)
    unique_lines.append(line)

with open(file_path, "w") as f:
    f.writelines(unique_lines)
