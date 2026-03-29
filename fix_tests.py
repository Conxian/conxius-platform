import os

file_path = "services/lib-conxian-core/gateway/src/api/tests.rs"
with open(file_path, "r") as f:
    content = f.read()

# Add imports to the beginning of the file if not present
imports = """use actix_web::{test, App, web};
use crate::engine::Engine;
use crate::api::config;
"""
if "use actix_web::{test, App, web};" not in content:
    content = imports + content

# Fix the test block to use the newly imported names correctly
# Actually, the file likely already has these in its module scope, but we added a test at the end.
# Let's check the top of the file.
with open(file_path, "w") as f:
    f.write(content)
