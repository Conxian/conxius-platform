import os

engine_path = "services/lib-conxian-core/gateway/src/engine/mod.rs"
api_path = "services/lib-conxian-core/gateway/src/api/mod.rs"

# Repair Engine struct init
with open(engine_path, "r") as f:
    content = f.read()

content = content.replace("erp_sync_status: Arc::new(RwLock::new(HashMap::new())),", "erp_sync_status: Arc::new(RwLock::new(HashMap::new())),")
# Actually, the error was "expected one of ! or ::, found :"
# which usually means a syntax error in the struct literal or missing semicolon before it.

# Let's fix the uptime call in API
with open(api_path, "r") as f:
    api_content = f.read()

api_content = api_content.replace(".num_seconds()", ".num_seconds()")
# Wait, num_seconds() IS available on TimeDelta/Duration.
# The error said chrono::DateTime - DateTime. That should be a Duration.
# Maybe I need to import Duration or use .num_seconds() on the result of signed_duration_since.

api_content = api_content.replace("(chrono::Utc::now() - engine.start_time).num_seconds()",
                                 "chrono::Utc::now().signed_duration_since(engine.start_time).num_seconds()")

with open(api_path, "w") as f:
    f.write(api_content)
