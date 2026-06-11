import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    lines = f.readlines()

new_lines = []
skip_until_structs = False
for line in lines:
    if "use actix_web" in line and len(new_lines) > 0:
        # We found a double inclusion of header
        break
    new_lines.append(line)

with open(file_path, "w") as f:
    f.writelines(new_lines)
