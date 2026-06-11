import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    lines = f.readlines()

print("".join(lines[:100]))
