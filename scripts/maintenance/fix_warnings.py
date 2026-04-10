import os

file_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
with open(file_path, "r") as f:
    content = f.read()

content = content.replace("amount: u64, min_out: u64", "_amount: u64, _min_out: u64")

with open(file_path, "w") as f:
    f.write(content)
